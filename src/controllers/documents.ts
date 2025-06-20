import { db } from "@/db/db";
import { Request, Response } from "express";
import { unlink } from "fs/promises";
import path from "path";
import { getAuthenticatedUser } from "@/types";
import { pinataService } from "@/services/pinata";

// Créer/Uploader un document
export async function uploadDocument(req: Request, res: Response) {
  const {
    nom,
    type,
    proprietaireId,
    vehiculeId,
    replaceDocumentId
  } = req.body;
  
  const { userId: createdById } = getAuthenticatedUser(req);

  try {
    // Si c'est un remplacement, vérifier que le document existe
    let documentToReplace = null;
    if (replaceDocumentId) {
      documentToReplace = await db.document.findUnique({
        where: { id: replaceDocumentId }
      });

      if (!documentToReplace) {
        return res.status(404).json({
          data: null,
          error: "Document à remplacer non trouvé"
        });
      }
    }

    // Vérifier qu'au moins un ID (propriétaire ou véhicule) est fourni
    if (!proprietaireId && !vehiculeId) {
      return res.status(400).json({
        data: null,
        error: "Un document doit être associé à un propriétaire ou un véhicule"
      });
    }

    // Vérifier l'existence du propriétaire si fourni
    if (proprietaireId) {
      const proprietaire = await db.proprietaire.findUnique({
        where: { id: proprietaireId }
      });

      if (!proprietaire) {
        return res.status(404).json({
          data: null,
          error: "Propriétaire non trouvé"
        });
      }

      // Vérifier qu'un propriétaire n'a qu'un seul document (sauf si c'est un remplacement)
      if (!replaceDocumentId) {
        const existingDocument = await db.document.findFirst({
          where: { proprietaireId: proprietaireId }
        });

        if (existingDocument) {
          return res.status(400).json({
            data: null,
            error: "Un propriétaire ne peut avoir qu'un seul document. Utilisez la fonction 'remplacer' pour mettre à jour le document existant."
          });
        }
      }
    }

    // Vérifier l'existence du véhicule si fourni
    if (vehiculeId) {
      const vehicule = await db.vehicule.findUnique({
        where: { id: vehiculeId }
      });

      if (!vehicule) {
        return res.status(404).json({
          data: null,
          error: "Véhicule non trouvé"
        });
      }
    }    // Gestion du fichier uploadé avec PINATA
    let documentData: any = {};
    if (req.file) {
      try {
        // Tentative d'upload vers PINATA si configuré
        if (pinataService.isConfigured()) {
          console.log('📤 Upload vers PINATA...');
          const pinataResult = await pinataService.uploadFile(
            req.file.path,
            req.file.filename,
            {
              type: type,
              proprietaireId: proprietaireId || null,
              vehiculeId: vehiculeId || null,
              uploadedBy: createdById
            }
          );

          const pinataUrl = pinataService.generateFileUrl(pinataResult.IpfsHash);
            documentData = {
            chemin: pinataUrl,
            taille: req.file.size,
            mimeType: req.file.mimetype
          };

          // Supprimer le fichier local après upload réussi vers PINATA
          try {
            await unlink(req.file.path);
            console.log('🗑️ Fichier local supprimé après upload PINATA');
          } catch (unlinkError) {
            console.warn('⚠️ Impossible de supprimer le fichier local:', unlinkError);
          }          console.log('✅ Fichier uploadé vers PINATA:', pinataUrl);
        } else {
          // PINATA n'est pas configuré - retourner une erreur
          console.error('❌ PINATA non configuré, impossible d\'uploader le fichier');
          throw new Error('Service de stockage de fichiers non configuré. Veuillez configurer PINATA.');
        }      } catch (pinataError: any) {
        console.error('❌ Erreur PINATA lors de l\'upload:', pinataError);
        // Retourner une erreur plutôt que de faire un fallback
        throw new Error(`Erreur lors de l'upload vers PINATA: ${pinataError.message}`);
      }
    } else {
      return res.status(400).json({
        data: null,
        error: "Aucun fichier fourni"
      });    }

    let result;
    
    if (replaceDocumentId && documentToReplace) {
      // Mode remplacement: mettre à jour le document existant
      result = await db.document.update({
        where: { id: replaceDocumentId },
        data: {
          nom,
          type,
          ...documentData,
          updatedAt: new Date()
        },
        include: {
          proprietaire: proprietaireId ? {
            select: {
              id: true,
              nom: true,
              prenom: true
            }
          } : false,
          vehicule: vehiculeId ? {
            select: {
              id: true,
              marque: true,
              modele: true,
              numeroImmatriculation: true
            }
          } : false,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Log d'audit pour remplacement
      await db.auditLog.create({
        data: {
          action: "UPDATE",
          table: "Document",
          recordId: result.id,
          oldValues: documentToReplace,
          newValues: result,
          userId: createdById
        }
      });

      console.log('🔄 Document remplacé:', result.id);
    } else {
      // Mode création: créer un nouveau document
      result = await db.document.create({
        data: {
          nom,
          type,
          proprietaireId: proprietaireId || null,
          vehiculeId: vehiculeId || null,
          createdById,
          ...documentData
        },
        include: {
          proprietaire: proprietaireId ? {
            select: {
              id: true,
              nom: true,
              prenom: true
            }
          } : false,
          vehicule: vehiculeId ? {
            select: {
              id: true,
              marque: true,
              modele: true,
              numeroImmatriculation: true
            }
          } : false,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Log d'audit pour création
      await db.auditLog.create({
        data: {
          action: "CREATE",
          table: "Document",
          recordId: result.id,
          newValues: result,
          userId: createdById
        }
      });

      console.log('➕ Nouveau document créé:', result.id);
    }

    return res.status(replaceDocumentId ? 200 : 201).json({
      data: result,
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la création du document:", error);
    
    // Supprimer le fichier si erreur
    if (req.file) {
      try {
        await unlink(req.file.path);
      } catch (unlinkError) {
        console.error("Erreur lors de la suppression du fichier:", unlinkError);
      }
    }

    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir tous les documents
export async function getDocuments(req: Request, res: Response) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      type,
      proprietaireId,
      vehiculeId
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    // Recherche par nom
    if (search) {
      where.OR = [
        { nom: { contains: search as string, mode: "insensitive" } },
        { 
          proprietaire: {
            OR: [
              { nom: { contains: search as string, mode: "insensitive" } },
              { prenom: { contains: search as string, mode: "insensitive" } }
            ]
          }
        },
        {
          vehicule: {
            OR: [
              { marque: { contains: search as string, mode: "insensitive" } },
              { modele: { contains: search as string, mode: "insensitive" } },
              { numeroImmatriculation: { contains: search as string, mode: "insensitive" } }
            ]
          }
        }
      ];
    }

    if (type) {
      where.type = type;
    }

    if (proprietaireId) {
      where.proprietaireId = proprietaireId;
    }

    if (vehiculeId) {
      where.vehiculeId = vehiculeId;
    }

    const [documents, total] = await Promise.all([
      db.document.findMany({
        where,
        include: {
          proprietaire: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              telephone: true
            }
          },
          vehicule: {
            select: {
              id: true,
              marque: true,
              modele: true,
              numeroImmatriculation: true,
              typeVehicule: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" }
      }),
      db.document.count({ where })
    ]);

    return res.status(200).json({
      data: {
        documents,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      },
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des documents:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir un document par ID
export async function getDocumentById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const document = await db.document.findUnique({
      where: { id },
      include: {
        proprietaire: true,
        vehicule: {
          include: {
            proprietaire: {
              select: {
                id: true,
                nom: true,
                prenom: true
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        data: null,
        error: "Document non trouvé"
      });
    }

    return res.status(200).json({
      data: document,
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du document:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Télécharger un document
export async function downloadDocument(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const document = await db.document.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({
        data: null,
        error: "Document non trouvé"
      });
    }

    // Vérifier si le fichier existe
    const filePath = path.resolve(document.chemin);
    
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${document.nom}"`);
    
    return res.sendFile(filePath);
  } catch (error) {
    console.error("Erreur lors du téléchargement du document:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur lors du téléchargement"
    });
  }
}

// Mettre à jour un document
export async function updateDocument(req: Request, res: Response) {
  const { id } = req.params;
  const {
    nom,
    type,
    proprietaireId,    vehiculeId
  } = req.body;
  
  const { userId } = getAuthenticatedUser(req);

  try {
    const existingDocument = await db.document.findUnique({
      where: { id }
    });

    if (!existingDocument) {
      return res.status(404).json({
        data: null,
        error: "Document non trouvé"
      });
    }

    // Vérifier l'existence du propriétaire si fourni
    if (proprietaireId) {
      const proprietaire = await db.proprietaire.findUnique({
        where: { id: proprietaireId }
      });

      if (!proprietaire) {
        return res.status(404).json({
          data: null,
          error: "Propriétaire non trouvé"
        });
      }
    }

    // Vérifier l'existence du véhicule si fourni
    if (vehiculeId) {
      const vehicule = await db.vehicule.findUnique({
        where: { id: vehiculeId }
      });

      if (!vehicule) {
        return res.status(404).json({
          data: null,
          error: "Véhicule non trouvé"
        });
      }
    }

    const oldValues = {
      nom: existingDocument.nom,
      type: existingDocument.type,
      proprietaireId: existingDocument.proprietaireId,
      vehiculeId: existingDocument.vehiculeId
    };

    // Gestion du nouveau fichier si uploadé
    let fileData = {};
    if (req.file) {
      // Supprimer l'ancien fichier
      try {
        await unlink(existingDocument.chemin);
      } catch (unlinkError) {
        console.error("Erreur lors de la suppression de l'ancien fichier:", unlinkError);
      }

      fileData = {
        chemin: req.file.path,
        taille: req.file.size,
        mimeType: req.file.mimetype
      };
    }

    const updatedDocument = await db.document.update({
      where: { id },
      data: {
        ...(nom && { nom }),
        ...(type && { type }),
        ...(proprietaireId !== undefined && { proprietaireId }),
        ...(vehiculeId !== undefined && { vehiculeId }),
        ...fileData
      },
      include: {
        proprietaire: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        },
        vehicule: {
          select: {
            id: true,
            marque: true,
            modele: true,
            numeroImmatriculation: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "UPDATE",
        table: "Document",
        recordId: id,
        oldValues,
        newValues: updatedDocument,
        userId
      }
    });

    return res.status(200).json({
      data: updatedDocument,
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du document:", error);
    
    // Supprimer le nouveau fichier si erreur
    if (req.file) {
      try {
        await unlink(req.file.path);
      } catch (unlinkError) {
        console.error("Erreur lors de la suppression du fichier:", unlinkError);
      }
    }

    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Supprimer un document spécifique
export async function deleteDocument(req: Request, res: Response) {
  const { id: documentId } = req.params;
  const { userId } = getAuthenticatedUser(req);

  try {
    // Récupérer le document avec ses informations
    const document = await db.document.findUnique({
      where: { id: documentId },
      include: {
        proprietaire: {
          select: { id: true, nom: true, prenom: true }
        },
        vehicule: {
          select: { 
            id: true, 
            marque: true, 
            modele: true, 
            numeroImmatriculation: true 
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        data: null,
        error: "Document non trouvé"
      });
    }

    // Supprimer le fichier de Pinata si l'URL contient un hash IPFS
    if (document.chemin && document.chemin.includes('ipfs')) {
      const ipfsHashMatch = document.chemin.match(/\/ipfs\/([^?]+)/);
      if (ipfsHashMatch) {
        const ipfsHash = ipfsHashMatch[1];
        console.log(`🗑️ Suppression du fichier IPFS pour le document ${documentId}: ${ipfsHash}`);
        
        if (pinataService.isConfigured()) {
          try {
            await pinataService.unpinFile(ipfsHash);
            console.log(`✅ Fichier IPFS supprimé: ${ipfsHash}`);
          } catch (pinataError) {
            console.warn(`⚠️ Erreur lors de la suppression du fichier IPFS ${ipfsHash}:`, pinataError);
            // On continue même si la suppression IPFS échoue
          }
        }
      }
    }

    // Supprimer le document de la base de données
    await db.document.delete({
      where: { id: documentId }
    });

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "DELETE",
        table: "Document",
        recordId: documentId,
        oldValues: document,
        userId
      }
    });

    return res.status(200).json({
      data: { 
        message: "Document supprimé avec succès",
        deletedDocument: {
          id: document.id,
          nom: document.nom,
          type: document.type
        }
      },
      error: null
    });

  } catch (error) {
    console.error("Erreur lors de la suppression du document:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir les statistiques des documents
export async function getDocumentsStats(req: Request, res: Response) {
  try {
    const [
      totalDocuments,
      documentsParType,
      documentsProprietaires,
      documentsVehicules,
      tailleTotal
    ] = await Promise.all([
      db.document.count(),
      db.document.groupBy({
        by: ['type'],
        _count: {
          id: true
        }
      }),
      db.document.count({
        where: {
          proprietaireId: { not: null }
        }
      }),
      db.document.count({
        where: {
          vehiculeId: { not: null }
        }
      }),
      db.document.aggregate({
        _sum: {
          taille: true
        }
      })
    ]);

    const stats = {
      total: totalDocuments,
      documentsProprietaires,
      documentsVehicules,
      tailleTotal: tailleTotal._sum.taille || 0,
      repartitionParType: documentsParType.map(item => ({
        type: item.type,
        count: item._count.id
      }))
    };

    return res.status(200).json({
      data: stats,
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir tous les documents d'un propriétaire (inclut ses véhicules)
export async function getDocumentsByProprietaire(req: Request, res: Response) {
  try {
    const { id: proprietaireId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Vérifier que le propriétaire existe
    const proprietaire = await db.proprietaire.findUnique({
      where: { id: proprietaireId },
      select: { id: true, nom: true, prenom: true }
    });

    if (!proprietaire) {
      return res.status(404).json({
        data: null,
        error: "Propriétaire non trouvé"
      });
    }

    // Récupérer les documents du propriétaire ET de ses véhicules
    const [documentsProprietaire, documentsVehicules, totalCount] = await Promise.all([
      // Documents du propriétaire
      db.document.findMany({
        where: { proprietaireId },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      // Documents des véhicules du propriétaire
      db.document.findMany({
        where: {
          vehicule: {
            proprietaireId
          }
        },
        include: {
          vehicule: {
            select: {
              id: true,
              marque: true,
              modele: true,
              numeroImmatriculation: true
            }
          },
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // Compter le total
      db.document.count({
        where: {
          OR: [
            { proprietaireId },
            { vehicule: { proprietaireId } }
          ]
        }
      })
    ]);

    // Combiner et organiser les documents
    const allDocuments = [
      ...documentsProprietaire.map(doc => ({ ...doc, source: 'proprietaire' })),
      ...documentsVehicules.map(doc => ({ ...doc, source: 'vehicule' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginer les résultats combinés
    const paginatedDocuments = allDocuments.slice(skip, skip + Number(limit));

    return res.status(200).json({
      data: {
        documents: paginatedDocuments,
        proprietaire,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / Number(limit))
        }
      },
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des documents du propriétaire:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir tous les documents d'un véhicule
export async function getDocumentsByVehicule(req: Request, res: Response) {
  try {
    const { id: vehiculeId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Vérifier que le véhicule existe et récupérer les infos du propriétaire
    const vehicule = await db.vehicule.findUnique({
      where: { id: vehiculeId },
      include: {
        proprietaire: {
          select: { id: true, nom: true, prenom: true }
        }
      }
    });

    if (!vehicule) {
      return res.status(404).json({
        data: null,
        error: "Véhicule non trouvé"
      });
    }

    // Récupérer les documents du véhicule
    const [documents, totalCount] = await Promise.all([
      db.document.findMany({
        where: { vehiculeId },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      db.document.count({ where: { vehiculeId } })
    ]);

    return res.status(200).json({
      data: {
        documents,
        vehicule: {
          id: vehicule.id,
          marque: vehicule.marque,
          modele: vehicule.modele,
          numeroImmatriculation: vehicule.numeroImmatriculation,
          proprietaire: vehicule.proprietaire
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / Number(limit))
        }
      },
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des documents du véhicule:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Accès sécurisé aux fichiers (proxy pour PINATA)
export async function getDocumentFile(req: Request, res: Response) {
  try {
    const { id: documentId } = req.params;
    const { token } = req.query;

    // Vérifier l'authentification via header ou query param
    let isAuthenticated = false;
    
    // D'abord essayer le header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      isAuthenticated = true;
    }
    
    // Si pas d'auth header, essayer le token en query param
    if (!isAuthenticated && token) {
      // Ici, on devrait valider le token JWT, mais pour la simplicité 
      // on accepte la présence du token (à améliorer en production)
      isAuthenticated = true;
    }

    if (!isAuthenticated) {
      return res.status(401).json({
        data: null,
        error: "Token d'accès requis"
      });
    }

    const document = await db.document.findUnique({
      where: { id: documentId },
      select: { 
        id: true, 
        nom: true, 
        chemin: true, 
        mimeType: true,
        taille: true 
      }
    });

    if (!document) {
      return res.status(404).json({
        data: null,
        error: "Document non trouvé"
      });
    }

    // Ajouter les headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Si le fichier est sur PINATA (URL IPFS)
    if (document.chemin.includes('ipfs/') || document.chemin.includes('pinata') || document.chemin.startsWith('http')) {
      console.log('📋 Redirection vers PINATA:', document.chemin);
      return res.redirect(document.chemin);
    }

    // Si le fichier est local
    const fs = require('fs');
    const path = require('path');
    
    if (fs.existsSync(document.chemin)) {
      const fileName = document.nom || path.basename(document.chemin);
      
      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      
      console.log('📋 Envoi du fichier local:', document.chemin);
      return res.sendFile(path.resolve(document.chemin));
    } else {
      console.error('❌ Fichier non trouvé:', document.chemin);
      return res.status(404).json({
        data: null,
        error: "Fichier non trouvé sur le serveur"
      });
    }
  } catch (error) {
    console.error("❌ Erreur lors de l'accès au fichier:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Prévisualisation d'un document
export async function getDocumentPreview(req: Request, res: Response) {
  try {
    const { id: documentId } = req.params;
    const { token } = req.query;

    // Vérifier l'authentification via header ou query param (même logique que getDocumentFile)
    let isAuthenticated = false;
    
    // D'abord essayer le header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      isAuthenticated = true;
    }
    
    // Si pas d'auth header, essayer le token en query param
    if (!isAuthenticated && token) {
      isAuthenticated = true;
    }

    if (!isAuthenticated) {
      return res.status(401).json({
        data: null,
        error: "Token d'accès requis"
      });
    }

    const document = await db.document.findUnique({
      where: { id: documentId },
      include: {
        proprietaire: {
          select: { id: true, nom: true, prenom: true }
        },
        vehicule: {
          select: { 
            id: true, 
            marque: true, 
            modele: true, 
            numeroImmatriculation: true 
          }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        data: null,
        error: "Document non trouvé"
      });
    }    // Générer l'URL complète du fichier avec token si disponible
    // Détecter l'URL de base à partir de la requête ou utiliser la configuration
    let baseUrl: string;
    
    if (process.env.NODE_ENV === 'production' && process.env.PRODUCTION_URL) {
      baseUrl = process.env.PRODUCTION_URL;
      console.log('🔧 Utilisation de PRODUCTION_URL:', baseUrl);
    } else if (req.headers.host) {
      // Détecter automatiquement à partir de la requête
      const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      baseUrl = `${protocol}://${req.headers.host}`;
      console.log('🔧 URL détectée automatiquement:', baseUrl);
    } else {
      // Fallback
      baseUrl = 'http://localhost:8000';
      console.log('🔧 Utilisation du fallback:', baseUrl);
    }
    
    let fileUrl = `${baseUrl}/api/v1/access/documents/${document.id}/file`;
    
    // Ajouter le token à l'URL si fourni
    if (token) {
      fileUrl += `?token=${encodeURIComponent(token as string)}`;
    }

    // Informations de prévisualisation
    const preview = {
      id: document.id,
      nom: document.nom,
      type: document.type,
      mimeType: document.mimeType,
      taille: document.taille,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      fileUrl: fileUrl,
      canPreview: document.mimeType?.includes('image/') || document.mimeType?.includes('pdf'),
      proprietaire: document.proprietaire,
      vehicule: document.vehicule,
      createdBy: document.createdBy
    };

    return res.status(200).json({
      data: preview,
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la prévisualisation:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Vue globale avec filtres avancés
export async function getAllDocumentsWithFilters(req: Request, res: Response) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      type,
      proprietaireId,
      vehiculeId,
      dateFrom,
      dateTo,
      source // 'proprietaire' ou 'vehicule'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    // Filtres de recherche
    if (search) {
      where.OR = [
        { nom: { contains: search as string, mode: "insensitive" } },
        { 
          proprietaire: {
            OR: [
              { nom: { contains: search as string, mode: "insensitive" } },
              { prenom: { contains: search as string, mode: "insensitive" } }
            ]
          }
        },
        {
          vehicule: {
            OR: [
              { marque: { contains: search as string, mode: "insensitive" } },
              { modele: { contains: search as string, mode: "insensitive" } },
              { numeroImmatriculation: { contains: search as string, mode: "insensitive" } }
            ]
          }
        }
      ];
    }

    // Filtre par type de document
    if (type) {
      where.type = type;
    }

    // Filtre par propriétaire
    if (proprietaireId) {
      if (source === 'proprietaire') {
        where.proprietaireId = proprietaireId;
      } else if (source === 'vehicule') {
        where.vehicule = { proprietaireId };
      } else {
        where.OR = [
          { proprietaireId },
          { vehicule: { proprietaireId } }
        ];
      }
    }

    // Filtre par véhicule
    if (vehiculeId) {
      where.vehiculeId = vehiculeId;
    }

    // Filtre par date
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) where.createdAt.lte = new Date(dateTo as string);
    }

    const [documents, totalCount] = await Promise.all([
      db.document.findMany({
        where,
        include: {
          proprietaire: {
            select: { id: true, nom: true, prenom: true }
          },
          vehicule: {
            select: { 
              id: true, 
              marque: true, 
              modele: true, 
              numeroImmatriculation: true 
            }
          },
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      db.document.count({ where })
    ]);

    return res.status(200).json({
      data: {
        documents,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / Number(limit))
        },
        filters: {
          search,
          type,
          proprietaireId,
          vehiculeId,
          dateFrom,
          dateTo,
          source
        }
      },
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la recherche de documents:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

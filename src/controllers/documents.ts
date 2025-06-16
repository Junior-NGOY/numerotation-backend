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
    vehiculeId  } = req.body;
  
  const { userId: createdById } = getAuthenticatedUser(req);

  try {
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
          }

          console.log('✅ Fichier uploadé vers PINATA:', pinataUrl);        } else {
          // Fallback vers stockage local
          console.log('💾 Stockage local (PINATA non configuré)');
          documentData = {
            chemin: req.file.path,
            taille: req.file.size,
            mimeType: req.file.mimetype
          };
        }
      } catch (pinataError) {        console.error('❌ Erreur PINATA, fallback vers stockage local:', pinataError);
        // Fallback vers stockage local en cas d'erreur PINATA
        documentData = {
          chemin: req.file.path,
          taille: req.file.size,
          mimeType: req.file.mimetype
        };
      }
    } else {
      return res.status(400).json({
        data: null,
        error: "Aucun fichier fourni"
      });
    }    const newDocument = await db.document.create({
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

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "CREATE",
        table: "Document",
        recordId: newDocument.id,
        newValues: newDocument,
        userId: createdById
      }
    });

    return res.status(201).json({
      data: newDocument,
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

// Supprimer un document
export async function deleteDocument(req: Request, res: Response) {  const { id } = req.params;
  
  const { userId } = getAuthenticatedUser(req);

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

    // Supprimer le fichier physique
    try {
      await unlink(document.chemin);
    } catch (unlinkError) {
      console.error("Erreur lors de la suppression du fichier:", unlinkError);
      // Continue même si la suppression du fichier échoue
    }

    await db.document.delete({
      where: { id }
    });

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "DELETE",
        table: "Document",
        recordId: id,
        oldValues: document,
        userId
      }
    });

    return res.status(200).json({
      data: { message: "Document supprimé avec succès" },
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

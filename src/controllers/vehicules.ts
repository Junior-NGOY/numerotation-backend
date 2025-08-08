import { db } from "@/db/db";
import { Request, Response } from "express";
import { unlink } from "fs/promises";
import { getAuthenticatedUser } from "@/types";
import { generateUniqueVehiculeCode } from "@/utils/generateSlug";
import { calculateRegistrationPrice } from "@/utils/pricingUtils";
import { pinataService } from "@/services/pinata";

// Créer un véhicule
export async function createVehicule(req: Request, res: Response) {
  const {
    marque,
    modele,
    typeVehicule,
    numeroImmatriculation,
    numeroChassis,
    anneeFabrication,
    capaciteAssises,
    itineraireId,
    codeUnique: providedCodeUnique,
    anneeEnregistrement,
    proprietaireId  } = req.body;
  
  const { userId: createdById } = getAuthenticatedUser(req);

  try {
    // Vérification supplémentaire : s'assurer que proprietaireId est fourni
    if (!proprietaireId) {
      return res.status(400).json({
        data: null,
        error: "L'ID du propriétaire est obligatoire"
      });
    }

    // Vérifier si le propriétaire existe
    const existingProprietaire = await db.proprietaire.findUnique({
      where: { id: proprietaireId }
    });

    if (!existingProprietaire) {
      return res.status(404).json({
        data: null,
        error: "Propriétaire non trouvé"
      });
    }

    // Utiliser l'année courante si anneeEnregistrement n'est pas fournie
    const finalAnneeEnregistrement = anneeEnregistrement || new Date().getFullYear();

    // Générer un code unique avec extraction aléatoire si non fourni
    let codeUnique = providedCodeUnique;
    if (!codeUnique) {
      // Fonction pour vérifier l'unicité du code
      const checkCodeUniqueness = async (code: string): Promise<boolean> => {
        const existing = await db.vehicule.findUnique({
          where: { codeUnique: code }
        });
        return !existing; // Retourne true si le code est unique (pas trouvé)
      };

      // Générer un code unique avec extraction aléatoire des 6 premiers caractères
      codeUnique = await generateUniqueVehiculeCode(
        numeroImmatriculation,
        finalAnneeEnregistrement, // Utiliser l'année d'enregistrement plutôt que l'année de fabrication
        checkCodeUniqueness
      );
    }
    // Vérifier si le propriétaire existe
    const proprietaire = await db.proprietaire.findUnique({
      where: { id: proprietaireId }
    });

    if (!proprietaire) {
      return res.status(404).json({
        data: null,
        error: "Propriétaire non trouvé"
      });
    }    // Vérifier l'unicité des identifiants du véhicule (sauf le code unique déjà vérifié)
    const [existingImmatriculation, existingChassis] = await Promise.all([
      db.vehicule.findUnique({ where: { numeroImmatriculation } }),
      db.vehicule.findUnique({ where: { numeroChassis } })
    ]);

    if (existingImmatriculation) {
      return res.status(409).json({
        data: null,
        error: "Ce numéro d'immatriculation existe déjà"
      });
    }

    if (existingChassis) {
      return res.status(409).json({
        data: null,
        error: "Ce numéro de châssis existe déjà"
      });
    }

    // Vérifier le code unique seulement s'il a été fourni manuellement
    if (providedCodeUnique) {
      const existingCodeUnique = await db.vehicule.findUnique({ where: { codeUnique } });
      if (existingCodeUnique) {
        return res.status(409).json({
          data: null,
          error: "Ce code unique existe déjà"
        });
      }
    }    // Calculer le prix d'enregistrement automatiquement selon le type de véhicule
    const prixEnregistrement = calculateRegistrationPrice(typeVehicule);

    const newVehicule = await db.vehicule.create({
      data: {
        marque,
        modele,
        typeVehicule,
        numeroImmatriculation,
        numeroChassis,
        anneeFabrication,
        capaciteAssises,
        itineraireId,
        codeUnique,
        anneeEnregistrement: finalAnneeEnregistrement,
        prixEnregistrement,
        proprietaireId,
        createdById
      },
      include: {
        proprietaire: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            adresse: true,
            telephone: true,
            numeroPiece: true,
            typePiece: true,
            lieuDelivrance: true,
            dateDelivrance: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            documents: true
          }
        }
      }
    });

    // Traitement des fichiers uploadés (s'il y en a)
    const uploadedDocuments = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      console.log(`📎 ${req.files.length} fichier(s) détecté(s) pour le véhicule ${newVehicule.id}`);
      
      for (const file of req.files) {
        try {
          let documentData: any = {};
          
          // Upload vers PINATA si configuré
          if (pinataService.isConfigured()) {
            console.log('📤 Upload vers PINATA:', file.filename);
            const pinataResult = await pinataService.uploadFile(
              file.path,
              file.filename,
              {
                type: 'CARTE_ROSE', // Type par défaut pour les véhicules
                vehiculeId: newVehicule.id,
                uploadedBy: createdById
              }
            );

            const pinataUrl = pinataService.generateFileUrl(pinataResult.IpfsHash);
            documentData = {
              chemin: pinataUrl,
              taille: file.size,
              mimeType: file.mimetype
            };

            // Supprimer le fichier local après upload réussi
            try {
              await unlink(file.path);
              console.log('🗑️ Fichier local supprimé après upload PINATA');
            } catch (unlinkError) {
              console.warn('⚠️ Impossible de supprimer le fichier local:', unlinkError);
            }

            console.log('✅ Fichier uploadé vers PINATA:', pinataUrl);
          } else {
            console.warn('⚠️ PINATA non configuré, impossible d\'uploader le fichier');
            continue; // Passer au fichier suivant
          }

          // Créer le document en base de données
          const document = await db.document.create({
            data: {
              nom: file.originalname,
              type: 'CARTE_ROSE', // Type par défaut pour les véhicules
              vehiculeId: newVehicule.id,
              createdById,
              ...documentData
            }
          });

          uploadedDocuments.push(document);
          console.log('💾 Document créé en base:', document.id);

        } catch (fileError: any) {
          console.error('❌ Erreur lors du traitement du fichier:', file.filename, fileError);
          
          // Supprimer le fichier local en cas d'erreur
          try {
            await unlink(file.path);
          } catch (unlinkError) {
            console.error('Erreur lors de la suppression du fichier:', unlinkError);
          }
          
          // Continuer avec les autres fichiers plutôt que d'échouer complètement
        }
      }
      
      if (uploadedDocuments.length > 0) {
        console.log(`✅ ${uploadedDocuments.length} document(s) uploadé(s) avec succès pour le véhicule ${newVehicule.id}`);
      }
    }

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "CREATE",
        table: "Vehicule",
        recordId: newVehicule.id,
        newValues: { ...newVehicule, uploadedDocuments: uploadedDocuments.length },
        userId: createdById
      }
    });

    return res.status(201).json({
      data: {
        ...newVehicule,
        uploadedDocuments: uploadedDocuments.length
      },
      error: null
    });
  } catch (error) {
    console.error("❌ Erreur lors de la création du véhicule:", error);
    
    // Nettoyage des fichiers en cas d'erreur
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        try {
          await unlink(file.path);
          console.log('🗑️ Fichier temporaire supprimé:', file.filename);
        } catch (unlinkError) {
          console.error('⚠️ Impossible de supprimer le fichier temporaire:', file.filename);
        }
      }
    }
    
    // Gestion d'erreurs spécifiques
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return res.status(409).json({
          data: null,
          error: "Un véhicule avec ces identifiants existe déjà"
        });
      }
      
      if (error.message.includes('Foreign key constraint')) {
        return res.status(400).json({
          data: null,
          error: "Données de référence invalides (propriétaire ou itinéraire)"
        });
      }
    }
    
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur lors de la création du véhicule"
    });
  }
}

// Obtenir tous les véhicules
export async function getVehicules(req: Request, res: Response) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      typeVehicule,
      proprietaireId,
      anneeFabrication
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    // Recherche par marque, modèle, immatriculation ou propriétaire
    if (search) {
      where.OR = [
        { marque: { contains: search as string, mode: "insensitive" } },
        { modele: { contains: search as string, mode: "insensitive" } },
        { numeroImmatriculation: { contains: search as string, mode: "insensitive" } },
        { numeroChassis: { contains: search as string, mode: "insensitive" } },
        { codeUnique: { contains: search as string, mode: "insensitive" } },
        { 
          proprietaire: {
            OR: [
              { nom: { contains: search as string, mode: "insensitive" } },
              { prenom: { contains: search as string, mode: "insensitive" } }
            ]
          }
        }
      ];
    }

    if (typeVehicule) {
      where.typeVehicule = typeVehicule;
    }

    if (proprietaireId) {
      where.proprietaireId = proprietaireId;
    }

    if (anneeFabrication) {
      where.anneeFabrication = parseInt(anneeFabrication as string);
    }

    const [vehicules, total] = await Promise.all([
      db.vehicule.findMany({
        where,
        include: {
          proprietaire: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              adresse: true,
              telephone: true,
              numeroPiece: true,
              typePiece: true,
              lieuDelivrance: true,
              dateDelivrance: true
            }
          },
          itineraire: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              documents: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" }
      }),
      db.vehicule.count({ where })
    ]);    return res.status(200).json({
      data: {
        items: vehicules,  // Changé de "vehicules" à "items" pour cohérence
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
    console.error("Erreur lors de la récupération des véhicules:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir un véhicule par ID
export async function getVehiculeById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const vehicule = await db.vehicule.findUnique({
      where: { id },
      include: {
        proprietaire: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            adresse: true,
            telephone: true,
            numeroPiece: true,
            typePiece: true,
            lieuDelivrance: true,
            dateDelivrance: true,
            createdAt: true,
            updatedAt: true
          }
        },
        itineraire: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        documents: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            documents: true
          }
        }
      }
    });

    if (!vehicule) {
      return res.status(404).json({
        data: null,
        error: "Véhicule non trouvé"
      });
    }

    return res.status(200).json({
      data: vehicule,
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du véhicule:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Mettre à jour un véhicule
export async function updateVehicule(req: Request, res: Response) {
  const { id } = req.params;
  const {
    marque,
    modele,
    typeVehicule,
    numeroImmatriculation,
    numeroChassis,
    anneeFabrication,
    capaciteAssises,
    itineraireId,
    codeUnique,
    anneeEnregistrement,
    proprietaireId  } = req.body;
  
  const { userId } = getAuthenticatedUser(req);

  try {
    const existingVehicule = await db.vehicule.findUnique({
      where: { id }
    });

    if (!existingVehicule) {
      return res.status(404).json({
        data: null,
        error: "Véhicule non trouvé"
      });
    }

    // Vérifier le propriétaire si changé
    if (proprietaireId && proprietaireId !== existingVehicule.proprietaireId) {
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

    // Vérifier l'unicité des identifiants modifiés
    const checks = [];
    if (numeroImmatriculation && numeroImmatriculation !== existingVehicule.numeroImmatriculation) {
      checks.push(
        db.vehicule.findUnique({ where: { numeroImmatriculation } })
          .then(result => ({ type: 'immatriculation', exists: !!result }))
      );
    }
    if (numeroChassis && numeroChassis !== existingVehicule.numeroChassis) {
      checks.push(
        db.vehicule.findUnique({ where: { numeroChassis } })
          .then(result => ({ type: 'chassis', exists: !!result }))
      );
    }
    if (codeUnique && codeUnique !== existingVehicule.codeUnique) {
      checks.push(
        db.vehicule.findUnique({ where: { codeUnique } })
          .then(result => ({ type: 'code', exists: !!result }))
      );
    }

    const results = await Promise.all(checks);
    const conflicts = results.filter(r => r.exists);

    if (conflicts.length > 0) {
      const conflictTypes = {
        immatriculation: "Ce numéro d'immatriculation existe déjà",
        chassis: "Ce numéro de châssis existe déjà",
        code: "Ce code unique existe déjà"
      };
      
      return res.status(409).json({
        data: null,
        error: conflictTypes[conflicts[0].type as keyof typeof conflictTypes]
      });
    }    const oldValues = {
      marque: existingVehicule.marque,
      modele: existingVehicule.modele,
      typeVehicule: existingVehicule.typeVehicule,
      numeroImmatriculation: existingVehicule.numeroImmatriculation,
      numeroChassis: existingVehicule.numeroChassis,
      anneeFabrication: existingVehicule.anneeFabrication,
      capaciteAssises: existingVehicule.capaciteAssises,
      itineraireId: existingVehicule.itineraireId,
      codeUnique: existingVehicule.codeUnique,
      anneeEnregistrement: existingVehicule.anneeEnregistrement,
      prixEnregistrement: existingVehicule.prixEnregistrement,
      proprietaireId: existingVehicule.proprietaireId
    };

    // Recalculer le prix si le type de véhicule change
    const finalTypeVehicule = typeVehicule || existingVehicule.typeVehicule;
    const prixEnregistrement = typeVehicule ? calculateRegistrationPrice(typeVehicule) : existingVehicule.prixEnregistrement;

    const updatedVehicule = await db.vehicule.update({
      where: { id },
      data: {
        ...(marque && { marque }),
        ...(modele && { modele }),
        ...(typeVehicule && { typeVehicule, prixEnregistrement }),
        ...(numeroImmatriculation && { numeroImmatriculation }),
        ...(numeroChassis && { numeroChassis }),        ...(anneeFabrication && { anneeFabrication }),
        ...(capaciteAssises && { capaciteAssises }),
        ...(itineraireId && { itineraireId }),
        ...(codeUnique && { codeUnique }),
        ...(anneeEnregistrement && { anneeEnregistrement }),
        ...(proprietaireId && { proprietaireId })
      },
      include: {
        proprietaire: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            adresse: true,
            telephone: true,
            numeroPiece: true,
            typePiece: true,
            lieuDelivrance: true,
            dateDelivrance: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            documents: true
          }
        }
      }
    });

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "UPDATE",
        table: "Vehicule",
        recordId: id,
        oldValues,
        newValues: updatedVehicule,
        userId
      }
    });

    return res.status(200).json({
      data: updatedVehicule,
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du véhicule:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Supprimer un véhicule
export async function deleteVehicule(req: Request, res: Response) {  const { id } = req.params;
  
  const { userId } = getAuthenticatedUser(req);

  try {
    const vehicule = await db.vehicule.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            documents: true
          }
        }
      }
    });

    if (!vehicule) {
      return res.status(404).json({
        data: null,
        error: "Véhicule non trouvé"
      });
    }

    await db.vehicule.delete({
      where: { id }
    });

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "DELETE",
        table: "Vehicule",
        recordId: id,
        oldValues: vehicule,
        userId
      }
    });

    return res.status(200).json({
      data: { message: "Véhicule supprimé avec succès" },
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du véhicule:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir les statistiques des véhicules
export async function getVehiculesStats(req: Request, res: Response) {
  try {
    const [
      totalVehicules,
      repartitionTypeVehicule,
      vehiculesParAnnee,
      vehiculesAvecDocuments,
      vehiculesSansDocuments
    ] = await Promise.all([
      db.vehicule.count(),
      db.vehicule.groupBy({
        by: ['typeVehicule'],
        _count: {
          id: true
        }
      }),
      db.vehicule.groupBy({
        by: ['anneeFabrication'],
        _count: {
          id: true
        },
        orderBy: {
          anneeFabrication: 'desc'
        },
        take: 10
      }),
      db.vehicule.count({
        where: {
          documents: {
            some: {}
          }
        }
      }),
      db.vehicule.count({
        where: {
          documents: {
            none: {}
          }
        }
      })
    ]);

    const stats = {
      total: totalVehicules,
      avecDocuments: vehiculesAvecDocuments,
      sansDocuments: vehiculesSansDocuments,
      repartitionTypeVehicule: repartitionTypeVehicule.map(item => ({
        type: item.typeVehicule,
        count: item._count.id
      })),
      vehiculesParAnnee: vehiculesParAnnee.map(item => ({
        annee: item.anneeFabrication,
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

// Recherche de véhicules par code unique ou immatriculation
export async function searchVehicule(req: Request, res: Response) {
  const { query } = req.params;

  try {
    const vehicule = await db.vehicule.findFirst({
      where: {
        OR: [
          { codeUnique: query },
          { numeroImmatriculation: query },
          { numeroChassis: query }
        ]
      },
      include: {
        proprietaire: true,
        documents: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!vehicule) {
      return res.status(404).json({
        data: null,
        error: "Véhicule non trouvé"
      });
    }

    return res.status(200).json({
      data: vehicule,
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la recherche du véhicule:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Récupérer tous les véhicules d'un propriétaire spécifique
export async function getVehiculesByProprietaireId(req: Request, res: Response) {
  const { proprietaireId } = req.params;
  const { 
    page = 1, 
    limit = 10, 
    search 
  } = req.query;

  try {
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

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { proprietaireId };

    // Recherche dans les véhicules du propriétaire
    if (search) {
      where.OR = [
        { marque: { contains: search as string, mode: "insensitive" } },
        { modele: { contains: search as string, mode: "insensitive" } },
        { numeroImmatriculation: { contains: search as string, mode: "insensitive" } },
        { numeroChassis: { contains: search as string, mode: "insensitive" } },
        { codeUnique: { contains: search as string, mode: "insensitive" } }
      ];
    }

    const [vehicules, total] = await Promise.all([
      db.vehicule.findMany({
        where,
        include: {
          proprietaire: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              adresse: true,
              telephone: true,
              numeroPiece: true,
              typePiece: true,
              lieuDelivrance: true,
              dateDelivrance: true
            }
          },
          itineraire: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              documents: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" }
      }),
      db.vehicule.count({ where })
    ]);

    return res.status(200).json({
      data: {
        items: vehicules,
        proprietaire: proprietaire,
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
    console.error("Erreur lors de la récupération des véhicules du propriétaire:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

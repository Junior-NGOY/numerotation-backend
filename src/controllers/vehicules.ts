import { db } from "@/db/db";
import { Request, Response } from "express";
import { getAuthenticatedUser } from "@/types";
import { generateSequentialVehiculeCode, getNextVehicleSequence } from "@/utils/generateSlug";
import { calculateRegistrationPrice } from "@/utils/pricingUtils";

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
    itineraire,
    codeUnique: providedCodeUnique,
    anneeEnregistrement,
    proprietaireId  } = req.body;
  
  const { userId: createdById } = getAuthenticatedUser(req);  try {
    // Utiliser l'année courante si anneeEnregistrement n'est pas fournie
    const finalAnneeEnregistrement = anneeEnregistrement || new Date().getFullYear();    // Générer un code unique séquentiel si non fourni
    let codeUnique = providedCodeUnique;
    if (!codeUnique) {
      const nextSequence = await getNextVehicleSequence(finalAnneeEnregistrement, numeroImmatriculation);
      codeUnique = generateSequentialVehiculeCode(finalAnneeEnregistrement, nextSequence, numeroImmatriculation);
      
      // Vérifier que le code généré n'existe pas déjà (sécurité supplémentaire)
      const existingVehicle = await db.vehicule.findUnique({ where: { codeUnique } });
      if (existingVehicle) {
        return res.status(500).json({
          data: null,
          error: "Conflit de génération de code unique, veuillez réessayer"
        });
      }
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
        anneeFabrication,        capaciteAssises,
        itineraire,
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
            telephone: true
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
        action: "CREATE",
        table: "Vehicule",
        recordId: newVehicule.id,
        newValues: newVehicule,
        userId: createdById
      }
    });

    return res.status(201).json({
      data: newVehicule,
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la création du véhicule:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
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
        where,        include: {
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
        proprietaire: true,
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
    itineraire,
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
      itineraire: existingVehicule.itineraire,
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
        ...(itineraire && { itineraire }),
        ...(codeUnique && { codeUnique }),
        ...(anneeEnregistrement && { anneeEnregistrement }),        ...(proprietaireId && { proprietaireId })
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

import { db } from "@/db/db";
import { Request, Response } from "express";
import { getAuthenticatedUser } from "@/types";

// Créer un propriétaire
export async function createProprietaire(req: Request, res: Response) {
  const {
    nom,
    prenom,
    adresse,
    telephone,
    numeroPiece,
    typePiece,
    lieuDelivrance,
    dateDelivrance  } = req.body;
  
  const { userId: createdById } = getAuthenticatedUser(req);

  try {
    // Vérifier si le numéro de pièce existe déjà
    const existingProprietaire = await db.proprietaire.findUnique({
      where: { numeroPiece }
    });

    if (existingProprietaire) {
      return res.status(409).json({
        data: null,
        error: "Un propriétaire avec ce numéro de pièce existe déjà"
      });
    }

    const newProprietaire = await db.proprietaire.create({
      data: {
        nom,
        prenom,
        adresse,
        telephone,
        numeroPiece,
        typePiece,
        lieuDelivrance,
        dateDelivrance: new Date(dateDelivrance),
        createdById
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            vehicules: true,
            documents: true
          }
        }
      }
    });

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "CREATE",
        table: "Proprietaire",
        recordId: newProprietaire.id,
        newValues: newProprietaire,
        userId: createdById
      }
    });

    return res.status(201).json({
      data: newProprietaire,
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la création du propriétaire:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir tous les propriétaires
export async function getProprietaires(req: Request, res: Response) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      typePiece 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    // Recherche par nom, prénom ou numéro de pièce
    if (search) {
      where.OR = [
        { nom: { contains: search as string, mode: "insensitive" } },
        { prenom: { contains: search as string, mode: "insensitive" } },
        { numeroPiece: { contains: search as string, mode: "insensitive" } },
        { telephone: { contains: search as string, mode: "insensitive" } }
      ];
    }

    if (typePiece) {
      where.typePiece = typePiece;
    }

    const [proprietaires, total] = await Promise.all([
      db.proprietaire.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              vehicules: true,
              documents: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" }
      }),
      db.proprietaire.count({ where })
    ]);    return res.status(200).json({
      data: {
        items: proprietaires,  // Changé de "proprietaires" à "items" pour cohérence
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
    console.error("Erreur lors de la récupération des propriétaires:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir un propriétaire par ID
export async function getProprietaireById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const proprietaire = await db.proprietaire.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        vehicules: {
          include: {
            _count: {
              select: {
                documents: true
              }
            }
          }
        },
        documents: true,
        _count: {
          select: {
            vehicules: true,
            documents: true
          }
        }
      }
    });

    if (!proprietaire) {
      return res.status(404).json({
        data: null,
        error: "Propriétaire non trouvé"
      });
    }

    return res.status(200).json({
      data: proprietaire,
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du propriétaire:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Mettre à jour un propriétaire
export async function updateProprietaire(req: Request, res: Response) {
  const { id } = req.params;
  const {
    nom,
    prenom,
    adresse,
    telephone,
    numeroPiece,
    typePiece,
    lieuDelivrance,
    dateDelivrance  } = req.body;
  
  const { userId } = getAuthenticatedUser(req);

  try {
    const existingProprietaire = await db.proprietaire.findUnique({
      where: { id }
    });

    if (!existingProprietaire) {
      return res.status(404).json({
        data: null,
        error: "Propriétaire non trouvé"
      });
    }

    // Vérifier si le nouveau numéro de pièce est déjà utilisé
    if (numeroPiece && numeroPiece !== existingProprietaire.numeroPiece) {
      const numeroPieceExists = await db.proprietaire.findUnique({
        where: { numeroPiece }
      });

      if (numeroPieceExists) {
        return res.status(409).json({
          data: null,
          error: "Ce numéro de pièce est déjà utilisé"
        });
      }
    }

    const oldValues = {
      nom: existingProprietaire.nom,
      prenom: existingProprietaire.prenom,
      adresse: existingProprietaire.adresse,
      telephone: existingProprietaire.telephone,
      numeroPiece: existingProprietaire.numeroPiece,
      typePiece: existingProprietaire.typePiece,
      lieuDelivrance: existingProprietaire.lieuDelivrance,
      dateDelivrance: existingProprietaire.dateDelivrance
    };

    const updatedProprietaire = await db.proprietaire.update({
      where: { id },
      data: {
        ...(nom && { nom }),
        ...(prenom && { prenom }),
        ...(adresse && { adresse }),
        ...(telephone && { telephone }),
        ...(numeroPiece && { numeroPiece }),
        ...(typePiece && { typePiece }),
        ...(lieuDelivrance && { lieuDelivrance }),
        ...(dateDelivrance && { dateDelivrance: new Date(dateDelivrance) })
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            vehicules: true,
            documents: true
          }
        }
      }
    });

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "UPDATE",
        table: "Proprietaire",
        recordId: id,
        oldValues,
        newValues: updatedProprietaire,
        userId
      }
    });

    return res.status(200).json({
      data: updatedProprietaire,
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du propriétaire:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Supprimer un propriétaire
export async function deleteProprietaire(req: Request, res: Response) {  const { id } = req.params;
  
  const { userId } = getAuthenticatedUser(req);

  try {
    const proprietaire = await db.proprietaire.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            vehicules: true
          }
        }
      }
    });

    if (!proprietaire) {
      return res.status(404).json({
        data: null,
        error: "Propriétaire non trouvé"
      });
    }

    // Vérifier s'il a des véhicules
    if (proprietaire._count.vehicules > 0) {
      return res.status(400).json({
        data: null,
        error: "Impossible de supprimer ce propriétaire car il possède des véhicules"
      });
    }

    await db.proprietaire.delete({
      where: { id }
    });

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "DELETE",
        table: "Proprietaire",
        recordId: id,
        oldValues: proprietaire,
        userId
      }
    });

    return res.status(200).json({
      data: { message: "Propriétaire supprimé avec succès" },
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du propriétaire:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir les statistiques des propriétaires
export async function getProprietairesStats(req: Request, res: Response) {
  try {
    const [
      totalProprietaires,
      proprietairesAvecVehicules,
      proprietairesSansVehicules,
      repartitionTypePiece
    ] = await Promise.all([
      db.proprietaire.count(),
      db.proprietaire.count({
        where: {
          vehicules: {
            some: {}
          }
        }
      }),
      db.proprietaire.count({
        where: {
          vehicules: {
            none: {}
          }
        }
      }),
      db.proprietaire.groupBy({
        by: ['typePiece'],
        _count: {
          id: true
        }
      })
    ]);

    const stats = {
      total: totalProprietaires,
      avecVehicules: proprietairesAvecVehicules,
      sansVehicules: proprietairesSansVehicules,
      repartitionTypePiece: repartitionTypePiece.map(item => ({
        type: item.typePiece,
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

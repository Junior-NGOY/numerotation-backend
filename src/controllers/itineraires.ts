import { db } from "@/db/db";
import { Request, Response } from "express";
import { getAuthenticatedUser } from "@/types";
import { Itineraire } from "@prisma/client";

// Define the interface for the transformed itinerary
interface TransformedItineraire extends Omit<Itineraire, 'duree'> {
  dureeEstimee: number | null;
}

// Helper function to transform itinerary data for frontend compatibility
function transformItineraire(itineraire: any): TransformedItineraire | null {
  if (!itineraire) return null;
  
  const { duree, ...rest } = itineraire;
  return {
    ...rest,
    dureeEstimee: duree
  };
}

// Helper function to transform array of itineraries
function transformItineraires(itineraires: any[]): TransformedItineraire[] {
  return itineraires.map(transformItineraire).filter(Boolean) as TransformedItineraire[];
}

// Créer un itinéraire
export async function createItineraire(req: Request, res: Response) {
  const { nom, description, distance, dureeEstimee, tarif } = req.body;
  const { userId: createdById } = getAuthenticatedUser(req);

  try {
    // Vérifier si l'itinéraire existe déjà
    const existingItineraire = await db.itineraire.findUnique({
      where: { nom }
    });

    if (existingItineraire) {
      return res.status(409).json({
        data: null,
        error: "Un itinéraire avec ce nom existe déjà"
      });
    }    const newItineraire = await db.itineraire.create({
      data: {
        nom,
        description,
        distance: distance ? parseFloat(distance) : null,
        duree: dureeEstimee ? parseInt(dureeEstimee) : null,
        tarif: tarif ? parseInt(tarif) : null,
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
            vehicules: true
          }
        }
      }
    });

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "CREATE",
        table: "Itineraire",
        recordId: newItineraire.id,
        newValues: newItineraire,
        userId: createdById
      }
    });    return res.status(201).json({
      data: transformItineraire(newItineraire),
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la création de l'itinéraire:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir tous les itinéraires
export async function getItineraires(req: Request, res: Response) {
  try {
    const {      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      statut
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Construire les filtres
    const where: any = {};

    if (search) {
      where.OR = [
        { nom: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (statut !== undefined) {
      where.statut = statut as string;
    }

    // Options de tri
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder;

    const [itineraires, total] = await Promise.all([
      db.itineraire.findMany({
        where,
        skip,
        take,
        orderBy,
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
              vehicules: true
            }
          }
        }
      }),
      db.itineraire.count({ where })
    ]);

    const totalPages = Math.ceil(total / take);

    return res.status(200).json({
      data: {
        itineraires: transformItineraires(itineraires),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages
        }
      },
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des itinéraires:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir un itinéraire par ID
export async function getItineraireById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const itineraire = await db.itineraire.findUnique({
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
          select: {
            id: true,
            marque: true,
            modele: true,
            numeroImmatriculation: true,
            proprietaire: {
              select: {
                nom: true,
                prenom: true
              }
            }
          }
        },
        _count: {
          select: {
            vehicules: true
          }
        }
      }
    });

    if (!itineraire) {
      return res.status(404).json({
        data: null,
        error: "Itinéraire non trouvé"
      });
    }

    return res.status(200).json({
      data: transformItineraire(itineraire),
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'itinéraire:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Mettre à jour un itinéraire
export async function updateItineraire(req: Request, res: Response) {
  const { id } = req.params;
  const { nom, description, distance, dureeEstimee, statut } = req.body;
  const { userId: updatedById } = getAuthenticatedUser(req);

  try {
    // Vérifier si l'itinéraire existe
    const existingItineraire = await db.itineraire.findUnique({
      where: { id }
    });

    if (!existingItineraire) {
      return res.status(404).json({
        data: null,
        error: "Itinéraire non trouvé"
      });
    }

    // Vérifier l'unicité du nom si modifié
    if (nom && nom !== existingItineraire.nom) {
      const nameExists = await db.itineraire.findUnique({
        where: { nom }
      });

      if (nameExists) {
        return res.status(409).json({
          data: null,
          error: "Un itinéraire avec ce nom existe déjà"
        });
      }
    }    // Construire les données de mise à jour
    const updateData: any = {};
    if (nom) updateData.nom = nom;
    if (description !== undefined) updateData.description = description;
    if (distance !== undefined) updateData.distance = distance ? parseFloat(distance) : null;
    if (dureeEstimee !== undefined) updateData.duree = dureeEstimee ? parseInt(dureeEstimee) : null;
    if (statut !== undefined) updateData.statut = statut;

    const updatedItineraire = await db.itineraire.update({
      where: { id },
      data: updateData,
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
            vehicules: true
          }
        }
      }
    });

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "UPDATE",
        table: "Itineraire",
        recordId: id,
        oldValues: existingItineraire,
        newValues: updatedItineraire,
        userId: updatedById
      }
    });    return res.status(200).json({
      data: transformItineraire(updatedItineraire),
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'itinéraire:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Supprimer un itinéraire
export async function deleteItineraire(req: Request, res: Response) {
  const { id } = req.params;
  const { userId: deletedById } = getAuthenticatedUser(req);

  try {
    // Vérifier si l'itinéraire existe
    const existingItineraire = await db.itineraire.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            vehicules: true
          }
        }
      }
    });

    if (!existingItineraire) {
      return res.status(404).json({
        data: null,
        error: "Itinéraire non trouvé"
      });
    }

    // Vérifier s'il y a des véhicules associés
    if (existingItineraire._count.vehicules > 0) {
      return res.status(400).json({
        data: null,
        error: `Impossible de supprimer cet itinéraire car ${existingItineraire._count.vehicules} véhicule(s) y sont associé(s)`
      });
    }

    await db.itineraire.delete({
      where: { id }
    });

    // Log d'audit
    await db.auditLog.create({
      data: {
        action: "DELETE",
        table: "Itineraire",
        recordId: id,
        oldValues: existingItineraire,
        userId: deletedById
      }
    });

    return res.status(200).json({
      data: { message: "Itinéraire supprimé avec succès" },
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'itinéraire:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir les statistiques des itinéraires
export async function getItinerairesStats(req: Request, res: Response) {
  try {    const [
      totalItineraires,
      activeItineraires,
      itinerairesWithVehicules,      vehiculesCount
    ] = await Promise.all([
      db.itineraire.count(),
      db.itineraire.count({ where: { statut: 'ACTIF' } }),
      db.itineraire.count({
        where: {
          vehicules: {
            some: {}
          }
        }
      }),
      db.vehicule.count()
    ]);

    // Calculate average vehicles per itinerary
    const avgVehiculesPerItineraire = totalItineraires > 0 ? vehiculesCount / totalItineraires : 0;

    return res.status(200).json({
      data: {
        totalItineraires,
        activeItineraires,
        inactiveItineraires: totalItineraires - activeItineraires,
        itinerairesWithVehicules,
        itinerairesWithoutVehicules: totalItineraires - itinerairesWithVehicules,
        avgVehiculesPerItineraire: Math.round(avgVehiculesPerItineraire * 100) / 100 // Round to 2 decimal places
      },
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

// Obtenir la liste simple des itinéraires actifs (pour les selects)
export async function getActiveItineraires(req: Request, res: Response) {
  try {
    const itineraires = await db.itineraire.findMany({
      where: { statut: 'ACTIF' },
      select: {
        id: true,
        nom: true,
        description: true,
        distance: true,
        duree: true
      },
      orderBy: { nom: 'asc' }
    });    return res.status(200).json({
      data: transformItineraires(itineraires),
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des itinéraires actifs:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

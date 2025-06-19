import { db } from '@/db/db';
import { Request, Response } from 'express';


// Vérifier un véhicule par son code unique (sans authentification)
export async function verifyVehicleByCode(req: Request, res: Response) {
  const { codeUnique } = req.params;

  try {
    // Rechercher le véhicule par code unique
    const vehicule = await db.vehicule.findUnique({
      where: { codeUnique },
      include: {
        proprietaire: {
          select: {
            nom: true,
            prenom: true,
            telephone: true
          }
        },
        itineraire: {
          select: {
            nom: true,
            description: true
          }
        }
      }
    });

    if (!vehicule) {
      return res.status(404).json({
        success: false,
        message: 'Véhicule non trouvé',
        data: null
      });
    }

    // Formater les données pour la réponse
    const vehicleData = {
      codeUnique: vehicule.codeUnique,
      marque: vehicule.marque,
      modele: vehicule.modele,
      typeVehicule: vehicule.typeVehicule,
      numeroImmatriculation: vehicule.numeroImmatriculation,
      anneeFabrication: vehicule.anneeFabrication,
      capaciteAssises: vehicule.capaciteAssises,
      anneeEnregistrement: vehicule.anneeEnregistrement,
      proprietaire: {
        nom: `${vehicule.proprietaire.prenom} ${vehicule.proprietaire.nom}`,
        telephone: vehicule.proprietaire.telephone
      },
      itineraire: {
        nom: vehicule.itineraire?.nom || 'Non spécifié',
        description: vehicule.itineraire?.description || ''
      },
      statut: 'Valide',
      dateVerification: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      message: 'Véhicule vérifié avec succès',
      data: vehicleData
    });

  } catch (error) {
    console.error('Erreur lors de la vérification du véhicule:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      data: null
    });
  }
}

// Obtenir les statistiques de vérification (optionnel)
export async function getVerificationStats(req: Request, res: Response) {
  try {
    const [totalVehicules, vehiculesActifs] = await Promise.all([
      db.vehicule.count(),
      db.vehicule.count({
        where: {
          // Vous pouvez ajouter des critères pour définir un véhicule "actif"
          createdAt: {
            gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
          }
        }
      })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalVehicules,
        vehiculesActifs,
        pourcentageActifs: totalVehicules > 0 ? Math.round((vehiculesActifs / totalVehicules) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      data: null
    });
  }
}

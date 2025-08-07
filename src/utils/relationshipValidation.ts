import { db } from "@/db/db";

/**
 * Fonctions utilitaires pour valider et maintenir l'intégrité des relations
 * entre propriétaires et véhicules
 */

// Valider qu'un véhicule appartient bien à un propriétaire
export async function validateVehiculeOwnership(vehiculeId: string, proprietaireId: string): Promise<boolean> {
  try {
    const vehicule = await db.vehicule.findUnique({
      where: { id: vehiculeId },
      select: { proprietaireId: true }
    });

    return vehicule?.proprietaireId === proprietaireId;
  } catch (error) {
    console.error('Erreur lors de la validation de propriété du véhicule:', error);
    return false;
  }
}

// Compter le nombre de véhicules d'un propriétaire
export async function countVehiculesByProprietaire(proprietaireId: string): Promise<number> {
  try {
    return await db.vehicule.count({
      where: { proprietaireId }
    });
  } catch (error) {
    console.error('Erreur lors du comptage des véhicules:', error);
    return 0;
  }
}

// Vérifier si un propriétaire peut être supprimé (n'a pas de véhicules)
export async function canDeleteProprietaire(proprietaireId: string): Promise<{ canDelete: boolean; vehiculeCount: number }> {
  try {
    const vehiculeCount = await countVehiculesByProprietaire(proprietaireId);
    return {
      canDelete: vehiculeCount === 0,
      vehiculeCount
    };
  } catch (error) {
    console.error('Erreur lors de la vérification de suppression:', error);
    return { canDelete: false, vehiculeCount: 0 };
  }
}

// Transférer tous les véhicules d'un propriétaire à un autre
export async function transferVehicules(fromProprietaireId: string, toProprietaireId: string): Promise<{
  success: boolean;
  transferredCount: number;
  error?: string;
}> {
  try {
    // Vérifier que le propriétaire de destination existe
    const destinationProprietaire = await db.proprietaire.findUnique({
      where: { id: toProprietaireId },
      select: { id: true }
    });

    if (!destinationProprietaire) {
      return {
        success: false,
        transferredCount: 0,
        error: 'Propriétaire de destination non trouvé'
      };
    }

    // Transférer tous les véhicules
    const updateResult = await db.vehicule.updateMany({
      where: { proprietaireId: fromProprietaireId },
      data: { proprietaireId: toProprietaireId }
    });

    return {
      success: true,
      transferredCount: updateResult.count
    };
  } catch (error) {
    console.error('Erreur lors du transfert des véhicules:', error);
    return {
      success: false,
      transferredCount: 0,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

// Obtenir un résumé des relations propriétaire-véhicule
export async function getOwnershipSummary() {
  try {
    const [
      totalProprietaires,
      totalVehicules,
      proprietairesWithVehicules,
      proprietairesWithoutVehicules,
      vehiculesWithoutProprietaire
    ] = await Promise.all([
      db.proprietaire.count(),
      db.vehicule.count(),
      db.proprietaire.count({
        where: { vehicules: { some: {} } }
      }),
      db.proprietaire.count({
        where: { vehicules: { none: {} } }
      }),
      // Note: Avec le schéma actuel, proprietaireId est obligatoire, donc il ne peut pas y avoir de véhicules orphelins
      // Cette métrique reste à 0 par design
      Promise.resolve(0)
    ]);

    return {
      totalProprietaires,
      totalVehicules,
      proprietairesWithVehicules,
      proprietairesWithoutVehicules,
      vehiculesWithoutProprietaire,
      averageVehiclesPerOwner: totalProprietaires > 0 ? totalVehicules / totalProprietaires : 0
    };
  } catch (error) {
    console.error('Erreur lors de la génération du résumé:', error);
    throw error;
  }
}

// Réparer les relations orphelines (véhicules sans propriétaire)
export async function repairOrphanedVehicules(): Promise<{
  success: boolean;
  orphanedCount: number;
  error?: string;
}> {
  try {
    // Avec le schéma Prisma actuel, proprietaireId est obligatoire
    // Il ne peut pas y avoir de véhicules orphelins par design
    // Cette fonction retourne toujours un succès avec 0 véhicules orphelins
    
    return {
      success: true,
      orphanedCount: 0
    };
  } catch (error) {
    console.error('Erreur lors de la vérification des véhicules orphelins:', error);
    return {
      success: false,
      orphanedCount: 0,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

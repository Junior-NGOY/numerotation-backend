/**
 * Utilitaires pour la gestion des prix d'enregistrement des véhicules
 */

export type TypeVehicule = 'BUS' | 'MINI_BUS' | 'TAXI';

/**
 * Calcule le prix d'enregistrement en fonction du type de véhicule
 * @param typeVehicule - Type du véhicule (BUS, MINI_BUS, TAXI)
 * @returns Prix en francs CFA
 */
export function calculateRegistrationPrice(typeVehicule: TypeVehicule): number {
  const pricingMap: Record<TypeVehicule, number> = {
    BUS: 60000,      // 60,000 FC
    MINI_BUS: 60000, // 60,000 FC (Taxi-Bus)
    TAXI: 50000      // 50,000 FC
  };

  return pricingMap[typeVehicule];
}

/**
 * Formate le prix en francs CFA
 * @param price - Prix à formater
 * @returns Prix formaté avec l'unité
 */
export function formatPrice(price: number): string {
  return `${price.toLocaleString('fr-FR')} FC`;
}

/**
 * Obtient la description du type de véhicule
 * @param typeVehicule - Type du véhicule
 * @returns Description lisible du type
 */
export function getVehicleTypeDescription(typeVehicule: TypeVehicule): string {
  const descriptions: Record<TypeVehicule, string> = {
    BUS: 'Bus',
    MINI_BUS: 'Mini Bus',
    TAXI: 'Taxi'
  };

  return descriptions[typeVehicule];
}

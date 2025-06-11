import { db } from "@/db/db";

export function generateSlug(title: string): string {
  // Convert title to lowercase and replace spaces with dashes
  const slug = title.toLowerCase().replace(/\s+/g, "-");

  // Remove special characters except for dashes
  const cleanedSlug = slug.replace(/[^\w\-]/g, "");

  return cleanedSlug;
}

// Générer un code unique pour les véhicules
export function generateVehiculeCode(marque: string, modele: string, immatriculation: string): string {
  const timestamp = Date.now().toString(); // Timestamp complet
  const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 caractères aléatoires
  const marqueSlug = marque.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, '').padEnd(2, 'X');
  const modeleSlug = modele.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, '').padEnd(2, 'X');
  const immatSlug = immatriculation.replace(/[^A-Z0-9]/g, '').substring(0, 3).padEnd(3, '0');
  
  return `${marqueSlug}${modeleSlug}${immatSlug}${timestamp.slice(-6)}${random}`;
}

// Générer un code unique séquentiel au format LSH-25-XY00000001
export function generateSequentialVehiculeCode(year: number, sequence: number, numeroImmatriculation: string): string {
  const yearSuffix = year.toString().slice(-2); // Derniers 2 chiffres de l'année
  
  // Extraire les 2 premières lettres de la plaque d'immatriculation
  const plateLetters = numeroImmatriculation
    .replace(/[^A-Z]/gi, '') // Garder seulement les lettres
    .toUpperCase()
    .substring(0, 2) // Prendre les 2 premières
    .padEnd(2, 'X'); // Compléter avec 'X' si moins de 2 lettres
  
  const paddedSequence = sequence.toString().padStart(6, '0'); // Séquence sur 6 chiffres
  
  return `LSH-${yearSuffix}-${plateLetters}${paddedSequence}`;
}

// Obtenir le prochain numéro de séquence pour une année et des lettres de plaque données
export async function getNextVehicleSequence(year: number, numeroImmatriculation: string): Promise<number> {
  // Extraire les 2 premières lettres de la plaque
  const plateLetters = numeroImmatriculation
    .replace(/[^A-Z]/gi, '')
    .toUpperCase()
    .substring(0, 2)
    .padEnd(2, 'X');
  
  // Chercher le dernier véhicule enregistré pour cette année et ces lettres
  const yearPrefix = `LSH-${year.toString().slice(-2)}-${plateLetters}`;
  
  const lastVehicle = await db.vehicule.findFirst({
    where: {
      codeUnique: {
        startsWith: yearPrefix
      }
    },
    orderBy: {
      codeUnique: 'desc'
    }
  });

  if (!lastVehicle) {
    // Premier véhicule pour cette combinaison année/lettres
    return 1;
  }
  // Extraire le numéro de séquence du dernier code
  const codeUnique = lastVehicle.codeUnique;
  const sequencePart = codeUnique.split('-')[2].substring(2); // Prendre après les 2 lettres
  const lastSequence = parseInt(sequencePart, 10);
  
  return lastSequence + 1;
}

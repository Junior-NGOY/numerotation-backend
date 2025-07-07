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

// Générer un code unique séquentiel au format LSH-25-XY000002 (dernière partie = 8 caractères)
export function generateSequentialVehiculeCode(year: number, sequence: number, numeroImmatriculation: string): string {
  const yearSuffix = year.toString().slice(-2); // Derniers 2 chiffres de l'année
  
  // Extraire les 2 premiers caractères de la plaque d'immatriculation (chiffres ou lettres)
  const platePrefix = numeroImmatriculation
    .replace(/[^A-Z0-9]/gi, '') // Garder seulement les lettres et les chiffres
    .toUpperCase()
    .substring(0, 2) // Prendre les 2 premiers caractères (chiffres ou lettres)
    .padEnd(2, 'X'); // Compléter avec 'X' si moins de 2 caractères
  
  // Séquence sur 6 chiffres pour que platePrefix(2) + sequence(6) = 8 caractères
  const paddedSequence = sequence.toString().padStart(6, '0'); 
  
  return `LSH-${yearSuffix}-${platePrefix}${paddedSequence}`;
}

// Obtenir le prochain numéro de séquence global pour tous les véhicules
export async function getNextVehicleSequence(year: number, numeroImmatriculation: string): Promise<number> {
  try {
    // Chercher tous les véhicules enregistrés pour cette année
    const yearPrefix = `LSH-${year.toString().slice(-2)}-`;
    
    console.log(`🔍 [SEQUENCE] Recherche véhicules pour l'année ${year} avec préfixe: ${yearPrefix}`);
    
    const vehicules = await db.vehicule.findMany({
      where: {
        codeUnique: {
          startsWith: yearPrefix
        }
      },
      select: {
        codeUnique: true
      }
    });

    console.log(`📊 [SEQUENCE] ${vehicules.length} véhicule(s) trouvé(s) pour l'année ${year}`);

    if (vehicules.length === 0) {
      console.log(`✨ [SEQUENCE] Premier véhicule pour l'année ${year}, séquence: 1`);
      return 1;
    }
    
    // Extraire tous les numéros de séquence et trouver le maximum
    let maxSequence = 0;
    
    console.log(`🔢 [SEQUENCE] Analyse des codes existants:`);
    for (const vehicule of vehicules) {
      const codeUnique = vehicule.codeUnique;
      console.log(`   - Code: ${codeUnique}`);
      
      // Format: LSH-25-XY000001, on veut extraire "000001" (6 chiffres après les 2 caractères)
      const parts = codeUnique.split('-');
      if (parts.length === 3) {
        const sequencePart = parts[2].substring(2); // Prendre après les 2 lettres/chiffres
        const sequenceNum = parseInt(sequencePart, 10);
        console.log(`     → Séquence extraite: ${sequencePart} → ${sequenceNum}`);
        
        if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
          maxSequence = sequenceNum;
          console.log(`     → Nouveau maximum: ${maxSequence}`);
        }
      } else {
        console.log(`     → Format invalide, ignoré`);
      }
    }
    
    const nextSequence = maxSequence + 1;
    
    console.log(`📈 [SEQUENCE] Plus grande séquence trouvée: ${maxSequence}, prochaine séquence: ${nextSequence}`);
    
    return nextSequence;
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la séquence:', error);
    
    // Fallback: générer un numéro basé sur timestamp pour éviter les conflits
    const timestamp = Date.now().toString().slice(-6);
    const fallbackSequence = parseInt(timestamp, 10);
    
    console.log(`🚨 Utilisation du fallback, séquence: ${fallbackSequence}`);
    return fallbackSequence;
  }
}

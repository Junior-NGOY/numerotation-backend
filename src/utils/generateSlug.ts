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
// XY est choisi aléatoirement parmi les paires adjacentes des 4 premiers chiffres de la plaque (ex: 9412 → 94, 41, 12)
export function generateSequentialVehiculeCode(year: number, sequence: number, numeroImmatriculation: string): string {
  const yearSuffix = year.toString().slice(-2); // Derniers 2 chiffres de l'année
  
  // Construire XY à partir des 4 premiers chiffres (paires adjacentes) : d0d1, d1d2, d2d3
  const raw = (numeroImmatriculation ?? '').toString();
  const digits = raw.replace(/\D/g, '');
  let platePrefix: string;

  if (digits.length >= 2) {
    const firstN = digits.slice(0, Math.min(4, digits.length));
    const candidates: string[] = [];
    for (let i = 0; i < firstN.length - 1; i++) {
      candidates.push(firstN.substring(i, i + 2));
    }
    // Choisir une paire aléatoirement parmi les candidates
    platePrefix = candidates[Math.floor(Math.random() * candidates.length)];
  } else {
    // Repli: ancien comportement basé sur les 2 premiers alphanumériques
    platePrefix = raw
      .replace(/[^A-Z0-9]/gi, '') // Garder seulement les lettres et les chiffres
      .toUpperCase()
      .substring(0, 2)
      .padEnd(2, 'X');
  }
  
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

// Générer un code unique (séquentiel) garanti unique via un callback d'unicité
// Signature attendue par le contrôleur: (plaque, année, checkUniq) => Promise<string>
export async function generateUniqueVehiculeCode(
  numeroImmatriculation: string,
  year: number,
  isUnique: (code: string) => Promise<boolean>
): Promise<string> {
  // Récupère la prochaine séquence globale de l'année
  let sequence = await getNextVehicleSequence(year, numeroImmatriculation);

  // Essaye plusieurs séquences croissantes jusqu'à obtenir un code unique
  const MAX_TRIES = 50;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const candidate = generateSequentialVehiculeCode(year, sequence, numeroImmatriculation);
    if (await isUnique(candidate)) {
      return candidate;
    }
    sequence += 1; // si collision, on incrémente et on réessaie
  }

  // Repli ultime: conserver le format et minimiser les collisions
  const yearSuffix = year.toString().slice(-2);
  const raw = (numeroImmatriculation ?? '').toString();
  const digits = raw.replace(/\D/g, '');
  let platePrefix: string;
  if (digits.length >= 2) {
    const firstN = digits.slice(0, Math.min(4, digits.length));
    const candidates: string[] = [];
    for (let i = 0; i < firstN.length - 1; i++) candidates.push(firstN.substring(i, i + 2));
    platePrefix = candidates[Math.floor(Math.random() * candidates.length)];
  } else {
    platePrefix = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase().substring(0, 2).padEnd(2, 'X');
  }
  const randomSeq = (Date.now() % 1_000_000).toString().padStart(6, '0');
  return `LSH-${yearSuffix}-${platePrefix}${randomSeq}`;
}

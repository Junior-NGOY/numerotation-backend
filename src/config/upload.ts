import fs from "fs";
import path from "path";

// Configuration des dossiers d'upload
export const UPLOAD_CONFIG = {
  BASE_DIR: process.env.UPLOAD_DIR || 'uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB par défaut
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  SUBFOLDERS: {
    PIECE_IDENTITE: 'identite',
    PERMIS_CONDUIRE: 'permis',
    CARTE_ROSE: 'carte-rose',
    PDF_COMPLET: 'pdf-complets',
    QR_CODE: 'qr-codes',
    GENERAL: 'general'
  }
};

// Fonction pour initialiser la structure des dossiers
export function initializeUploadDirectories() {
  const baseDir = path.join(process.cwd(), UPLOAD_CONFIG.BASE_DIR);
  
  // Créer le dossier principal
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
    console.log(`Dossier d'upload créé: ${baseDir}`);
  }
  
  // Créer les sous-dossiers
  Object.values(UPLOAD_CONFIG.SUBFOLDERS).forEach(subfolder => {
    const subfolderPath = path.join(baseDir, subfolder);
    if (!fs.existsSync(subfolderPath)) {
      fs.mkdirSync(subfolderPath, { recursive: true });
      console.log(`Sous-dossier créé: ${subfolderPath}`);
    }
  });
}

// Fonction pour obtenir le chemin d'un sous-dossier
export function getUploadPath(documentType?: string): string {
  const baseDir = path.join(process.cwd(), UPLOAD_CONFIG.BASE_DIR);
  
  if (!documentType) {
    return path.join(baseDir, UPLOAD_CONFIG.SUBFOLDERS.GENERAL);
  }
  
  const subfolder = UPLOAD_CONFIG.SUBFOLDERS[documentType as keyof typeof UPLOAD_CONFIG.SUBFOLDERS] 
    || UPLOAD_CONFIG.SUBFOLDERS.GENERAL;
    
  return path.join(baseDir, subfolder);
}

// Fonction pour nettoyer le nom de fichier
export function sanitizeFilename(filename: string): string {
  return filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Retirer les accents
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Remplacer les caractères spéciaux
    .toLowerCase();
}

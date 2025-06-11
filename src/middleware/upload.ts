import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

// Créer le dossier uploads s'il n'existe pas
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration de stockage pour multer
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    // Créer des sous-dossiers basés sur le type de document
    const { type } = req.body;
    let subfolder = 'general';
    
    switch (type) {
      case 'PIECE_IDENTITE':
        subfolder = 'identite';
        break;
      case 'PERMIS_CONDUIRE':
        subfolder = 'permis';
        break;
      case 'CARTE_ROSE':
        subfolder = 'carte-rose';
        break;
      case 'PDF_COMPLET':
        subfolder = 'pdf-complets';
        break;
      case 'QR_CODE':
        subfolder = 'qr-codes';
        break;
    }
    
    const destinationPath = path.join(uploadDir, subfolder);
    if (!fs.existsSync(destinationPath)) {
      fs.mkdirSync(destinationPath, { recursive: true });
    }
    
    cb(null, destinationPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Générer un nom de fichier unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
    
    cb(null, `${sanitizedBaseName}_${uniqueSuffix}${extension}`);
  }
});

// Configuration des filtres de fichiers
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Types de fichiers autorisés
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé: ${file.mimetype}. Types acceptés: ${allowedMimeTypes.join(', ')}`));
  }
};

// Configuration multer
export const uploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB maximum
    files: 5 // Maximum 5 fichiers à la fois
  },
  fileFilter: fileFilter
});

// Middleware pour upload simple
export const singleUpload = uploadMiddleware.single('file');

// Middleware pour upload multiple
export const multipleUpload = uploadMiddleware.array('files', 5);

// Fonction utilitaire pour supprimer un fichier
export const deleteFile = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Fonction utilitaire pour vérifier si un fichier existe
export const fileExists = (filePath: string): boolean => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};

// Fonction pour obtenir la taille d'un fichier
export const getFileSize = (filePath: string): number => {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
};

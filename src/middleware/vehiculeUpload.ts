import { Request, Response, NextFunction } from 'express';
import { multipleUpload } from './upload';

// Middleware spécialisé pour la création de véhicules avec upload
export const vehiculeUploadHandler = (req: Request, res: Response, next: NextFunction) => {
  console.log('🚗 Début traitement upload véhicule');
  console.log('📋 Content-Type:', req.headers['content-type']);
  console.log('📦 Body présent:', !!req.body);
  
  // Utiliser le middleware multer
  multipleUpload(req, res, (error) => {
    if (error) {
      console.error('❌ Erreur upload multer:', error);
      
      // Gérer les différents types d'erreurs multer
      let errorMessage = 'Erreur lors de l\'upload des fichiers';
      let statusCode = 400;
      
      if (error.code === 'LIMIT_FILE_SIZE') {
        errorMessage = 'Fichier trop volumineux (maximum 10MB)';
      } else if (error.code === 'LIMIT_FILE_COUNT') {
        errorMessage = 'Trop de fichiers (maximum 5)';
      } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        errorMessage = 'Champ de fichier inattendu';
      } else if (error.message.includes('Type de fichier non autorisé')) {
        errorMessage = error.message;
      } else {
        statusCode = 500;
        errorMessage = 'Erreur interne lors de l\'upload';
      }
      
      return res.status(statusCode).json({
        data: null,
        error: errorMessage
      });
    }
    
    // Log des informations post-upload
    console.log('📁 Fichiers uploadés:', req.files ? (req.files as Express.Multer.File[]).length : 0);
    console.log('📝 Données body:', Object.keys(req.body));
    
    // Normaliser les données pour éviter les problèmes de validation
    if (req.body) {
      // Convertir les chaînes vides en undefined pour les champs optionnels
      Object.keys(req.body).forEach(key => {
        if (req.body[key] === '' || req.body[key] === 'undefined') {
          delete req.body[key];
        }
      });
      
      console.log('🔧 Body normalisé:', req.body);
    }
    
    next();
  });
};

// Middleware pour nettoyer les fichiers en cas d'erreur de validation
export const cleanupFilesOnError = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data: any): Response {
    // Si c'est une erreur et qu'il y a des fichiers uploadés
    if (res.statusCode >= 400 && req.files && Array.isArray(req.files)) {
      console.log('🧹 Nettoyage des fichiers après erreur de validation');
      
      const fs = require('fs');
      req.files.forEach((file: Express.Multer.File) => {
        fs.unlink(file.path, (err: any) => {
          if (err) {
            console.error('❌ Erreur lors de la suppression du fichier:', file.path, err);
          } else {
            console.log('🗑️ Fichier supprimé:', file.path);
          }
        });
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

import { Request, Response, NextFunction } from "express";
import { createVehiculeSchema } from "./validation";

/**
 * Fonction utilitaire pour accéder à une valeur imbriquée dans un objet
 */
function getNestedValue(obj: any, path: (string | number)[]): any {
  return path.reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined;
  }, obj);
}

/**
 * Middleware de validation spécialisé pour les véhicules avec upload de fichiers
 * Gère la validation Zod avec des données FormData
 */
export const validateVehiculeWithFiles = (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("🔍 Validation véhicule avec fichiers - Body reçu:", req.body);
    console.log("📁 Fichiers reçus:", req.files ? (req.files as Express.Multer.File[]).length : 0);
    
    // Nettoyer les valeurs vides et nulles qui viennent des FormData
    Object.keys(req.body).forEach(key => {
      if (req.body[key] === '' || req.body[key] === 'undefined' || req.body[key] === 'null') {
        delete req.body[key];
      }
    });
    
    console.log("✅ Body après nettoyage:", req.body);
    
    // Valider avec le schéma Zod (qui gère automatiquement les transformations string->number)
    const result = createVehiculeSchema.safeParse({ body: req.body });
    
    if (!result.success) {
      console.error("❌ Erreurs de validation:", result.error.errors);
      
      const errors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        value: getNestedValue(req.body, err.path)
      }));
      
      return res.status(400).json({
        data: null,
        error: "Données de validation invalides",
        details: errors
      });
    }
    
    // Remplacer req.body par les données validées et transformées par Zod
    req.body = result.data.body;
    console.log("✅ Validation réussie, données finales:", req.body);
    
    next();
  } catch (error) {
    console.error("❌ Erreur dans validateVehiculeWithFiles:", error);
    return res.status(400).json({
      data: null,
      error: "Erreur de validation des données",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
};

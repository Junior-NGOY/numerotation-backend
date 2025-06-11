import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

// Middleware de validation générique
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }));
        
        return res.status(400).json({
          data: null,
          error: "Données de validation invalides",
          details: errorMessages
        });
      }
      
      return res.status(500).json({
        data: null,
        error: "Erreur de validation interne"
      });
    }
  };
};

// Middleware pour valider les IDs de paramètres
export const validateId = (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  
  if (!id || typeof id !== 'string' || id.length < 20) {
    return res.status(400).json({
      data: null,
      error: "ID invalide fourni"
    });
  }
  
  next();
};

// Middleware pour valider les paramètres de pagination
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const { page, limit } = req.query;
  
  if (page && (isNaN(Number(page)) || Number(page) < 1)) {
    return res.status(400).json({
      data: null,
      error: "Le numéro de page doit être un entier positif"
    });
  }
  
  if (limit && (isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
    return res.status(400).json({
      data: null,
      error: "La limite doit être un entier entre 1 et 100"
    });
  }
  
  next();
};

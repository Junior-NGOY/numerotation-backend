import express from "express";
import {
  getDocumentsByProprietaire,
  getDocumentsByVehicule,
  getDocumentFile,
  getDocumentPreview,
  getAllDocumentsWithFilters
} from "@/controllers/documents";
import { authenticateToken } from "@/middleware/auth";
import { validate } from "@/middleware/validateRequest";
import { idParamSchema, paginationSchema } from "@/middleware/validation";

const documentsAccessRouter = express.Router();

// Toutes les routes nécessitent une authentification
documentsAccessRouter.use(authenticateToken);

// Documents d'un propriétaire (inclut ses véhicules)
documentsAccessRouter.get(
  "/proprietaires/:id/documents", 
  validate(idParamSchema), 
  validate(paginationSchema), 
  getDocumentsByProprietaire
);

// Documents d'un véhicule spécifique
documentsAccessRouter.get(
  "/vehicules/:id/documents", 
  validate(idParamSchema), 
  validate(paginationSchema), 
  getDocumentsByVehicule
);

// Accès sécurisé au fichier (proxy PINATA)
documentsAccessRouter.get(
  "/documents/:id/file", 
  validate(idParamSchema), 
  getDocumentFile
);

// Prévisualisation d'un document
documentsAccessRouter.get(
  "/documents/:id/preview", 
  validate(idParamSchema), 
  getDocumentPreview
);

// Vue globale de tous les documents avec filtres avancés
documentsAccessRouter.get(
  "/documents/search", 
  validate(paginationSchema), 
  getAllDocumentsWithFilters
);

export default documentsAccessRouter;

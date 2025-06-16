import express from "express";
import { testPinataConnection, getStorageStats } from "@/controllers/storage";
import { authenticateToken, authorizeRoles } from "@/middleware/auth";

const storageRouter = express.Router();

// Toutes les routes nécessitent une authentification
storageRouter.use(authenticateToken);

// Test de connexion PINATA
storageRouter.get("/pinata/test", testPinataConnection);

// Statistiques de stockage (admin seulement)
storageRouter.get("/stats", authorizeRoles("ADMIN"), getStorageStats);

export default storageRouter;

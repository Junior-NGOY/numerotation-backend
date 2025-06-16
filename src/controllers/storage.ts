import { Request, Response } from "express";
import { pinataService } from "@/services/pinata";
import { getAuthenticatedUser } from "@/types";

// Test de connexion PINATA
export async function testPinataConnection(req: Request, res: Response) {
  try {
    const isConfigured = pinataService.isConfigured();
    
    if (!isConfigured) {
      return res.status(200).json({
        data: {
          configured: false,
          message: "PINATA is not configured. File uploads will use local storage.",
          status: "warning"
        },
        error: null
      });
    }

    const isConnected = await pinataService.testConnection();
    
    if (isConnected) {
      return res.status(200).json({
        data: {
          configured: true,
          connected: true,
          message: "PINATA connection successful!",
          status: "success"
        },
        error: null
      });
    } else {
      return res.status(200).json({
        data: {
          configured: true,
          connected: false,
          message: "PINATA configuration error. Check your API keys.",
          status: "error"
        },
        error: null
      });
    }
  } catch (error) {
    console.error("Error testing PINATA connection:", error);
    return res.status(500).json({
      data: null,
      error: "Internal server error"
    });
  }
}

// Obtenir les statistiques de stockage
export async function getStorageStats(req: Request, res: Response) {
  try {
    const { userId } = getAuthenticatedUser(req);
    
    // Statistiques des documents
    const { db } = require("@/db/db");
      const [totalDocuments, totalSize] = await Promise.all([
      db.document.count(),
      // db.document.count({ where: { isExternal: true } }),
      // db.document.count({ where: { isExternal: false } }),
      db.document.aggregate({
        _sum: {
          taille: true
        }
      })
    ]);    const stats = {
      total: totalDocuments,
      external: 0, // externalDocuments, // Désactivé temporairement
      local: totalDocuments, // localDocuments, // Tous les documents sont considérés comme locaux
      totalSize: totalSize._sum.taille || 0,
      pinataConfigured: pinataService.isConfigured()
    };

    return res.status(200).json({
      data: stats,
      error: null
    });
  } catch (error) {
    console.error("Error getting storage stats:", error);
    return res.status(500).json({
      data: null,
      error: "Internal server error"
    });
  }
}

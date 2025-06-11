import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@/db/db";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      }
    }
  }
}

// Interface pour les requêtes authentifiées
export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  }
}

// Middleware d'authentification
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      data: null,
      error: "Token d'accès requis"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as any;
    
    // Vérifier que l'utilisateur existe toujours et est actif
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true }
    });

    if (!user) {
      return res.status(401).json({
        data: null,
        error: "Utilisateur non trouvé"
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        data: null,
        error: "Compte désactivé"
      });
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    return res.status(403).json({
      data: null,
      error: "Token invalide"
    });
  }
}

// Middleware d'autorisation basé sur les rôles
export function authorizeRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        data: null,
        error: "Non authentifié"
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        data: null,
        error: "Accès non autorisé"
      });
    }

    next();
  };
}

// Middleware pour vérifier si l'utilisateur peut modifier une ressource
export function canModifyResource(req: Request, res: Response, next: NextFunction) {
  // Les admins peuvent tout modifier
  if (req.user?.role === 'ADMIN') {
    return next();
  }

  // Les utilisateurs peuvent modifier leurs propres créations
  // Cette logique peut être étendue selon les besoins
  next();
}

// Middleware de logging des requêtes
export function logRequest(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - User: ${req.user?.email || 'Anonymous'}`);
  });

  next();
}

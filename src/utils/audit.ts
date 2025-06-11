import { db } from "@/db/db";
import { Request } from "express";
import { AuthenticatedRequest } from "@/types";

interface AuditLogData {
  action: string;
  table: string;
  recordId: string;
  oldValues?: any;
  newValues?: any;
  userId?: string;
  userEmail?: string;
}

// Fonction utilitaire pour créer un log d'audit
export async function createAuditLog(data: AuditLogData) {
  try {
    await db.auditLog.create({
      data: {
        action: data.action,
        table: data.table,
        recordId: data.recordId,
        oldValues: data.oldValues ? JSON.parse(JSON.stringify(data.oldValues)) : null,
        newValues: data.newValues ? JSON.parse(JSON.stringify(data.newValues)) : null,
        userId: data.userId,
        userEmail: data.userEmail,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error("Erreur lors de la création du log d'audit:", error);
    // Ne pas lancer d'erreur pour ne pas interrompre l'opération principale
  }
}

// Middleware pour capturer automatiquement les logs d'audit
export function auditMiddleware(table: string, action: string) {
  return async (req: AuthenticatedRequest, oldData?: any) => {
    const user = req.user;
    const recordId = req.params.id || req.body.id || 'unknown';
    
    const auditData: AuditLogData = {
      action,
      table,
      recordId,
      userId: user?.userId,
      userEmail: user?.email
    };

    // Pour les opérations UPDATE et DELETE, inclure les anciennes valeurs
    if (action === 'UPDATE' && oldData) {
      auditData.oldValues = oldData;
      auditData.newValues = req.body;
    } else if (action === 'DELETE' && oldData) {
      auditData.oldValues = oldData;
    } else if (action === 'CREATE') {
      auditData.newValues = req.body;
    }

    await createAuditLog(auditData);
  };
}

// Fonction pour nettoyer les anciennes données sensibles avant l'audit
export function sanitizeForAudit(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };
  
  // Supprimer les champs sensibles
  const sensitiveFields = ['password', 'token', 'secret'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

// Types d'actions d'audit
export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE', 
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  UPLOAD = 'UPLOAD',
  DOWNLOAD = 'DOWNLOAD'
}

// Tables de la base de données
export enum AuditTable {
  USER = 'users',
  PROPRIETAIRE = 'proprietaires',
  VEHICULE = 'vehicules',
  DOCUMENT = 'documents',
  AUDIT_LOG = 'audit_logs'
}

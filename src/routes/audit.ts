import express from "express";
import {
  getAuditLogs,
  getAuditLogById,
  getAuditLogsByRecord,
  getAuditStats,
  purgeOldAuditLogs,
  exportAuditLogs
} from "@/controllers/audit";
import { authenticateToken, authorizeRoles } from "@/middleware/auth";

const auditRouter = express.Router();

// Toutes les routes nécessitent une authentification
auditRouter.use(authenticateToken);

// Routes d'audit (principalement pour les admins)
auditRouter.get("/", authorizeRoles("ADMIN"), getAuditLogs);
auditRouter.get("/stats", authorizeRoles("ADMIN"), getAuditStats);
auditRouter.get("/export", authorizeRoles("ADMIN"), exportAuditLogs);
auditRouter.post("/purge", authorizeRoles("ADMIN"), purgeOldAuditLogs);
auditRouter.get("/record/:table/:recordId", getAuditLogsByRecord);
auditRouter.get("/:id", authorizeRoles("ADMIN"), getAuditLogById);

export default auditRouter;

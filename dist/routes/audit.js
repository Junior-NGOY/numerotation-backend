"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const audit_1 = require("../controllers/audit");
const auth_1 = require("../middleware/auth");
const auditRouter = express_1.default.Router();
auditRouter.use(auth_1.authenticateToken);
auditRouter.get("/", (0, auth_1.authorizeRoles)("ADMIN"), audit_1.getAuditLogs);
auditRouter.get("/stats", (0, auth_1.authorizeRoles)("ADMIN"), audit_1.getAuditStats);
auditRouter.get("/export", (0, auth_1.authorizeRoles)("ADMIN"), audit_1.exportAuditLogs);
auditRouter.post("/purge", (0, auth_1.authorizeRoles)("ADMIN"), audit_1.purgeOldAuditLogs);
auditRouter.get("/record/:table/:recordId", audit_1.getAuditLogsByRecord);
auditRouter.get("/:id", (0, auth_1.authorizeRoles)("ADMIN"), audit_1.getAuditLogById);
exports.default = auditRouter;

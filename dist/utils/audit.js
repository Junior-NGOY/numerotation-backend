"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditTable = exports.AuditAction = void 0;
exports.createAuditLog = createAuditLog;
exports.auditMiddleware = auditMiddleware;
exports.sanitizeForAudit = sanitizeForAudit;
const db_1 = require("../db/db");
function createAuditLog(data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield db_1.db.auditLog.create({
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
        }
        catch (error) {
            console.error("Erreur lors de la création du log d'audit:", error);
        }
    });
}
function auditMiddleware(table, action) {
    return (req, oldData) => __awaiter(this, void 0, void 0, function* () {
        const user = req.user;
        const recordId = req.params.id || req.body.id || 'unknown';
        const auditData = {
            action,
            table,
            recordId,
            userId: user === null || user === void 0 ? void 0 : user.userId,
            userEmail: user === null || user === void 0 ? void 0 : user.email
        };
        if (action === 'UPDATE' && oldData) {
            auditData.oldValues = oldData;
            auditData.newValues = req.body;
        }
        else if (action === 'DELETE' && oldData) {
            auditData.oldValues = oldData;
        }
        else if (action === 'CREATE') {
            auditData.newValues = req.body;
        }
        yield createAuditLog(auditData);
    });
}
function sanitizeForAudit(data) {
    if (!data || typeof data !== 'object') {
        return data;
    }
    const sanitized = Object.assign({}, data);
    const sensitiveFields = ['password', 'token', 'secret'];
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });
    return sanitized;
}
var AuditAction;
(function (AuditAction) {
    AuditAction["CREATE"] = "CREATE";
    AuditAction["READ"] = "READ";
    AuditAction["UPDATE"] = "UPDATE";
    AuditAction["DELETE"] = "DELETE";
    AuditAction["LOGIN"] = "LOGIN";
    AuditAction["LOGOUT"] = "LOGOUT";
    AuditAction["UPLOAD"] = "UPLOAD";
    AuditAction["DOWNLOAD"] = "DOWNLOAD";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
var AuditTable;
(function (AuditTable) {
    AuditTable["USER"] = "users";
    AuditTable["PROPRIETAIRE"] = "proprietaires";
    AuditTable["VEHICULE"] = "vehicules";
    AuditTable["DOCUMENT"] = "documents";
    AuditTable["AUDIT_LOG"] = "audit_logs";
})(AuditTable || (exports.AuditTable = AuditTable = {}));

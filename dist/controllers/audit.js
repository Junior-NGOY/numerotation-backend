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
exports.getAuditLogs = getAuditLogs;
exports.getAuditLogById = getAuditLogById;
exports.getAuditLogsByRecord = getAuditLogsByRecord;
exports.getAuditStats = getAuditStats;
exports.purgeOldAuditLogs = purgeOldAuditLogs;
exports.exportAuditLogs = exportAuditLogs;
const db_1 = require("../db/db");
const types_1 = require("../types");
function getAuditLogs(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { page = 1, limit = 10, action, table, userId, startDate, endDate } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const where = {};
            if (action) {
                where.action = action;
            }
            if (table) {
                where.table = table;
            }
            if (userId) {
                where.userId = userId;
            }
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) {
                    where.createdAt.gte = new Date(startDate);
                }
                if (endDate) {
                    where.createdAt.lte = new Date(endDate);
                }
            }
            const [auditLogs, total] = yield Promise.all([
                db_1.db.auditLog.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    orderBy: { createdAt: "desc" }
                }),
                db_1.db.auditLog.count({ where })
            ]);
            return res.status(200).json({
                data: {
                    auditLogs,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        totalPages: Math.ceil(total / Number(limit))
                    }
                },
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération des logs d'audit:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getAuditLogById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        try {
            const auditLog = yield db_1.db.auditLog.findUnique({
                where: { id }
            });
            if (!auditLog) {
                return res.status(404).json({
                    data: null,
                    error: "Log d'audit non trouvé"
                });
            }
            return res.status(200).json({
                data: auditLog,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération du log d'audit:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getAuditLogsByRecord(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { table, recordId } = req.params;
        try {
            const auditLogs = yield db_1.db.auditLog.findMany({
                where: {
                    table,
                    recordId
                },
                orderBy: { createdAt: "desc" }
            });
            return res.status(200).json({
                data: auditLogs,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération des logs d'audit pour l'enregistrement:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getAuditStats(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const [totalLogs, actionsRepartition, tablesRepartition, activiteRecente, utilisateursActifs] = yield Promise.all([
                db_1.db.auditLog.count(),
                db_1.db.auditLog.groupBy({
                    by: ['action'],
                    _count: {
                        id: true
                    }
                }),
                db_1.db.auditLog.groupBy({
                    by: ['table'],
                    _count: {
                        id: true
                    }
                }),
                db_1.db.auditLog.findMany({
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                    },
                    orderBy: { createdAt: "desc" },
                    take: 10
                }),
                db_1.db.auditLog.groupBy({
                    by: ['userId'],
                    where: {
                        userId: { not: null },
                        createdAt: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    },
                    _count: {
                        id: true
                    },
                    orderBy: {
                        _count: {
                            id: 'desc'
                        }
                    },
                    take: 10
                })
            ]);
            const stats = {
                total: totalLogs,
                activiteRecente: activiteRecente.length,
                repartitionActions: actionsRepartition.map(item => ({
                    action: item.action,
                    count: item._count.id
                })),
                repartitionTables: tablesRepartition.map(item => ({
                    table: item.table,
                    count: item._count.id
                })),
                utilisateursActifs: utilisateursActifs.map(item => ({
                    userId: item.userId,
                    count: item._count.id
                }))
            };
            return res.status(200).json({
                data: stats,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération des statistiques d'audit:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function purgeOldAuditLogs(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { days = 90 } = req.body;
        const { userId } = (0, types_1.getAuthenticatedUser)(req);
        try {
            const cutoffDate = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
            const deletedLogs = yield db_1.db.auditLog.deleteMany({
                where: {
                    createdAt: {
                        lt: cutoffDate
                    }
                }
            });
            yield db_1.db.auditLog.create({
                data: {
                    action: "PURGE",
                    table: "AuditLog",
                    recordId: "bulk",
                    newValues: {
                        deletedCount: deletedLogs.count,
                        cutoffDate,
                        days
                    },
                    userId
                }
            });
            return res.status(200).json({
                data: {
                    message: `${deletedLogs.count} logs d'audit supprimés`,
                    deletedCount: deletedLogs.count
                },
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la purge des logs d'audit:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function exportAuditLogs(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { startDate, endDate, action, table, format = 'json' } = req.query;
            const where = {};
            if (action) {
                where.action = action;
            }
            if (table) {
                where.table = table;
            }
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) {
                    where.createdAt.gte = new Date(startDate);
                }
                if (endDate) {
                    where.createdAt.lte = new Date(endDate);
                }
            }
            const auditLogs = yield db_1.db.auditLog.findMany({
                where,
                orderBy: { createdAt: "desc" }
            });
            if (format === 'csv') {
                const csvHeader = 'ID,Action,Table,Record ID,User ID,User Email,Created At,Old Values,New Values\n';
                const csvData = auditLogs.map(log => `"${log.id}","${log.action}","${log.table}","${log.recordId}","${log.userId || ''}","${log.userEmail || ''}","${log.createdAt.toISOString()}","${JSON.stringify(log.oldValues) || ''}","${JSON.stringify(log.newValues) || ''}"`).join('\n');
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
                return res.send(csvHeader + csvData);
            }
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.json"`);
            return res.json({
                exportDate: new Date().toISOString(),
                totalRecords: auditLogs.length,
                filters: { startDate, endDate, action, table },
                data: auditLogs
            });
        }
        catch (error) {
            console.error("Erreur lors de l'export des logs d'audit:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}

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
exports.getDashboardStats = getDashboardStats;
exports.getEntityStats = getEntityStats;
exports.getPerformanceMetrics = getPerformanceMetrics;
exports.getQuickSummary = getQuickSummary;
exports.getVehicleStatsByCategory = getVehicleStatsByCategory;
exports.getRevenueEvolution = getRevenueEvolution;
exports.getRecentActivity = getRecentActivity;
const db_1 = require("../db/db");
const pricingUtils_1 = require("../utils/pricingUtils");
const REVENUE_START_DATE = new Date('2025-07-01T00:00:00.000Z');
function getDashboardStats(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const [totalUsers, activeUsers, totalProprietaires, totalVehicules, totalDocuments, recentUsers, recentProprietaires, recentVehicules, recentDocuments, totalRevenue, usersByRole, vehiculesByType, documentsByType, proprietairesByTypePiece, creationsParJour] = yield Promise.all([
                db_1.db.user.count(),
                db_1.db.user.count({ where: { isActive: true } }),
                db_1.db.proprietaire.count(),
                db_1.db.vehicule.count(),
                db_1.db.document.count(),
                db_1.db.user.count({
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    }
                }),
                db_1.db.proprietaire.count({
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    }
                }),
                db_1.db.vehicule.count({
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    }
                }),
                db_1.db.document.count({
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    }
                }),
                db_1.db.vehicule.aggregate({
                    _sum: {
                        prixEnregistrement: true
                    },
                    where: {
                        createdAt: {
                            gte: REVENUE_START_DATE
                        }
                    }
                }),
                db_1.db.user.groupBy({
                    by: ['role'],
                    _count: { id: true }
                }),
                db_1.db.vehicule.groupBy({
                    by: ['typeVehicule'],
                    _count: { id: true }
                }),
                db_1.db.document.groupBy({
                    by: ['type'],
                    _count: { id: true }
                }),
                db_1.db.proprietaire.groupBy({
                    by: ['typePiece'],
                    _count: { id: true }
                }),
                getTendanceCreations()
            ]);
            const stats = {
                general: {
                    totalUsers,
                    activeUsers,
                    inactiveUsers: totalUsers - activeUsers,
                    totalProprietaires,
                    totalVehicules,
                    totalDocuments,
                    totalRevenue: totalRevenue._sum.prixEnregistrement || 0
                },
                activiteRecente: {
                    nouveauxUtilisateurs: recentUsers,
                    nouveauxProprietaires: recentProprietaires,
                    nouveauxVehicules: recentVehicules,
                    nouveauxDocuments: recentDocuments
                },
                repartitions: {
                    utilisateursParRole: usersByRole.map(item => ({
                        role: item.role,
                        count: item._count.id
                    })),
                    vehiculesParType: vehiculesByType.map(item => ({
                        type: item.typeVehicule,
                        count: item._count.id
                    })),
                    documentsParType: documentsByType.map(item => ({
                        type: item.type,
                        count: item._count.id
                    })),
                    proprietairesParTypePiece: proprietairesByTypePiece.map(item => ({
                        type: item.typePiece,
                        count: item._count.id
                    }))
                },
                tendances: creationsParJour
            };
            return res.status(200).json({
                data: stats,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération des statistiques:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getEntityStats(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { entity } = req.params;
        const { period = '30' } = req.query;
        try {
            const startDate = new Date(Date.now() - Number(period) * 24 * 60 * 60 * 1000);
            let stats;
            switch (entity) {
                case 'users':
                    stats = yield getUsersDetailedStats(startDate);
                    break;
                case 'proprietaires':
                    stats = yield getProprietairesDetailedStats(startDate);
                    break;
                case 'vehicules':
                    stats = yield getVehiculesDetailedStats(startDate);
                    break;
                case 'documents':
                    stats = yield getDocumentsDetailedStats(startDate);
                    break;
                default:
                    return res.status(400).json({
                        data: null,
                        error: "Entité non reconnue"
                    });
            }
            return res.status(200).json({
                data: stats,
                error: null
            });
        }
        catch (error) {
            console.error(`Erreur lors de la récupération des statistiques pour ${entity}:`, error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getPerformanceMetrics(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const [avgResponseTime, systemLoad, databaseMetrics] = yield Promise.all([
                Promise.resolve({ avgResponseTime: Math.random() * 100 + 50 }),
                Promise.resolve({ cpu: Math.random() * 100, memory: Math.random() * 100 }),
                getDatabaseMetrics()
            ]);
            const metrics = {
                performance: avgResponseTime,
                system: systemLoad,
                database: databaseMetrics,
                timestamp: new Date().toISOString()
            };
            return res.status(200).json({
                data: metrics,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération des métriques:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getQuickSummary(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const [totalUsers, totalProprietaires, totalVehicules, totalDocuments, todayRegistrations, weeklyStats] = yield Promise.all([
                db_1.db.user.count(),
                db_1.db.proprietaire.count(),
                db_1.db.vehicule.count(),
                db_1.db.document.count(),
                db_1.db.vehicule.count({
                    where: {
                        createdAt: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0))
                        }
                    }
                }),
                getWeeklyGrowth()
            ]);
            const summary = {
                totalUsers,
                totalProprietaires,
                totalVehicules,
                totalDocuments,
                todayRegistrations,
                weeklyGrowth: weeklyStats
            };
            return res.status(200).json({
                data: summary,
                error: null
            });
        }
        catch (error) {
            console.error('Erreur lors de la récupération du résumé:', error);
            return res.status(500).json({
                data: null,
                error: 'Erreur lors de la récupération du résumé'
            });
        }
    });
}
function getWeeklyGrowth() {
    return __awaiter(this, void 0, void 0, function* () {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const [usersThisWeek, proprietairesThisWeek, vehiculesThisWeek, documentsThisWeek] = yield Promise.all([
            db_1.db.user.count({
                where: { createdAt: { gte: oneWeekAgo } }
            }),
            db_1.db.proprietaire.count({
                where: { createdAt: { gte: oneWeekAgo } }
            }),
            db_1.db.vehicule.count({
                where: { createdAt: { gte: oneWeekAgo } }
            }),
            db_1.db.document.count({
                where: { createdAt: { gte: oneWeekAgo } }
            })
        ]);
        return {
            users: usersThisWeek,
            proprietaires: proprietairesThisWeek,
            vehicules: vehiculesThisWeek,
            documents: documentsThisWeek
        };
    });
}
function getTendanceCreations() {
    return __awaiter(this, void 0, void 0, function* () {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const [users, proprietaires, vehicules, documents] = yield Promise.all([
            db_1.db.user.findMany({
                where: { createdAt: { gte: thirtyDaysAgo } },
                select: { createdAt: true }
            }),
            db_1.db.proprietaire.findMany({
                where: { createdAt: { gte: thirtyDaysAgo } },
                select: { createdAt: true }
            }),
            db_1.db.vehicule.findMany({
                where: { createdAt: { gte: thirtyDaysAgo } },
                select: { createdAt: true }
            }),
            db_1.db.document.findMany({
                where: { createdAt: { gte: thirtyDaysAgo } },
                select: { createdAt: true }
            })
        ]);
        const groupByDay = (items) => {
            const groups = {};
            items.forEach(item => {
                const day = item.createdAt.toISOString().split('T')[0];
                groups[day] = (groups[day] || 0) + 1;
            });
            return groups;
        };
        return {
            utilisateurs: groupByDay(users),
            proprietaires: groupByDay(proprietaires),
            vehicules: groupByDay(vehicules),
            documents: groupByDay(documents)
        };
    });
}
function getUsersDetailedStats(startDate) {
    return __awaiter(this, void 0, void 0, function* () {
        const [total, recent, byRole, activeInactive, loginStats] = yield Promise.all([
            db_1.db.user.count(),
            db_1.db.user.count({ where: { createdAt: { gte: startDate } } }),
            db_1.db.user.groupBy({ by: ['role'], _count: { id: true } }),
            db_1.db.user.groupBy({ by: ['isActive'], _count: { id: true } }),
            db_1.db.user.aggregate({
                _count: { lastLogin: true },
                where: { lastLogin: { not: null } }
            })
        ]);
        return {
            total,
            recent,
            byRole: byRole.map(r => ({ role: r.role, count: r._count.id })),
            activeInactive: activeInactive.map(r => ({ status: r.isActive ? 'active' : 'inactive', count: r._count.id })),
            usersWithLogin: loginStats._count.lastLogin
        };
    });
}
function getProprietairesDetailedStats(startDate) {
    return __awaiter(this, void 0, void 0, function* () {
        const [total, recent, byTypePiece, withVehicles, withoutVehicles] = yield Promise.all([
            db_1.db.proprietaire.count(),
            db_1.db.proprietaire.count({ where: { createdAt: { gte: startDate } } }),
            db_1.db.proprietaire.groupBy({ by: ['typePiece'], _count: { id: true } }),
            db_1.db.proprietaire.count({ where: { vehicules: { some: {} } } }),
            db_1.db.proprietaire.count({ where: { vehicules: { none: {} } } })
        ]);
        return {
            total,
            recent,
            byTypePiece: byTypePiece.map(r => ({ type: r.typePiece, count: r._count.id })),
            withVehicles,
            withoutVehicles
        };
    });
}
function getVehiculesDetailedStats(startDate) {
    return __awaiter(this, void 0, void 0, function* () {
        const [total, recent, byType, byYear, withDocuments, withoutDocuments] = yield Promise.all([
            db_1.db.vehicule.count(),
            db_1.db.vehicule.count({ where: { createdAt: { gte: startDate } } }),
            db_1.db.vehicule.groupBy({ by: ['typeVehicule'], _count: { id: true } }),
            db_1.db.vehicule.groupBy({
                by: ['anneeFabrication'],
                _count: { id: true },
                orderBy: { anneeFabrication: 'desc' },
                take: 10
            }),
            db_1.db.vehicule.count({ where: { documents: { some: {} } } }),
            db_1.db.vehicule.count({ where: { documents: { none: {} } } })
        ]);
        return {
            total,
            recent,
            byType: byType.map(r => ({ type: r.typeVehicule, count: r._count.id })),
            byYear: byYear.map(r => ({ year: r.anneeFabrication, count: r._count.id })),
            withDocuments,
            withoutDocuments
        };
    });
}
function getDocumentsDetailedStats(startDate) {
    return __awaiter(this, void 0, void 0, function* () {
        const [total, recent, byType, forProprietaires, forVehicules, totalSize] = yield Promise.all([
            db_1.db.document.count(),
            db_1.db.document.count({ where: { createdAt: { gte: startDate } } }),
            db_1.db.document.groupBy({ by: ['type'], _count: { id: true } }),
            db_1.db.document.count({ where: { proprietaireId: { not: null } } }),
            db_1.db.document.count({ where: { vehiculeId: { not: null } } }),
            db_1.db.document.aggregate({ _sum: { taille: true } })
        ]);
        return {
            total,
            recent,
            byType: byType.map(r => ({ type: r.type, count: r._count.id })),
            forProprietaires,
            forVehicules,
            totalSize: totalSize._sum.taille || 0
        };
    });
}
function getDatabaseMetrics() {
    return __awaiter(this, void 0, void 0, function* () {
        const [totalRecords, tablesCount] = yield Promise.all([
            Promise.all([
                db_1.db.user.count(),
                db_1.db.proprietaire.count(),
                db_1.db.vehicule.count(),
                db_1.db.document.count(),
                db_1.db.auditLog.count()
            ]).then(counts => counts.reduce((sum, count) => sum + count, 0)),
            Promise.resolve(5)
        ]);
        return {
            totalRecords,
            tablesCount,
            estimatedSize: totalRecords * 1024,
            connectionsActive: 1
        };
    });
}
function getVehicleStatsByCategory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const { period } = req.query;
            let dateFilter = {};
            const now = new Date();
            switch (period) {
                case 'day':
                    dateFilter = {
                        createdAt: {
                            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
                        }
                    };
                    break;
                case 'week':
                    const startOfWeek = new Date(now);
                    startOfWeek.setDate(now.getDate() - now.getDay());
                    startOfWeek.setHours(0, 0, 0, 0);
                    dateFilter = {
                        createdAt: {
                            gte: startOfWeek
                        }
                    };
                    break;
                case 'month':
                    dateFilter = {
                        createdAt: {
                            gte: new Date(now.getFullYear(), now.getMonth(), 1)
                        }
                    };
                    break;
                default:
                    dateFilter = {
                        createdAt: {
                            gte: REVENUE_START_DATE
                        }
                    };
                    break;
            }
            if (!dateFilter) {
                dateFilter = {
                    createdAt: {
                        gte: REVENUE_START_DATE
                    }
                };
            }
            else if (((_a = dateFilter.createdAt) === null || _a === void 0 ? void 0 : _a.gte) && dateFilter.createdAt.gte < REVENUE_START_DATE) {
                dateFilter = Object.assign(Object.assign({}, dateFilter), { createdAt: Object.assign(Object.assign({}, dateFilter.createdAt), { gte: REVENUE_START_DATE }) });
            }
            const vehiculesByCategory = yield db_1.db.vehicule.groupBy({
                by: ['typeVehicule'],
                where: dateFilter,
                _count: { id: true },
                _sum: { prixEnregistrement: true }
            });
            const formattedStats = vehiculesByCategory.map(item => ({
                category: item.typeVehicule,
                count: item._count.id,
                totalRevenue: item._sum.prixEnregistrement || 0,
                standardPrice: (0, pricingUtils_1.calculateRegistrationPrice)(item.typeVehicule),
                label: item.typeVehicule === 'BUS' ? 'Bus' :
                    item.typeVehicule === 'MINI_BUS' ? 'Mini Bus' :
                        'Taxi'
            }));
            const totals = {
                totalVehicles: formattedStats.reduce((sum, item) => sum + item.count, 0),
                totalRevenue: formattedStats.reduce((sum, item) => sum + item.totalRevenue, 0),
                averageRevenuePerVehicle: 0
            };
            if (totals.totalVehicles > 0) {
                totals.averageRevenuePerVehicle = Math.round(totals.totalRevenue / totals.totalVehicles);
            }
            return res.json({
                data: {
                    stats: formattedStats,
                    totals,
                    period: period || 'all'
                },
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération des statistiques par catégorie:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur lors de la récupération des statistiques"
            });
        }
    });
}
function getRevenueEvolution(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { days = 30 } = req.query;
            const numDays = parseInt(days);
            const evolution = [];
            const now = new Date();
            for (let i = numDays - 1; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(now.getDate() - i);
                date.setHours(0, 0, 0, 0);
                if (date < REVENUE_START_DATE) {
                    continue;
                }
                const nextDate = new Date(date);
                nextDate.setDate(date.getDate() + 1);
                const dayStats = yield db_1.db.vehicule.groupBy({
                    by: ['typeVehicule'],
                    where: {
                        createdAt: {
                            gte: date,
                            lt: nextDate
                        }
                    },
                    _count: { id: true },
                    _sum: { prixEnregistrement: true }
                });
                const dayData = {
                    date: date.toISOString().split('T')[0],
                    BUS: { count: 0, revenue: 0 },
                    MINI_BUS: { count: 0, revenue: 0 },
                    TAXI: { count: 0, revenue: 0 },
                    total: { count: 0, revenue: 0 }
                };
                dayStats.forEach(stat => {
                    dayData[stat.typeVehicule] = {
                        count: stat._count.id,
                        revenue: stat._sum.prixEnregistrement || 0
                    };
                    dayData.total.count += stat._count.id;
                    dayData.total.revenue += stat._sum.prixEnregistrement || 0;
                });
                evolution.push(dayData);
            }
            evolution.reverse();
            return res.json({
                data: evolution,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération de l'évolution des revenus:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur lors de la récupération de l'évolution"
            });
        }
    });
}
function getRecentActivity(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const days = parseInt(req.query.days) || 7;
            const dateLimit = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const [nouveauxUtilisateurs, nouveauxProprietaires, nouveauxVehicules, nouveauxDocuments] = yield Promise.all([
                db_1.db.user.count({
                    where: {
                        createdAt: {
                            gte: dateLimit
                        }
                    }
                }),
                db_1.db.proprietaire.count({
                    where: {
                        createdAt: {
                            gte: dateLimit
                        }
                    }
                }),
                db_1.db.vehicule.count({
                    where: {
                        createdAt: {
                            gte: dateLimit
                        }
                    }
                }),
                db_1.db.document.count({
                    where: {
                        createdAt: {
                            gte: dateLimit
                        }
                    }
                })
            ]);
            const activityData = {
                nouveauxUtilisateurs,
                nouveauxProprietaires,
                nouveauxVehicules,
                nouveauxDocuments
            };
            return res.json({
                data: activityData,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération de l'activité récente:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur lors de la récupération de l'activité récente"
            });
        }
    });
}

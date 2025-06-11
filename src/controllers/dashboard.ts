import { db } from "@/db/db";
import { Request, Response } from "express";
import { calculateRegistrationPrice } from "@/utils/pricingUtils";

// Obtenir les statistiques du tableau de bord
export async function getDashboardStats(req: Request, res: Response) {
  try {    const [
      // Statistiques générales
      totalUsers,
      activeUsers,
      totalProprietaires,
      totalVehicules,
      totalDocuments,
      
      // Activité récente
      recentUsers,
      recentProprietaires,
      recentVehicules,
      recentDocuments,
      
      // Calcul des revenus totaux
      totalRevenue,
      
      // Répartitions
      usersByRole,
      vehiculesByType,
      documentsByType,
      proprietairesByTypePiece,
      
      // Tendances (30 derniers jours)
      creationsParJour
    ] = await Promise.all([
      // Statistiques générales
      db.user.count(),
      db.user.count({ where: { isActive: true } }),
      db.proprietaire.count(),
      db.vehicule.count(),
      db.document.count(),
      
      // Activité récente (7 derniers jours)
      db.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      db.proprietaire.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      db.vehicule.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      db.document.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Calcul des revenus totaux depuis tous les véhicules enregistrés
      db.vehicule.aggregate({
        _sum: {
          prixEnregistrement: true
        }
      }),
      
      // Répartitions
      db.user.groupBy({
        by: ['role'],
        _count: { id: true }
      }),
      db.vehicule.groupBy({
        by: ['typeVehicule'],
        _count: { id: true }
      }),
      db.document.groupBy({
        by: ['type'],
        _count: { id: true }
      }),
      db.proprietaire.groupBy({
        by: ['typePiece'],
        _count: { id: true }
      }),
      
      // Tendances (créations par jour sur 30 jours)
      getTendanceCreations()
    ]);    const stats = {
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
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir les statistiques détaillées d'une entité
export async function getEntityStats(req: Request, res: Response) {
  const { entity } = req.params;
  const { period = '30' } = req.query; // Période en jours

  try {
    const startDate = new Date(Date.now() - Number(period) * 24 * 60 * 60 * 1000);

    let stats;

    switch (entity) {
      case 'users':
        stats = await getUsersDetailedStats(startDate);
        break;
      case 'proprietaires':
        stats = await getProprietairesDetailedStats(startDate);
        break;
      case 'vehicules':
        stats = await getVehiculesDetailedStats(startDate);
        break;
      case 'documents':
        stats = await getDocumentsDetailedStats(startDate);
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
  } catch (error) {
    console.error(`Erreur lors de la récupération des statistiques pour ${entity}:`, error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir les métriques de performance
export async function getPerformanceMetrics(req: Request, res: Response) {
  try {
    const [
      avgResponseTime,
      systemLoad,
      databaseMetrics
    ] = await Promise.all([
      // Simuler les métriques de performance
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
  } catch (error) {
    console.error("Erreur lors de la récupération des métriques:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir un résumé rapide pour les widgets
export async function getQuickSummary(req: Request, res: Response) {
  try {
    const [
      totalUsers,
      totalProprietaires,
      totalVehicules,
      totalDocuments,
      todayRegistrations,
      weeklyStats
    ] = await Promise.all([
      // Totaux généraux
      db.user.count(),
      db.proprietaire.count(),
      db.vehicule.count(),
      db.document.count(),
      
      // Enregistrements d'aujourd'hui
      db.vehicule.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      // Statistiques de la semaine
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
  } catch (error) {
    console.error('Erreur lors de la récupération du résumé:', error);
    return res.status(500).json({
      data: null,
      error: 'Erreur lors de la récupération du résumé'
    });
  }
}

// Fonction helper pour calculer la croissance hebdomadaire
async function getWeeklyGrowth() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const [
    usersThisWeek,
    proprietairesThisWeek,
    vehiculesThisWeek,
    documentsThisWeek
  ] = await Promise.all([
    db.user.count({
      where: { createdAt: { gte: oneWeekAgo } }
    }),
    db.proprietaire.count({
      where: { createdAt: { gte: oneWeekAgo } }
    }),
    db.vehicule.count({
      where: { createdAt: { gte: oneWeekAgo } }
    }),
    db.document.count({
      where: { createdAt: { gte: oneWeekAgo } }
    })
  ]);

  return {
    users: usersThisWeek,
    proprietaires: proprietairesThisWeek,
    vehicules: vehiculesThisWeek,
    documents: documentsThisWeek
  };
}

// Fonctions utilitaires

async function getTendanceCreations() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const [users, proprietaires, vehicules, documents] = await Promise.all([
    db.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true }
    }),
    db.proprietaire.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true }
    }),
    db.vehicule.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true }
    }),
    db.document.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true }
    })
  ]);

  // Grouper par jour
  const groupByDay = (items: { createdAt: Date }[]) => {
    const groups: { [key: string]: number } = {};
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
}

async function getUsersDetailedStats(startDate: Date) {
  const [
    total,
    recent,
    byRole,
    activeInactive,
    loginStats
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: startDate } } }),
    db.user.groupBy({ by: ['role'], _count: { id: true } }),
    db.user.groupBy({ by: ['isActive'], _count: { id: true } }),
    db.user.aggregate({
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
}

async function getProprietairesDetailedStats(startDate: Date) {
  const [
    total,
    recent,
    byTypePiece,
    withVehicles,
    withoutVehicles
  ] = await Promise.all([
    db.proprietaire.count(),
    db.proprietaire.count({ where: { createdAt: { gte: startDate } } }),
    db.proprietaire.groupBy({ by: ['typePiece'], _count: { id: true } }),
    db.proprietaire.count({ where: { vehicules: { some: {} } } }),
    db.proprietaire.count({ where: { vehicules: { none: {} } } })
  ]);

  return {
    total,
    recent,
    byTypePiece: byTypePiece.map(r => ({ type: r.typePiece, count: r._count.id })),
    withVehicles,
    withoutVehicles
  };
}

async function getVehiculesDetailedStats(startDate: Date) {
  const [
    total,
    recent,
    byType,
    byYear,
    withDocuments,
    withoutDocuments
  ] = await Promise.all([
    db.vehicule.count(),
    db.vehicule.count({ where: { createdAt: { gte: startDate } } }),
    db.vehicule.groupBy({ by: ['typeVehicule'], _count: { id: true } }),
    db.vehicule.groupBy({ 
      by: ['anneeFabrication'], 
      _count: { id: true },
      orderBy: { anneeFabrication: 'desc' },
      take: 10
    }),
    db.vehicule.count({ where: { documents: { some: {} } } }),
    db.vehicule.count({ where: { documents: { none: {} } } })
  ]);

  return {
    total,
    recent,
    byType: byType.map(r => ({ type: r.typeVehicule, count: r._count.id })),
    byYear: byYear.map(r => ({ year: r.anneeFabrication, count: r._count.id })),
    withDocuments,
    withoutDocuments
  };
}

async function getDocumentsDetailedStats(startDate: Date) {
  const [
    total,
    recent,
    byType,
    forProprietaires,
    forVehicules,
    totalSize
  ] = await Promise.all([
    db.document.count(),
    db.document.count({ where: { createdAt: { gte: startDate } } }),
    db.document.groupBy({ by: ['type'], _count: { id: true } }),
    db.document.count({ where: { proprietaireId: { not: null } } }),
    db.document.count({ where: { vehiculeId: { not: null } } }),
    db.document.aggregate({ _sum: { taille: true } })
  ]);

  return {
    total,
    recent,
    byType: byType.map(r => ({ type: r.type, count: r._count.id })),
    forProprietaires,
    forVehicules,
    totalSize: totalSize._sum.taille || 0
  };
}

async function getDatabaseMetrics() {
  const [
    totalRecords,
    tablesCount
  ] = await Promise.all([
    Promise.all([
      db.user.count(),
      db.proprietaire.count(),
      db.vehicule.count(),
      db.document.count(),
      db.auditLog.count()
    ]).then(counts => counts.reduce((sum, count) => sum + count, 0)),
    Promise.resolve(5) // Nombre de tables principales
  ]);

  return {
    totalRecords,
    tablesCount,
    estimatedSize: totalRecords * 1024, // Estimation simple
    connectionsActive: 1 // Simulé
  };
}

// Obtenir les statistiques des véhicules par catégorie avec filtres temporels
export async function getVehicleStatsByCategory(req: Request, res: Response) {
  try {
    const { period } = req.query; // 'day', 'week', 'month'
    
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
        // Pas de filtre temporel - tous les véhicules
        break;
    }

    // Statistiques par type de véhicule avec revenus
    const vehiculesByCategory = await db.vehicule.groupBy({
      by: ['typeVehicule'],
      where: dateFilter,
      _count: { id: true },
      _sum: { prixEnregistrement: true }
    });

    // Formater les données avec les informations de prix
    const formattedStats = vehiculesByCategory.map(item => ({
      category: item.typeVehicule,
      count: item._count.id,
      totalRevenue: item._sum.prixEnregistrement || 0,
      standardPrice: calculateRegistrationPrice(item.typeVehicule),
      label: item.typeVehicule === 'BUS' ? 'Bus' : 
             item.typeVehicule === 'MINI_BUS' ? 'Mini Bus' : 
             'Taxi'
    }));

    // Calculer les totaux
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
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques par catégorie:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur lors de la récupération des statistiques"
    });
  }
}

// Obtenir l'évolution des revenus par période
export async function getRevenueEvolution(req: Request, res: Response) {
  try {
    const { days = 30 } = req.query;
    const numDays = parseInt(days as string);
    
    const evolution = [];
    const now = new Date();
    
    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      
      const dayStats = await db.vehicule.groupBy({
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
    
    return res.json({
      data: evolution,
      error: null
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'évolution des revenus:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur lors de la récupération de l'évolution"
    });
  }
}

// Obtenir les statistiques d'activité récente
export async function getRecentActivity(req: Request, res: Response) {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const dateLimit = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      nouveauxUtilisateurs,
      nouveauxProprietaires,
      nouveauxVehicules,
      nouveauxDocuments
    ] = await Promise.all([
      db.user.count({
        where: {
          createdAt: {
            gte: dateLimit
          }
        }
      }),
      db.proprietaire.count({
        where: {
          createdAt: {
            gte: dateLimit
          }
        }
      }),
      db.vehicule.count({
        where: {
          createdAt: {
            gte: dateLimit
          }
        }
      }),
      db.document.count({
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
  } catch (error) {
    console.error("Erreur lors de la récupération de l'activité récente:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur lors de la récupération de l'activité récente"
    });
  }
}

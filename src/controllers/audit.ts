import { db } from "@/db/db";
import { Request, Response } from "express";
import { getAuthenticatedUser } from "@/types";

// Obtenir tous les logs d'audit
export async function getAuditLogs(req: Request, res: Response) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      action,
      table,
      userId,
      startDate,
      endDate
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (table) {
      where.table = table;
    }

    if (userId) {
      where.userId = userId;
    }

    // Filtrage par date
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const [auditLogs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" }
      }),
      db.auditLog.count({ where })
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
  } catch (error) {
    console.error("Erreur lors de la récupération des logs d'audit:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir un log d'audit par ID
export async function getAuditLogById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const auditLog = await db.auditLog.findUnique({
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
  } catch (error) {
    console.error("Erreur lors de la récupération du log d'audit:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir les logs d'audit pour un enregistrement spécifique
export async function getAuditLogsByRecord(req: Request, res: Response) {
  const { table, recordId } = req.params;

  try {
    const auditLogs = await db.auditLog.findMany({
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
  } catch (error) {
    console.error("Erreur lors de la récupération des logs d'audit pour l'enregistrement:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Obtenir les statistiques des logs d'audit
export async function getAuditStats(req: Request, res: Response) {
  try {
    const [
      totalLogs,
      actionsRepartition,
      tablesRepartition,
      activiteRecente,
      utilisateursActifs
    ] = await Promise.all([
      db.auditLog.count(),
      db.auditLog.groupBy({
        by: ['action'],
        _count: {
          id: true
        }
      }),
      db.auditLog.groupBy({
        by: ['table'],
        _count: {
          id: true
        }
      }),
      db.auditLog.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Dernières 24h
          }
        },
        orderBy: { createdAt: "desc" },
        take: 10
      }),
      db.auditLog.groupBy({
        by: ['userId'],
        where: {
          userId: { not: null },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Dernière semaine
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
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques d'audit:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Purger les anciens logs d'audit
export async function purgeOldAuditLogs(req: Request, res: Response) {  const { days = 90 } = req.body; // Par défaut, supprimer les logs de plus de 90 jours
  
  const { userId } = getAuthenticatedUser(req);

  try {
    const cutoffDate = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const deletedLogs = await db.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    // Log de cette action
    await db.auditLog.create({
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
  } catch (error) {
    console.error("Erreur lors de la purge des logs d'audit:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

// Exporter les logs d'audit
export async function exportAuditLogs(req: Request, res: Response) {
  try {
    const { 
      startDate,
      endDate,
      action,
      table,
      format = 'json'
    } = req.query;

    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (table) {
      where.table = table;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const auditLogs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    if (format === 'csv') {
      // Conversion en CSV
      const csvHeader = 'ID,Action,Table,Record ID,User ID,User Email,Created At,Old Values,New Values\n';
      const csvData = auditLogs.map(log => 
        `"${log.id}","${log.action}","${log.table}","${log.recordId}","${log.userId || ''}","${log.userEmail || ''}","${log.createdAt.toISOString()}","${JSON.stringify(log.oldValues) || ''}","${JSON.stringify(log.newValues) || ''}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
      return res.send(csvHeader + csvData);
    }

    // Format JSON par défaut
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.json"`);
    
    return res.json({
      exportDate: new Date().toISOString(),
      totalRecords: auditLogs.length,
      filters: { startDate, endDate, action, table },
      data: auditLogs
    });
  } catch (error) {
    console.error("Erreur lors de l'export des logs d'audit:", error);
    return res.status(500).json({
      data: null,
      error: "Erreur interne du serveur"
    });
  }
}

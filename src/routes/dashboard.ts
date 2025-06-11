import express from "express";
import {
  getDashboardStats,
  getEntityStats,
  getPerformanceMetrics,
  getQuickSummary,
  getVehicleStatsByCategory,
  getRevenueEvolution,
  getRecentActivity
} from "@/controllers/dashboard";
import { authenticateToken, authorizeRoles } from "@/middleware/auth";

const dashboardRouter = express.Router();

// Toutes les routes nécessitent une authentification
dashboardRouter.use(authenticateToken);

// Routes du tableau de bord
dashboardRouter.get("/stats", getDashboardStats);
dashboardRouter.get("/summary", getQuickSummary);
dashboardRouter.get("/entity/:entity", getEntityStats);
dashboardRouter.get("/performance", authorizeRoles("ADMIN"), getPerformanceMetrics);
dashboardRouter.get("/vehicles-by-category", getVehicleStatsByCategory);
dashboardRouter.get("/revenue-evolution", getRevenueEvolution);
dashboardRouter.get("/recent-activity", getRecentActivity);

export default dashboardRouter;

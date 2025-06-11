"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dashboard_1 = require("../controllers/dashboard");
const auth_1 = require("../middleware/auth");
const dashboardRouter = express_1.default.Router();
dashboardRouter.use(auth_1.authenticateToken);
dashboardRouter.get("/stats", dashboard_1.getDashboardStats);
dashboardRouter.get("/summary", dashboard_1.getQuickSummary);
dashboardRouter.get("/entity/:entity", dashboard_1.getEntityStats);
dashboardRouter.get("/performance", (0, auth_1.authorizeRoles)("ADMIN"), dashboard_1.getPerformanceMetrics);
dashboardRouter.get("/vehicles-by-category", dashboard_1.getVehicleStatsByCategory);
dashboardRouter.get("/revenue-evolution", dashboard_1.getRevenueEvolution);
dashboardRouter.get("/recent-activity", dashboard_1.getRecentActivity);
exports.default = dashboardRouter;

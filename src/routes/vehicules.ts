import express from "express";
import {
  createVehicule,
  getVehicules,
  getVehiculeById,
  updateVehicule,
  deleteVehicule,
  getVehiculesStats
} from "@/controllers/vehicules";
import { authenticateToken, authorizeRoles } from "@/middleware/auth";
import { validate } from "@/middleware/validateRequest";
import {
  createVehiculeSchema,
  updateVehiculeSchema,
  paginationSchema,
  idParamSchema
} from "@/middleware/validation";

const vehiculeRouter = express.Router();

// Toutes les routes nécessitent une authentification
vehiculeRouter.use(authenticateToken);

// Routes CRUD
vehiculeRouter.post("/", validate(createVehiculeSchema), createVehicule);
vehiculeRouter.get("/", validate(paginationSchema), getVehicules);
vehiculeRouter.get("/stats", getVehiculesStats);
vehiculeRouter.get("/:id", validate(idParamSchema), getVehiculeById);
vehiculeRouter.put("/:id", validate(idParamSchema), validate(updateVehiculeSchema), updateVehicule);
vehiculeRouter.delete("/:id", authorizeRoles("ADMIN"), validate(idParamSchema), deleteVehicule);

export default vehiculeRouter;

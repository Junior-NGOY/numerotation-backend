import express from "express";
import {
  createProprietaire,
  getProprietaires,
  getProprietaireById,
  updateProprietaire,
  deleteProprietaire,
  getProprietairesStats
} from "@/controllers/proprietaires";
import { authenticateToken, authorizeRoles } from "@/middleware/auth";
import { validate } from "@/middleware/validateRequest";
import { singleUpload } from "@/middleware/upload";
import {
  createProprietaireSchema,
  updateProprietaireSchema,
  paginationSchema,
  idParamSchema
} from "@/middleware/validation";

const proprietaireRouter = express.Router();

// Toutes les routes nécessitent une authentification
proprietaireRouter.use(authenticateToken);

// Routes CRUD
proprietaireRouter.post("/", singleUpload, validate(createProprietaireSchema), createProprietaire);
proprietaireRouter.get("/", validate(paginationSchema), getProprietaires);
proprietaireRouter.get("/stats", getProprietairesStats);
proprietaireRouter.get("/:id", validate(idParamSchema), getProprietaireById);
proprietaireRouter.put("/:id", validate(idParamSchema), validate(updateProprietaireSchema), updateProprietaire);
proprietaireRouter.delete("/:id", authorizeRoles("ADMIN"), validate(idParamSchema), deleteProprietaire);

export default proprietaireRouter;

import express from "express";
import {
  createItineraire,
  getItineraires,
  getItineraireById,
  updateItineraire,
  deleteItineraire,
  getItinerairesStats,
  getActiveItineraires
} from "@/controllers/itineraires";
import { authenticateToken, authorizeRoles } from "@/middleware/auth";
import { validate } from "@/middleware/validateRequest";
import {
  createItineraireSchema,
  updateItineraireSchema,
  paginationSchema,
  idParamSchema
} from "@/middleware/validation";

const itineraireRouter = express.Router();

// Toutes les routes nécessitent une authentification
itineraireRouter.use(authenticateToken);

// Routes CRUD
itineraireRouter.post("/", validate(createItineraireSchema), createItineraire);
itineraireRouter.get("/", validate(paginationSchema), getItineraires);
itineraireRouter.get("/active", getActiveItineraires); // Route pour récupérer les itinéraires actifs (select)
itineraireRouter.get("/stats", getItinerairesStats);
itineraireRouter.get("/:id", validate(idParamSchema), getItineraireById);
itineraireRouter.put("/:id", validate(idParamSchema), validate(updateItineraireSchema), updateItineraire);
itineraireRouter.delete("/:id", authorizeRoles("ADMIN"), validate(idParamSchema), deleteItineraire);

export default itineraireRouter;

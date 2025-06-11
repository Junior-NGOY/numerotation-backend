import express from "express";
import {
  uploadDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  downloadDocument,
  getDocumentsStats
} from "@/controllers/documents";
import { authenticateToken, authorizeRoles } from "@/middleware/auth";
import { singleUpload, multipleUpload } from "@/middleware/upload";
import { validate } from "@/middleware/validateRequest";
import {
  uploadDocumentSchema,
  updateDocumentSchema,
  paginationSchema,
  idParamSchema
} from "@/middleware/validation";

const documentRouter = express.Router();

// Toutes les routes nécessitent une authentification
documentRouter.use(authenticateToken);

// Routes CRUD
documentRouter.post("/upload", singleUpload, validate(uploadDocumentSchema), uploadDocument);
documentRouter.post("/upload-multiple", multipleUpload, uploadDocument);
documentRouter.get("/", validate(paginationSchema), getDocuments);
documentRouter.get("/stats", getDocumentsStats);
documentRouter.get("/:id", validate(idParamSchema), getDocumentById);
documentRouter.get("/:id/download", validate(idParamSchema), downloadDocument);
documentRouter.put("/:id", validate(idParamSchema), validate(updateDocumentSchema), updateDocument);
documentRouter.delete("/:id", authorizeRoles("ADMIN"), validate(idParamSchema), deleteDocument);

export default documentRouter;

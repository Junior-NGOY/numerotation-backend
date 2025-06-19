import express from "express";
import path from "path";
import userRouter from "./routes/users";
import proprietaireRouter from "./routes/proprietaires";
import vehiculeRouter from "./routes/vehicules";
import documentRouter from "./routes/documents";
import auditRouter from "./routes/audit";
import dashboardRouter from "./routes/dashboard";
import verificationRouter from "./routes/verification";
import { logRequest } from "./middleware/auth";
import { initializeUploadDirectories } from "./config/upload";

require("dotenv").config();
const cors = require("cors");
const app = express();

// Initialiser les dossiers d'upload
initializeUploadDirectories();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware de logging des requêtes
app.use(logRequest);

// Servir les fichiers statiques uploadés
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const PORT = process.env.PORT || 8000;

// Routes API
app.use("/api/v1/users", userRouter);
app.use("/api/v1/proprietaires", proprietaireRouter);
app.use("/api/v1/vehicules", vehiculeRouter);
app.use("/api/v1/documents", documentRouter);
app.use("/api/v1/audit", auditRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/verify", verificationRouter); // Route publique de vérification

// Route de santé
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Middleware de gestion d'erreurs globales
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erreur non gérée:', err);
  res.status(500).json({
    data: null,
    error: "Une erreur interne s'est produite"
  });
});

// Gestion des routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    data: null,
    error: "Route non trouvée"
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});

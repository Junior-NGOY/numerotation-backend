"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const users_1 = __importDefault(require("./routes/users"));
const proprietaires_1 = __importDefault(require("./routes/proprietaires"));
const vehicules_1 = __importDefault(require("./routes/vehicules"));
const documents_1 = __importDefault(require("./routes/documents"));
const documents_access_1 = __importDefault(require("./routes/documents-access"));
const audit_1 = __importDefault(require("./routes/audit"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const itineraires_1 = __importDefault(require("./routes/itineraires"));
const storage_1 = __importDefault(require("./routes/storage"));
const verification_1 = __importDefault(require("./routes/verification"));
const auth_1 = require("./middleware/auth");
const upload_1 = require("./config/upload");
require("dotenv").config();
const cors = require("cors");
const app = (0, express_1.default)();
(0, upload_1.initializeUploadDirectories)();
app.use(cors());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use(auth_1.logRequest);
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
const PORT = process.env.PORT || 8000;
app.use("/api/v1/users", users_1.default);
app.use("/api/v1/proprietaires", proprietaires_1.default);
app.use("/api/v1/vehicules", vehicules_1.default);
app.use("/api/v1/documents", documents_1.default);
app.use("/api/v1/documents-access", documents_access_1.default);
app.use("/api/v1/audit", audit_1.default);
app.use("/api/v1/dashboard", dashboard_1.default);
app.use("/api/v1/itineraires", itineraires_1.default);
app.use("/api/v1/storage", storage_1.default);
app.use("/api/v1/verify", verification_1.default);
app.use("/api/v1/access", documents_access_1.default);
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
app.use((err, req, res, next) => {
    console.error('Erreur non gérée:', err);
    res.status(500).json({
        data: null,
        error: "Une erreur interne s'est produite"
    });
});
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

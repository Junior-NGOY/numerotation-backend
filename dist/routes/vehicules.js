"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const vehicules_1 = require("../controllers/vehicules");
const auth_1 = require("../middleware/auth");
const validateRequest_1 = require("../middleware/validateRequest");
const validation_1 = require("../middleware/validation");
const vehiculeRouter = express_1.default.Router();
vehiculeRouter.use(auth_1.authenticateToken);
vehiculeRouter.post("/", (0, validateRequest_1.validate)(validation_1.createVehiculeSchema), vehicules_1.createVehicule);
vehiculeRouter.get("/", (0, validateRequest_1.validate)(validation_1.paginationSchema), vehicules_1.getVehicules);
vehiculeRouter.get("/stats", vehicules_1.getVehiculesStats);
vehiculeRouter.get("/:id", (0, validateRequest_1.validate)(validation_1.idParamSchema), vehicules_1.getVehiculeById);
vehiculeRouter.put("/:id", (0, validateRequest_1.validate)(validation_1.idParamSchema), (0, validateRequest_1.validate)(validation_1.updateVehiculeSchema), vehicules_1.updateVehicule);
vehiculeRouter.delete("/:id", (0, auth_1.authorizeRoles)("ADMIN"), (0, validateRequest_1.validate)(validation_1.idParamSchema), vehicules_1.deleteVehicule);
exports.default = vehiculeRouter;

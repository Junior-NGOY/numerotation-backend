"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const storage_1 = require("../controllers/storage");
const auth_1 = require("../middleware/auth");
const storageRouter = express_1.default.Router();
storageRouter.use(auth_1.authenticateToken);
storageRouter.get("/pinata/test", storage_1.testPinataConnection);
storageRouter.get("/stats", (0, auth_1.authorizeRoles)("ADMIN"), storage_1.getStorageStats);
exports.default = storageRouter;

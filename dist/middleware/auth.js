"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.authorizeRoles = authorizeRoles;
exports.canModifyResource = canModifyResource;
exports.logRequest = logRequest;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db/db");
function authenticateToken(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                data: null,
                error: "Token d'accès requis"
            });
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "fallback-secret");
            const user = yield db_1.db.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true, role: true, isActive: true }
            });
            if (!user) {
                return res.status(401).json({
                    data: null,
                    error: "Utilisateur non trouvé"
                });
            }
            if (!user.isActive) {
                return res.status(403).json({
                    data: null,
                    error: "Compte désactivé"
                });
            }
            req.user = {
                userId: user.id,
                email: user.email,
                role: user.role
            };
            next();
        }
        catch (error) {
            return res.status(403).json({
                data: null,
                error: "Token invalide"
            });
        }
    });
}
function authorizeRoles(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                data: null,
                error: "Non authentifié"
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                data: null,
                error: "Accès non autorisé"
            });
        }
        next();
    };
}
function canModifyResource(req, res, next) {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'ADMIN') {
        return next();
    }
    next();
}
function logRequest(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        var _a;
        const duration = Date.now() - start;
        console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - User: ${((_a = req.user) === null || _a === void 0 ? void 0 : _a.email) || 'Anonymous'}`);
    });
    next();
}

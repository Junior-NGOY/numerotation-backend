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
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPinataConnection = testPinataConnection;
exports.getStorageStats = getStorageStats;
const pinata_1 = require("../services/pinata");
const types_1 = require("../types");
function testPinataConnection(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const isConfigured = pinata_1.pinataService.isConfigured();
            if (!isConfigured) {
                return res.status(200).json({
                    data: {
                        configured: false,
                        message: "PINATA is not configured. File uploads will use local storage.",
                        status: "warning"
                    },
                    error: null
                });
            }
            const isConnected = yield pinata_1.pinataService.testConnection();
            if (isConnected) {
                return res.status(200).json({
                    data: {
                        configured: true,
                        connected: true,
                        message: "PINATA connection successful!",
                        status: "success"
                    },
                    error: null
                });
            }
            else {
                return res.status(200).json({
                    data: {
                        configured: true,
                        connected: false,
                        message: "PINATA configuration error. Check your API keys.",
                        status: "error"
                    },
                    error: null
                });
            }
        }
        catch (error) {
            console.error("Error testing PINATA connection:", error);
            return res.status(500).json({
                data: null,
                error: "Internal server error"
            });
        }
    });
}
function getStorageStats(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId } = (0, types_1.getAuthenticatedUser)(req);
            const { db } = require("../db/db");
            const [totalDocuments, totalSize] = yield Promise.all([
                db.document.count(),
                db.document.aggregate({
                    _sum: {
                        taille: true
                    }
                })
            ]);
            const stats = {
                total: totalDocuments,
                external: 0,
                local: totalDocuments,
                totalSize: totalSize._sum.taille || 0,
                pinataConfigured: pinata_1.pinataService.isConfigured()
            };
            return res.status(200).json({
                data: stats,
                error: null
            });
        }
        catch (error) {
            console.error("Error getting storage stats:", error);
            return res.status(500).json({
                data: null,
                error: "Internal server error"
            });
        }
    });
}

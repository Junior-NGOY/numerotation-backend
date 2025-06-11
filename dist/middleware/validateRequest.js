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
exports.validatePagination = exports.validateId = exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            return next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errorMessages = error.errors.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }));
                return res.status(400).json({
                    data: null,
                    error: "Données de validation invalides",
                    details: errorMessages
                });
            }
            return res.status(500).json({
                data: null,
                error: "Erreur de validation interne"
            });
        }
    });
};
exports.validate = validate;
const validateId = (req, res, next) => {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || id.length < 20) {
        return res.status(400).json({
            data: null,
            error: "ID invalide fourni"
        });
    }
    next();
};
exports.validateId = validateId;
const validatePagination = (req, res, next) => {
    const { page, limit } = req.query;
    if (page && (isNaN(Number(page)) || Number(page) < 1)) {
        return res.status(400).json({
            data: null,
            error: "Le numéro de page doit être un entier positif"
        });
    }
    if (limit && (isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
        return res.status(400).json({
            data: null,
            error: "La limite doit être un entier entre 1 et 100"
        });
    }
    next();
};
exports.validatePagination = validatePagination;

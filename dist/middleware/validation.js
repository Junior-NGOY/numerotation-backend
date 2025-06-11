"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.idParamSchema = exports.paginationSchema = exports.updateDocumentSchema = exports.uploadDocumentSchema = exports.updateVehiculeSchema = exports.createVehiculeSchema = exports.updateProprietaireSchema = exports.createProprietaireSchema = exports.changePasswordSchema = exports.updateUserSchema = exports.loginUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email("Email invalide"),
        name: zod_1.z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
        password: zod_1.z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
        role: zod_1.z.enum(["ADMIN", "USER"]).optional()
    })
});
exports.loginUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email("Email invalide"),
        password: zod_1.z.string().min(1, "Mot de passe requis")
    })
});
exports.updateUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email("Email invalide").optional(),
        name: zod_1.z.string().min(2, "Le nom doit contenir au moins 2 caractères").optional(),
        role: zod_1.z.enum(["ADMIN", "USER"]).optional(),
        isActive: zod_1.z.boolean().optional()
    })
});
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string().min(1, "Mot de passe actuel requis"),
        newPassword: zod_1.z.string().min(6, "Le nouveau mot de passe doit contenir au moins 6 caractères")
    })
});
exports.createProprietaireSchema = zod_1.z.object({
    body: zod_1.z.object({
        nom: zod_1.z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
        prenom: zod_1.z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
        adresse: zod_1.z.string().min(5, "L'adresse doit être complète"),
        telephone: zod_1.z.string().regex(/^[+]?[0-9\s-()]{8,15}$/, "Numéro de téléphone invalide"),
        numeroPiece: zod_1.z.string().min(5, "Numéro de pièce invalide"),
        typePiece: zod_1.z.enum(["CARTE_IDENTITE", "PASSEPORT", "PERMIS_SEJOUR"]),
        lieuDelivrance: zod_1.z.string().min(2, "Lieu de délivrance requis"),
        dateDelivrance: zod_1.z.string().refine((date) => !isNaN(Date.parse(date)), {
            message: "Date de délivrance invalide"
        })
    })
});
exports.updateProprietaireSchema = zod_1.z.object({
    body: zod_1.z.object({
        nom: zod_1.z.string().min(2, "Le nom doit contenir au moins 2 caractères").optional(),
        prenom: zod_1.z.string().min(2, "Le prénom doit contenir au moins 2 caractères").optional(),
        adresse: zod_1.z.string().min(5, "L'adresse doit être complète").optional(),
        telephone: zod_1.z.string().regex(/^[+]?[0-9\s-()]{8,15}$/, "Numéro de téléphone invalide").optional(),
        numeroPiece: zod_1.z.string().min(5, "Numéro de pièce invalide").optional(),
        typePiece: zod_1.z.enum(["CARTE_IDENTITE", "PASSEPORT", "PERMIS_SEJOUR"]).optional(),
        lieuDelivrance: zod_1.z.string().min(2, "Lieu de délivrance requis").optional(),
        dateDelivrance: zod_1.z.string().refine((date) => !isNaN(Date.parse(date)), {
            message: "Date de délivrance invalide"
        }).optional()
    })
});
exports.createVehiculeSchema = zod_1.z.object({
    body: zod_1.z.object({
        marque: zod_1.z.string().min(2, "La marque doit contenir au moins 2 caractères"),
        modele: zod_1.z.string().min(1, "Le modèle est requis"),
        typeVehicule: zod_1.z.enum(["BUS", "MINI_BUS", "TAXI"]),
        numeroImmatriculation: zod_1.z.string().min(6, "Numéro d'immatriculation invalide"),
        numeroChassis: zod_1.z.string().min(10, "Numéro de châssis invalide"),
        anneeFabrication: zod_1.z.union([
            zod_1.z.string().transform((val) => parseInt(val, 10)),
            zod_1.z.number()
        ]).pipe(zod_1.z.number().int().min(1900).max(new Date().getFullYear())),
        capaciteAssises: zod_1.z.union([
            zod_1.z.string().transform((val) => parseInt(val, 10)),
            zod_1.z.number()
        ]).pipe(zod_1.z.number().int().min(1).max(100)),
        itineraire: zod_1.z.string().min(5, "L'itinéraire doit être spécifié"), codeUnique: zod_1.z.string().min(8, "Code unique invalide").optional(),
        anneeEnregistrement: zod_1.z.union([
            zod_1.z.string().transform((val) => parseInt(val, 10)),
            zod_1.z.number()
        ]).pipe(zod_1.z.number().int().min(1900).max(new Date().getFullYear())).optional(),
        proprietaireId: zod_1.z.string().cuid("ID propriétaire invalide")
    })
});
exports.updateVehiculeSchema = zod_1.z.object({
    body: zod_1.z.object({
        marque: zod_1.z.string().min(2, "La marque doit contenir au moins 2 caractères").optional(),
        modele: zod_1.z.string().min(1, "Le modèle est requis").optional(),
        typeVehicule: zod_1.z.enum(["BUS", "MINI_BUS", "TAXI"]).optional(),
        numeroImmatriculation: zod_1.z.string().min(6, "Numéro d'immatriculation invalide").optional(),
        numeroChassis: zod_1.z.string().min(10, "Numéro de châssis invalide").optional(),
        anneeFabrication: zod_1.z.union([
            zod_1.z.string().transform((val) => parseInt(val, 10)),
            zod_1.z.number()
        ]).pipe(zod_1.z.number().int().min(1900).max(new Date().getFullYear())).optional(),
        capaciteAssises: zod_1.z.union([
            zod_1.z.string().transform((val) => parseInt(val, 10)),
            zod_1.z.number()
        ]).pipe(zod_1.z.number().int().min(1).max(100)).optional(),
        itineraire: zod_1.z.string().min(5, "L'itinéraire doit être spécifié").optional(),
        codeUnique: zod_1.z.string().min(8, "Code unique invalide").optional(),
        anneeEnregistrement: zod_1.z.union([
            zod_1.z.string().transform((val) => parseInt(val, 10)),
            zod_1.z.number()
        ]).pipe(zod_1.z.number().int().min(1900).max(new Date().getFullYear())).optional(),
        proprietaireId: zod_1.z.string().cuid("ID propriétaire invalide").optional()
    })
});
exports.uploadDocumentSchema = zod_1.z.object({
    body: zod_1.z.object({
        nom: zod_1.z.string().min(1, "Le nom du document est requis"),
        type: zod_1.z.enum(["PIECE_IDENTITE", "PERMIS_CONDUIRE", "CARTE_ROSE", "PDF_COMPLET", "QR_CODE"]),
        proprietaireId: zod_1.z.string().cuid("ID propriétaire invalide").optional(),
        vehiculeId: zod_1.z.string().cuid("ID véhicule invalide").optional()
    }).refine((data) => data.proprietaireId || data.vehiculeId, {
        message: "Au moins un proprietaireId ou vehiculeId doit être fourni"
    })
});
exports.updateDocumentSchema = zod_1.z.object({
    body: zod_1.z.object({
        nom: zod_1.z.string().min(1, "Le nom du document est requis").optional(),
        type: zod_1.z.enum(["PIECE_IDENTITE", "PERMIS_CONDUIRE", "CARTE_ROSE", "PDF_COMPLET", "QR_CODE"]).optional()
    })
});
exports.paginationSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
        limit: zod_1.z.string().optional().transform((val) => val ? parseInt(val, 10) : 10),
        search: zod_1.z.string().optional(),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(["asc", "desc"]).optional()
    })
});
exports.idParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().cuid("ID invalide")
    })
});

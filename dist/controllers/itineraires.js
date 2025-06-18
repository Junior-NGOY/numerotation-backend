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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createItineraire = createItineraire;
exports.getItineraires = getItineraires;
exports.getItineraireById = getItineraireById;
exports.updateItineraire = updateItineraire;
exports.deleteItineraire = deleteItineraire;
exports.getItinerairesStats = getItinerairesStats;
exports.getActiveItineraires = getActiveItineraires;
const db_1 = require("../db/db");
const types_1 = require("../types");
function transformItineraire(itineraire) {
    if (!itineraire)
        return null;
    const { duree } = itineraire, rest = __rest(itineraire, ["duree"]);
    return Object.assign(Object.assign({}, rest), { dureeEstimee: duree });
}
function transformItineraires(itineraires) {
    return itineraires.map(transformItineraire).filter(Boolean);
}
function createItineraire(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { nom, description, distance, dureeEstimee } = req.body;
        const { userId } = (0, types_1.getAuthenticatedUser)(req);
        try {
            const existingItineraire = yield db_1.db.itineraire.findUnique({
                where: { nom }
            });
            if (existingItineraire) {
                return res.status(409).json({
                    data: null,
                    error: "Un itinéraire avec ce nom existe déjà"
                });
            }
            const newItineraire = yield db_1.db.itineraire.create({
                data: {
                    nom,
                    description,
                    distance: distance ? parseFloat(distance) : null,
                    duree: dureeEstimee ? parseInt(dureeEstimee) : null,
                    createdById: userId
                }
            });
            yield db_1.db.auditLog.create({
                data: {
                    action: "CREATE",
                    table: "Itineraire",
                    recordId: newItineraire.id,
                    newValues: newItineraire,
                    userId: userId
                }
            });
            return res.status(201).json({
                data: transformItineraire(newItineraire),
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la création de l'itinéraire:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getItineraires(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { page = 1, limit = 10, search = "", sortBy = "createdAt", sortOrder = "desc", isActive } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const take = Number(limit);
            const where = {};
            if (search) {
                where.OR = [
                    { nom: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } }
                ];
            }
            if (isActive !== undefined) {
                where.isActive = isActive === 'true';
            }
            const orderBy = {};
            orderBy[sortBy] = sortOrder;
            const [itineraires, total] = yield Promise.all([
                db_1.db.itineraire.findMany({
                    where,
                    skip,
                    take,
                    orderBy,
                    include: {
                        createdBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        },
                        _count: {
                            select: {
                                vehicules: true
                            }
                        }
                    }
                }),
                db_1.db.itineraire.count({ where })
            ]);
            const totalPages = Math.ceil(total / take);
            return res.status(200).json({
                data: {
                    itineraires: transformItineraires(itineraires),
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        totalPages
                    }
                },
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération des itinéraires:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getItineraireById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        try {
            const itineraire = yield db_1.db.itineraire.findUnique({
                where: { id },
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    vehicules: {
                        select: {
                            id: true,
                            marque: true,
                            modele: true,
                            numeroImmatriculation: true,
                            proprietaire: {
                                select: {
                                    nom: true,
                                    prenom: true
                                }
                            }
                        }
                    },
                    _count: {
                        select: {
                            vehicules: true
                        }
                    }
                }
            });
            if (!itineraire) {
                return res.status(404).json({
                    data: null,
                    error: "Itinéraire non trouvé"
                });
            }
            return res.status(200).json({
                data: transformItineraire(itineraire),
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération de l'itinéraire:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function updateItineraire(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        const { nom, description, distance, dureeEstimee, isActive } = req.body;
        const { userId: updatedById } = (0, types_1.getAuthenticatedUser)(req);
        try {
            const existingItineraire = yield db_1.db.itineraire.findUnique({
                where: { id }
            });
            if (!existingItineraire) {
                return res.status(404).json({
                    data: null,
                    error: "Itinéraire non trouvé"
                });
            }
            if (nom && nom !== existingItineraire.nom) {
                const nameExists = yield db_1.db.itineraire.findUnique({
                    where: { nom }
                });
                if (nameExists) {
                    return res.status(409).json({
                        data: null,
                        error: "Un itinéraire avec ce nom existe déjà"
                    });
                }
            }
            const updateData = {};
            if (nom)
                updateData.nom = nom;
            if (description !== undefined)
                updateData.description = description;
            if (distance !== undefined)
                updateData.distance = distance ? parseFloat(distance) : null;
            if (dureeEstimee !== undefined)
                updateData.duree = dureeEstimee ? parseInt(dureeEstimee) : null;
            if (isActive !== undefined)
                updateData.isActive = Boolean(isActive);
            const updatedItineraire = yield db_1.db.itineraire.update({
                where: { id },
                data: updateData,
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    _count: {
                        select: {
                            vehicules: true
                        }
                    }
                }
            });
            yield db_1.db.auditLog.create({
                data: {
                    action: "UPDATE",
                    table: "Itineraire",
                    recordId: id,
                    oldValues: existingItineraire,
                    newValues: updatedItineraire,
                    userId: updatedById
                }
            });
            return res.status(200).json({
                data: transformItineraire(updatedItineraire),
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la mise à jour de l'itinéraire:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function deleteItineraire(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        const { userId: deletedById } = (0, types_1.getAuthenticatedUser)(req);
        try {
            const existingItineraire = yield db_1.db.itineraire.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: {
                            vehicules: true
                        }
                    }
                }
            });
            if (!existingItineraire) {
                return res.status(404).json({
                    data: null,
                    error: "Itinéraire non trouvé"
                });
            }
            if (existingItineraire._count.vehicules > 0) {
                return res.status(400).json({
                    data: null,
                    error: `Impossible de supprimer cet itinéraire car ${existingItineraire._count.vehicules} véhicule(s) y sont associé(s)`
                });
            }
            yield db_1.db.itineraire.delete({
                where: { id }
            });
            yield db_1.db.auditLog.create({
                data: {
                    action: "DELETE",
                    table: "Itineraire",
                    recordId: id,
                    oldValues: existingItineraire,
                    userId: deletedById
                }
            });
            return res.status(200).json({
                data: { message: "Itinéraire supprimé avec succès" },
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la suppression de l'itinéraire:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getItinerairesStats(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const [totalItineraires, activeItineraires, itinerairesWithVehicules, vehiculesCount] = yield Promise.all([
                db_1.db.itineraire.count(),
                db_1.db.itineraire.count({ where: { isActive: true } }),
                db_1.db.itineraire.count({
                    where: {
                        vehicules: {
                            some: {}
                        }
                    }
                }),
                db_1.db.vehicule.count()
            ]);
            const avgVehiculesPerItineraire = totalItineraires > 0 ? vehiculesCount / totalItineraires : 0;
            return res.status(200).json({
                data: {
                    totalItineraires,
                    activeItineraires,
                    inactiveItineraires: totalItineraires - activeItineraires,
                    itinerairesWithVehicules,
                    itinerairesWithoutVehicules: totalItineraires - itinerairesWithVehicules,
                    avgVehiculesPerItineraire: Math.round(avgVehiculesPerItineraire * 100) / 100
                },
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération des statistiques:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getActiveItineraires(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const itineraires = yield db_1.db.itineraire.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    nom: true,
                    description: true,
                    distance: true,
                    duree: true
                },
                orderBy: { nom: 'asc' }
            });
            return res.status(200).json({
                data: transformItineraires(itineraires),
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération des itinéraires actifs:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}

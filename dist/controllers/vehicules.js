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
exports.createVehicule = createVehicule;
exports.getVehicules = getVehicules;
exports.getVehiculeById = getVehiculeById;
exports.updateVehicule = updateVehicule;
exports.deleteVehicule = deleteVehicule;
exports.getVehiculesStats = getVehiculesStats;
exports.searchVehicule = searchVehicule;
const db_1 = require("../db/db");
const promises_1 = require("fs/promises");
const types_1 = require("../types");
const generateSlug_1 = require("../utils/generateSlug");
const pricingUtils_1 = require("../utils/pricingUtils");
const pinata_1 = require("../services/pinata");
function createVehicule(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { marque, modele, typeVehicule, numeroImmatriculation, numeroChassis, anneeFabrication, capaciteAssises, itineraireId, codeUnique: providedCodeUnique, anneeEnregistrement, proprietaireId } = req.body;
        const { userId: createdById } = (0, types_1.getAuthenticatedUser)(req);
        try {
            const finalAnneeEnregistrement = anneeEnregistrement || new Date().getFullYear();
            let codeUnique = providedCodeUnique;
            if (!codeUnique) {
                const nextSequence = yield (0, generateSlug_1.getNextVehicleSequence)(finalAnneeEnregistrement, numeroImmatriculation);
                codeUnique = (0, generateSlug_1.generateSequentialVehiculeCode)(finalAnneeEnregistrement, nextSequence, numeroImmatriculation);
                const existingVehicle = yield db_1.db.vehicule.findUnique({ where: { codeUnique } });
                if (existingVehicle) {
                    return res.status(500).json({
                        data: null,
                        error: "Conflit de génération de code unique, veuillez réessayer"
                    });
                }
            }
            const proprietaire = yield db_1.db.proprietaire.findUnique({
                where: { id: proprietaireId }
            });
            if (!proprietaire) {
                return res.status(404).json({
                    data: null,
                    error: "Propriétaire non trouvé"
                });
            }
            const [existingImmatriculation, existingChassis] = yield Promise.all([
                db_1.db.vehicule.findUnique({ where: { numeroImmatriculation } }),
                db_1.db.vehicule.findUnique({ where: { numeroChassis } })
            ]);
            if (existingImmatriculation) {
                return res.status(409).json({
                    data: null,
                    error: "Ce numéro d'immatriculation existe déjà"
                });
            }
            if (existingChassis) {
                return res.status(409).json({
                    data: null,
                    error: "Ce numéro de châssis existe déjà"
                });
            }
            if (providedCodeUnique) {
                const existingCodeUnique = yield db_1.db.vehicule.findUnique({ where: { codeUnique } });
                if (existingCodeUnique) {
                    return res.status(409).json({
                        data: null,
                        error: "Ce code unique existe déjà"
                    });
                }
            }
            const prixEnregistrement = (0, pricingUtils_1.calculateRegistrationPrice)(typeVehicule);
            const newVehicule = yield db_1.db.vehicule.create({
                data: {
                    marque,
                    modele,
                    typeVehicule,
                    numeroImmatriculation,
                    numeroChassis,
                    anneeFabrication,
                    capaciteAssises,
                    itineraireId,
                    codeUnique,
                    anneeEnregistrement: finalAnneeEnregistrement,
                    prixEnregistrement,
                    proprietaireId,
                    createdById
                },
                include: {
                    proprietaire: {
                        select: {
                            id: true,
                            nom: true,
                            prenom: true,
                            telephone: true
                        }
                    },
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    _count: {
                        select: {
                            documents: true
                        }
                    }
                }
            });
            const uploadedDocuments = [];
            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                console.log(`📎 ${req.files.length} fichier(s) détecté(s) pour le véhicule ${newVehicule.id}`);
                for (const file of req.files) {
                    try {
                        let documentData = {};
                        if (pinata_1.pinataService.isConfigured()) {
                            console.log('📤 Upload vers PINATA:', file.filename);
                            const pinataResult = yield pinata_1.pinataService.uploadFile(file.path, file.filename, {
                                type: 'CARTE_ROSE',
                                vehiculeId: newVehicule.id,
                                uploadedBy: createdById
                            });
                            const pinataUrl = pinata_1.pinataService.generateFileUrl(pinataResult.IpfsHash);
                            documentData = {
                                chemin: pinataUrl,
                                taille: file.size,
                                mimeType: file.mimetype
                            };
                            try {
                                yield (0, promises_1.unlink)(file.path);
                                console.log('🗑️ Fichier local supprimé après upload PINATA');
                            }
                            catch (unlinkError) {
                                console.warn('⚠️ Impossible de supprimer le fichier local:', unlinkError);
                            }
                            console.log('✅ Fichier uploadé vers PINATA:', pinataUrl);
                        }
                        else {
                            console.warn('⚠️ PINATA non configuré, impossible d\'uploader le fichier');
                            continue;
                        }
                        const document = yield db_1.db.document.create({
                            data: Object.assign({ nom: file.originalname, type: 'CARTE_ROSE', vehiculeId: newVehicule.id, createdById }, documentData)
                        });
                        uploadedDocuments.push(document);
                        console.log('💾 Document créé en base:', document.id);
                    }
                    catch (fileError) {
                        console.error('❌ Erreur lors du traitement du fichier:', file.filename, fileError);
                        try {
                            yield (0, promises_1.unlink)(file.path);
                        }
                        catch (unlinkError) {
                            console.error('Erreur lors de la suppression du fichier:', unlinkError);
                        }
                    }
                }
                if (uploadedDocuments.length > 0) {
                    console.log(`✅ ${uploadedDocuments.length} document(s) uploadé(s) avec succès pour le véhicule ${newVehicule.id}`);
                }
            }
            yield db_1.db.auditLog.create({
                data: {
                    action: "CREATE",
                    table: "Vehicule",
                    recordId: newVehicule.id,
                    newValues: Object.assign(Object.assign({}, newVehicule), { uploadedDocuments: uploadedDocuments.length }),
                    userId: createdById
                }
            });
            return res.status(201).json({
                data: Object.assign(Object.assign({}, newVehicule), { uploadedDocuments: uploadedDocuments.length }),
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la création du véhicule:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getVehicules(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { page = 1, limit = 10, search, typeVehicule, proprietaireId, anneeFabrication } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const where = {};
            if (search) {
                where.OR = [
                    { marque: { contains: search, mode: "insensitive" } },
                    { modele: { contains: search, mode: "insensitive" } },
                    { numeroImmatriculation: { contains: search, mode: "insensitive" } },
                    { numeroChassis: { contains: search, mode: "insensitive" } },
                    { codeUnique: { contains: search, mode: "insensitive" } },
                    {
                        proprietaire: {
                            OR: [
                                { nom: { contains: search, mode: "insensitive" } },
                                { prenom: { contains: search, mode: "insensitive" } }
                            ]
                        }
                    }
                ];
            }
            if (typeVehicule) {
                where.typeVehicule = typeVehicule;
            }
            if (proprietaireId) {
                where.proprietaireId = proprietaireId;
            }
            if (anneeFabrication) {
                where.anneeFabrication = parseInt(anneeFabrication);
            }
            const [vehicules, total] = yield Promise.all([
                db_1.db.vehicule.findMany({
                    where,
                    include: {
                        proprietaire: {
                            select: {
                                id: true,
                                nom: true,
                                prenom: true,
                                telephone: true,
                                numeroPiece: true
                            }
                        },
                        createdBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        },
                        _count: {
                            select: {
                                documents: true
                            }
                        }
                    },
                    skip,
                    take: Number(limit),
                    orderBy: { createdAt: "desc" }
                }),
                db_1.db.vehicule.count({ where })
            ]);
            return res.status(200).json({
                data: {
                    items: vehicules,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        totalPages: Math.ceil(total / Number(limit))
                    }
                },
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération des véhicules:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getVehiculeById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        try {
            const vehicule = yield db_1.db.vehicule.findUnique({
                where: { id },
                include: {
                    proprietaire: true,
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    documents: {
                        include: {
                            createdBy: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    },
                    _count: {
                        select: {
                            documents: true
                        }
                    }
                }
            });
            if (!vehicule) {
                return res.status(404).json({
                    data: null,
                    error: "Véhicule non trouvé"
                });
            }
            return res.status(200).json({
                data: vehicule,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération du véhicule:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function updateVehicule(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        const { marque, modele, typeVehicule, numeroImmatriculation, numeroChassis, anneeFabrication, capaciteAssises, itineraireId, codeUnique, anneeEnregistrement, proprietaireId } = req.body;
        const { userId } = (0, types_1.getAuthenticatedUser)(req);
        try {
            const existingVehicule = yield db_1.db.vehicule.findUnique({
                where: { id }
            });
            if (!existingVehicule) {
                return res.status(404).json({
                    data: null,
                    error: "Véhicule non trouvé"
                });
            }
            if (proprietaireId && proprietaireId !== existingVehicule.proprietaireId) {
                const proprietaire = yield db_1.db.proprietaire.findUnique({
                    where: { id: proprietaireId }
                });
                if (!proprietaire) {
                    return res.status(404).json({
                        data: null,
                        error: "Propriétaire non trouvé"
                    });
                }
            }
            const checks = [];
            if (numeroImmatriculation && numeroImmatriculation !== existingVehicule.numeroImmatriculation) {
                checks.push(db_1.db.vehicule.findUnique({ where: { numeroImmatriculation } })
                    .then(result => ({ type: 'immatriculation', exists: !!result })));
            }
            if (numeroChassis && numeroChassis !== existingVehicule.numeroChassis) {
                checks.push(db_1.db.vehicule.findUnique({ where: { numeroChassis } })
                    .then(result => ({ type: 'chassis', exists: !!result })));
            }
            if (codeUnique && codeUnique !== existingVehicule.codeUnique) {
                checks.push(db_1.db.vehicule.findUnique({ where: { codeUnique } })
                    .then(result => ({ type: 'code', exists: !!result })));
            }
            const results = yield Promise.all(checks);
            const conflicts = results.filter(r => r.exists);
            if (conflicts.length > 0) {
                const conflictTypes = {
                    immatriculation: "Ce numéro d'immatriculation existe déjà",
                    chassis: "Ce numéro de châssis existe déjà",
                    code: "Ce code unique existe déjà"
                };
                return res.status(409).json({
                    data: null,
                    error: conflictTypes[conflicts[0].type]
                });
            }
            const oldValues = {
                marque: existingVehicule.marque,
                modele: existingVehicule.modele,
                typeVehicule: existingVehicule.typeVehicule,
                numeroImmatriculation: existingVehicule.numeroImmatriculation,
                numeroChassis: existingVehicule.numeroChassis,
                anneeFabrication: existingVehicule.anneeFabrication,
                capaciteAssises: existingVehicule.capaciteAssises,
                itineraireId: existingVehicule.itineraireId,
                codeUnique: existingVehicule.codeUnique,
                anneeEnregistrement: existingVehicule.anneeEnregistrement,
                prixEnregistrement: existingVehicule.prixEnregistrement,
                proprietaireId: existingVehicule.proprietaireId
            };
            const finalTypeVehicule = typeVehicule || existingVehicule.typeVehicule;
            const prixEnregistrement = typeVehicule ? (0, pricingUtils_1.calculateRegistrationPrice)(typeVehicule) : existingVehicule.prixEnregistrement;
            const updatedVehicule = yield db_1.db.vehicule.update({
                where: { id },
                data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (marque && { marque })), (modele && { modele })), (typeVehicule && { typeVehicule, prixEnregistrement })), (numeroImmatriculation && { numeroImmatriculation })), (numeroChassis && { numeroChassis })), (anneeFabrication && { anneeFabrication })), (capaciteAssises && { capaciteAssises })), (itineraireId && { itineraireId })), (codeUnique && { codeUnique })), (anneeEnregistrement && { anneeEnregistrement })), (proprietaireId && { proprietaireId })),
                include: {
                    proprietaire: {
                        select: {
                            id: true,
                            nom: true,
                            prenom: true,
                            telephone: true
                        }
                    },
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    _count: {
                        select: {
                            documents: true
                        }
                    }
                }
            });
            yield db_1.db.auditLog.create({
                data: {
                    action: "UPDATE",
                    table: "Vehicule",
                    recordId: id,
                    oldValues,
                    newValues: updatedVehicule,
                    userId
                }
            });
            return res.status(200).json({
                data: updatedVehicule,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la mise à jour du véhicule:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function deleteVehicule(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        const { userId } = (0, types_1.getAuthenticatedUser)(req);
        try {
            const vehicule = yield db_1.db.vehicule.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: {
                            documents: true
                        }
                    }
                }
            });
            if (!vehicule) {
                return res.status(404).json({
                    data: null,
                    error: "Véhicule non trouvé"
                });
            }
            yield db_1.db.vehicule.delete({
                where: { id }
            });
            yield db_1.db.auditLog.create({
                data: {
                    action: "DELETE",
                    table: "Vehicule",
                    recordId: id,
                    oldValues: vehicule,
                    userId
                }
            });
            return res.status(200).json({
                data: { message: "Véhicule supprimé avec succès" },
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la suppression du véhicule:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getVehiculesStats(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const [totalVehicules, repartitionTypeVehicule, vehiculesParAnnee, vehiculesAvecDocuments, vehiculesSansDocuments] = yield Promise.all([
                db_1.db.vehicule.count(),
                db_1.db.vehicule.groupBy({
                    by: ['typeVehicule'],
                    _count: {
                        id: true
                    }
                }),
                db_1.db.vehicule.groupBy({
                    by: ['anneeFabrication'],
                    _count: {
                        id: true
                    },
                    orderBy: {
                        anneeFabrication: 'desc'
                    },
                    take: 10
                }),
                db_1.db.vehicule.count({
                    where: {
                        documents: {
                            some: {}
                        }
                    }
                }),
                db_1.db.vehicule.count({
                    where: {
                        documents: {
                            none: {}
                        }
                    }
                })
            ]);
            const stats = {
                total: totalVehicules,
                avecDocuments: vehiculesAvecDocuments,
                sansDocuments: vehiculesSansDocuments,
                repartitionTypeVehicule: repartitionTypeVehicule.map(item => ({
                    type: item.typeVehicule,
                    count: item._count.id
                })),
                vehiculesParAnnee: vehiculesParAnnee.map(item => ({
                    annee: item.anneeFabrication,
                    count: item._count.id
                }))
            };
            return res.status(200).json({
                data: stats,
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
function searchVehicule(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { query } = req.params;
        try {
            const vehicule = yield db_1.db.vehicule.findFirst({
                where: {
                    OR: [
                        { codeUnique: query },
                        { numeroImmatriculation: query },
                        { numeroChassis: query }
                    ]
                },
                include: {
                    proprietaire: true,
                    documents: true,
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });
            if (!vehicule) {
                return res.status(404).json({
                    data: null,
                    error: "Véhicule non trouvé"
                });
            }
            return res.status(200).json({
                data: vehicule,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la recherche du véhicule:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}

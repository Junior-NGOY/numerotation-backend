"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.createProprietaire = createProprietaire;
exports.getProprietaires = getProprietaires;
exports.getProprietaireById = getProprietaireById;
exports.updateProprietaire = updateProprietaire;
exports.deleteProprietaire = deleteProprietaire;
exports.getProprietairesStats = getProprietairesStats;
const db_1 = require("../db/db");
const types_1 = require("../types");
const pinata_1 = require("../services/pinata");
const promises_1 = require("fs/promises");
function createProprietaire(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { nom, prenom, adresse, telephone, numeroPiece, typePiece, lieuDelivrance, dateDelivrance } = req.body;
        const { userId: createdById } = (0, types_1.getAuthenticatedUser)(req);
        try {
            const existingProprietaire = yield db_1.db.proprietaire.findUnique({
                where: { numeroPiece }
            });
            if (existingProprietaire) {
                return res.status(409).json({
                    data: null,
                    error: "Un propriétaire avec ce numéro de pièce existe déjà"
                });
            }
            const newProprietaire = yield db_1.db.proprietaire.create({
                data: {
                    nom,
                    prenom,
                    adresse,
                    telephone,
                    numeroPiece,
                    typePiece,
                    lieuDelivrance,
                    dateDelivrance: new Date(dateDelivrance),
                    createdById
                },
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
                            vehicules: true,
                            documents: true
                        }
                    }
                }
            });
            if (req.file) {
                try {
                    let documentData = {};
                    if (pinata_1.pinataService.isConfigured()) {
                        console.log('📤 Upload pièce d\'identité vers PINATA...');
                        const pinataResult = yield pinata_1.pinataService.uploadFile(req.file.path, req.file.filename, {
                            type: 'PIECE_IDENTITE',
                            proprietaireId: newProprietaire.id,
                            proprietaireName: `${nom} ${prenom}`,
                            uploadedBy: createdById
                        });
                        const pinataUrl = pinata_1.pinataService.generateFileUrl(pinataResult.IpfsHash);
                        documentData = {
                            nom: `Pièce d'identité - ${nom} ${prenom}`,
                            type: 'PIECE_IDENTITE',
                            chemin: pinataUrl,
                            taille: req.file.size,
                            mimeType: req.file.mimetype,
                            proprietaireId: newProprietaire.id,
                            createdById
                        };
                        try {
                            yield (0, promises_1.unlink)(req.file.path);
                            console.log('🗑️ Fichier local supprimé après upload PINATA');
                        }
                        catch (unlinkError) {
                            console.warn('⚠️ Impossible de supprimer le fichier local:', unlinkError);
                        }
                        console.log('✅ Pièce d\'identité uploadée vers PINATA:', pinataUrl);
                    }
                    else {
                        console.error('❌ PINATA non configuré, impossible d\'uploader la pièce d\'identité');
                        throw new Error('Service de stockage de fichiers non configuré. Veuillez configurer PINATA.');
                    }
                    yield db_1.db.document.create({
                        data: documentData
                    });
                    console.log('✅ Document de pièce d\'identité créé avec succès');
                }
                catch (documentError) {
                    console.error('❌ Erreur lors de l\'upload de la pièce d\'identité:', documentError);
                }
            }
            yield db_1.db.auditLog.create({
                data: {
                    action: "CREATE",
                    table: "Proprietaire",
                    recordId: newProprietaire.id,
                    newValues: newProprietaire,
                    userId: createdById
                }
            });
            return res.status(201).json({
                data: newProprietaire,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la création du propriétaire:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getProprietaires(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { page = 1, limit = 10, search, typePiece } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const where = {};
            if (search) {
                where.OR = [
                    { nom: { contains: search, mode: "insensitive" } },
                    { prenom: { contains: search, mode: "insensitive" } },
                    { numeroPiece: { contains: search, mode: "insensitive" } },
                    { telephone: { contains: search, mode: "insensitive" } }
                ];
            }
            if (typePiece) {
                where.typePiece = typePiece;
            }
            const [proprietaires, total] = yield Promise.all([
                db_1.db.proprietaire.findMany({
                    where,
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
                                vehicules: true,
                                documents: true
                            }
                        }
                    },
                    skip,
                    take: Number(limit),
                    orderBy: { createdAt: "desc" }
                }),
                db_1.db.proprietaire.count({ where })
            ]);
            return res.status(200).json({
                data: {
                    items: proprietaires,
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
            console.error("Erreur lors de la récupération des propriétaires:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getProprietaireById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        try {
            const proprietaire = yield db_1.db.proprietaire.findUnique({
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
                        include: {
                            _count: {
                                select: {
                                    documents: true
                                }
                            }
                        }
                    },
                    documents: true,
                    _count: {
                        select: {
                            vehicules: true,
                            documents: true
                        }
                    }
                }
            });
            if (!proprietaire) {
                return res.status(404).json({
                    data: null,
                    error: "Propriétaire non trouvé"
                });
            }
            return res.status(200).json({
                data: proprietaire,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération du propriétaire:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function updateProprietaire(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        const { nom, prenom, adresse, telephone, numeroPiece, typePiece, lieuDelivrance, dateDelivrance } = req.body;
        const { userId } = (0, types_1.getAuthenticatedUser)(req);
        try {
            const existingProprietaire = yield db_1.db.proprietaire.findUnique({
                where: { id }
            });
            if (!existingProprietaire) {
                return res.status(404).json({
                    data: null,
                    error: "Propriétaire non trouvé"
                });
            }
            if (numeroPiece && numeroPiece !== existingProprietaire.numeroPiece) {
                const numeroPieceExists = yield db_1.db.proprietaire.findUnique({
                    where: { numeroPiece }
                });
                if (numeroPieceExists) {
                    return res.status(409).json({
                        data: null,
                        error: "Ce numéro de pièce est déjà utilisé"
                    });
                }
            }
            const oldValues = {
                nom: existingProprietaire.nom,
                prenom: existingProprietaire.prenom,
                adresse: existingProprietaire.adresse,
                telephone: existingProprietaire.telephone,
                numeroPiece: existingProprietaire.numeroPiece,
                typePiece: existingProprietaire.typePiece,
                lieuDelivrance: existingProprietaire.lieuDelivrance,
                dateDelivrance: existingProprietaire.dateDelivrance
            };
            const updatedProprietaire = yield db_1.db.proprietaire.update({
                where: { id },
                data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (nom && { nom })), (prenom && { prenom })), (adresse && { adresse })), (telephone && { telephone })), (numeroPiece && { numeroPiece })), (typePiece && { typePiece })), (lieuDelivrance && { lieuDelivrance })), (dateDelivrance && { dateDelivrance: new Date(dateDelivrance) })),
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
                            vehicules: true,
                            documents: true
                        }
                    }
                }
            });
            yield db_1.db.auditLog.create({
                data: {
                    action: "UPDATE",
                    table: "Proprietaire",
                    recordId: id,
                    oldValues,
                    newValues: updatedProprietaire,
                    userId
                }
            });
            return res.status(200).json({
                data: updatedProprietaire,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la mise à jour du propriétaire:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function deleteProprietaire(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const { id } = req.params;
        const { userId } = (0, types_1.getAuthenticatedUser)(req);
        try {
            const proprietaire = yield db_1.db.proprietaire.findUnique({
                where: { id },
                include: {
                    documents: true,
                    _count: {
                        select: {
                            vehicules: true
                        }
                    }
                }
            });
            if (!proprietaire) {
                return res.status(404).json({
                    data: null,
                    error: "Propriétaire non trouvé"
                });
            }
            if (proprietaire._count.vehicules > 0) {
                return res.status(400).json({
                    data: null,
                    error: "Impossible de supprimer ce propriétaire car il possède des véhicules"
                });
            }
            if (proprietaire.documents && proprietaire.documents.length > 0) {
                console.log(`🗑️ Suppression du document du propriétaire ${id}`);
                for (const document of proprietaire.documents) {
                    try {
                        if (document.chemin && document.chemin.includes('ipfs')) {
                            const ipfsHashMatch = document.chemin.match(/\/ipfs\/([^?]+)/);
                            if (ipfsHashMatch) {
                                const ipfsHash = ipfsHashMatch[1];
                                console.log(`🗑️ Suppression du fichier IPFS: ${ipfsHash}`);
                                const { pinataService } = yield Promise.resolve().then(() => __importStar(require('../services/pinata')));
                                if (pinataService.isConfigured()) {
                                    try {
                                        yield pinataService.unpinFile(ipfsHash);
                                        console.log(`✅ Fichier IPFS supprimé: ${ipfsHash}`);
                                    }
                                    catch (pinataError) {
                                        console.warn(`⚠️ Erreur lors de la suppression du fichier IPFS ${ipfsHash}:`, pinataError);
                                    }
                                }
                            }
                        }
                    }
                    catch (error) {
                        console.warn(`⚠️ Erreur lors de la suppression du fichier pour le document ${document.id}:`, error);
                    }
                }
                yield db_1.db.document.deleteMany({
                    where: { proprietaireId: id }
                });
            }
            yield db_1.db.proprietaire.delete({
                where: { id }
            });
            yield db_1.db.auditLog.create({
                data: {
                    action: "DELETE",
                    table: "Proprietaire",
                    recordId: id,
                    oldValues: Object.assign(Object.assign({}, proprietaire), { documentsDeleted: ((_a = proprietaire.documents) === null || _a === void 0 ? void 0 : _a.length) || 0 }),
                    userId
                }
            });
            return res.status(200).json({
                data: {
                    message: "Propriétaire supprimé avec succès",
                    documentsDeleted: ((_b = proprietaire.documents) === null || _b === void 0 ? void 0 : _b.length) || 0
                },
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la suppression du propriétaire:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getProprietairesStats(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const [totalProprietaires, proprietairesAvecVehicules, proprietairesSansVehicules, repartitionTypePiece] = yield Promise.all([
                db_1.db.proprietaire.count(),
                db_1.db.proprietaire.count({
                    where: {
                        vehicules: {
                            some: {}
                        }
                    }
                }),
                db_1.db.proprietaire.count({
                    where: {
                        vehicules: {
                            none: {}
                        }
                    }
                }),
                db_1.db.proprietaire.groupBy({
                    by: ['typePiece'],
                    _count: {
                        id: true
                    }
                })
            ]);
            const stats = {
                total: totalProprietaires,
                avecVehicules: proprietairesAvecVehicules,
                sansVehicules: proprietairesSansVehicules,
                repartitionTypePiece: repartitionTypePiece.map(item => ({
                    type: item.typePiece,
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

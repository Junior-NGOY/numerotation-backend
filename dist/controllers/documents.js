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
exports.uploadDocument = uploadDocument;
exports.getDocuments = getDocuments;
exports.getDocumentById = getDocumentById;
exports.downloadDocument = downloadDocument;
exports.updateDocument = updateDocument;
exports.deleteDocument = deleteDocument;
exports.getDocumentsStats = getDocumentsStats;
const db_1 = require("../db/db");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const types_1 = require("../types");
const pinata_1 = require("../services/pinata");
function uploadDocument(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { nom, type, proprietaireId, vehiculeId } = req.body;
        const { userId: createdById } = (0, types_1.getAuthenticatedUser)(req);
        try {
            if (!proprietaireId && !vehiculeId) {
                return res.status(400).json({
                    data: null,
                    error: "Un document doit être associé à un propriétaire ou un véhicule"
                });
            }
            if (proprietaireId) {
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
            if (vehiculeId) {
                const vehicule = yield db_1.db.vehicule.findUnique({
                    where: { id: vehiculeId }
                });
                if (!vehicule) {
                    return res.status(404).json({
                        data: null,
                        error: "Véhicule non trouvé"
                    });
                }
            }
            let documentData = {};
            if (req.file) {
                try {
                    if (pinata_1.pinataService.isConfigured()) {
                        console.log('📤 Upload vers PINATA...');
                        const pinataResult = yield pinata_1.pinataService.uploadFile(req.file.path, req.file.filename, {
                            type: type,
                            proprietaireId: proprietaireId || null,
                            vehiculeId: vehiculeId || null,
                            uploadedBy: createdById
                        });
                        const pinataUrl = pinata_1.pinataService.generateFileUrl(pinataResult.IpfsHash);
                        documentData = {
                            chemin: pinataUrl,
                            taille: req.file.size,
                            mimeType: req.file.mimetype
                        };
                        try {
                            yield (0, promises_1.unlink)(req.file.path);
                            console.log('🗑️ Fichier local supprimé après upload PINATA');
                        }
                        catch (unlinkError) {
                            console.warn('⚠️ Impossible de supprimer le fichier local:', unlinkError);
                        }
                        console.log('✅ Fichier uploadé vers PINATA:', pinataUrl);
                    }
                    else {
                        console.log('💾 Stockage local (PINATA non configuré)');
                        documentData = {
                            chemin: req.file.path,
                            taille: req.file.size,
                            mimeType: req.file.mimetype
                        };
                    }
                }
                catch (pinataError) {
                    console.error('❌ Erreur PINATA, fallback vers stockage local:', pinataError);
                    documentData = {
                        chemin: req.file.path,
                        taille: req.file.size,
                        mimeType: req.file.mimetype
                    };
                }
            }
            else {
                return res.status(400).json({
                    data: null,
                    error: "Aucun fichier fourni"
                });
            }
            const newDocument = yield db_1.db.document.create({
                data: Object.assign({ nom,
                    type, proprietaireId: proprietaireId || null, vehiculeId: vehiculeId || null, createdById }, documentData),
                include: {
                    proprietaire: proprietaireId ? {
                        select: {
                            id: true,
                            nom: true,
                            prenom: true
                        }
                    } : false,
                    vehicule: vehiculeId ? {
                        select: {
                            id: true,
                            marque: true,
                            modele: true,
                            numeroImmatriculation: true
                        }
                    } : false,
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });
            yield db_1.db.auditLog.create({
                data: {
                    action: "CREATE",
                    table: "Document",
                    recordId: newDocument.id,
                    newValues: newDocument,
                    userId: createdById
                }
            });
            return res.status(201).json({
                data: newDocument,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la création du document:", error);
            if (req.file) {
                try {
                    yield (0, promises_1.unlink)(req.file.path);
                }
                catch (unlinkError) {
                    console.error("Erreur lors de la suppression du fichier:", unlinkError);
                }
            }
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getDocuments(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { page = 1, limit = 10, search, type, proprietaireId, vehiculeId } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const where = {};
            if (search) {
                where.OR = [
                    { nom: { contains: search, mode: "insensitive" } },
                    {
                        proprietaire: {
                            OR: [
                                { nom: { contains: search, mode: "insensitive" } },
                                { prenom: { contains: search, mode: "insensitive" } }
                            ]
                        }
                    },
                    {
                        vehicule: {
                            OR: [
                                { marque: { contains: search, mode: "insensitive" } },
                                { modele: { contains: search, mode: "insensitive" } },
                                { numeroImmatriculation: { contains: search, mode: "insensitive" } }
                            ]
                        }
                    }
                ];
            }
            if (type) {
                where.type = type;
            }
            if (proprietaireId) {
                where.proprietaireId = proprietaireId;
            }
            if (vehiculeId) {
                where.vehiculeId = vehiculeId;
            }
            const [documents, total] = yield Promise.all([
                db_1.db.document.findMany({
                    where,
                    include: {
                        proprietaire: {
                            select: {
                                id: true,
                                nom: true,
                                prenom: true,
                                telephone: true
                            }
                        },
                        vehicule: {
                            select: {
                                id: true,
                                marque: true,
                                modele: true,
                                numeroImmatriculation: true,
                                typeVehicule: true
                            }
                        },
                        createdBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    },
                    skip,
                    take: Number(limit),
                    orderBy: { createdAt: "desc" }
                }),
                db_1.db.document.count({ where })
            ]);
            return res.status(200).json({
                data: {
                    documents,
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
            console.error("Erreur lors de la récupération des documents:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getDocumentById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        try {
            const document = yield db_1.db.document.findUnique({
                where: { id },
                include: {
                    proprietaire: true,
                    vehicule: {
                        include: {
                            proprietaire: {
                                select: {
                                    id: true,
                                    nom: true,
                                    prenom: true
                                }
                            }
                        }
                    },
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });
            if (!document) {
                return res.status(404).json({
                    data: null,
                    error: "Document non trouvé"
                });
            }
            return res.status(200).json({
                data: document,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération du document:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function downloadDocument(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        try {
            const document = yield db_1.db.document.findUnique({
                where: { id }
            });
            if (!document) {
                return res.status(404).json({
                    data: null,
                    error: "Document non trouvé"
                });
            }
            const filePath = path_1.default.resolve(document.chemin);
            res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${document.nom}"`);
            return res.sendFile(filePath);
        }
        catch (error) {
            console.error("Erreur lors du téléchargement du document:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur lors du téléchargement"
            });
        }
    });
}
function updateDocument(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        const { nom, type, proprietaireId, vehiculeId } = req.body;
        const { userId } = (0, types_1.getAuthenticatedUser)(req);
        try {
            const existingDocument = yield db_1.db.document.findUnique({
                where: { id }
            });
            if (!existingDocument) {
                return res.status(404).json({
                    data: null,
                    error: "Document non trouvé"
                });
            }
            if (proprietaireId) {
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
            if (vehiculeId) {
                const vehicule = yield db_1.db.vehicule.findUnique({
                    where: { id: vehiculeId }
                });
                if (!vehicule) {
                    return res.status(404).json({
                        data: null,
                        error: "Véhicule non trouvé"
                    });
                }
            }
            const oldValues = {
                nom: existingDocument.nom,
                type: existingDocument.type,
                proprietaireId: existingDocument.proprietaireId,
                vehiculeId: existingDocument.vehiculeId
            };
            let fileData = {};
            if (req.file) {
                try {
                    yield (0, promises_1.unlink)(existingDocument.chemin);
                }
                catch (unlinkError) {
                    console.error("Erreur lors de la suppression de l'ancien fichier:", unlinkError);
                }
                fileData = {
                    chemin: req.file.path,
                    taille: req.file.size,
                    mimeType: req.file.mimetype
                };
            }
            const updatedDocument = yield db_1.db.document.update({
                where: { id },
                data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (nom && { nom })), (type && { type })), (proprietaireId !== undefined && { proprietaireId })), (vehiculeId !== undefined && { vehiculeId })), fileData),
                include: {
                    proprietaire: {
                        select: {
                            id: true,
                            nom: true,
                            prenom: true
                        }
                    },
                    vehicule: {
                        select: {
                            id: true,
                            marque: true,
                            modele: true,
                            numeroImmatriculation: true
                        }
                    },
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });
            yield db_1.db.auditLog.create({
                data: {
                    action: "UPDATE",
                    table: "Document",
                    recordId: id,
                    oldValues,
                    newValues: updatedDocument,
                    userId
                }
            });
            return res.status(200).json({
                data: updatedDocument,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la mise à jour du document:", error);
            if (req.file) {
                try {
                    yield (0, promises_1.unlink)(req.file.path);
                }
                catch (unlinkError) {
                    console.error("Erreur lors de la suppression du fichier:", unlinkError);
                }
            }
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function deleteDocument(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        const { userId } = (0, types_1.getAuthenticatedUser)(req);
        try {
            const document = yield db_1.db.document.findUnique({
                where: { id }
            });
            if (!document) {
                return res.status(404).json({
                    data: null,
                    error: "Document non trouvé"
                });
            }
            try {
                yield (0, promises_1.unlink)(document.chemin);
            }
            catch (unlinkError) {
                console.error("Erreur lors de la suppression du fichier:", unlinkError);
            }
            yield db_1.db.document.delete({
                where: { id }
            });
            yield db_1.db.auditLog.create({
                data: {
                    action: "DELETE",
                    table: "Document",
                    recordId: id,
                    oldValues: document,
                    userId
                }
            });
            return res.status(200).json({
                data: { message: "Document supprimé avec succès" },
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la suppression du document:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getDocumentsStats(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const [totalDocuments, documentsParType, documentsProprietaires, documentsVehicules, tailleTotal] = yield Promise.all([
                db_1.db.document.count(),
                db_1.db.document.groupBy({
                    by: ['type'],
                    _count: {
                        id: true
                    }
                }),
                db_1.db.document.count({
                    where: {
                        proprietaireId: { not: null }
                    }
                }),
                db_1.db.document.count({
                    where: {
                        vehiculeId: { not: null }
                    }
                }),
                db_1.db.document.aggregate({
                    _sum: {
                        taille: true
                    }
                })
            ]);
            const stats = {
                total: totalDocuments,
                documentsProprietaires,
                documentsVehicules,
                tailleTotal: tailleTotal._sum.taille || 0,
                repartitionParType: documentsParType.map(item => ({
                    type: item.type,
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

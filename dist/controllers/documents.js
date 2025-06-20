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
exports.getDocumentsByProprietaire = getDocumentsByProprietaire;
exports.getDocumentsByVehicule = getDocumentsByVehicule;
exports.getDocumentFile = getDocumentFile;
exports.getDocumentPreview = getDocumentPreview;
exports.getAllDocumentsWithFilters = getAllDocumentsWithFilters;
const db_1 = require("../db/db");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const types_1 = require("../types");
const pinata_1 = require("../services/pinata");
function uploadDocument(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { nom, type, proprietaireId, vehiculeId, replaceDocumentId } = req.body;
        const { userId: createdById } = (0, types_1.getAuthenticatedUser)(req);
        try {
            let documentToReplace = null;
            if (replaceDocumentId) {
                documentToReplace = yield db_1.db.document.findUnique({
                    where: { id: replaceDocumentId }
                });
                if (!documentToReplace) {
                    return res.status(404).json({
                        data: null,
                        error: "Document à remplacer non trouvé"
                    });
                }
            }
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
                if (!replaceDocumentId) {
                    const existingDocument = yield db_1.db.document.findFirst({
                        where: { proprietaireId: proprietaireId }
                    });
                    if (existingDocument) {
                        return res.status(400).json({
                            data: null,
                            error: "Un propriétaire ne peut avoir qu'un seul document. Utilisez la fonction 'remplacer' pour mettre à jour le document existant."
                        });
                    }
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
                        console.error('❌ PINATA non configuré, impossible d\'uploader le fichier');
                        throw new Error('Service de stockage de fichiers non configuré. Veuillez configurer PINATA.');
                    }
                }
                catch (pinataError) {
                    console.error('❌ Erreur PINATA lors de l\'upload:', pinataError);
                    throw new Error(`Erreur lors de l'upload vers PINATA: ${pinataError.message}`);
                }
            }
            else {
                return res.status(400).json({
                    data: null,
                    error: "Aucun fichier fourni"
                });
            }
            let result;
            if (replaceDocumentId && documentToReplace) {
                result = yield db_1.db.document.update({
                    where: { id: replaceDocumentId },
                    data: Object.assign(Object.assign({ nom,
                        type }, documentData), { updatedAt: new Date() }),
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
                        action: "UPDATE",
                        table: "Document",
                        recordId: result.id,
                        oldValues: documentToReplace,
                        newValues: result,
                        userId: createdById
                    }
                });
                console.log('🔄 Document remplacé:', result.id);
            }
            else {
                result = yield db_1.db.document.create({
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
                        recordId: result.id,
                        newValues: result,
                        userId: createdById
                    }
                });
                console.log('➕ Nouveau document créé:', result.id);
            }
            return res.status(replaceDocumentId ? 200 : 201).json({
                data: result,
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
        const { id: documentId } = req.params;
        const { userId } = (0, types_1.getAuthenticatedUser)(req);
        try {
            const document = yield db_1.db.document.findUnique({
                where: { id: documentId },
                include: {
                    proprietaire: {
                        select: { id: true, nom: true, prenom: true }
                    },
                    vehicule: {
                        select: {
                            id: true,
                            marque: true,
                            modele: true,
                            numeroImmatriculation: true
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
            if (document.chemin && document.chemin.includes('ipfs')) {
                const ipfsHashMatch = document.chemin.match(/\/ipfs\/([^?]+)/);
                if (ipfsHashMatch) {
                    const ipfsHash = ipfsHashMatch[1];
                    console.log(`🗑️ Suppression du fichier IPFS pour le document ${documentId}: ${ipfsHash}`);
                    if (pinata_1.pinataService.isConfigured()) {
                        try {
                            yield pinata_1.pinataService.unpinFile(ipfsHash);
                            console.log(`✅ Fichier IPFS supprimé: ${ipfsHash}`);
                        }
                        catch (pinataError) {
                            console.warn(`⚠️ Erreur lors de la suppression du fichier IPFS ${ipfsHash}:`, pinataError);
                        }
                    }
                }
            }
            yield db_1.db.document.delete({
                where: { id: documentId }
            });
            yield db_1.db.auditLog.create({
                data: {
                    action: "DELETE",
                    table: "Document",
                    recordId: documentId,
                    oldValues: document,
                    userId
                }
            });
            return res.status(200).json({
                data: {
                    message: "Document supprimé avec succès",
                    deletedDocument: {
                        id: document.id,
                        nom: document.nom,
                        type: document.type
                    }
                },
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
function getDocumentsByProprietaire(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id: proprietaireId } = req.params;
            const { page = 1, limit = 10 } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const proprietaire = yield db_1.db.proprietaire.findUnique({
                where: { id: proprietaireId },
                select: { id: true, nom: true, prenom: true }
            });
            if (!proprietaire) {
                return res.status(404).json({
                    data: null,
                    error: "Propriétaire non trouvé"
                });
            }
            const [documentsProprietaire, documentsVehicules, totalCount] = yield Promise.all([
                db_1.db.document.findMany({
                    where: { proprietaireId },
                    include: {
                        createdBy: {
                            select: { id: true, name: true, email: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }),
                db_1.db.document.findMany({
                    where: {
                        vehicule: {
                            proprietaireId
                        }
                    },
                    include: {
                        vehicule: {
                            select: {
                                id: true,
                                marque: true,
                                modele: true,
                                numeroImmatriculation: true
                            }
                        },
                        createdBy: {
                            select: { id: true, name: true, email: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }),
                db_1.db.document.count({
                    where: {
                        OR: [
                            { proprietaireId },
                            { vehicule: { proprietaireId } }
                        ]
                    }
                })
            ]);
            const allDocuments = [
                ...documentsProprietaire.map(doc => (Object.assign(Object.assign({}, doc), { source: 'proprietaire' }))),
                ...documentsVehicules.map(doc => (Object.assign(Object.assign({}, doc), { source: 'vehicule' })))
            ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const paginatedDocuments = allDocuments.slice(skip, skip + Number(limit));
            return res.status(200).json({
                data: {
                    documents: paginatedDocuments,
                    proprietaire,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total: totalCount,
                        pages: Math.ceil(totalCount / Number(limit))
                    }
                },
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération des documents du propriétaire:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getDocumentsByVehicule(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id: vehiculeId } = req.params;
            const { page = 1, limit = 10 } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const vehicule = yield db_1.db.vehicule.findUnique({
                where: { id: vehiculeId },
                include: {
                    proprietaire: {
                        select: { id: true, nom: true, prenom: true }
                    }
                }
            });
            if (!vehicule) {
                return res.status(404).json({
                    data: null,
                    error: "Véhicule non trouvé"
                });
            }
            const [documents, totalCount] = yield Promise.all([
                db_1.db.document.findMany({
                    where: { vehiculeId },
                    include: {
                        createdBy: {
                            select: { id: true, name: true, email: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: Number(limit)
                }),
                db_1.db.document.count({ where: { vehiculeId } })
            ]);
            return res.status(200).json({
                data: {
                    documents,
                    vehicule: {
                        id: vehicule.id,
                        marque: vehicule.marque,
                        modele: vehicule.modele,
                        numeroImmatriculation: vehicule.numeroImmatriculation,
                        proprietaire: vehicule.proprietaire
                    },
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total: totalCount,
                        pages: Math.ceil(totalCount / Number(limit))
                    }
                },
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération des documents du véhicule:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getDocumentFile(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id: documentId } = req.params;
            const { token } = req.query;
            let isAuthenticated = false;
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                isAuthenticated = true;
            }
            if (!isAuthenticated && token) {
                isAuthenticated = true;
            }
            if (!isAuthenticated) {
                return res.status(401).json({
                    data: null,
                    error: "Token d'accès requis"
                });
            }
            const document = yield db_1.db.document.findUnique({
                where: { id: documentId },
                select: {
                    id: true,
                    nom: true,
                    chemin: true,
                    mimeType: true,
                    taille: true
                }
            });
            if (!document) {
                return res.status(404).json({
                    data: null,
                    error: "Document non trouvé"
                });
            }
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            if (document.chemin.includes('ipfs/') || document.chemin.includes('pinata') || document.chemin.startsWith('http')) {
                console.log('📋 Redirection vers PINATA:', document.chemin);
                return res.redirect(document.chemin);
            }
            const fs = require('fs');
            const path = require('path');
            if (fs.existsSync(document.chemin)) {
                const fileName = document.nom || path.basename(document.chemin);
                res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
                res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
                console.log('📋 Envoi du fichier local:', document.chemin);
                return res.sendFile(path.resolve(document.chemin));
            }
            else {
                console.error('❌ Fichier non trouvé:', document.chemin);
                return res.status(404).json({
                    data: null,
                    error: "Fichier non trouvé sur le serveur"
                });
            }
        }
        catch (error) {
            console.error("❌ Erreur lors de l'accès au fichier:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getDocumentPreview(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const { id: documentId } = req.params;
            const { token } = req.query;
            let isAuthenticated = false;
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                isAuthenticated = true;
            }
            if (!isAuthenticated && token) {
                isAuthenticated = true;
            }
            if (!isAuthenticated) {
                return res.status(401).json({
                    data: null,
                    error: "Token d'accès requis"
                });
            }
            const document = yield db_1.db.document.findUnique({
                where: { id: documentId },
                include: {
                    proprietaire: {
                        select: { id: true, nom: true, prenom: true }
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
                        select: { id: true, name: true, email: true }
                    }
                }
            });
            if (!document) {
                return res.status(404).json({
                    data: null,
                    error: "Document non trouvé"
                });
            }
            const baseUrl = process.env.NODE_ENV === 'production'
                ? process.env.PRODUCTION_URL || 'http://localhost:8000'
                : 'http://localhost:8000';
            let fileUrl = `${baseUrl}/api/v1/access/documents/${document.id}/file`;
            if (token) {
                fileUrl += `?token=${encodeURIComponent(token)}`;
            }
            const preview = {
                id: document.id,
                nom: document.nom,
                type: document.type,
                mimeType: document.mimeType,
                taille: document.taille,
                createdAt: document.createdAt,
                updatedAt: document.updatedAt,
                fileUrl: fileUrl,
                canPreview: ((_a = document.mimeType) === null || _a === void 0 ? void 0 : _a.includes('image/')) || ((_b = document.mimeType) === null || _b === void 0 ? void 0 : _b.includes('pdf')),
                proprietaire: document.proprietaire,
                vehicule: document.vehicule,
                createdBy: document.createdBy
            };
            return res.status(200).json({
                data: preview,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la prévisualisation:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getAllDocumentsWithFilters(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { page = 1, limit = 10, search, type, proprietaireId, vehiculeId, dateFrom, dateTo, source } = req.query;
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
                if (source === 'proprietaire') {
                    where.proprietaireId = proprietaireId;
                }
                else if (source === 'vehicule') {
                    where.vehicule = { proprietaireId };
                }
                else {
                    where.OR = [
                        { proprietaireId },
                        { vehicule: { proprietaireId } }
                    ];
                }
            }
            if (vehiculeId) {
                where.vehiculeId = vehiculeId;
            }
            if (dateFrom || dateTo) {
                where.createdAt = {};
                if (dateFrom)
                    where.createdAt.gte = new Date(dateFrom);
                if (dateTo)
                    where.createdAt.lte = new Date(dateTo);
            }
            const [documents, totalCount] = yield Promise.all([
                db_1.db.document.findMany({
                    where,
                    include: {
                        proprietaire: {
                            select: { id: true, nom: true, prenom: true }
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
                            select: { id: true, name: true, email: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: Number(limit)
                }),
                db_1.db.document.count({ where })
            ]);
            return res.status(200).json({
                data: {
                    documents,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total: totalCount,
                        pages: Math.ceil(totalCount / Number(limit))
                    },
                    filters: {
                        search,
                        type,
                        proprietaireId,
                        vehiculeId,
                        dateFrom,
                        dateTo,
                        source
                    }
                },
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la recherche de documents:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}

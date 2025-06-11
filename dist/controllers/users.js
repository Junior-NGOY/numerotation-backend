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
exports.createUser = createUser;
exports.loginUser = loginUser;
exports.getUsers = getUsers;
exports.getUserById = getUserById;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
exports.changePassword = changePassword;
const db_1 = require("../db/db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function createUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { email, name, password, role } = req.body;
        try {
            const existingUser = yield db_1.db.user.findUnique({
                where: { email }
            });
            if (existingUser) {
                return res.status(409).json({
                    data: null,
                    error: "Un utilisateur avec cet email existe déjà"
                });
            }
            const hashedPassword = yield bcryptjs_1.default.hash(password, 12);
            const newUser = yield db_1.db.user.create({
                data: {
                    email,
                    name,
                    password: hashedPassword,
                    role: role || "USER"
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                    lastLogin: true
                }
            });
            yield db_1.db.auditLog.create({
                data: {
                    action: "CREATE",
                    table: "User",
                    recordId: newUser.id,
                    newValues: newUser,
                    userEmail: email
                }
            });
            return res.status(201).json({
                data: newUser,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la création de l'utilisateur:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function loginUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { email, password } = req.body;
        try {
            const user = yield db_1.db.user.findUnique({
                where: { email }
            });
            if (!user) {
                return res.status(401).json({
                    data: null,
                    error: "Email ou mot de passe incorrect"
                });
            }
            const isPasswordValid = yield bcryptjs_1.default.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    data: null,
                    error: "Email ou mot de passe incorrect"
                });
            }
            if (!user.isActive) {
                return res.status(403).json({
                    data: null,
                    error: "Compte désactivé"
                });
            }
            yield db_1.db.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() }
            });
            const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || "fallback-secret", { expiresIn: "7d" });
            const userResponse = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                isActive: user.isActive
            };
            return res.status(200).json({
                data: {
                    user: userResponse,
                    token
                },
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la connexion:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getUsers(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { page = 1, limit = 10, role, isActive } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const where = {};
            if (role)
                where.role = role;
            if (isActive !== undefined)
                where.isActive = isActive === 'true';
            const [users, total] = yield Promise.all([
                db_1.db.user.findMany({
                    where,
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        isActive: true,
                        lastLogin: true,
                        createdAt: true,
                        _count: {
                            select: {
                                createdProprietaires: true,
                                createdVehicules: true,
                                createdDocuments: true
                            }
                        }
                    },
                    skip,
                    take: Number(limit),
                    orderBy: { createdAt: "desc" }
                }),
                db_1.db.user.count({ where })
            ]);
            return res.status(200).json({
                data: {
                    items: users,
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
            console.error("Erreur lors de la récupération des utilisateurs:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function getUserById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        try {
            const user = yield db_1.db.user.findUnique({
                where: { id },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isActive: true,
                    lastLogin: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            createdProprietaires: true,
                            createdVehicules: true,
                            createdDocuments: true
                        }
                    }
                }
            });
            if (!user) {
                return res.status(404).json({
                    data: null,
                    error: "Utilisateur non trouvé"
                });
            }
            return res.status(200).json({
                data: user,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la récupération de l'utilisateur:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function updateUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        const { email, name, role, isActive } = req.body;
        if (!req.user) {
            return res.status(401).json({
                data: null,
                error: "Non authentifié"
            });
        }
        const { userId: currentUserId } = req.user;
        try {
            const existingUser = yield db_1.db.user.findUnique({
                where: { id }
            });
            if (!existingUser) {
                return res.status(404).json({
                    data: null,
                    error: "Utilisateur non trouvé"
                });
            }
            if (email && email !== existingUser.email) {
                const emailExists = yield db_1.db.user.findUnique({
                    where: { email }
                });
                if (emailExists) {
                    return res.status(409).json({
                        data: null,
                        error: "Cet email est déjà utilisé"
                    });
                }
            }
            const oldValues = {
                email: existingUser.email,
                name: existingUser.name,
                role: existingUser.role,
                isActive: existingUser.isActive
            };
            const updatedUser = yield db_1.db.user.update({
                where: { id },
                data: Object.assign(Object.assign(Object.assign(Object.assign({}, (email && { email })), (name && { name })), (role && { role })), (isActive !== undefined && { isActive })),
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isActive: true,
                    lastLogin: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
            yield db_1.db.auditLog.create({
                data: {
                    action: "UPDATE",
                    table: "User",
                    recordId: id,
                    oldValues,
                    newValues: updatedUser,
                    userId: currentUserId
                }
            });
            return res.status(200).json({
                data: updatedUser,
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function deleteUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        if (!req.user) {
            return res.status(401).json({
                data: null,
                error: "Non authentifié"
            });
        }
        const { userId: currentUserId } = req.user;
        try {
            const user = yield db_1.db.user.findUnique({
                where: { id },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true
                }
            });
            if (!user) {
                return res.status(404).json({
                    data: null,
                    error: "Utilisateur non trouvé"
                });
            }
            yield db_1.db.user.delete({
                where: { id }
            });
            yield db_1.db.auditLog.create({
                data: {
                    action: "DELETE",
                    table: "User",
                    recordId: id,
                    oldValues: user,
                    userId: currentUserId
                }
            });
            return res.status(200).json({
                data: { message: "Utilisateur supprimé avec succès" },
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors de la suppression de l'utilisateur:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}
function changePassword(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        const { oldPassword, newPassword } = req.body;
        if (!req.user) {
            return res.status(401).json({
                data: null,
                error: "Non authentifié"
            });
        }
        const { userId: currentUserId } = req.user;
        try {
            const user = yield db_1.db.user.findUnique({
                where: { id }
            });
            if (!user) {
                return res.status(404).json({
                    data: null,
                    error: "Utilisateur non trouvé"
                });
            }
            const isOldPasswordValid = yield bcryptjs_1.default.compare(oldPassword, user.password);
            if (!isOldPasswordValid) {
                return res.status(400).json({
                    data: null,
                    error: "Ancien mot de passe incorrect"
                });
            }
            const hashedNewPassword = yield bcryptjs_1.default.hash(newPassword, 12);
            yield db_1.db.user.update({
                where: { id },
                data: { password: hashedNewPassword }
            });
            yield db_1.db.auditLog.create({
                data: {
                    action: "PASSWORD_CHANGE",
                    table: "User",
                    recordId: id,
                    userId: currentUserId
                }
            });
            return res.status(200).json({
                data: { message: "Mot de passe modifié avec succès" },
                error: null
            });
        }
        catch (error) {
            console.error("Erreur lors du changement de mot de passe:", error);
            return res.status(500).json({
                data: null,
                error: "Erreur interne du serveur"
            });
        }
    });
}

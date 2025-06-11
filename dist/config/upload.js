"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_CONFIG = void 0;
exports.initializeUploadDirectories = initializeUploadDirectories;
exports.getUploadPath = getUploadPath;
exports.sanitizeFilename = sanitizeFilename;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.UPLOAD_CONFIG = {
    BASE_DIR: process.env.UPLOAD_DIR || 'uploads',
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
    ALLOWED_MIME_TYPES: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    SUBFOLDERS: {
        PIECE_IDENTITE: 'identite',
        PERMIS_CONDUIRE: 'permis',
        CARTE_ROSE: 'carte-rose',
        PDF_COMPLET: 'pdf-complets',
        QR_CODE: 'qr-codes',
        GENERAL: 'general'
    }
};
function initializeUploadDirectories() {
    const baseDir = path_1.default.join(process.cwd(), exports.UPLOAD_CONFIG.BASE_DIR);
    if (!fs_1.default.existsSync(baseDir)) {
        fs_1.default.mkdirSync(baseDir, { recursive: true });
        console.log(`Dossier d'upload créé: ${baseDir}`);
    }
    Object.values(exports.UPLOAD_CONFIG.SUBFOLDERS).forEach(subfolder => {
        const subfolderPath = path_1.default.join(baseDir, subfolder);
        if (!fs_1.default.existsSync(subfolderPath)) {
            fs_1.default.mkdirSync(subfolderPath, { recursive: true });
            console.log(`Sous-dossier créé: ${subfolderPath}`);
        }
    });
}
function getUploadPath(documentType) {
    const baseDir = path_1.default.join(process.cwd(), exports.UPLOAD_CONFIG.BASE_DIR);
    if (!documentType) {
        return path_1.default.join(baseDir, exports.UPLOAD_CONFIG.SUBFOLDERS.GENERAL);
    }
    const subfolder = exports.UPLOAD_CONFIG.SUBFOLDERS[documentType]
        || exports.UPLOAD_CONFIG.SUBFOLDERS.GENERAL;
    return path_1.default.join(baseDir, subfolder);
}
function sanitizeFilename(filename) {
    return filename
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .toLowerCase();
}

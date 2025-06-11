"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileSize = exports.fileExists = exports.deleteFile = exports.multipleUpload = exports.singleUpload = exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uploadDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const { type } = req.body;
        let subfolder = 'general';
        switch (type) {
            case 'PIECE_IDENTITE':
                subfolder = 'identite';
                break;
            case 'PERMIS_CONDUIRE':
                subfolder = 'permis';
                break;
            case 'CARTE_ROSE':
                subfolder = 'carte-rose';
                break;
            case 'PDF_COMPLET':
                subfolder = 'pdf-complets';
                break;
            case 'QR_CODE':
                subfolder = 'qr-codes';
                break;
        }
        const destinationPath = path_1.default.join(uploadDir, subfolder);
        if (!fs_1.default.existsSync(destinationPath)) {
            fs_1.default.mkdirSync(destinationPath, { recursive: true });
        }
        cb(null, destinationPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path_1.default.extname(file.originalname);
        const baseName = path_1.default.basename(file.originalname, extension);
        const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, `${sanitizedBaseName}_${uniqueSuffix}${extension}`);
    }
});
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Type de fichier non autorisé: ${file.mimetype}. Types acceptés: ${allowedMimeTypes.join(', ')}`));
    }
};
exports.uploadMiddleware = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 5
    },
    fileFilter: fileFilter
});
exports.singleUpload = exports.uploadMiddleware.single('file');
exports.multipleUpload = exports.uploadMiddleware.array('files', 5);
const deleteFile = (filePath) => {
    return new Promise((resolve, reject) => {
        fs_1.default.unlink(filePath, (err) => {
            if (err && err.code !== 'ENOENT') {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
};
exports.deleteFile = deleteFile;
const fileExists = (filePath) => {
    try {
        return fs_1.default.existsSync(filePath);
    }
    catch (_a) {
        return false;
    }
};
exports.fileExists = fileExists;
const getFileSize = (filePath) => {
    try {
        const stats = fs_1.default.statSync(filePath);
        return stats.size;
    }
    catch (_a) {
        return 0;
    }
};
exports.getFileSize = getFileSize;

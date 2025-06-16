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
exports.pinataService = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = __importDefault(require("fs"));
class PinataService {
    constructor() {
        this.config = {
            apiKey: process.env.PINATA_API_KEY || '',
            secretApiKey: process.env.PINATA_SECRET_API_KEY || '',
            gateway: process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud'
        };
        if (!this.config.apiKey || !this.config.secretApiKey) {
            console.warn('PINATA credentials not configured. File uploads will use local storage.');
        }
    }
    isConfigured() {
        return !!(this.config.apiKey && this.config.secretApiKey);
    }
    uploadFile(filePath, fileName, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!this.isConfigured()) {
                throw new Error('PINATA is not configured');
            }
            try {
                const formData = new form_data_1.default();
                const fileStream = fs_1.default.createReadStream(filePath);
                formData.append('file', fileStream);
                if (metadata) {
                    formData.append('pinataMetadata', JSON.stringify({
                        name: fileName,
                        keyvalues: metadata
                    }));
                }
                formData.append('pinataOptions', JSON.stringify({
                    cidVersion: 0
                }));
                const response = yield axios_1.default.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
                    headers: Object.assign(Object.assign({}, formData.getHeaders()), { 'pinata_api_key': this.config.apiKey, 'pinata_secret_api_key': this.config.secretApiKey }),
                });
                return response.data;
            }
            catch (error) {
                console.error('Error uploading to PINATA:', error);
                throw new Error(`Failed to upload file to PINATA: ${((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || error.message}`);
            }
        });
    }
    generateFileUrl(ipfsHash) {
        return `${this.config.gateway}/ipfs/${ipfsHash}`;
    }
    unpinFile(ipfsHash) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!this.isConfigured()) {
                throw new Error('PINATA is not configured');
            }
            try {
                yield axios_1.default.delete(`https://api.pinata.cloud/pinning/unpin/${ipfsHash}`, {
                    headers: {
                        'pinata_api_key': this.config.apiKey,
                        'pinata_secret_api_key': this.config.secretApiKey,
                    },
                });
            }
            catch (error) {
                console.error('Error unpinning from PINATA:', error);
                throw new Error(`Failed to unpin file from PINATA: ${((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || error.message}`);
            }
        });
    }
    testConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isConfigured()) {
                return false;
            }
            try {
                const response = yield axios_1.default.get('https://api.pinata.cloud/data/testAuthentication', {
                    headers: {
                        'pinata_api_key': this.config.apiKey,
                        'pinata_secret_api_key': this.config.secretApiKey,
                    },
                });
                return response.data.message === 'Congratulations! You are communicating with the Pinata API!';
            }
            catch (error) {
                console.error('PINATA connection test failed:', error);
                return false;
            }
        });
    }
}
exports.pinataService = new PinataService();
exports.default = exports.pinataService;

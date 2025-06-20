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
const pinata_web3_1 = require("pinata-web3");
const fs_1 = __importDefault(require("fs"));
class PinataService {
    constructor() {
        this.pinata = null;
        this.config = {
            jwt: process.env.PINATA_JWT || '',
            gateway: process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud'
        };
        if (this.config.jwt) {
            this.pinata = new pinata_web3_1.PinataSDK({
                pinataJwt: this.config.jwt,
                pinataGateway: this.config.gateway
            });
        }
        else {
            console.warn('PINATA JWT not configured. File uploads will use local storage.');
        }
    }
    isConfigured() {
        return !!(this.config.jwt && this.pinata);
    }
    uploadFile(filePath, fileName, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isConfigured()) {
                throw new Error('PINATA is not configured');
            }
            try {
                const fileBuffer = fs_1.default.readFileSync(filePath);
                const file = new File([new Uint8Array(fileBuffer)], fileName);
                const uploadOptions = {
                    metadata: Object.assign({ name: fileName }, (metadata && { keyvalues: metadata }))
                };
                const result = yield this.pinata.upload.file(file, uploadOptions);
                return {
                    IpfsHash: result.IpfsHash,
                    PinSize: result.PinSize,
                    Timestamp: result.Timestamp || new Date().toISOString()
                };
            }
            catch (error) {
                console.error('Error uploading to PINATA:', error);
                throw new Error(`Failed to upload file to PINATA: ${error.message}`);
            }
        });
    }
    generateFileUrl(ipfsHash) {
        return `${this.config.gateway}/ipfs/${ipfsHash}`;
    }
    unpinFile(ipfsHash) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isConfigured()) {
                throw new Error('PINATA is not configured');
            }
            try {
                yield this.pinata.unpin([ipfsHash]);
            }
            catch (error) {
                console.error('Error unpinning from PINATA:', error);
                throw new Error(`Failed to unpin file from PINATA: ${error.message}`);
            }
        });
    }
    testConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isConfigured()) {
                return false;
            }
            try {
                const result = yield this.pinata.testAuthentication();
                return result.message === 'Congratulations! You are communicating with the Pinata API!';
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

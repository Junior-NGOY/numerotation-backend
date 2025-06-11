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
exports.generateSlug = generateSlug;
exports.generateVehiculeCode = generateVehiculeCode;
exports.generateSequentialVehiculeCode = generateSequentialVehiculeCode;
exports.getNextVehicleSequence = getNextVehicleSequence;
const db_1 = require("../db/db");
function generateSlug(title) {
    const slug = title.toLowerCase().replace(/\s+/g, "-");
    const cleanedSlug = slug.replace(/[^\w\-]/g, "");
    return cleanedSlug;
}
function generateVehiculeCode(marque, modele, immatriculation) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const marqueSlug = marque.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, '').padEnd(2, 'X');
    const modeleSlug = modele.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, '').padEnd(2, 'X');
    const immatSlug = immatriculation.replace(/[^A-Z0-9]/g, '').substring(0, 3).padEnd(3, '0');
    return `${marqueSlug}${modeleSlug}${immatSlug}${timestamp.slice(-6)}${random}`;
}
function generateSequentialVehiculeCode(year, sequence, numeroImmatriculation) {
    const yearSuffix = year.toString().slice(-2);
    const plateLetters = numeroImmatriculation
        .replace(/[^A-Z]/gi, '')
        .toUpperCase()
        .substring(0, 2)
        .padEnd(2, 'X');
    const paddedSequence = sequence.toString().padStart(6, '0');
    return `LSH-${yearSuffix}-${plateLetters}${paddedSequence}`;
}
function getNextVehicleSequence(year, numeroImmatriculation) {
    return __awaiter(this, void 0, void 0, function* () {
        const plateLetters = numeroImmatriculation
            .replace(/[^A-Z]/gi, '')
            .toUpperCase()
            .substring(0, 2)
            .padEnd(2, 'X');
        const yearPrefix = `LSH-${year.toString().slice(-2)}-${plateLetters}`;
        const lastVehicle = yield db_1.db.vehicule.findFirst({
            where: {
                codeUnique: {
                    startsWith: yearPrefix
                }
            },
            orderBy: {
                codeUnique: 'desc'
            }
        });
        if (!lastVehicle) {
            return 1;
        }
        const codeUnique = lastVehicle.codeUnique;
        const sequencePart = codeUnique.split('-')[2].substring(2);
        const lastSequence = parseInt(sequencePart, 10);
        return lastSequence + 1;
    });
}

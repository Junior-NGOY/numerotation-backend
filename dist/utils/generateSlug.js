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
    const platePrefix = numeroImmatriculation
        .replace(/[^A-Z0-9]/gi, '')
        .toUpperCase()
        .substring(0, 2)
        .padEnd(2, 'X');
    const paddedSequence = sequence.toString().padStart(8, '0');
    return `LSH-${yearSuffix}-${platePrefix}${paddedSequence}`;
}
function getNextVehicleSequence(year, numeroImmatriculation) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const yearPrefix = `LSH-${year.toString().slice(-2)}-`;
            console.log(`🔍 [SEQUENCE] Recherche véhicules pour l'année ${year} avec préfixe: ${yearPrefix}`);
            const vehicules = yield db_1.db.vehicule.findMany({
                where: {
                    codeUnique: {
                        startsWith: yearPrefix
                    }
                },
                select: {
                    codeUnique: true
                }
            });
            console.log(`📊 [SEQUENCE] ${vehicules.length} véhicule(s) trouvé(s) pour l'année ${year}`);
            if (vehicules.length === 0) {
                console.log(`✨ [SEQUENCE] Premier véhicule pour l'année ${year}, séquence: 1`);
                return 1;
            }
            let maxSequence = 0;
            console.log(`🔢 [SEQUENCE] Analyse des codes existants:`);
            for (const vehicule of vehicules) {
                const codeUnique = vehicule.codeUnique;
                console.log(`   - Code: ${codeUnique}`);
                const parts = codeUnique.split('-');
                if (parts.length === 3) {
                    const sequencePart = parts[2].substring(2);
                    const sequenceNum = parseInt(sequencePart, 10);
                    console.log(`     → Séquence extraite: ${sequencePart} → ${sequenceNum}`);
                    if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
                        maxSequence = sequenceNum;
                        console.log(`     → Nouveau maximum: ${maxSequence}`);
                    }
                }
                else {
                    console.log(`     → Format invalide, ignoré`);
                }
            }
            const nextSequence = maxSequence + 1;
            console.log(`📈 [SEQUENCE] Plus grande séquence trouvée: ${maxSequence}, prochaine séquence: ${nextSequence}`);
            return nextSequence;
        }
        catch (error) {
            console.error('❌ Erreur lors de la récupération de la séquence:', error);
            const timestamp = Date.now().toString().slice(-6);
            const fallbackSequence = parseInt(timestamp, 10);
            console.log(`🚨 Utilisation du fallback, séquence: ${fallbackSequence}`);
            return fallbackSequence;
        }
    });
}

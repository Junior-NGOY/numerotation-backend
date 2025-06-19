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
exports.verifyVehicleByCode = verifyVehicleByCode;
exports.getVerificationStats = getVerificationStats;
const db_1 = require("../db/db");
function verifyVehicleByCode(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const { codeUnique } = req.params;
        try {
            const vehicule = yield db_1.db.vehicule.findUnique({
                where: { codeUnique },
                include: {
                    proprietaire: {
                        select: {
                            nom: true,
                            prenom: true,
                            telephone: true
                        }
                    },
                    itineraire: {
                        select: {
                            nom: true,
                            description: true
                        }
                    }
                }
            });
            if (!vehicule) {
                return res.status(404).json({
                    success: false,
                    message: 'Véhicule non trouvé',
                    data: null
                });
            }
            const vehicleData = {
                codeUnique: vehicule.codeUnique,
                marque: vehicule.marque,
                modele: vehicule.modele,
                typeVehicule: vehicule.typeVehicule,
                numeroImmatriculation: vehicule.numeroImmatriculation,
                anneeFabrication: vehicule.anneeFabrication,
                capaciteAssises: vehicule.capaciteAssises,
                anneeEnregistrement: vehicule.anneeEnregistrement,
                proprietaire: {
                    nom: `${vehicule.proprietaire.prenom} ${vehicule.proprietaire.nom}`,
                    telephone: vehicule.proprietaire.telephone
                },
                itineraire: {
                    nom: ((_a = vehicule.itineraire) === null || _a === void 0 ? void 0 : _a.nom) || 'Non spécifié',
                    description: ((_b = vehicule.itineraire) === null || _b === void 0 ? void 0 : _b.description) || ''
                },
                statut: 'Valide',
                dateVerification: new Date().toISOString()
            };
            return res.status(200).json({
                success: true,
                message: 'Véhicule vérifié avec succès',
                data: vehicleData
            });
        }
        catch (error) {
            console.error('Erreur lors de la vérification du véhicule:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                data: null
            });
        }
    });
}
function getVerificationStats(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const [totalVehicules, vehiculesActifs] = yield Promise.all([
                db_1.db.vehicule.count(),
                db_1.db.vehicule.count({
                    where: {
                        createdAt: {
                            gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
                        }
                    }
                })
            ]);
            return res.status(200).json({
                success: true,
                data: {
                    totalVehicules,
                    vehiculesActifs,
                    pourcentageActifs: totalVehicules > 0 ? Math.round((vehiculesActifs / totalVehicules) * 100) : 0
                }
            });
        }
        catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                data: null
            });
        }
    });
}

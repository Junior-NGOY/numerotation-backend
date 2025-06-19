"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verification_prod_1 = require("../controllers/verification-prod");
const router = (0, express_1.Router)();
router.get('/:codeUnique', verification_prod_1.verifyVehicleByCode);
router.get('/stats/overview', verification_prod_1.getVerificationStats);
exports.default = router;

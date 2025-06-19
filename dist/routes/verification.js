"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verification_1 = require("../controllers/verification");
const router = (0, express_1.Router)();
router.get('/:codeUnique', verification_1.verifyVehicleByCode);
router.get('/stats/overview', verification_1.getVerificationStats);
exports.default = router;

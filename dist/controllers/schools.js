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
exports.createSchool = createSchool;
exports.getSchools = getSchools;
const db_1 = require("../db/db");
const generateSlug_1 = require("../utils/generateSlug");
function createSchool(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { name, logo } = req.body;
        const slug = (0, generateSlug_1.generateSlug)(name);
        try {
            const existingSchool = yield db_1.db.school.findUnique({
                where: {
                    slug,
                },
            });
            if (existingSchool) {
                return res.status(409).json({
                    data: null,
                    error: "School with this name already exists",
                });
            }
            const newSchool = yield db_1.db.school.create({
                data: {
                    name,
                    slug,
                    logo,
                },
            });
            console.log(`School created successfully: ${newSchool.name} (${newSchool.id})`);
            return res.status(201).json({
                data: newSchool,
                error: null,
            });
        }
        catch (error) {
            console.log(error);
            return res.status(500).json({
                data: null,
                error: "Something went wrong",
            });
        }
    });
}
function getSchools(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const schools = yield db_1.db.school.findMany({
                orderBy: {
                    createdAt: "desc",
                },
            });
            return res.status(200).json(schools);
        }
        catch (error) {
            console.log(error);
        }
    });
}

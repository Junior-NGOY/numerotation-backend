"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const client_1 = require("@prisma/client");
if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL non définie dans les variables d'environnement");
    console.error("📋 Variables d'environnement disponibles :", Object.keys(process.env).filter(key => key.includes('DATABASE')));
    throw new Error("DATABASE_URL is required");
}
console.log("✅ DATABASE_URL trouvée:", process.env.DATABASE_URL ? 'Définie' : 'Non définie');
exports.db = globalThis.prisma || new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
if (process.env.NODE_ENV !== "production")
    globalThis.prisma = exports.db;

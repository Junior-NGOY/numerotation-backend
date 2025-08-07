import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

// Vérifier que DATABASE_URL est définie
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL non définie dans les variables d'environnement");
  console.error("📋 Variables d'environnement disponibles :", Object.keys(process.env).filter(key => key.includes('DATABASE')));
  throw new Error("DATABASE_URL is required");
}

console.log("✅ DATABASE_URL trouvée:", process.env.DATABASE_URL ? 'Définie' : 'Non définie');

export const db = globalThis.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Optimisation pour Neon
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== "production") globalThis.prisma = db;

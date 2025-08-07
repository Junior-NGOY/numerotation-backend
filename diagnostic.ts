// Charger dotenv en premier
require("dotenv").config();

import { db } from "./src/db/db";
import bcrypt from "bcryptjs";

async function testDatabaseConnection() {
  console.log("🔍 Test de connexion à la base de données...");
  
  // Vérifier les variables d'environnement d'abord
  console.log("📋 Variables d'environnement :");
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Définie' : 'Non définie'}`);
  console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? 'Définie' : 'Non définie'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL non définie !");
    console.error("💡 Vérifiez que le fichier .env existe et contient DATABASE_URL");
    return;
  }
  
  try {
    // Test de connexion
    const result = await db.$queryRaw`SELECT 1 as test`;
    console.log("✅ Connexion à la base de données réussie:", result);
    
    // Test de lecture des utilisateurs
    const userCount = await db.user.count();
    console.log(`✅ Nombre d'utilisateurs dans la base: ${userCount}`);
    
    // Si aucun utilisateur, créer un utilisateur de test
    if (userCount === 0) {
      console.log("ℹ️  Aucun utilisateur trouvé, création d'un utilisateur de test...");
      
      const hashedPassword = await bcrypt.hash("password123", 12);
      
      const testUser = await db.user.create({
        data: {
          email: "admin@test.com",
          name: "Admin Test",
          password: hashedPassword,
          role: "ADMIN"
        }
      });
      
      console.log("✅ Utilisateur de test créé:", {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        role: testUser.role
      });
      console.log("🔑 Utilisez les identifiants suivants pour vous connecter:");
      console.log("   Email: admin@test.com");
      console.log("   Mot de passe: password123");
    } else {
      // Afficher les utilisateurs existants
      const users = await db.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true
        }
      });
      
      console.log("✅ Utilisateurs existants:");
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.name}) - ${user.role} - ${user.isActive ? 'Actif' : 'Inactif'}`);
      });
    }
    
  } catch (error) {
    console.error("❌ Erreur lors du test de la base de données:", error);
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        console.error("💡 Suggestion: Vérifiez votre connexion internet et l'URL de la base de données");
      } else if (error.message.includes('authentication')) {
        console.error("💡 Suggestion: Vérifiez les identifiants de la base de données dans .env");
      } else if (error.message.includes('does not exist')) {
        console.error("💡 Suggestion: Exécutez 'npx prisma migrate dev' pour créer les tables");
      }
    }
  } finally {
    await db.$disconnect();
  }
}

// Test du JWT
function testJWT() {
  console.log("\n🔍 Test de la configuration JWT...");
  
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("❌ JWT_SECRET non défini dans .env");
    return false;
  }
  
  if (jwtSecret === "vehicle-registration-super-secret-jwt-key-2024-change-this-in-production") {
    console.log("⚠️  JWT_SECRET utilise la valeur par défaut (OK pour le développement)");
  }
  
  console.log("✅ JWT_SECRET configuré");
  return true;
}

async function runDiagnostics() {
  console.log("🚀 Diagnostic du backend de l'application vehicle-registration\n");
  
  // Test des variables d'environnement
  console.log("🔍 Variables d'environnement:");
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Définie' : 'Non définie'}`);
  console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? 'Définie' : 'Non définie'}`);
  console.log(`   PORT: ${process.env.PORT || '8000'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}\n`);
  
  // Test JWT
  testJWT();
  
  // Test de la base de données
  await testDatabaseConnection();
  
  console.log("\n🎯 Si le problème persiste:");
  console.log("1. Vérifiez que le serveur backend est démarré avec 'npm run dev'");
  console.log("2. Vérifiez que l'URL frontend pointe vers http://localhost:8000");
  console.log("3. Vérifiez les logs du serveur backend");
  console.log("4. Essayez de faire une requête directe: curl http://localhost:8000/health");
}

runDiagnostics().catch(console.error);

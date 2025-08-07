import { PrismaClient } from "@prisma/client";

async function testDifferentConnections() {
  console.log("🔍 Test de différentes configurations de connexion...\n");
  
  // URL actuelle
  const currentUrl = "postgresql://register_owner:npg_CGQPgfh9e3pD@ep-misty-hall-a84j7reh-pooler.eastus2.azure.neon.tech/register?sslmode=require";
  
  // Variations à tester
  const urlsToTest = [
    // URL actuelle
    currentUrl,
    
    // Sans SSL
    "postgresql://register_owner:npg_CGQPgfh9e3pD@ep-misty-hall-a84j7reh-pooler.eastus2.azure.neon.tech/register",
    
    // Avec sslmode=prefer
    "postgresql://register_owner:npg_CGQPgfh9e3pD@ep-misty-hall-a84j7reh-pooler.eastus2.azure.neon.tech/register?sslmode=prefer",
    
    // Avec timeout
    "postgresql://register_owner:npg_CGQPgfh9e3pD@ep-misty-hall-a84j7reh-pooler.eastus2.azure.neon.tech/register?sslmode=require&connect_timeout=30",
    
    // URL directe sans pooler
    "postgresql://register_owner:npg_CGQPgfh9e3pD@ep-misty-hall-a84j7reh.eastus2.azure.neon.tech/register?sslmode=require"
  ];
  
  for (let i = 0; i < urlsToTest.length; i++) {
    const url = urlsToTest[i];
    console.log(`\n🧪 Test ${i + 1}/${urlsToTest.length}:`);
    console.log(`URL: ${url.replace(/:[^:@]*@/, ':***@')}`); // Masquer le mot de passe
    
    try {
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: url
          }
        }
      });
      
      const start = Date.now();
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      const duration = Date.now() - start;
      
      console.log(`✅ Connexion réussie en ${duration}ms:`, result);
      
      // Test de comptage des utilisateurs
      const userCount = await prisma.user.count();
      console.log(`✅ Utilisateurs trouvés: ${userCount}`);
      
      await prisma.$disconnect();
      
      console.log("🎉 Cette configuration fonctionne !");
      break;
      
    } catch (error: any) {
      console.log(`❌ Échec:`, error.message);
      if (error.code) {
        console.log(`   Code d'erreur: ${error.code}`);
      }
    }
  }
  
  console.log("\n💡 Suggestions:");
  console.log("1. Vérifiez l'état de votre base Neon sur https://console.neon.tech");
  console.log("2. Essayez de recréer la chaîne de connexion depuis la console Neon");
  console.log("3. Vérifiez si votre abonnement Neon est actif");
  console.log("4. Contactez le support Neon si le problème persiste");
}

testDifferentConnections().catch(console.error);

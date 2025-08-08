// Test de la fonction d'unicité
const { generateUniqueVehiculeCode } = require('./dist/utils/generateSlug');

console.log('🧪 === TEST DE LA FONCTION D\'UNICITÉ ===\n');

// Simuler une base de données avec quelques codes existants
const existingCodes = new Set([
  '20256A1234',
  '2025941567',
  '2025162890',
  '2025AX3456'
]);

// Fonction de vérification d'unicité simulée
const checkUniqueness = async (code) => {
  const isUnique = !existingCodes.has(code);
  console.log(`   🔍 Vérification code ${code}: ${isUnique ? '✅ Unique' : '❌ Existe déjà'}`);
  return isUnique;
};

async function testUnicite() {
  const plaque = '9416AX05';
  const annee = 2025;
  
  console.log(`📋 Test avec plaque: ${plaque}`);
  console.log(`📅 Année: ${annee}`);
  console.log(`🗂️ Codes existants simulés: ${Array.from(existingCodes).join(', ')}\n`);
  
  try {
    console.log('🔄 Génération d\'un code unique...\n');
    const uniqueCode = await generateUniqueVehiculeCode(plaque, annee, checkUniqueness);
    console.log(`\n🎉 Code unique final généré: ${uniqueCode}`);
    
    // Ajouter le code généré à notre "base de données" simulée
    existingCodes.add(uniqueCode);
    console.log(`\n💾 Code ajouté à la base simulée. Total: ${existingCodes.size} codes`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération:', error.message);
  }
}

// Exécuter le test
testUnicite().then(() => {
  console.log('\n🏁 Test d\'unicité terminé !');
}).catch(console.error);

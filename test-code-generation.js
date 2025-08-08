// Script de test pour la nouvelle génération de code unique
const { generateSecureVehiculeCode } = require('./dist/utils/generateSlug');

console.log('🧪 === TEST DE LA NOUVELLE GÉNÉRATION DE CODE UNIQUE ===\n');

// Test avec la plaque exemple: 9416AX05
const plaque = '9416AX05';
const annee = 2025;

console.log(`📋 Plaque de test: ${plaque}`);
console.log(`📅 Année de test: ${annee}`);
console.log(`🎯 Zone d'extraction: ${plaque.substring(0, 6)} (6 premiers caractères)`);
console.log(`📊 Positions possibles: 0→94, 1→41, 2→16, 3→6A, 4→AX`);
console.log(`🏷️ Format attendu: LSH-25-94XXXXXX (où 94 peut être 94, 41, 16, 6A ou AX)\n`);

// Générer plusieurs codes pour voir la variabilité
console.log('🔄 Génération de 10 codes pour tester la variabilité:\n');

for (let i = 1; i <= 10; i++) {
  try {
    const code = generateSecureVehiculeCode(plaque, annee);
    console.log(`${i.toString().padStart(2, '0')}. ${code}`);
  } catch (error) {
    console.error(`❌ Erreur génération ${i}:`, error.message);
  }
}

console.log('\n🧪 === TEST AVEC DIFFÉRENTES PLAQUES ===\n');

const testCases = [
  { plaque: '1234AB67', annee: 2024, desc: 'Format classique 8 caractères' },
  { plaque: '9876XY12', annee: 2023, desc: 'Autre format 8 caractères' },
  { plaque: '123456', annee: 2025, desc: 'Format minimal 6 caractères' },
  { plaque: 'ABCDEF78', annee: 2025, desc: 'Lettres en début' },
];

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.desc}: ${testCase.plaque}`);
  try {
    const code = generateSecureVehiculeCode(testCase.plaque, testCase.annee);
    console.log(`   ✅ Code généré: ${code}\n`);
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}\n`);
  }
});

console.log('🏁 Tests terminés !');

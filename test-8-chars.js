// Test de la nouvelle logique avec 8 caractères

function generateSequentialVehiculeCode(year, sequence, numeroImmatriculation) {
  const yearSuffix = year.toString().slice(-2); // Derniers 2 chiffres de l'année
  
  // Extraire les 2 premiers caractères de la plaque d'immatriculation (chiffres ou lettres)
  const platePrefix = numeroImmatriculation
    .replace(/[^A-Z0-9]/gi, '') // Garder seulement les lettres et les chiffres
    .toUpperCase()
    .substring(0, 2) // Prendre les 2 premiers caractères (chiffres ou lettres)
    .padEnd(2, 'X'); // Compléter avec 'X' si moins de 2 caractères
  
  const paddedSequence = sequence.toString().padStart(8, '0'); // Séquence sur 8 chiffres
  
  return `LSH-${yearSuffix}-${platePrefix}${paddedSequence}`;
}

console.log('🧪 Test avec la nouvelle limite de 8 caractères\n');

// Test avec différentes séquences
const testCases = [
  { seq: 1, immat: '12ABC123' },
  { seq: 99, immat: 'AB123CD4' },
  { seq: 999999, immat: '1A2B3C4D' },
  { seq: 99999999, immat: 'XY123456' }, // Maximum avec 8 chiffres
];

testCases.forEach((testCase, index) => {
  const result = generateSequentialVehiculeCode(2025, testCase.seq, testCase.immat);
  const sequencePart = result.split('-')[2].substring(2); // Extraire la partie séquence
  
  console.log(`Test ${index + 1}:`);
  console.log(`  Séquence: ${testCase.seq}`);
  console.log(`  Immatriculation: "${testCase.immat}"`);
  console.log(`  Code généré: ${result}`);
  console.log(`  Séquence dans le code: ${sequencePart} (${sequencePart.length} caractères)`);
  console.log(`  ✅ ${sequencePart.length === 8 ? 'LONGUEUR CORRECTE' : '❌ LONGUEUR INCORRECTE'}\n`);
});

console.log('✨ Tests terminés !');

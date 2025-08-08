/*
  Test de la génération séquentielle du code véhicule
  - Vérifie que XY est choisi aléatoirement parmi les paires adjacentes
    des 4 premiers chiffres de la plaque (ex: 9412 -> 94, 41, 12)
  - Préserve le format LSH-YY-XY000000
*/

// Assurer une valeur d'environnement pour éviter l'initialisation Prisma bloquante
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db?schema=public';
}
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

(async () => {
  const { generateSequentialVehiculeCode } = await import("../src/utils/generateSlug");

  function extractXY(code: string): string {
    // Format attendu: LSH-YY-XY000000
    const part = code.split('-')[2] || '';
    return part.substring(0, 2);
  }

  function testWithPlate(plate: string, year: number, runs = 20) {
    const digits = plate.replace(/\D/g, '');
    const firstN = digits.slice(0, Math.min(4, digits.length));
    const candidates: string[] = [];
    for (let i = 0; i < firstN.length - 1; i++) {
      candidates.push(firstN.substring(i, i + 2));
    }

    console.log(`\n🧪 Plaque: ${plate} | Année: ${year}`);
    console.log(`   → Paires candidates pour XY: ${candidates.length ? candidates.join(', ') : '(repli: 2 premiers alphanumériques)'}`);

    const seen: Record<string, number> = {};
    const results: string[] = [];

    for (let i = 0; i < runs; i++) {
      const code = generateSequentialVehiculeCode(year, 1, plate); // garder sequence=1 pour observer XY
      const xy = extractXY(code);
      results.push(code);
      seen[xy] = (seen[xy] || 0) + 1;

      // Vérifs simples
      if (!/^LSH-\d{2}-[A-Z0-9]{8}$/.test(code)) {
        console.error(`   ❌ Format invalide: ${code}`);
      }

      if (candidates.length > 0 && !candidates.includes(xy)) {
        console.error(`   ❌ XY '${xy}' n'est pas dans les candidates: [${candidates.join(', ')}]`);
      }
    }

    console.log('   Résultats:');
    results.forEach((r, idx) => console.log(`   ${String(idx + 1).padStart(2, '0')}. ${r}`));

    console.log('   Fréquences XY:');
    Object.entries(seen).forEach(([k, v]) => console.log(`   - ${k}: ${v}`));
  }

  console.log('=== TEST: generateSequentialVehiculeCode ===');

  // Cas principal: 9412AX05 -> candidats 94, 41, 12
  testWithPlate('9412AX05', 2025, 20);

  // Autres cas
  testWithPlate('1234AB67', 2024, 15); // 12, 23, 34
  testWithPlate('9876XY12', 2023, 15); // 98, 87, 76
  testWithPlate('12A', 2025, 10);      // 12 (une seule paire)
  testWithPlate('A', 2025, 5);         // repli: 2 premiers alphanumériques

  console.log('\n🏁 Tests terminés');
})();

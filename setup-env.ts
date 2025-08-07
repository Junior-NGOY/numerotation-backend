#!/usr/bin/env tsx
/**
 * Script pour configurer l'environnement de développement ou production
 * Usage: npm run setup:dev ou npm run setup:prod
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ENV_FILE = join(__dirname, '.env');

function updateDatabaseUrl(environment: 'development' | 'production') {
  try {
    const envContent = readFileSync(ENV_FILE, 'utf8');
    
    let newContent: string;
    let newDatabaseUrl: string;
    
    if (environment === 'development') {
      // Extraire l'URL de développement du fichier
      const devUrlMatch = envContent.match(/DATABASE_URL_DEVELOPMENT="([^"]+)"/);
      if (!devUrlMatch) {
        console.error('❌ DATABASE_URL_DEVELOPMENT non trouvée dans .env');
        process.exit(1);
      }
      newDatabaseUrl = devUrlMatch[1];
      console.log('✅ Configuration mise à jour pour DÉVELOPPEMENT');
      console.log('📝 Utilise DATABASE_URL_DEVELOPMENT');
    } else {
      // Extraire l'URL de production du fichier
      const prodUrlMatch = envContent.match(/DATABASE_URL_PRODUCTION="([^"]+)"/);
      if (!prodUrlMatch) {
        console.error('❌ DATABASE_URL_PRODUCTION non trouvée dans .env');
        process.exit(1);
      }
      newDatabaseUrl = prodUrlMatch[1];
      console.log('✅ Configuration mise à jour pour PRODUCTION');
      console.log('📝 Utilise DATABASE_URL_PRODUCTION');
    }
    
    newContent = envContent.replace(
      /DATABASE_URL="[^"]*"/,
      `DATABASE_URL="${newDatabaseUrl}"`
    );
    
    writeFileSync(ENV_FILE, newContent);
    console.log('🔄 Fichier .env mis à jour avec succès');
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    process.exit(1);
  }
}

// Récupérer l'argument de ligne de commande
const environment = process.argv[2] as 'development' | 'production';

if (!environment || !['development', 'production'].includes(environment)) {
  console.error('❌ Usage: tsx setup-env.ts [development|production]');
  process.exit(1);
}

updateDatabaseUrl(environment);

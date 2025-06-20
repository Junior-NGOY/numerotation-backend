import { db } from "../src/db/db";
import { pinataService } from "../src/services/pinata";
import { unlink } from "fs/promises";
import fs from "fs";
import path from "path";

interface DocumentMigration {
  id: string;
  nom: string;
  currentPath: string;
  newPinataUrl?: string;
  migrated: boolean;
  error?: string;
}

async function migrateDocumentsToPinata() {
  console.log('🚀 Début de la migration des documents vers PINATA...');

  if (!pinataService.isConfigured()) {
    console.error('❌ PINATA n\'est pas configuré. Veuillez configurer PINATA_JWT et PINATA_GATEWAY.');
    process.exit(1);
  }

  try {
    // Récupérer tous les documents avec des chemins locaux
    const documentsToMigrate = await db.document.findMany({
      where: {
        chemin: {
          not: {
            contains: 'ipfs'
          }
        }
      },
      select: {
        id: true,
        nom: true,
        chemin: true,
        type: true,
        proprietaire: {
          select: {
            id: true,
            nom: true,
            prenom: true
          }
        },
        vehicule: {
          select: {
            id: true,
            marque: true,
            modele: true,
            numeroImmatriculation: true
          }
        }
      }
    });

    console.log(`📄 ${documentsToMigrate.length} document(s) à migrer trouvé(s)`);

    if (documentsToMigrate.length === 0) {
      console.log('✅ Aucun document à migrer. Tous les documents utilisent déjà PINATA.');
      return;
    }

    const migrationResults: DocumentMigration[] = [];

    for (const document of documentsToMigrate) {
      const migrationResult: DocumentMigration = {
        id: document.id,
        nom: document.nom,
        currentPath: document.chemin,
        migrated: false
      };

      try {
        console.log(`🔄 Migration du document: ${document.nom} (${document.id})`);
        
        // Vérifier que le fichier existe
        if (!fs.existsSync(document.chemin)) {
          migrationResult.error = 'Fichier non trouvé sur le disque';
          console.warn(`⚠️ Fichier non trouvé: ${document.chemin}`);
          migrationResults.push(migrationResult);
          continue;
        }        // Préparer les métadonnées
        const metadata: any = {
          type: document.type,
          documentId: document.id,
          proprietaireId: document.proprietaire?.id || null,
          vehiculeId: document.vehicule?.id || null,
          migrationDate: new Date().toISOString()
        };

        // Ajouter des informations contextuelles
        if (document.proprietaire) {
          metadata.proprietaireName = `${document.proprietaire.nom} ${document.proprietaire.prenom}`;
        }
        if (document.vehicule) {
          metadata.vehiculeInfo = `${document.vehicule.marque} ${document.vehicule.modele} - ${document.vehicule.numeroImmatriculation}`;
        }

        // Upload vers PINATA
        const fileName = path.basename(document.chemin);
        const pinataResult = await pinataService.uploadFile(
          document.chemin,
          fileName,
          metadata
        );

        const pinataUrl = pinataService.generateFileUrl(pinataResult.IpfsHash);
        migrationResult.newPinataUrl = pinataUrl;

        // Mettre à jour l'enregistrement dans la base de données
        await db.document.update({
          where: { id: document.id },
          data: {
            chemin: pinataUrl
          }
        });

        // Supprimer le fichier local après migration réussie
        try {
          await unlink(document.chemin);
          console.log(`🗑️ Fichier local supprimé: ${document.chemin}`);
        } catch (unlinkError) {
          console.warn(`⚠️ Impossible de supprimer le fichier local ${document.chemin}:`, unlinkError);
        }

        migrationResult.migrated = true;
        console.log(`✅ Document migré avec succès: ${document.nom} -> ${pinataUrl}`);

      } catch (error: any) {
        migrationResult.error = error.message;
        console.error(`❌ Erreur lors de la migration du document ${document.nom}:`, error);
      }

      migrationResults.push(migrationResult);
    }

    // Rapport de migration
    const successfulMigrations = migrationResults.filter(r => r.migrated);
    const failedMigrations = migrationResults.filter(r => !r.migrated);

    console.log('\n📊 Rapport de migration:');
    console.log(`✅ Réussies: ${successfulMigrations.length}`);
    console.log(`❌ Échouées: ${failedMigrations.length}`);

    if (failedMigrations.length > 0) {
      console.log('\n❌ Migrations échouées:');
      failedMigrations.forEach(migration => {
        console.log(`- ${migration.nom} (${migration.id}): ${migration.error}`);
      });
    }

    console.log('\n🎉 Migration terminée !');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Exécuter la migration
if (require.main === module) {
  migrateDocumentsToPinata();
}

export { migrateDocumentsToPinata };

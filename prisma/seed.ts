import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...');

  // Créer un utilisateur admin par défaut
  const adminPassword = await bcrypt.hash('admin123', 12);
  const userPassword = await bcrypt.hash('user123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vehicleregistration.com' },
    update: {},
    create: {
      email: 'admin@vehicleregistration.com',
      name: 'Administrateur Système',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@vehicleregistration.com' },
    update: {},
    create: {
      email: 'user@vehicleregistration.com',
      name: 'Utilisateur Test',
      password: userPassword,
      role: 'USER',
      isActive: true,
    },
  });

  console.log('✅ Utilisateurs créés:', { admin: admin.email, user: user.email });

  // Créer quelques propriétaires de test
  const proprietaire1 = await prisma.proprietaire.create({
    data: {
      nom: 'Dupont',
      prenom: 'Jean',
      adresse: '123 Rue de la Paix, 75001 Paris',
      telephone: '+33123456789',
      numeroPiece: 'CNI123456789',
      typePiece: 'CARTE_IDENTITE',
      lieuDelivrance: 'Mairie de Paris',
      dateDelivrance: new Date('2020-01-15'),
      createdById: admin.id,
    },
  });

  const proprietaire2 = await prisma.proprietaire.create({
    data: {
      nom: 'Martin',
      prenom: 'Marie',
      adresse: '456 Avenue des Champs, 69002 Lyon',
      telephone: '+33987654321',
      numeroPiece: 'PASS123456789',
      typePiece: 'PASSEPORT',
      lieuDelivrance: 'Préfecture du Rhône',
      dateDelivrance: new Date('2019-06-20'),
      createdById: user.id,
    },
  });
  console.log('✅ Propriétaires créés:', { proprietaire1: proprietaire1.nom, proprietaire2: proprietaire2.nom });

  // Créer des itinéraires de test
  const itineraire1 = await prisma.itineraire.create({
    data: {
      nom: 'Ligne A: Centre-ville - Aéroport',
      description: 'Desserte entre le centre-ville et l\'aéroport international',
      distance: 25.5,
      duree: 45,
      isActive: true,
      createdById: admin.id,
    },
  });

  const itineraire2 = await prisma.itineraire.create({
    data: {
      nom: 'Ligne B: Gare - Université',
      description: 'Liaison entre la gare centrale et le campus universitaire',
      distance: 12.3,
      duree: 25,
      isActive: true,
      createdById: admin.id,
    },
  });

  const itineraire3 = await prisma.itineraire.create({
    data: {
      nom: 'Ligne C: Quartier résidentiel',
      description: 'Desserte des quartiers résidentiels périphériques',
      distance: 18.7,
      duree: 35,
      isActive: true,
      createdById: user.id,
    },
  });

  console.log('✅ Itinéraires créés:', { 
    itineraire1: itineraire1.nom, 
    itineraire2: itineraire2.nom, 
    itineraire3: itineraire3.nom 
  });

  // Créer quelques véhicules de test
  const vehicule1 = await prisma.vehicule.create({
    data: {
      marque: 'Mercedes',
      modele: 'Sprinter',
      typeVehicule: 'BUS',
      numeroImmatriculation: 'AB-123-CD',
      numeroChassis: 'WDB9066331234567',
      anneeFabrication: 2020,
      capaciteAssises: 20,
      itineraireId: itineraire1.id,
      codeUnique: 'VH001234',
      anneeEnregistrement: 2021,
      proprietaireId: proprietaire1.id,
      createdById: admin.id,
    },
  });

  const vehicule2 = await prisma.vehicule.create({
    data: {
      marque: 'Renault',
      modele: 'Master',
      typeVehicule: 'MINI_BUS',
      numeroImmatriculation: 'EF-456-GH',
      numeroChassis: 'VF1MA000012345678',
      anneeFabrication: 2019,
      capaciteAssises: 12,
      itineraireId: itineraire2.id,
      codeUnique: 'VH005678',
      anneeEnregistrement: 2020,
      proprietaireId: proprietaire2.id,
      createdById: user.id,
    },
  });

  console.log('✅ Véhicules créés:', { vehicule1: vehicule1.marque, vehicule2: vehicule2.marque });

  // Créer des logs d'audit de test
  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      table: 'User',
      recordId: admin.id,
      newValues: { email: admin.email, name: admin.name, role: admin.role },
      userEmail: 'system@vehicleregistration.com',
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      table: 'Proprietaire',
      recordId: proprietaire1.id,
      newValues: { nom: proprietaire1.nom, prenom: proprietaire1.prenom },
      userId: admin.id,
      userEmail: admin.email,
    },
  });

  console.log('✅ Logs d\'audit créés');

  console.log('🎉 Seeding terminé avec succès!');
  console.log('\n📋 Comptes de test créés:');
  console.log('👨‍💼 Admin: admin@vehicleregistration.com / admin123');
  console.log('👤 User: user@vehicleregistration.com / user123');
}

main()
  .catch((e) => {
    console.error('❌ Erreur pendant le seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

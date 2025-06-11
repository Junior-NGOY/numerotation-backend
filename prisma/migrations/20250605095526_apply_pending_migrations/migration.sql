/*
  Warnings:

  - You are about to drop the `School` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "TypePiece" AS ENUM ('CARTE_IDENTITE', 'PASSEPORT', 'PERMIS_SEJOUR');

-- CreateEnum
CREATE TYPE "TypeVehicule" AS ENUM ('BUS', 'MINI_BUS', 'TAXI');

-- CreateEnum
CREATE TYPE "TypeDocument" AS ENUM ('PIECE_IDENTITE', 'PERMIS_CONDUIRE', 'CARTE_ROSE', 'PDF_COMPLET', 'QR_CODE');

-- DropTable
DROP TABLE "School";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proprietaires" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "numeroPiece" TEXT NOT NULL,
    "typePiece" "TypePiece" NOT NULL,
    "lieuDelivrance" TEXT NOT NULL,
    "dateDelivrance" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "proprietaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicules" (
    "id" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "typeVehicule" "TypeVehicule" NOT NULL,
    "numeroImmatriculation" TEXT NOT NULL,
    "numeroChassis" TEXT NOT NULL,
    "anneeFabrication" INTEGER NOT NULL,
    "capaciteAssises" INTEGER NOT NULL,
    "itineraire" TEXT NOT NULL,
    "codeUnique" TEXT NOT NULL,
    "anneeEnregistrement" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "proprietaireId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "vehicules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "TypeDocument" NOT NULL,
    "chemin" TEXT NOT NULL,
    "taille" INTEGER,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "proprietaireId" TEXT,
    "vehiculeId" TEXT,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "table" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "userId" TEXT,
    "userEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "proprietaires_numeroPiece_key" ON "proprietaires"("numeroPiece");

-- CreateIndex
CREATE UNIQUE INDEX "vehicules_numeroImmatriculation_key" ON "vehicules"("numeroImmatriculation");

-- CreateIndex
CREATE UNIQUE INDEX "vehicules_numeroChassis_key" ON "vehicules"("numeroChassis");

-- CreateIndex
CREATE UNIQUE INDEX "vehicules_codeUnique_key" ON "vehicules"("codeUnique");

-- AddForeignKey
ALTER TABLE "proprietaires" ADD CONSTRAINT "proprietaires_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicules" ADD CONSTRAINT "vehicules_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "proprietaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicules" ADD CONSTRAINT "vehicules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "proprietaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "vehicules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

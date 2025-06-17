/*
  Warnings:

  - You are about to drop the column `itineraire` on the `vehicules` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "vehicules" DROP COLUMN "itineraire",
ADD COLUMN     "itineraireId" TEXT;

-- CreateTable
CREATE TABLE "itineraires" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "distance" DOUBLE PRECISION,
    "duree" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "itineraires_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "itineraires_nom_key" ON "itineraires"("nom");

-- AddForeignKey
ALTER TABLE "vehicules" ADD CONSTRAINT "vehicules_itineraireId_fkey" FOREIGN KEY ("itineraireId") REFERENCES "itineraires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itineraires" ADD CONSTRAINT "itineraires_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

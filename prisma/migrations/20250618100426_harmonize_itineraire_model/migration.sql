/*
  Warnings:

  - Made the column `itineraireId` on table `vehicules` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "vehicules" DROP CONSTRAINT "vehicules_itineraireId_fkey";

-- AlterTable
ALTER TABLE "vehicules" ALTER COLUMN "prixEnregistrement" SET DEFAULT 30000,
ALTER COLUMN "itineraireId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "vehicules" ADD CONSTRAINT "vehicules_itineraireId_fkey" FOREIGN KEY ("itineraireId") REFERENCES "itineraires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

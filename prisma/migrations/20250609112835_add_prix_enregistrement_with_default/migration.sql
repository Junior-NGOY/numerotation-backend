/*
  Warnings:

  - The values [PERMIS_SEJOUR] on the enum `TypePiece` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TypePiece_new" AS ENUM ('CARTE_IDENTITE', 'PASSEPORT');
ALTER TABLE "proprietaires" ALTER COLUMN "typePiece" TYPE "TypePiece_new" USING ("typePiece"::text::"TypePiece_new");
ALTER TYPE "TypePiece" RENAME TO "TypePiece_old";
ALTER TYPE "TypePiece_new" RENAME TO "TypePiece";
DROP TYPE "TypePiece_old";
COMMIT;

-- AlterTable
ALTER TABLE "vehicules" ADD COLUMN     "prixEnregistrement" INTEGER NOT NULL DEFAULT 30000;

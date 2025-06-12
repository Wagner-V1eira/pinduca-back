/*
  Warnings:

  - You are about to drop the column `comentarioId` on the `logs` table. All the data in the column will be lost.
  - You are about to drop the `comentarios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notas` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "comentarios" DROP CONSTRAINT "comentarios_gibiId_fkey";

-- DropForeignKey
ALTER TABLE "comentarios" DROP CONSTRAINT "comentarios_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "logs" DROP CONSTRAINT "logs_comentarioId_fkey";

-- DropForeignKey
ALTER TABLE "notas" DROP CONSTRAINT "notas_gibiId_fkey";

-- DropForeignKey
ALTER TABLE "notas" DROP CONSTRAINT "notas_usuarioId_fkey";

-- AlterTable
ALTER TABLE "logs" DROP COLUMN "comentarioId",
ADD COLUMN     "reviewId" INTEGER;

-- DropTable
DROP TABLE "comentarios";

-- DropTable
DROP TABLE "notas";

-- CreateTable
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "gibiId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "avaliacao" INTEGER NOT NULL,
    "conteudo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_gibiId_usuarioId_key" ON "reviews"("gibiId", "usuarioId");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_gibiId_fkey" FOREIGN KEY ("gibiId") REFERENCES "gibis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

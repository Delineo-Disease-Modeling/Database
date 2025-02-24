/*
  Warnings:

  - You are about to drop the column `dson_pattern` on the `MovementPattern` table. All the data in the column will be lost.
  - Added the required column `name` to the `ConvenienceZone` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patterns` to the `MovementPattern` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ConvenienceZone" ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MovementPattern" DROP COLUMN "dson_pattern",
ADD COLUMN     "patterns" TEXT NOT NULL;

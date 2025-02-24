/*
  Warnings:

  - You are about to drop the column `start_datetime` on the `MovementPattern` table. All the data in the column will be lost.
  - Added the required column `label` to the `ConvenienceZone` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_date` to the `MovementPattern` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ConvenienceZone" ADD COLUMN     "label" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MovementPattern" DROP COLUMN "start_datetime",
ADD COLUMN     "start_date" TIMESTAMP(3) NOT NULL;

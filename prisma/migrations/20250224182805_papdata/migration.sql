/*
  Warnings:

  - The primary key for the `MovementPattern` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `MovementPattern` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `papdata_id` to the `ConvenienceZone` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ConvenienceZone" ADD COLUMN     "papdata_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "MovementPattern" DROP CONSTRAINT "MovementPattern_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "MovementPattern_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "PaPData" (
    "id" SERIAL NOT NULL,
    "czone_id" INTEGER NOT NULL,

    CONSTRAINT "PaPData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaPData_czone_id_key" ON "PaPData"("czone_id");

-- AddForeignKey
ALTER TABLE "PaPData" ADD CONSTRAINT "PaPData_czone_id_fkey" FOREIGN KEY ("czone_id") REFERENCES "ConvenienceZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

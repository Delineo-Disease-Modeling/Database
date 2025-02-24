/*
  Warnings:

  - A unique constraint covering the columns `[czone_id]` on the table `MovementPattern` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MovementPattern_czone_id_key" ON "MovementPattern"("czone_id");

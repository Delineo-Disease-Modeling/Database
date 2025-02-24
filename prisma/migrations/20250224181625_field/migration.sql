/*
  Warnings:

  - You are about to drop the column `date_of_creation` on the `ConvenienceZone` table. All the data in the column will be lost.
  - Added the required column `czone_id` to the `MovementPattern` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ConvenienceZone" DROP COLUMN "date_of_creation",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "MovementPattern" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "czone_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "MovementPattern" ADD CONSTRAINT "MovementPattern_czone_id_fkey" FOREIGN KEY ("czone_id") REFERENCES "ConvenienceZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the `MealItem` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `imageUrl` to the `Meal` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MealItem" DROP CONSTRAINT "MealItem_mealId_fkey";

-- AlterTable
ALTER TABLE "Meal" ADD COLUMN     "description" TEXT,
ADD COLUMN     "imageUrl" TEXT NOT NULL,
ADD COLUMN     "time" TEXT;

-- DropTable
DROP TABLE "MealItem";

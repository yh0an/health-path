-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Set admin flag for owner
UPDATE "User" SET "isAdmin" = true WHERE email = 'yoan.pons@gmail.com';

/*
  Warnings:

  - You are about to drop the `BriefConversion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Project` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BriefConversion" DROP CONSTRAINT "BriefConversion_userId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_userId_fkey";

-- DropTable
DROP TABLE "BriefConversion";

-- DropTable
DROP TABLE "Project";

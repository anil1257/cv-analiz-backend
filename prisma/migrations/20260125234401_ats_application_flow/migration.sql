-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_positionId_fkey";

-- AlterTable
ALTER TABLE "Application" ALTER COLUMN "positionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

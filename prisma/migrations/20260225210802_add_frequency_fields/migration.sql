-- AlterTable
ALTER TABLE "Log" ADD COLUMN     "takenDate" TEXT;

-- AlterTable
ALTER TABLE "Medication" ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#43a047',
ADD COLUMN     "customDates" TEXT,
ADD COLUMN     "dayOfWeek" INTEGER,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN     "secondTime" TIMESTAMP(3);

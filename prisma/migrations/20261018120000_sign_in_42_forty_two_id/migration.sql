-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "forty_two_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Student_forty_two_id_key" ON "Student"("forty_two_id");

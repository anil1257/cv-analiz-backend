-- CreateTable
CREATE TABLE "AnalysisResult" (
    "id" SERIAL NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "educationScore" INTEGER NOT NULL,
    "experienceScore" INTEGER NOT NULL,
    "skillScore" INTEGER NOT NULL,
    "strengths" TEXT NOT NULL,
    "suggestions" TEXT NOT NULL,
    "careerNote" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicationId" INTEGER NOT NULL,

    CONSTRAINT "AnalysisResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisResult_applicationId_key" ON "AnalysisResult"("applicationId");

-- AddForeignKey
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

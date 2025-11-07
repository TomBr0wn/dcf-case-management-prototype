-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "action" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "recordId" INTEGER,
    "title" TEXT NOT NULL,
    "meta" JSONB,
    "userId" INTEGER,
    "caseId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActivityLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Victim" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Witness" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "ethnicity" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'English',
    "isCpsContactAllowed" BOOLEAN NOT NULL DEFAULT true,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "addressTown" TEXT,
    "addressPostcode" TEXT,
    "mobileNumber" TEXT,
    "emailAddress" TEXT,
    "preferredContactMethod" TEXT,
    "faxNumber" TEXT,
    "homeNumber" TEXT,
    "workNumber" TEXT,
    "otherNumber" TEXT,
    "isVictim" BOOLEAN NOT NULL DEFAULT false,
    "isKeyWitness" BOOLEAN NOT NULL DEFAULT false,
    "isChild" BOOLEAN NOT NULL DEFAULT false,
    "isExpert" BOOLEAN NOT NULL DEFAULT false,
    "isInterpreter" BOOLEAN NOT NULL DEFAULT false,
    "isPolice" BOOLEAN NOT NULL DEFAULT false,
    "isProfessional" BOOLEAN NOT NULL DEFAULT false,
    "isPrisoner" BOOLEAN NOT NULL DEFAULT false,
    "isVulnerable" BOOLEAN NOT NULL DEFAULT false,
    "isIntimidated" BOOLEAN NOT NULL DEFAULT false,
    "isAppearingInCourt" BOOLEAN,
    "reasonForNotAppearingInCourt" TEXT,
    "isRelevant" BOOLEAN,
    "attendanceIssues" TEXT,
    "previousTransgressions" TEXT,
    "acroConvictions" BOOLEAN NOT NULL DEFAULT true,
    "wasWarned" BOOLEAN,
    "dcf" BOOLEAN NOT NULL,
    "courtAvailabilityStartDate" DATETIME,
    "courtAvailabilityEndDate" DATETIME,
    "victimCode" TEXT,
    "victimExplained" BOOLEAN,
    "victimOfferResponse" TEXT,
    "caseId" INTEGER NOT NULL,
    CONSTRAINT "Witness_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WitnessStatement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "witnessId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "isMarkedAsSection9" BOOLEAN,
    "isUsedAsEvidence" BOOLEAN,
    "receivedDate" DATETIME NOT NULL,
    CONSTRAINT "WitnessStatement_witnessId_fkey" FOREIGN KEY ("witnessId") REFERENCES "Witness" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpecialMeasure" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "details" TEXT,
    "needs" TEXT,
    "requiresMeeting" BOOLEAN NOT NULL DEFAULT false,
    "meetingUrl" TEXT,
    "hasAppliedForReportingRestrictions" BOOLEAN NOT NULL DEFAULT false,
    "witnessId" INTEGER NOT NULL,
    CONSTRAINT "SpecialMeasure_witnessId_fkey" FOREIGN KEY ("witnessId") REFERENCES "Witness" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Case" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reference" TEXT NOT NULL,
    "complexity" TEXT,
    "type" TEXT,
    "userId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    "reportStatus" TEXT,
    CONSTRAINT "Case_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Case_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DGA" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "caseId" INTEGER NOT NULL,
    "reason" TEXT,
    "outcome" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DGA_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dga_failure_reasons" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reason" TEXT NOT NULL,
    "outcome" TEXT,
    "details" TEXT,
    "methods" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "dgaId" INTEGER NOT NULL,
    CONSTRAINT "dga_failure_reasons_dgaId_fkey" FOREIGN KEY ("dgaId") REFERENCES "DGA" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lawyer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "unitId" INTEGER NOT NULL,
    CONSTRAINT "Lawyer_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Specialism" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Team" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "unitId" INTEGER NOT NULL,
    "isStandard" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Team_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserUnit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    CONSTRAINT "UserUnit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Defendant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" TEXT,
    "religion" TEXT,
    "occupation" TEXT,
    "dateOfBirth" DATETIME,
    "remandStatus" TEXT,
    "defenceLawyerId" INTEGER,
    CONSTRAINT "Defendant_defenceLawyerId_fkey" FOREIGN KEY ("defenceLawyerId") REFERENCES "DefenceLawyer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DefenceLawyer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "organisation" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Charge" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chargeCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "offenceDate" DATETIME NOT NULL,
    "plea" TEXT,
    "particulars" TEXT NOT NULL,
    "custodyTimeLimit" DATETIME,
    "isCount" BOOLEAN NOT NULL DEFAULT false,
    "defendantId" INTEGER NOT NULL,
    CONSTRAINT "Charge_defendantId_fkey" FOREIGN KEY ("defendantId") REFERENCES "Defendant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Hearing" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "caseId" INTEGER,
    CONSTRAINT "Hearing_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Location" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "caseId" INTEGER,
    CONSTRAINT "Location_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "caseId" INTEGER NOT NULL,
    "assignedToUserId" INTEGER,
    "assignedToTeamId" INTEGER,
    CONSTRAINT "Task_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_assignedToTeamId_fkey" FOREIGN KEY ("assignedToTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "caseId" INTEGER NOT NULL,
    CONSTRAINT "Document_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Note" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT,
    "content" TEXT NOT NULL,
    "caseId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Note_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_CaseDefendants" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_CaseDefendants_A_fkey" FOREIGN KEY ("A") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CaseDefendants_B_fkey" FOREIGN KEY ("B") REFERENCES "Defendant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_CaseVictims" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_CaseVictims_A_fkey" FOREIGN KEY ("A") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CaseVictims_B_fkey" FOREIGN KEY ("B") REFERENCES "Victim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_CaseLawyers" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_CaseLawyers_A_fkey" FOREIGN KEY ("A") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CaseLawyers_B_fkey" FOREIGN KEY ("B") REFERENCES "Lawyer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_LawyerSpecialistAreas" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_LawyerSpecialistAreas_A_fkey" FOREIGN KEY ("A") REFERENCES "Lawyer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LawyerSpecialistAreas_B_fkey" FOREIGN KEY ("B") REFERENCES "Specialism" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_LawyerPreferredAreas" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_LawyerPreferredAreas_A_fkey" FOREIGN KEY ("A") REFERENCES "Lawyer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LawyerPreferredAreas_B_fkey" FOREIGN KEY ("B") REFERENCES "Specialism" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_LawyerRestrictedAreas" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_LawyerRestrictedAreas_A_fkey" FOREIGN KEY ("A") REFERENCES "Lawyer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LawyerRestrictedAreas_B_fkey" FOREIGN KEY ("B") REFERENCES "Specialism" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WitnessStatement_witnessId_number_key" ON "WitnessStatement"("witnessId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Case_reference_key" ON "Case"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "DGA_caseId_key" ON "DGA"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "Specialism_name_key" ON "Specialism"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserUnit_userId_unitId_key" ON "UserUnit"("userId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Hearing_caseId_key" ON "Hearing"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_caseId_key" ON "Location"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "_CaseDefendants_AB_unique" ON "_CaseDefendants"("A", "B");

-- CreateIndex
CREATE INDEX "_CaseDefendants_B_index" ON "_CaseDefendants"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CaseVictims_AB_unique" ON "_CaseVictims"("A", "B");

-- CreateIndex
CREATE INDEX "_CaseVictims_B_index" ON "_CaseVictims"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CaseLawyers_AB_unique" ON "_CaseLawyers"("A", "B");

-- CreateIndex
CREATE INDEX "_CaseLawyers_B_index" ON "_CaseLawyers"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_LawyerSpecialistAreas_AB_unique" ON "_LawyerSpecialistAreas"("A", "B");

-- CreateIndex
CREATE INDEX "_LawyerSpecialistAreas_B_index" ON "_LawyerSpecialistAreas"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_LawyerPreferredAreas_AB_unique" ON "_LawyerPreferredAreas"("A", "B");

-- CreateIndex
CREATE INDEX "_LawyerPreferredAreas_B_index" ON "_LawyerPreferredAreas"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_LawyerRestrictedAreas_AB_unique" ON "_LawyerRestrictedAreas"("A", "B");

-- CreateIndex
CREATE INDEX "_LawyerRestrictedAreas_B_index" ON "_LawyerRestrictedAreas"("B");

-- CreateTable
CREATE TABLE "module_configurations" (
    "id" SERIAL NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isImplemented" BOOLEAN NOT NULL DEFAULT false,
    "dependsOn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedByProfileId" INTEGER,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "module_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "module_configurations_moduleKey_key" ON "module_configurations"("moduleKey");

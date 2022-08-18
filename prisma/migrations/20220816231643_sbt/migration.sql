/*
  Warnings:

  - A unique constraint covering the columns `[address]` on the table `Account` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "SbtCollection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "creatorId" INTEGER NOT NULL,
    CONSTRAINT "SbtCollection_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SbtToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sbtCollectionId" INTEGER NOT NULL,
    "idInCollection" TEXT NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "targetSoulId" INTEGER NOT NULL,
    "metadataJson" TEXT NOT NULL,
    CONSTRAINT "SbtToken_sbtCollectionId_fkey" FOREIGN KEY ("sbtCollectionId") REFERENCES "SbtCollection" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SbtToken_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SbtToken_targetSoulId_fkey" FOREIGN KEY ("targetSoulId") REFERENCES "Soul" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Soul" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "address" TEXT NOT NULL,
    "ownerId" INTEGER NOT NULL,
    CONSTRAINT "Soul_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SbtCollection_address_key" ON "SbtCollection"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Soul_address_key" ON "Soul"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Account_address_key" ON "Account"("address");

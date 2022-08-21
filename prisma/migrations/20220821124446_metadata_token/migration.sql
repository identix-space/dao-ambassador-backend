/*
  Warnings:

  - You are about to drop the column `metadataJson` on the `SbtToken` table. All the data in the column will be lost.
  - Added the required column `metadataId` to the `SbtToken` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SbtToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sbtCollectionId" INTEGER NOT NULL,
    "idInCollection" TEXT NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "targetSoulId" INTEGER NOT NULL,
    "metadataId" INTEGER NOT NULL,
    CONSTRAINT "SbtToken_sbtCollectionId_fkey" FOREIGN KEY ("sbtCollectionId") REFERENCES "SbtCollection" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SbtToken_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SbtToken_targetSoulId_fkey" FOREIGN KEY ("targetSoulId") REFERENCES "Soul" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SbtToken_metadataId_fkey" FOREIGN KEY ("metadataId") REFERENCES "Metadata" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SbtToken" ("createdAt", "creatorId", "id", "idInCollection", "sbtCollectionId", "targetSoulId", "updatedAt") SELECT "createdAt", "creatorId", "id", "idInCollection", "sbtCollectionId", "targetSoulId", "updatedAt" FROM "SbtToken";
DROP TABLE "SbtToken";
ALTER TABLE "new_SbtToken" RENAME TO "SbtToken";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateTable
CREATE TABLE "HiddenActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    CONSTRAINT "HiddenActivity_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "HiddenActivity_storeId_idx" ON "HiddenActivity"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "HiddenActivity_storeId_domain_name_key" ON "HiddenActivity"("storeId", "domain", "name");

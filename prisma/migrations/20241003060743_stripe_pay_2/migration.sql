/*
  Warnings:

  - Added the required column `receiptUrl` to the `OrderReceipt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `OrderReceipt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderReceipt" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "receiptUrl" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('file', 'folder');

-- CreateTable
CREATE TABLE "FileNode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" "FileType" NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileNode_pkey" PRIMARY KEY ("id")
);

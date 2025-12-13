-- AlterEnum
-- Add ZOOM_WEBHOOK to VerificationMethod enum
ALTER TYPE "VerificationMethod" ADD VALUE IF NOT EXISTS 'ZOOM_WEBHOOK';


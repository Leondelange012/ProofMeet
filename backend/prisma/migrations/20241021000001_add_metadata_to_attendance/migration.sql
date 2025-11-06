-- AlterTable: Add metadata field to attendance_records for Tier 2 Enhanced Security
ALTER TABLE "attendance_records" ADD COLUMN "metadata" JSONB;

-- Add comment to explain the purpose
COMMENT ON COLUMN "attendance_records"."metadata" IS 'Tier 2 Enhanced Security data: engagement scores, fraud detection results, blockchain hashes, and verification metadata';


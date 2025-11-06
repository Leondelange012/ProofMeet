-- Add violations and enhanced validation fields to CourtCard
ALTER TABLE "court_cards" ADD COLUMN IF NOT EXISTS "idle_duration_min" INTEGER;
ALTER TABLE "court_cards" ADD COLUMN IF NOT EXISTS "violations" JSONB DEFAULT '[]';
ALTER TABLE "court_cards" ADD COLUMN IF NOT EXISTS "validation_status" TEXT DEFAULT 'PASSED';
ALTER TABLE "court_cards" ADD COLUMN IF NOT EXISTS "meeting_id" TEXT;

-- Add index for validation_status for faster queries
CREATE INDEX IF NOT EXISTS "court_cards_validation_status_idx" ON "court_cards"("validation_status");

-- Add comment to explain violations structure
COMMENT ON COLUMN "court_cards"."violations" IS 'Array of violation objects: [{type, message, severity, timestamp}]';


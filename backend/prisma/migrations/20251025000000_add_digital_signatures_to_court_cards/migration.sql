-- Add signatures field to court_cards table
-- Stores array of digital signature objects as JSON

ALTER TABLE "court_cards"
ADD COLUMN IF NOT EXISTS "signatures" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add index for faster signature queries
CREATE INDEX IF NOT EXISTS "court_cards_signatures_idx" ON "court_cards" USING gin ("signatures");


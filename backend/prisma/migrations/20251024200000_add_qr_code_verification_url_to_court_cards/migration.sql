-- Add verification URL and QR code data fields to court cards
-- These fields store the generated QR code data and verification URL

ALTER TABLE "court_cards" ADD COLUMN IF NOT EXISTS "verification_url" TEXT;
ALTER TABLE "court_cards" ADD COLUMN IF NOT EXISTS "qr_code_data" TEXT;


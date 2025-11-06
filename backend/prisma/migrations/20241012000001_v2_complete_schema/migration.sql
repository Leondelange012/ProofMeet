-- ProofMeet V2.0 Complete Schema Migration
-- Migrates from V1 (Host/Participant) to V2 (Court Rep/Participant)
-- Date: October 12, 2025

-- ============================================
-- DROP OLD TABLES (V1 Schema)
-- ============================================

DROP TABLE IF EXISTS "attendance_records" CASCADE;
DROP TABLE IF EXISTS "meetings" CASCADE;
DROP TABLE IF EXISTS "auth_tokens" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- Drop old enums
DROP TYPE IF EXISTS "AttendanceType" CASCADE;

-- ============================================
-- CREATE NEW ENUMS (V2 Schema)
-- ============================================

CREATE TYPE "UserType" AS ENUM ('COURT_REP', 'PARTICIPANT');
CREATE TYPE "MeetingFormat" AS ENUM ('ONLINE', 'IN_PERSON', 'HYBRID');
CREATE TYPE "AttendanceStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FLAGGED');
CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'AT_RISK', 'NON_COMPLIANT');
CREATE TYPE "VerificationMethod" AS ENUM ('WEBCAM', 'SCREEN_ACTIVITY', 'BOTH');
CREATE TYPE "DigestStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- ============================================
-- CREATE NEW TABLES (V2 Schema)
-- ============================================

-- Users table (V2)
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "user_type" "UserType" NOT NULL,
    "court_domain" TEXT,
    "court_name" TEXT,
    "badge_number" TEXT,
    "case_number" TEXT,
    "court_rep_id" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone_number" TEXT,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" TEXT,
    "verification_token_expiry" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Meeting Requirements
CREATE TABLE "meeting_requirements" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "court_rep_id" TEXT NOT NULL,
    "meetings_per_week" INTEGER NOT NULL DEFAULT 0,
    "meetings_per_month" INTEGER NOT NULL DEFAULT 0,
    "required_programs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minimum_duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "minimum_attendance_percent" DECIMAL(5,2) NOT NULL DEFAULT 90.00,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "meeting_requirements_pkey" PRIMARY KEY ("id")
);

-- External Meetings (from AA/NA/SMART APIs)
CREATE TABLE "external_meetings" (
    "id" TEXT NOT NULL,
    "external_id" TEXT,
    "name" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "meeting_type" TEXT NOT NULL,
    "description" TEXT,
    "day_of_week" TEXT,
    "time" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'PST',
    "duration_minutes" INTEGER,
    "format" "MeetingFormat" NOT NULL,
    "zoom_url" TEXT,
    "zoom_id" TEXT,
    "zoom_password" TEXT,
    "location" TEXT,
    "address" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "has_proof_capability" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_meetings_pkey" PRIMARY KEY ("id")
);

-- Attendance Records (V2)
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "court_rep_id" TEXT NOT NULL,
    "external_meeting_id" TEXT,
    "meeting_name" TEXT NOT NULL,
    "meeting_program" TEXT NOT NULL,
    "meeting_date" DATE NOT NULL,
    "join_time" TIMESTAMP(3) NOT NULL,
    "leave_time" TIMESTAMP(3),
    "total_duration_min" INTEGER,
    "activity_timeline" JSONB,
    "active_duration_min" INTEGER,
    "idle_duration_min" INTEGER,
    "attendance_percent" DECIMAL(5,2),
    "webcam_snapshot_count" INTEGER NOT NULL DEFAULT 0,
    "screen_activity_logs" JSONB,
    "verification_method" "VerificationMethod",
    "status" "AttendanceStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "flags" JSONB,
    "court_card_generated" BOOLEAN NOT NULL DEFAULT false,
    "court_card_data" JSONB,
    "court_card_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- Court Cards (Legal Proof Documents)
CREATE TABLE "court_cards" (
    "id" TEXT NOT NULL,
    "attendance_record_id" TEXT NOT NULL,
    "card_number" TEXT NOT NULL,
    "participant_email" TEXT NOT NULL,
    "participant_name" TEXT NOT NULL,
    "case_number" TEXT NOT NULL,
    "court_rep_email" TEXT NOT NULL,
    "court_rep_name" TEXT NOT NULL,
    "meeting_name" TEXT NOT NULL,
    "meeting_program" TEXT NOT NULL,
    "meeting_date" DATE NOT NULL,
    "meeting_duration_min" INTEGER NOT NULL,
    "join_time" TIMESTAMP(3) NOT NULL,
    "leave_time" TIMESTAMP(3) NOT NULL,
    "total_duration_min" INTEGER NOT NULL,
    "active_duration_min" INTEGER NOT NULL,
    "attendance_percent" DECIMAL(5,2) NOT NULL,
    "active_periods" JSONB NOT NULL,
    "verification_method" "VerificationMethod" NOT NULL,
    "confidence_level" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "card_hash" TEXT NOT NULL,
    "is_tampered" BOOLEAN NOT NULL DEFAULT false,
    "pdf_url" TEXT,
    "pdf_generated_at" TIMESTAMP(3),

    CONSTRAINT "court_cards_pkey" PRIMARY KEY ("id")
);

-- Daily Digest Queue
CREATE TABLE "daily_digest_queue" (
    "id" TEXT NOT NULL,
    "court_rep_id" TEXT NOT NULL,
    "digest_date" DATE NOT NULL,
    "attendance_record_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "DigestStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMP(3),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_digest_queue_pkey" PRIMARY KEY ("id")
);

-- Approved Court Domains
CREATE TABLE "approved_court_domains" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "contact_email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by" TEXT,

    CONSTRAINT "approved_court_domains_pkey" PRIMARY KEY ("id")
);

-- Audit Logs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_email" TEXT,
    "user_type" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- System Configuration
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- CREATE UNIQUE CONSTRAINTS
-- ============================================

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_verification_token_key" ON "users"("verification_token");
CREATE UNIQUE INDEX "external_meetings_external_id_key" ON "external_meetings"("external_id");
CREATE UNIQUE INDEX "court_cards_attendance_record_id_key" ON "court_cards"("attendance_record_id");
CREATE UNIQUE INDEX "court_cards_card_number_key" ON "court_cards"("card_number");
CREATE UNIQUE INDEX "court_cards_card_hash_key" ON "court_cards"("card_hash");
CREATE UNIQUE INDEX "approved_court_domains_domain_key" ON "approved_court_domains"("domain");
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- ============================================
-- CREATE INDEXES
-- ============================================

-- User indexes
CREATE INDEX "users_court_rep_id_idx" ON "users"("court_rep_id");
CREATE INDEX "users_case_number_idx" ON "users"("case_number");
CREATE INDEX "users_user_type_idx" ON "users"("user_type");
CREATE INDEX "users_email_idx" ON "users"("email");

-- Meeting Requirements indexes
CREATE INDEX "meeting_requirements_participant_id_idx" ON "meeting_requirements"("participant_id");
CREATE INDEX "meeting_requirements_court_rep_id_idx" ON "meeting_requirements"("court_rep_id");

-- External Meetings indexes
CREATE INDEX "external_meetings_program_idx" ON "external_meetings"("program");
CREATE INDEX "external_meetings_format_idx" ON "external_meetings"("format");
CREATE INDEX "external_meetings_day_of_week_idx" ON "external_meetings"("day_of_week");

-- Attendance Records indexes
CREATE INDEX "attendance_records_participant_id_idx" ON "attendance_records"("participant_id");
CREATE INDEX "attendance_records_court_rep_id_idx" ON "attendance_records"("court_rep_id");
CREATE INDEX "attendance_records_meeting_date_idx" ON "attendance_records"("meeting_date");
CREATE INDEX "attendance_records_status_idx" ON "attendance_records"("status");

-- Court Cards indexes
CREATE INDEX "court_cards_participant_email_idx" ON "court_cards"("participant_email");
CREATE INDEX "court_cards_case_number_idx" ON "court_cards"("case_number");
CREATE INDEX "court_cards_meeting_date_idx" ON "court_cards"("meeting_date");
CREATE INDEX "court_cards_card_number_idx" ON "court_cards"("card_number");

-- Daily Digest indexes
CREATE INDEX "daily_digest_queue_court_rep_id_idx" ON "daily_digest_queue"("court_rep_id");
CREATE INDEX "daily_digest_queue_digest_date_idx" ON "daily_digest_queue"("digest_date");
CREATE INDEX "daily_digest_queue_status_idx" ON "daily_digest_queue"("status");

-- Approved Domains indexes
CREATE INDEX "approved_court_domains_domain_idx" ON "approved_court_domains"("domain");
CREATE INDEX "approved_court_domains_state_idx" ON "approved_court_domains"("state");

-- Audit Log indexes
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- ============================================
-- ADD FOREIGN KEY CONSTRAINTS
-- ============================================

-- User self-referential FK (court rep to participant)
ALTER TABLE "users" ADD CONSTRAINT "users_court_rep_id_fkey" 
    FOREIGN KEY ("court_rep_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Meeting Requirements FKs
ALTER TABLE "meeting_requirements" ADD CONSTRAINT "meeting_requirements_participant_id_fkey" 
    FOREIGN KEY ("participant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meeting_requirements" ADD CONSTRAINT "meeting_requirements_created_by_id_fkey" 
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Attendance Records FKs
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_participant_id_fkey" 
    FOREIGN KEY ("participant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_court_rep_id_fkey" 
    FOREIGN KEY ("court_rep_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_external_meeting_id_fkey" 
    FOREIGN KEY ("external_meeting_id") REFERENCES "external_meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Court Cards FKs
ALTER TABLE "court_cards" ADD CONSTRAINT "court_cards_attendance_record_id_fkey" 
    FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Daily Digest FKs
ALTER TABLE "daily_digest_queue" ADD CONSTRAINT "daily_digest_queue_court_rep_id_fkey" 
    FOREIGN KEY ("court_rep_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


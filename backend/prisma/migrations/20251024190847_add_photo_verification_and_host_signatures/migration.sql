-- CreateTable
CREATE TABLE "participant_id_photos" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "photo_hash" TEXT NOT NULL,
    "id_type" TEXT,
    "id_number" TEXT,
    "id_state" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participant_id_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webcam_snapshots" (
    "id" TEXT NOT NULL,
    "attendance_record_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "photo_hash" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "minute_into_meeting" INTEGER NOT NULL,
    "face_detected" BOOLEAN NOT NULL DEFAULT false,
    "face_match_score" DECIMAL(5,2),
    "metadata" JSONB,

    CONSTRAINT "webcam_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_host_signatures" (
    "id" TEXT NOT NULL,
    "attendance_record_id" TEXT NOT NULL,
    "host_name" TEXT NOT NULL,
    "host_email" TEXT NOT NULL,
    "host_phone" TEXT,
    "host_role" TEXT NOT NULL DEFAULT 'MEETING_LEADER',
    "signature_data" TEXT NOT NULL,
    "signature_method" TEXT NOT NULL DEFAULT 'ELECTRONIC',
    "confirmed_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "attestation_text" TEXT NOT NULL,
    "meeting_location" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT true,
    "verification_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_host_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participant_id_photos_participant_id_key" ON "participant_id_photos"("participant_id");

-- CreateIndex
CREATE INDEX "participant_id_photos_participant_id_idx" ON "participant_id_photos"("participant_id");

-- CreateIndex
CREATE INDEX "webcam_snapshots_attendance_record_id_idx" ON "webcam_snapshots"("attendance_record_id");

-- CreateIndex
CREATE INDEX "webcam_snapshots_participant_id_idx" ON "webcam_snapshots"("participant_id");

-- CreateIndex
CREATE INDEX "webcam_snapshots_captured_at_idx" ON "webcam_snapshots"("captured_at");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_host_signatures_attendance_record_id_key" ON "meeting_host_signatures"("attendance_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_host_signatures_verification_code_key" ON "meeting_host_signatures"("verification_code");

-- CreateIndex
CREATE INDEX "meeting_host_signatures_attendance_record_id_idx" ON "meeting_host_signatures"("attendance_record_id");

-- CreateIndex
CREATE INDEX "meeting_host_signatures_host_email_idx" ON "meeting_host_signatures"("host_email");

-- CreateIndex
CREATE INDEX "meeting_host_signatures_verification_code_idx" ON "meeting_host_signatures"("verification_code");

-- AddForeignKey
ALTER TABLE "participant_id_photos" ADD CONSTRAINT "participant_id_photos_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webcam_snapshots" ADD CONSTRAINT "webcam_snapshots_attendance_record_id_fkey" FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_host_signatures" ADD CONSTRAINT "meeting_host_signatures_attendance_record_id_fkey" FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;


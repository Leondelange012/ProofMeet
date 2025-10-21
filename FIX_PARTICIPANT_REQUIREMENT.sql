-- SQL Script to Add Meeting Requirement for Existing Participant
-- Run this in Railway PostgreSQL Console
-- This fixes the issue where participant leondelange001@gmail.com has no assigned meetings

DO $$
DECLARE
    v_participant_id UUID;
    v_court_rep_id UUID;
    v_requirement_id UUID;
BEGIN
    -- Find the participant and their court rep
    SELECT id, court_rep_id 
    INTO v_participant_id, v_court_rep_id
    FROM users
    WHERE email = 'leondelange001@gmail.com'
    AND user_type = 'PARTICIPANT';
    
    IF v_participant_id IS NULL THEN
        RAISE NOTICE '❌ Participant not found';
        RETURN;
    END IF;
    
    -- Check if requirement already exists
    IF EXISTS (SELECT 1 FROM meeting_requirements WHERE participant_id = v_participant_id AND is_active = TRUE) THEN
        RAISE NOTICE '✓ Meeting requirement already exists for this participant';
        RETURN;
    END IF;
    
    -- Create new meeting requirement
    v_requirement_id := gen_random_uuid();
    
    INSERT INTO meeting_requirements (
        id,
        participant_id,
        court_rep_id,
        created_by_id,
        meetings_per_week,
        meetings_per_month,
        required_programs,
        minimum_duration_minutes,
        minimum_attendance_percent,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        v_requirement_id,
        v_participant_id,
        v_court_rep_id,
        v_court_rep_id,
        1,  -- 1 meeting per week
        4,  -- 4 meetings per month  
        ARRAY['TEST', 'AA']::text[],  -- Can attend TEST or AA meetings
        5,  -- 5 minutes minimum duration
        80.00,  -- 80% minimum attendance
        TRUE,  -- is active
        NOW(),
        NOW()
    );
    
    RAISE NOTICE '✅ Meeting requirement created successfully!';
    RAISE NOTICE '   Participant ID: %', v_participant_id;
    RAISE NOTICE '   Requirement ID: %', v_requirement_id;
    RAISE NOTICE '   Meetings per week: 1';
    RAISE NOTICE '   Required programs: TEST, AA';
    RAISE NOTICE '   Minimum attendance: 80%%';
    
END $$;

-- Verify the requirement was created
SELECT 
    u.email as participant_email,
    u.first_name || ' ' || u.last_name as participant_name,
    mr.meetings_per_week,
    mr.required_programs,
    mr.minimum_attendance_percent,
    mr.is_active,
    mr.created_at
FROM meeting_requirements mr
JOIN users u ON u.id = mr.participant_id
WHERE u.email = 'leondelange001@gmail.com';


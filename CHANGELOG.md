# Changelog

All notable changes to ProofMeet will be documented in this file.

## [Unreleased]

## [2026-01-28] - Critical Fixes & UX Improvements

### Fixed
- **Attendance Window Bug**: Fixed "304 min late" calculation error that used database creation timestamp instead of actual meeting start time. Now correctly uses `attendance.meetingDate` for all meeting types.
- **Video Tracking False Positive**: Fixed issue where system claimed "100% video active" when video tracking wasn't enabled. Now shows 0% when video state is unknown.
- **Compliance Thresholds**: Lowered active time requirement from 80% to 40% to reflect realistic recovery meeting behavior (listening-focused, minimal mouse movement required).
- **Idle Time Threshold**: Adjusted from 80% to 60% to balance with 40% active time requirement.

### Changed
- **UX Labels**: Clarified metric labels to reduce confusion
  - "Idle Time" → "Inactive While Present" (mouse/keyboard inactivity while in meeting)
  - "Time Away" → "Left Meeting (Time Away)" (completely absent from meeting)
  - "Leave/Rejoin Events" → "Left Meeting (Leave/Rejoin Events)"
- **Consistency**: All dashboards (participant, court rep, public verification) now use identical terminology

### Documentation
- See `CRITICAL_FIXES_2026-01-28.md` for detailed technical analysis
- See `COMPLIANCE_THRESHOLD_FIXES_2026-01-25.md` for compliance rule changes
- See `UX_LABEL_IMPROVEMENTS_2026-01-28.md` for label change details

---

## [2026-01-25] - Compliance System Improvements

### Changed
- Lowered active time requirement from 80% to 40%
- Adjusted idle time threshold from 80% to 60%
- Maintained 80% meeting duration attendance requirement
- Updated validation messages to reflect new thresholds

### Rationale
Recovery meetings are listening-focused. Participants don't need constant mouse movement to be engaged. New thresholds reflect realistic behavior while maintaining accountability.

---

## [2025-12-29] - Activity Tracking Fix

### Fixed
- Activity tracking finalization logic
- Zoom webhook integration reliability
- Court card generation timing

---

## [Earlier Changes]

For historical changes prior to 2025-12-29, see files in `docs/archive/`.

---

## Format

This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Types of Changes
- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

# Webcam Snapshot Capture - Technical Decision

## ❌ Issue: Camera Access Conflict

### Problem
When the ProofMeet tab uses `navigator.mediaDevices.getUserMedia()` to capture webcam snapshots, it takes **exclusive access** to the camera. This prevents Zoom from accessing the camera simultaneously, resulting in:
- ❌ Participant's Zoom video shows black screen
- ❌ Participant cannot be seen by other meeting attendees
- ❌ Defeats the purpose of attending a video meeting

### Root Cause
**Operating System Limitation:** Most operating systems only allow **one application** to access a webcam at a time. This is a security and hardware limitation, not a ProofMeet bug.

---

## ✅ Solution: Disable Webcam Snapshot Capture

### Why This Works

**Zoom Webhooks Provide Sufficient Court-Admissible Evidence:**

1. **Join/Leave Timestamps** (from Zoom)
   - Third-party verified
   - Cryptographically signed
   - Cannot be tampered with by participant

2. **Total Duration** (from Zoom)
   - Calculated by Zoom's servers
   - Accounts for multiple joins/leaves
   - Accurate to the second

3. **Punctuality Tracking** (derived from Zoom)
   - Minutes late/early calculated from Zoom timestamps
   - Compared against scheduled meeting times

4. **Leave/Rejoin Timeline** (from Zoom webhooks)
   - Every join/leave event logged
   - Complete audit trail
   - Shows all disconnections and reconnections

5. **Browser Activity Monitoring** (OPTIONAL - for engagement bonus)
   - Mouse movements
   - Tab focus/blur
   - Active/idle status
   - Provides engagement score, but NOT required for core attendance

6. **Fraud Detection**
   - Pattern analysis from Zoom data + activity data
   - Detects suspicious behavior
   - Flags for manual review if needed

### What We're Giving Up
- ❌ Visual snapshots of participant's face during meeting
- ❌ Face detection confirmation
- ❌ "Face detection rate" metric in court card

### What We're Keeping
- ✅ Zoom-verified attendance (PRIMARY)
- ✅ Join/leave timestamps (accurate to the second)
- ✅ Punctuality tracking
- ✅ Leave/rejoin timeline
- ✅ Browser activity (optional engagement bonus)
- ✅ Fraud detection
- ✅ Court-admissible proof via Zoom's third-party verification

---

## 🔮 Future Enhancement: Zoom Cloud Recording API

If visual verification becomes a hard requirement in the future, we can explore:

### Option 1: Zoom Apps SDK
**What:** Build an app that runs INSIDE Zoom's client
**Pros:**
- Access to meeting context and participant video
- Real-time integration
**Cons:**
- Requires Zoom marketplace approval
- Complex architecture changes
- Significant development time (2-3 months)
- Must comply with Zoom's app review process

### Option 2: Zoom Cloud Recording API
**What:** Record the meeting to Zoom's cloud, then extract frames post-meeting
**Pros:**
- Official Zoom API
- Can extract participant video frames
- No camera conflict
**Cons:**
- POST-meeting verification only (not real-time)
- Requires Zoom Pro/Business plan ($15-20/month per host)
- Additional storage costs
- Privacy concerns (full meeting recordings)
- Processing delay (minutes to hours after meeting)

### Option 3: Screen Capture API (Browser)
**What:** Capture the participant's screen (showing Zoom window)
**Pros:**
- Works in browser
- Can see what participant sees
**Cons:**
- Requires participant permission (additional friction)
- Can be circumvented (participant can share wrong screen/window)
- Large file sizes
- Privacy concerns (captures everything on screen)

---

## 📊 Impact on Court Card Metrics

### Metrics REMOVED (due to webcam conflict):
- ❌ Total Snapshots
- ❌ Snapshots with Face Detected
- ❌ Face Detection Rate
- ❌ Video On Percentage (derived from snapshots)

### Metrics RETAINED (Zoom-based):
- ✅ Join Time (Zoom webhook)
- ✅ Leave Time (Zoom webhook)
- ✅ Total Duration (Zoom calculation)
- ✅ Punctuality (minutes late/early)
- ✅ Leave/Rejoin Events (complete timeline)
- ✅ Time Away (calculated from leave/rejoin)
- ✅ Attendance Percentage (duration vs. scheduled)
- ✅ Browser Activity Events (mouse, focus - OPTIONAL)
- ✅ Engagement Score (from activity - OPTIONAL)
- ✅ Fraud Risk Score (pattern analysis)

---

## 🎯 Conclusion

**Decision: Disable webcam snapshot capture to allow Zoom camera usage.**

**Rationale:**
1. Participants NEED their Zoom camera for actual meeting participation
2. Zoom webhooks provide court-admissible attendance proof
3. Visual snapshots were only SUPPLEMENTARY (bonuses), not REQUIRED
4. Browser activity monitoring provides sufficient engagement data
5. Fraud detection remains robust with remaining data layers

**Result:** Participants can now use their Zoom camera normally while ProofMeet tracks attendance accurately via Zoom's secure webhook system.

---

## 📝 Documentation Updates Required

- [x] Remove `WebcamSnapshotCapture` from `ActiveMeetingPage.tsx`
- [x] Update UI text to reflect no webcam capture
- [ ] Update `TRACKING_METHODS.md` to remove webcam snapshot section
- [ ] Update `COMPLIANCE_METRICS.md` to remove visual verification layer
- [ ] Update Court Card generation to remove snapshot metrics
- [ ] Update public verification page to not expect snapshot data
- [ ] Update Court Rep dashboard to not show snapshot stats


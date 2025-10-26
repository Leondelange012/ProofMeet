# Zoom Email Requirement for ProofMeet

## ⚠️ IMPORTANT: Registration Email Must Match Zoom

For the attendance tracking system to work correctly, participants **MUST** register in ProofMeet using the **SAME email address** they use for their Zoom account.

---

## ✅ Correct Registration

```
Your Zoom Account Email: john.doe@gmail.com
↓
Register in ProofMeet with: john.doe@gmail.com
↓
✅ Attendance will be tracked automatically!
```

---

## ❌ Common Mistake

```
Your Zoom Account Email: john.personal@gmail.com
Register in ProofMeet with: john.work@company.com
↓
❌ Attendance will NOT be tracked!
↓
Zoom webhook won't match → No attendance record
```

---

## 🎯 How It Works

1. **Participant joins Zoom meeting**
   - Zoom identifies them by email: `john@gmail.com`

2. **Zoom sends webhook to ProofMeet**
   - "Participant john@gmail.com joined the meeting"

3. **ProofMeet searches database**
   - Looks for User with email: `john@gmail.com`

4. **Match Found ✅**
   - Updates attendance record
   - Tracks join time, activity, duration
   - Generates court card

5. **Match NOT Found ❌**
   - No attendance tracked
   - Court Rep doesn't see participation

---

## 📋 Instructions for Participants

### When Registering:
1. Go to ProofMeet registration page
2. **Use the SAME email as your Zoom account**
3. Complete registration
4. ✅ You're ready to have meetings tracked!

### To Check Your Zoom Email:
1. Open Zoom app or web
2. Click your profile picture
3. Look at the email shown
4. **Use THIS email** when registering for ProofMeet

---

## 🔧 For Court Representatives

When onboarding participants, remind them:

> **"Please register using the same email address you use for Zoom. This is required for attendance tracking to work."**

---

## 💡 Why This Matters

The system uses Zoom webhooks to verify actual attendance. When a participant joins a Zoom meeting, Zoom tells us their email. We use that email to find their ProofMeet account and record their attendance.

**If the emails don't match, we can't link the Zoom participant to the ProofMeet user.**

---

## 🎯 Testing Checklist

✅ Register with Zoom email  
✅ Court Rep creates test meeting  
✅ Join the Zoom meeting  
✅ Verify attendance appears in Participant dashboard  
✅ Verify Court Rep sees the participation  

---

**Bottom Line:** Use the same email for both Zoom and ProofMeet! 🎯


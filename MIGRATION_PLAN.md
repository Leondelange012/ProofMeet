# ProofMeet Migration Plan
**From Phase 1 (General Platform) to Version 2.0 (Court Compliance System)**

*Created: October 7, 2024*  
*Est. Timeline: 6-8 weeks*

---

## 📋 Executive Summary

### The Challenge
We have a fully operational Phase 1 system in production (Vercel + Railway) that needs to be transformed into a specialized court compliance system with minimal disruption.

### The Approach
**Hybrid Migration Strategy**: Rebuild core components while preserving valuable infrastructure.

### Timeline
- **Weeks 1-2**: Database redesign and backend restructure
- **Weeks 3-4**: New frontend dashboards and user flows
- **Weeks 5-6**: Attendance tracking and Court Card system
- **Weeks 7-8**: Testing, refinement, and production deployment

---

## 🔍 What We Can Reuse

### ✅ Keep and Enhance

#### 1. **Infrastructure (90% Reusable)**
- ✅ Vercel frontend deployment
- ✅ Railway backend + PostgreSQL
- ✅ Docker configurations
- ✅ Environment variable management
- ✅ CORS and security middleware

#### 2. **Authentication System (70% Reusable)**
- ✅ Email + password registration flow
- ✅ JWT token management
- ✅ Login/logout endpoints
- ✅ Password hashing (bcrypt)
- 🔨 **Modify**: Add user type differentiation
- 🔨 **Add**: Email domain verification for Court Reps
- 🔨 **Add**: Case number and Court Rep linkage for Participants

#### 3. **Backend Architecture (80% Reusable)**
- ✅ Express.js server structure
- ✅ Prisma ORM setup
- ✅ Route organization pattern
- ✅ Error handling middleware
- ✅ Logger utility
- 🔨 **Modify**: Update routes for new user types
- 🔨 **Add**: New endpoints for Court Reps

#### 4. **External Meeting Service (100% Reusable)**
- ✅ `aaIntergroupService.ts` structure
- ✅ Mock data generation (for MVP)
- ✅ Meeting interface definitions
- 🔨 **Enhance**: Connect to real APIs when available

#### 5. **QR Code System (95% Reusable)**
- ✅ QR generation logic (`/api/qr/generate`)
- ✅ Check-in/check-out endpoints
- ✅ QR validation logic
- 🔨 **Modify**: Link to Court Rep instead of host

#### 6. **Attendance Tracking Backend (80% Reusable)**
- ✅ Join/leave tracking endpoints
- ✅ Duration calculation logic
- ✅ Attendance percentage calculation
- 🔨 **Modify**: Add visual activity tracking
- 🔨 **Add**: Court Card generation
- 🔨 **Add**: Daily digest queue system

---

## 🔨 What Needs Complete Rebuild

### ❌ Replace Entirely

#### 1. **User Model & Registration** (Major Changes)
**Current**: Single user type with host/participant role
**New**: Two distinct user types with different registration flows

**Action Items:**
- [ ] Create migration script for existing users
- [ ] Build dual registration forms (Court Rep vs Participant)
- [ ] Implement email domain verification
- [ ] Add case number field and Court Rep linkage
- [ ] Update Prisma schema with new fields

#### 2. **Frontend Dashboards** (Complete Redesign)
**Current**: Host dashboard (create meetings) + Participant dashboard (join meetings)
**New**: Court Rep dashboard (monitor compliance) + Participant dashboard (browse/attend meetings)

**Action Items:**
- [ ] Design new Court Rep dashboard wireframes
- [ ] Design new Participant dashboard wireframes
- [ ] Build Court Rep participant list component
- [ ] Build participant progress tracking component
- [ ] Create "My Assigned Meetings" page
- [ ] Build compliance metrics visualizations

#### 3. **Meeting Management** (Remove/Replace)
**Current**: User-created Zoom meetings (CRUD operations)
**New**: External API meetings (read-only, browse)

**Action Items:**
- [ ] Remove meeting creation UI
- [ ] Remove meeting edit/delete functionality
- [ ] Keep meeting browsing interface
- [ ] Migrate to external_meetings table
- [ ] Update meeting display components

#### 4. **Reporting System** (Build from Scratch)
**Current**: None
**New**: Automatic Court Card generation and daily digests

**Action Items:**
- [ ] Design Court Card template
- [ ] Build Court Card generation logic
- [ ] Implement PDF export functionality
- [ ] Create daily digest email system
- [ ] Build email queue and cron job
- [ ] Add hash generation for card integrity

---

## 📅 Phase-by-Phase Implementation Plan

### **Phase 1: Database & Backend Foundation** (Weeks 1-2)

#### Week 1: Database Redesign
```
Day 1-2: Schema Design
├─ Update User model with user_type, case_number, court_rep_id
├─ Create MeetingRequirements table
├─ Create ExternalMeetings table
├─ Update AttendanceRecords table
└─ Create CourtCards table

Day 3-4: Migration Scripts
├─ Write Prisma migration files
├─ Create data migration script for existing users
├─ Test migrations on development database
└─ Backup production data

Day 5: Deploy Database Changes
├─ Run migrations on production
├─ Verify data integrity
└─ Test with existing auth system
```

#### Week 2: Backend API Updates
```
Day 1-2: Authentication Routes
├─ Split /api/auth/register into two endpoints
├─ Add email domain verification middleware
├─ Update login to handle user types
├─ Add Court Rep validation logic
└─ Test auth flows

Day 3-4: New Court Rep Endpoints
├─ GET /api/court-rep/dashboard
├─ GET /api/court-rep/participants
├─ POST /api/court-rep/participants/:id/requirements
├─ GET /api/court-rep/attendance-reports
└─ Test all endpoints

Day 5: Update Participant Endpoints
├─ Update /api/participant/dashboard
├─ Add /api/participant/meetings/assigned
├─ Update /api/participant/my-attendance
└─ Integration testing
```

### **Phase 2: Frontend Dashboards** (Weeks 3-4)

#### Week 3: Court Rep Interface
```
Day 1-2: Registration & Login
├─ Build Court Rep registration form
├─ Add email domain validation UI
├─ Update login page for user type selection
└─ Test registration flow

Day 3-4: Court Rep Dashboard
├─ Build dashboard layout
├─ Create participant list component
├─ Add real-time activity feed
├─ Build participant detail view
└─ Test data loading and display

Day 5: Meeting Requirements UI
├─ Build requirements form
├─ Add requirement display in participant view
├─ Test CRUD operations
└─ Polish and refine
```

#### Week 4: Participant Interface
```
Day 1-2: Registration & Linkage
├─ Build Participant registration form
├─ Add Court Rep email/ID input
├─ Add case number field
├─ Test Court Rep linkage
└─ Test complete registration flow

Day 3-4: New Dashboards
├─ Redesign main dashboard
├─ Keep "All Meetings" view (external meetings)
├─ Build "My Assigned Meetings" page
├─ Add progress tracking component
└─ Test navigation and data flow

Day 5: Polish & Refinement
├─ Improve UI/UX based on testing
├─ Add loading states and error handling
├─ Mobile responsiveness check
└─ Cross-browser testing
```

### **Phase 3: Attendance & Tracking** (Weeks 5-6)

#### Week 5: Enhanced Attendance Tracking
```
Day 1-2: Visual Activity Tracking
├─ Research webcam detection libraries
├─ Implement screen activity tracking
├─ Build activity timeline generation
├─ Test accuracy and performance
└─ Add privacy controls

Day 3-4: Frontend Integration
├─ Update meeting join flow
├─ Add activity tracking UI
├─ Build activity indicator
├─ Test during live meetings
└─ Optimize performance

Day 5: Testing & Refinement
├─ Test with different meeting types
├─ Test activity detection edge cases
├─ Performance optimization
└─ Privacy and security review
```

#### Week 6: Court Card System
```
Day 1-2: Court Card Generation
├─ Build Court Card template
├─ Implement generation logic
├─ Add hash generation for integrity
├─ Create PDF export functionality
└─ Test card generation

Day 3-4: Daily Digest System
├─ Build digest queue system
├─ Create email templates
├─ Implement cron job for sending
├─ Test email delivery
└─ Add digest preferences

Day 5: Real-time Dashboard Updates
├─ Implement WebSocket or polling
├─ Update Court Rep dashboard on attendance events
├─ Test real-time updates
└─ Performance optimization
```

### **Phase 4: Testing & Deployment** (Weeks 7-8)

#### Week 7: Comprehensive Testing
```
Day 1-2: End-to-End Testing
├─ Test complete Court Rep workflow
├─ Test complete Participant workflow
├─ Test attendance tracking accuracy
├─ Test Court Card generation
└─ Test email notifications

Day 3-4: Integration Testing
├─ Test all API endpoints
├─ Test database operations
├─ Test external meeting integration
├─ Load testing
└─ Security testing

Day 5: Bug Fixes
├─ Fix identified issues
├─ Regression testing
└─ Performance optimization
```

#### Week 8: Production Deployment
```
Day 1-2: Pre-Deployment Preparation
├─ Final code review
├─ Update documentation
├─ Prepare rollback plan
├─ Backup production database
└─ Schedule deployment window

Day 3: Deployment
├─ Deploy database migrations
├─ Deploy backend to Railway
├─ Deploy frontend to Vercel
├─ Verify production environment
└─ Smoke testing

Day 4-5: Post-Deployment
├─ Monitor for issues
├─ Fix critical bugs
├─ Collect initial feedback
├─ Plan iteration cycle
└─ Celebrate! 🎉
```

---

## 🗂️ Database Migration Strategy

### Step 1: Add New Fields (Non-Breaking)
```sql
-- Add new fields without removing old ones
ALTER TABLE users ADD COLUMN user_type VARCHAR(20);
ALTER TABLE users ADD COLUMN case_number VARCHAR(100);
ALTER TABLE users ADD COLUMN court_rep_id UUID;
ALTER TABLE users ADD COLUMN court_domain VARCHAR(255);
```

### Step 2: Migrate Existing Data
```sql
-- Convert existing users
UPDATE users SET user_type = 'PARTICIPANT' WHERE role = 'participant';
UPDATE users SET user_type = 'COURT_REP' WHERE role = 'host';
```

### Step 3: Create New Tables
```sql
CREATE TABLE meeting_requirements (...);
CREATE TABLE external_meetings (...);
CREATE TABLE court_cards (...);
CREATE TABLE daily_digest_queue (...);
```

### Step 4: Update Attendance Records
```sql
-- Add court_rep_id to attendance records
ALTER TABLE attendance_records ADD COLUMN court_rep_id UUID;
UPDATE attendance_records SET court_rep_id = (
  SELECT court_rep_id FROM users WHERE users.id = attendance_records.user_id
);
```

### Step 5: Remove Old Fields (After Verification)
```sql
-- Once new system is stable
ALTER TABLE users DROP COLUMN role; -- Old role field
-- Drop meetings table (user-created meetings)
-- Keep as archive or migrate to external_meetings
```

---

## 🔄 Data Migration for Existing Users

### Scenario 1: Keep Existing Test Accounts
```javascript
// Migration script
async function migrateTestAccounts() {
  const existingUsers = await prisma.user.findMany();
  
  for (const user of existingUsers) {
    // Convert host → Court Rep
    if (user.role === 'host') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          user_type: 'COURT_REP',
          court_domain: 'test.proofmeet.com',
          court_name: 'Test Court System'
        }
      });
    }
    
    // Convert participant → Participant (assign to default Court Rep)
    if (user.role === 'participant') {
      const defaultCourtRep = await prisma.user.findFirst({
        where: { user_type: 'COURT_REP' }
      });
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          user_type: 'PARTICIPANT',
          case_number: `MIGRATED-${user.id.substring(0, 8)}`,
          court_rep_id: defaultCourtRep?.id
        }
      });
    }
  }
}
```

### Scenario 2: Fresh Start (Recommended for MVP)
```javascript
// Clear test data and start fresh
async function freshStart() {
  // Option 1: Keep database schema, clear data
  await prisma.attendance.deleteMany({});
  await prisma.meeting.deleteMany({});
  await prisma.user.deleteMany({});
  
  // Option 2: Use existing clear-database endpoint
  // DELETE /api/admin/clear-database
  
  // Create sample Court Rep
  const courtRep = await prisma.user.create({
    data: {
      email: 'officer.smith@probation.ca.gov',
      password_hash: '...',
      user_type: 'COURT_REP',
      court_domain: 'probation.ca.gov',
      court_name: 'Test County Probation',
      first_name: 'Sarah',
      last_name: 'Smith'
    }
  });
  
  // Create sample Participant
  await prisma.user.create({
    data: {
      email: 'john.doe@example.com',
      password_hash: '...',
      user_type: 'PARTICIPANT',
      case_number: '2024-12345',
      court_rep_id: courtRep.id,
      first_name: 'John',
      last_name: 'Doe'
    }
  });
}
```

---

## ⚠️ Risk Assessment & Mitigation

### High Risk Areas

#### 1. **Database Migration**
**Risk**: Data loss or corruption during schema changes
**Mitigation**:
- Full database backup before migration
- Test migrations on staging environment
- Gradual rollout with rollback plan
- Keep old tables as backup for 30 days

#### 2. **Production Downtime**
**Risk**: System unavailable during deployment
**Mitigation**:
- Deploy during low-traffic hours
- Use blue-green deployment strategy
- Keep Phase 1 system as fallback
- Estimated downtime: < 1 hour

#### 3. **Breaking Changes for Existing Users**
**Risk**: Current test users can't access system
**Mitigation**:
- Announce migration timeline
- Provide migration support
- Or: Fresh start with clear communication

#### 4. **Visual Activity Tracking Privacy**
**Risk**: Legal concerns with webcam monitoring
**Mitigation**:
- Research legal requirements
- Add consent mechanisms
- Make webcam optional (use screen activity only)
- Clear privacy policy

#### 5. **Email Delivery Reliability**
**Risk**: Court Reps don't receive daily digests
**Mitigation**:
- Use reliable email service (SendGrid, AWS SES)
- Implement retry logic
- Add dashboard notifications as backup
- Monitor delivery rates

---

## 🧪 Testing Strategy

### Unit Testing
```
Backend:
├─ Authentication middleware
├─ Email domain validation
├─ Court Card generation logic
├─ Attendance calculation
└─ Hash generation

Frontend:
├─ Form validation
├─ Dashboard components
├─ Activity tracking
└─ Real-time updates
```

### Integration Testing
```
User Flows:
├─ Court Rep registration → login → dashboard
├─ Participant registration → linkage → dashboard
├─ Meeting attendance → tracking → Court Card
├─ Requirements setting → compliance monitoring
└─ Daily digest generation → email delivery
```

### End-to-End Testing
```
Scenarios:
├─ Complete Court Rep workflow
├─ Complete Participant workflow
├─ Multi-participant monitoring
├─ Real meeting attendance simulation
└─ Email notification delivery
```

### Load Testing
```
Performance:
├─ 100 concurrent participants
├─ 50 active meetings simultaneously
├─ Dashboard real-time updates
├─ Court Card generation at scale
└─ Email queue processing
```

---

## 📊 Success Criteria

### Technical Metrics
- [ ] All new API endpoints operational
- [ ] Database migrations complete without data loss
- [ ] Zero downtime deployment achieved
- [ ] 99.9% uptime in first week
- [ ] Response time < 500ms for all endpoints

### Functional Metrics
- [ ] Court Reps can register and verify email
- [ ] Participants can link to Court Reps
- [ ] Attendance tracking works with 99%+ accuracy
- [ ] Court Cards generate automatically
- [ ] Daily digests send successfully
- [ ] Real-time dashboard updates work

### User Experience Metrics
- [ ] Registration flow < 2 minutes
- [ ] Dashboard loads < 2 seconds
- [ ] Meeting join < 5 seconds
- [ ] Mobile-responsive on all pages
- [ ] Zero confusion in user testing

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All code reviewed and approved
- [ ] Tests passing (unit, integration, E2E)
- [ ] Database migrations tested on staging
- [ ] Documentation updated
- [ ] Rollback plan prepared
- [ ] Production backup created
- [ ] Team notified of deployment window

### Deployment
- [ ] Put Phase 1 in maintenance mode (if needed)
- [ ] Run database migrations
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Update environment variables
- [ ] Verify all services healthy
- [ ] Run smoke tests

### Post-Deployment
- [ ] Monitor error logs for 24 hours
- [ ] Test critical user flows
- [ ] Verify email notifications working
- [ ] Check database performance
- [ ] Collect initial user feedback
- [ ] Fix critical bugs within 24 hours
- [ ] Plan first iteration

---

## 🎯 Quick Wins (Can Implement Immediately)

### Week 0: Preparation (Before Main Migration)
These can be done now without breaking current system:

1. **Create External Meetings Table**
   - Add table without affecting current meetings
   - Start syncing external API data
   - No frontend changes needed yet

2. **Add User Type Field**
   - Add user_type column (nullable for now)
   - Update registration to set default value
   - Doesn't break existing auth

3. **Build Court Card Template**
   - Design and implement template
   - Test generation logic
   - Ready to use when needed

4. **Set Up Email Service**
   - Configure SendGrid/AWS SES
   - Create email templates
   - Test email delivery

5. **Update Documentation**
   - This migration plan
   - SYSTEM_REDESIGN.md
   - MEMORY_BANK.md
   - API documentation

---

## 📝 Open Questions & Decisions Needed

### Before Starting Migration

1. **Data Strategy**
   - [ ] Keep existing test accounts or fresh start?
   - [ ] How to handle existing meetings?
   - [ ] Data retention policy?

2. **Visual Tracking Implementation**
   - [ ] Webcam + screen activity or screen only?
   - [ ] Which library: MediaPipe, TensorFlow.js, other?
   - [ ] Privacy compliance research needed?

3. **Email Notifications**
   - [ ] Which email service: SendGrid, AWS SES, other?
   - [ ] Daily digest send time (e.g., 8 PM local time)?
   - [ ] Email frequency preferences for users?

4. **Court Domain Verification**
   - [ ] Start with manual approval or automated list?
   - [ ] Who manages approved domains?
   - [ ] Fallback for unknown courts?

5. **MVP Scope**
   - [ ] Include meeting requirements in Phase 1?
   - [ ] Include visual tracking in Phase 1?
   - [ ] Which external APIs to integrate first?

### Decisions to Make This Week
- [ ] Exact deployment date
- [ ] Communication plan for existing users
- [ ] Team assignments for each phase
- [ ] Budget for email service and any new tools

---

## 💡 Recommendations

### Priority Order
1. **Start with Fresh Database** for MVP (easier than complex migration)
2. **Build Core Features First** (auth, dashboards, basic tracking)
3. **Add Visual Tracking in Phase 2** (get core system working first)
4. **Use Mock External Meetings Initially** (don't block on API research)
5. **Deploy Incrementally** (backend first, then frontend)

### Technical Decisions
- Use **screen activity only** for MVP (webcam adds complexity)
- Start with **manual Court domain approval** (add automation later)
- Implement **daily digests only** (skip real-time emails for MVP)
- Use **SendGrid** for email (reliable, good free tier)

### Project Management
- Daily standups during migration weeks
- Weekly demos to stakeholders
- Continuous deployment to staging
- User testing after each phase

---

## 📅 Estimated Timeline Summary

```
Week 1-2:  Database & Backend       [████████░░] 40% Complete
Week 3-4:  Frontend Dashboards      [░░░░░░░░░░]  0% Complete
Week 5-6:  Attendance & Tracking    [░░░░░░░░░░]  0% Complete
Week 7-8:  Testing & Deployment     [░░░░░░░░░░]  0% Complete

Total: 6-8 weeks to production-ready Version 2.0
```

---

## ✅ Definition of Done

This migration is considered complete when:

- ✅ All database migrations deployed to production
- ✅ Court Rep and Participant registration flows working
- ✅ Both dashboard types fully functional
- ✅ Attendance tracking capturing all required data
- ✅ Court Cards generating automatically
- ✅ Daily digests sending to Court Reps
- ✅ Real-time dashboard updates operational
- ✅ All tests passing
- ✅ Documentation updated
- ✅ Zero critical bugs
- ✅ Stakeholder sign-off received

**Next Steps**: Review with team → Get approval → Start Week 1 implementation

---

*Migration Plan prepared by: AI Development Team*  
*Status: Ready for Review and Team Assignment*  
*Last Updated: October 7, 2024*


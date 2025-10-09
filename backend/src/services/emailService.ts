import { prisma } from '../index';
import { logger } from '../utils/logger';

/**
 * Email Service
 * 
 * Handles all email notifications including:
 * - Email verification
 * - Daily digests for Court Reps
 * - Attendance confirmations for Participants
 * 
 * TODO: Integrate with SendGrid or AWS SES
 * Currently logs emails for development
 */

interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send email (mock implementation)
 * TODO: Replace with SendGrid/AWS SES integration
 */
async function sendEmail(template: EmailTemplate): Promise<boolean> {
  try {
    // Mock email sending for development
    if (process.env.NODE_ENV === 'development' || !process.env.SENDGRID_API_KEY) {
      logger.info(`[EMAIL MOCK] To: ${template.to}`);
      logger.info(`[EMAIL MOCK] Subject: ${template.subject}`);
      logger.info(`[EMAIL MOCK] Preview: ${template.text.substring(0, 200)}...`);
      return true;
    }

    // TODO: Integrate with SendGrid
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send(template);

    return true;
  } catch (error: any) {
    logger.error('Email send error:', error);
    return false;
  }
}

/**
 * Send email verification
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;
  
  const template: EmailTemplate = {
    to: email,
    subject: 'ProofMeet - Verify Your Email',
    html: `
      <h2>Welcome to ProofMeet!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verificationUrl}">Verify Email</a></p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create this account, please ignore this email.</p>
    `,
    text: `Welcome to ProofMeet! Verify your email: ${verificationUrl}`,
  };

  await sendEmail(template);
}

/**
 * Queue daily digest for a Court Rep
 */
export async function queueDailyDigest(courtRepId: string, attendanceRecordIds: string[]): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if digest already exists for today
    const existing = await prisma.dailyDigestQueue.findFirst({
      where: {
        courtRepId,
        digestDate: today,
      },
    });

    if (existing) {
      // Update with new attendance records
      await prisma.dailyDigestQueue.update({
        where: { id: existing.id },
        data: {
          attendanceRecordIds: {
            set: [...existing.attendanceRecordIds, ...attendanceRecordIds],
          },
        },
      });
    } else {
      // Create new digest queue entry
      await prisma.dailyDigestQueue.create({
        data: {
          courtRepId,
          digestDate: today,
          attendanceRecordIds,
          status: 'PENDING',
        },
      });
    }

    logger.info(`Queued daily digest for Court Rep ${courtRepId}`);
  } catch (error: any) {
    logger.error('Queue daily digest error:', error);
  }
}

/**
 * Generate and send daily digest email for a Court Rep
 */
export async function sendDailyDigest(courtRepId: string, digestDate: Date): Promise<boolean> {
  try {
    // Get Court Rep info
    const courtRep = await prisma.user.findUnique({
      where: { id: courtRepId },
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!courtRep) {
      logger.error(`Court Rep not found: ${courtRepId}`);
      return false;
    }

    // Get today's attendance records
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        courtRepId,
        meetingDate: digestDate,
        status: 'COMPLETED',
      },
      include: {
        participant: {
          select: {
            firstName: true,
            lastName: true,
            caseNumber: true,
          },
        },
        courtCard: {
          select: {
            id: true,
            cardNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (attendanceRecords.length === 0) {
      logger.info(`No attendance records for digest: ${courtRepId} on ${digestDate.toISOString()}`);
      return false;
    }

    // Calculate statistics
    const uniqueParticipants = new Set(attendanceRecords.map(r => r.participantId)).size;
    const avgAttendance = attendanceRecords.reduce((sum, r) => sum + Number(r.attendancePercent || 0), 0) / attendanceRecords.length;

    // Build email content
    const meetingsList = attendanceRecords.map((record, index) => `
      ${index + 1}. ${record.participant.firstName} ${record.participant.lastName} (#${record.participant.caseNumber})
         ${record.meetingName}
         Duration: ${record.totalDurationMin} min | Attendance: ${record.attendancePercent}%
         Status: ${record.isValid ? 'Valid ✓' : 'Flagged ⚠'}
    `).join('\n');

    const emailHtml = `
      <h2>Daily Attendance Report</h2>
      <p>Officer ${courtRep.firstName} ${courtRep.lastName},</p>
      
      <h3>📊 Today's Overview</h3>
      <ul>
        <li>Total Meetings Attended: ${attendanceRecords.length}</li>
        <li>Participants Active: ${uniqueParticipants}</li>
        <li>Average Attendance: ${Math.round(avgAttendance * 10) / 10}%</li>
      </ul>

      <h3>✅ Completed Meetings</h3>
      <pre>${meetingsList}</pre>

      <p><a href="${process.env.FRONTEND_URL}/court-rep/dashboard">View Full Dashboard</a></p>
      
      <hr>
      <p style="color: #666; font-size: 12px;">
        ProofMeet Court Compliance System<br>
        Automated Attendance Monitoring
      </p>
    `;

    const emailText = `
Daily Attendance Report - ${digestDate.toLocaleDateString()}

Officer ${courtRep.firstName} ${courtRep.lastName},

📊 TODAY'S OVERVIEW
- Total Meetings Attended: ${attendanceRecords.length}
- Participants Active: ${uniqueParticipants}
- Average Attendance: ${Math.round(avgAttendance * 10) / 10}%

✅ COMPLETED MEETINGS
${meetingsList}

View Full Dashboard: ${process.env.FRONTEND_URL}/court-rep/dashboard

---
ProofMeet Court Compliance System
    `;

    const template: EmailTemplate = {
      to: courtRep.email,
      subject: `Daily Attendance Report - ${digestDate.toLocaleDateString()}`,
      html: emailHtml,
      text: emailText,
    };

    const sent = await sendEmail(template);

    if (sent) {
      logger.info(`Daily digest sent to ${courtRep.email}`);
    }

    return sent;
  } catch (error: any) {
    logger.error('Send daily digest error:', error);
    return false;
  }
}

/**
 * Process all pending daily digests
 * This should be run by a cron job daily
 */
export async function processPendingDigests(): Promise<{ sent: number; failed: number }> {
  try {
    logger.info('Processing pending daily digests...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const pendingDigests = await prisma.dailyDigestQueue.findMany({
      where: {
        status: 'PENDING',
        digestDate: {
          lte: yesterday, // Only process yesterday and older
        },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const digest of pendingDigests) {
      try {
        const success = await sendDailyDigest(digest.courtRepId, digest.digestDate);
        
        if (success) {
          await prisma.dailyDigestQueue.update({
            where: { id: digest.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
            },
          });
          sent++;
        } else {
          await prisma.dailyDigestQueue.update({
            where: { id: digest.id },
            data: {
              status: 'FAILED',
              retryCount: { increment: 1 },
              errorMessage: 'Failed to send email',
            },
          });
          failed++;
        }
      } catch (error: any) {
        logger.error(`Failed to process digest ${digest.id}:`, error);
        failed++;
      }
    }

    logger.info(`Daily digests processed: ${sent} sent, ${failed} failed`);

    return { sent, failed };
  } catch (error: any) {
    logger.error('Process pending digests error:', error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Send attendance confirmation to participant
 */
export async function sendAttendanceConfirmation(
  participantEmail: string,
  meetingName: string,
  duration: number,
  attendancePercent: number,
  courtCardNumber: string
): Promise<void> {
  const template: EmailTemplate = {
    to: participantEmail,
    subject: `Meeting Attendance Confirmed - ${meetingName}`,
    html: `
      <h2>✅ Attendance Confirmed</h2>
      <p>Your attendance has been recorded and reported to your Court Representative.</p>
      
      <h3>Meeting Details:</h3>
      <ul>
        <li><strong>Meeting:</strong> ${meetingName}</li>
        <li><strong>Duration:</strong> ${duration} minutes</li>
        <li><strong>Attendance:</strong> ${attendancePercent}%</li>
        <li><strong>Court Card:</strong> ${courtCardNumber}</li>
      </ul>

      <p>Your Court Card has been automatically sent to your Court Representative.</p>
      
      <p><a href="${process.env.FRONTEND_URL}/participant/my-attendance">View Full History</a></p>
    `,
    text: `
Attendance Confirmed

Meeting: ${meetingName}
Duration: ${duration} minutes
Attendance: ${attendancePercent}%
Court Card: ${courtCardNumber}

Your Court Card has been automatically sent to your Court Representative.
    `,
  };

  await sendEmail(template);
}

export const emailService = {
  sendVerificationEmail,
  queueDailyDigest,
  sendDailyDigest,
  processPendingDigests,
  sendAttendanceConfirmation,
};


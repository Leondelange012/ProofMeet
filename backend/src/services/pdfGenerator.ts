/**
 * Court Card PDF Generator
 * Generates comprehensive compliance report PDFs for participants
 */

import { logger } from '../utils/logger';
import QRCode from 'qrcode';

interface MeetingRecord {
  date: Date;
  meetingName: string;
  meetingProgram: string;
  duration: number;
  attendancePercent: number;
  validationStatus: string;
}

interface DigitalSignatureInfo {
  signerName: string;
  signerRole: string;
  timestamp: Date;
  signatureMethod: string;
}

interface WebcamSnapshot {
  id: string;
  photoUrl: string;
  capturedAt: Date;
  minuteIntoMeeting: number;
  faceDetected?: boolean;
  faceMatchScore?: number;
}

interface HostSignature {
  hostName: string;
  hostEmail: string;
  hostRole: string;
  signatureData: string; // Base64 image
  confirmedAt: Date;
  attestationText: string;
  meetingLocation?: string;
}

interface ParticipantIDPhoto {
  photoUrl: string;
  isVerified: boolean;
  verifiedAt?: Date;
  idType?: string;
}

interface AuditTrailMetrics {
  startTime: Date;
  endTime: Date;
  activeTimeMinutes: number;
  idleTimeMinutes: number;
  videoOnPercentage: number;
  attendancePercentage: number;
  engagementScore: number | null;
  engagementLevel: string | null;
  activityEvents: number;
  verificationMethod: string;
  confidenceLevel: string;
}

interface CourtCardPDFData {
  participantName: string;
  participantEmail: string;
  caseNumber: string;
  courtRepName: string;
  courtRepEmail: string;
  totalMeetings: number;
  totalHours: number;
  meetingsByType: { [key: string]: number };
  meetings: MeetingRecord[];
  generatedDate: Date;
  // Digital verification fields
  cardNumber?: string;
  verificationUrl?: string;
  qrCodeData?: string;
  cardHash?: string;
  chainPosition?: number;
  // Photo verification fields
  webcamSnapshots?: WebcamSnapshot[];
  hostSignature?: HostSignature;
  participantIDPhoto?: ParticipantIDPhoto;
  // Audit trail metrics
  auditTrail?: AuditTrailMetrics;
}

/**
 * Generate HTML content for Court Card PDF
 * This will be used with a PDF generation library (puppeteer, pdfkit, etc.)
 */
export async function generateCourtCardHTML(data: CourtCardPDFData): Promise<string> {
  // Generate QR code image as base64 data URL
  let qrCodeImage = '';
  if (data.qrCodeData) {
    try {
      qrCodeImage = await QRCode.toDataURL(data.qrCodeData, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 256
      });
    } catch (error) {
      logger.error('Error generating QR code:', error);
      qrCodeImage = ''; // Fallback to no image
    }
  }
  const meetingTypesSummary = Object.entries(data.meetingsByType)
    .map(([type, count]) => `<li>${type}: ${count} meeting${count > 1 ? 's' : ''}</li>`)
    .join('');

  const meetingsRows = data.meetings
    .map(
      (m) => `
    <tr style="${m.validationStatus === 'FAILED' ? 'background-color: #ffe6e6;' : ''}">
      <td style="padding: 8px; border: 1px solid #ddd;">${new Date(m.date).toLocaleDateString()}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${m.meetingName}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${m.meetingProgram}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${m.duration} min</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${m.attendancePercent}%</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
        <span style="color: ${m.validationStatus === 'PASSED' ? 'green' : 'red'}; font-weight: bold;">
          ${m.validationStatus}
        </span>
      </td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', sans-serif;
      padding: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #1976d2;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1976d2;
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header p {
      color: #666;
      font-size: 14px;
    }
    .info-section {
      margin-bottom: 30px;
      padding: 20px;
      background-color: #f5f5f5;
      border-radius: 8px;
    }
    .info-section h2 {
      color: #1976d2;
      font-size: 18px;
      margin-bottom: 15px;
      border-bottom: 2px solid #1976d2;
      padding-bottom: 5px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .info-item {
      padding: 10px;
    }
    .info-item label {
      font-weight: bold;
      color: #555;
      display: block;
      margin-bottom: 5px;
    }
    .info-item value {
      color: #333;
      font-size: 16px;
    }
    .summary-section {
      margin-bottom: 30px;
      padding: 20px;
      background-color: #e3f2fd;
      border-radius: 8px;
      border-left: 5px solid #1976d2;
    }
    .summary-section h2 {
      color: #1976d2;
      font-size: 18px;
      margin-bottom: 15px;
    }
    .summary-stats {
      display: flex;
      justify-content: space-around;
      margin-bottom: 15px;
    }
    .stat-box {
      text-align: center;
      padding: 15px;
      background-color: white;
      border-radius: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stat-box .number {
      font-size: 32px;
      font-weight: bold;
      color: #1976d2;
    }
    .stat-box .label {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    .meetings-section {
      margin-bottom: 30px;
    }
    .meetings-section h2 {
      color: #1976d2;
      font-size: 18px;
      margin-bottom: 15px;
      border-bottom: 2px solid #1976d2;
      padding-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th {
      background-color: #1976d2;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: bold;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #ddd;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .signature-section {
      margin-top: 40px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }
    .signature-box {
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    .signature-box label {
      font-weight: bold;
      color: #555;
      display: block;
      margin-bottom: 10px;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 50px;
      padding-top: 5px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>⚖️ COURT COMPLIANCE CARD</h1>
    <p>Official Attendance Verification Report</p>
    <p style="margin-top: 10px; font-weight: bold;">Generated: ${new Date(data.generatedDate).toLocaleString()}</p>
  </div>

  <!-- Participant Information -->
  <div class="info-section">
    <h2>Participant Information</h2>
    <div class="info-grid">
      <div class="info-item">
        <label>Full Name:</label>
        <value>${data.participantName}</value>
      </div>
      <div class="info-item">
        <label>Case Number:</label>
        <value>${data.caseNumber}</value>
      </div>
      <div class="info-item">
        <label>Email Address:</label>
        <value>${data.participantEmail}</value>
      </div>
      <div class="info-item">
        <label>Court Representative:</label>
        <value>${data.courtRepName}</value>
      </div>
    </div>
  </div>

  <!-- Summary Statistics -->
  <div class="summary-section">
    <h2>Compliance Summary</h2>
    <div class="summary-stats">
      <div class="stat-box">
        <div class="number">${data.totalMeetings}</div>
        <div class="label">Total Meetings</div>
      </div>
      <div class="stat-box">
        <div class="number">${data.totalHours.toFixed(1)}</div>
        <div class="label">Total Hours</div>
      </div>
      <div class="stat-box">
        <div class="number">${Object.keys(data.meetingsByType).length}</div>
        <div class="label">Program Types</div>
      </div>
    </div>
    <div style="margin-top: 15px;">
      <label style="font-weight: bold; margin-bottom: 10px; display: block;">Meetings by Type:</label>
      <ul style="margin-left: 20px;">
        ${meetingTypesSummary}
      </ul>
    </div>
  </div>

  <!-- Detailed Meeting History -->
  <div class="meetings-section">
    <h2>Detailed Meeting History</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Meeting Name</th>
          <th>Program</th>
          <th>Duration</th>
          <th>Attendance</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${meetingsRows}
      </tbody>
    </table>
  </div>

  <!-- Attendance Metrics Section (NEW) -->
  ${data.auditTrail ? `
  <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 5px solid #4caf50; margin-top: 30px; margin-bottom: 20px;">
    <h2 style="color: #2e7d32; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #4caf50; padding-bottom: 5px;">
      📊 Attendance Verification Metrics
    </h2>
    <p style="margin-bottom: 15px; font-size: 13px; color: #555;">
      Comprehensive proof of attendance tracked throughout the meeting.
    </p>
    
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
      <div style="background-color: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 24px; font-weight: bold; color: #2e7d32; margin-bottom: 5px;">
          ${data.auditTrail.activeTimeMinutes} min
        </div>
        <div style="font-size: 12px; color: #666;">Active Time</div>
      </div>
      <div style="background-color: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 24px; font-weight: bold; color: ${data.auditTrail.videoOnPercentage >= 80 ? '#2e7d32' : '#f57c00'}; margin-bottom: 5px;">
          ${data.auditTrail.videoOnPercentage}%
        </div>
        <div style="font-size: 12px; color: #666;">Video On</div>
      </div>
      <div style="background-color: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 24px; font-weight: bold; color: #2e7d32; margin-bottom: 5px;">
          ${data.auditTrail.attendancePercentage}%
        </div>
        <div style="font-size: 12px; color: #666;">Attendance</div>
      </div>
    </div>
    
    <div style="background-color: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 15px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <strong>Meeting Start:</strong> ${new Date(data.auditTrail.startTime).toLocaleString()}
        </div>
        <div>
          <strong>Meeting End:</strong> ${new Date(data.auditTrail.endTime).toLocaleString()}
        </div>
        <div>
          <strong>Engagement Score:</strong> ${data.auditTrail.engagementScore !== null ? `${data.auditTrail.engagementScore}/100` : 'N/A'}
        </div>
        <div>
          <strong>Engagement Level:</strong> ${data.auditTrail.engagementLevel || 'N/A'}
        </div>
        <div>
          <strong>Activity Events:</strong> ${data.auditTrail.activityEvents}
        </div>
        <div>
          <strong>Idle Time:</strong> ${data.auditTrail.idleTimeMinutes} min
        </div>
        <div>
          <strong>Verification Method:</strong> ${data.auditTrail.verificationMethod}
        </div>
        <div>
          <strong>Confidence Level:</strong> <span style="color: ${data.auditTrail.confidenceLevel === 'HIGH' ? '#2e7d32' : data.auditTrail.confidenceLevel === 'MEDIUM' ? '#f57c00' : '#666'}; font-weight: bold;">${data.auditTrail.confidenceLevel}</span>
        </div>
      </div>
    </div>
    
    <div style="padding: 12px; background-color: white; border-radius: 5px; border: 1px solid #4caf50;">
      <p style="font-size: 11px; color: #555;">
        <strong>✓ Verified Attendance:</strong> All metrics were tracked in real-time using video monitoring, activity detection, and engagement analysis. This provides comprehensive proof that the participant was present and actively engaged throughout the meeting.
      </p>
    </div>
  </div>
  ` : ''}

  <!-- Verification & QR Code Section (NEW) -->
  <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; border-left: 5px solid #ff9800; margin-top: 30px;">
    <h2 style="color: #e65100; font-size: 18px; margin-bottom: 15px;">
      📱 Instant Verification
    </h2>
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; align-items: center;">
      <div>
        <p style="margin-bottom: 10px;"><strong>Card Number:</strong> ${data.cardNumber || 'N/A'}</p>
        <p style="margin-bottom: 10px;"><strong>Verification URL:</strong></p>
        <p style="font-family: monospace; font-size: 12px; background-color: white; padding: 10px; border-radius: 3px; word-break: break-all;">
          ${data.verificationUrl || 'N/A'}
        </p>
        ${data.cardHash ? `
        <p style="margin-top: 15px;"><strong>Security Hash:</strong></p>
        <p style="font-family: monospace; font-size: 10px; background-color: white; padding: 10px; border-radius: 3px; word-break: break-all;">
          ${data.cardHash.substring(0, 32)}...
        </p>
        ` : ''}
        ${data.chainPosition ? `
        <p style="margin-top: 10px; font-size: 12px; color: #666;">
          🔗 Chain Position: #${data.chainPosition} (Blockchain-verified)
        </p>
        ` : ''}
      </div>
      <div style="text-align: center;">
        <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <p style="font-weight: bold; margin-bottom: 10px; font-size: 14px;">Scan to Verify</p>
          ${qrCodeImage ? `
          <img src="${qrCodeImage}" alt="QR Code" style="width: 200px; height: 200px; margin: 0 auto; display: block;" />
          ` : `
          <div style="width: 200px; height: 200px; background-color: #f5f5f5; border: 2px solid #ddd; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
            <p style="font-size: 12px; color: #999;">QR Code</p>
          </div>
          `}
          <p style="margin-top: 10px; font-size: 11px; color: #666;">
            Or visit verification URL above
          </p>
        </div>
      </div>
    </div>
    <div style="margin-top: 20px; padding: 15px; background-color: #fff; border-radius: 5px; border: 1px solid #ff9800;">
      <p style="font-size: 13px; margin-bottom: 5px;"><strong>How Courts Can Verify:</strong></p>
      <ol style="margin-left: 20px; font-size: 12px;">
        <li>Scan QR code with any smartphone</li>
        <li>Visit the verification URL in any browser</li>
        <li>Verify the card number matches</li>
        <li>Review attendance metrics and timestamps</li>
        <li>Confirm chain of trust is intact</li>
      </ol>
    </div>
  </div>

  ${data.participantIDPhoto ? `
  <!-- Participant ID Photo Section -->
  <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 5px solid #4caf50; margin-top: 30px;">
    <h2 style="color: #2e7d32; font-size: 18px; margin-bottom: 15px;">
      🆔 Identity Verification
    </h2>
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px; align-items: center;">
      <div style="text-align: center;">
        <img src="${data.participantIDPhoto.photoUrl}" alt="Participant ID Photo" style="max-width: 200px; max-height: 250px; border: 2px solid #4caf50; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
      </div>
      <div>
        <p style="margin-bottom: 10px;"><strong>Participant:</strong> ${data.participantName}</p>
        ${data.participantIDPhoto.idType ? `<p style="margin-bottom: 10px;"><strong>ID Type:</strong> ${data.participantIDPhoto.idType}</p>` : ''}
        <p style="margin-bottom: 10px;">
          <strong>Verification Status:</strong>
          <span style="color: ${data.participantIDPhoto.isVerified ? 'green' : 'orange'}; font-weight: bold;">
            ${data.participantIDPhoto.isVerified ? '✓ Verified' : 'Pending Verification'}
          </span>
        </p>
        ${data.participantIDPhoto.isVerified && data.participantIDPhoto.verifiedAt ? `
        <p style="margin-bottom: 10px; font-size: 12px; color: #666;">
          Verified on: ${new Date(data.participantIDPhoto.verifiedAt).toLocaleDateString()}
        </p>
        ` : ''}
        <p style="margin-top: 15px; font-size: 12px; color: #555; padding: 10px; background-color: white; border-radius: 5px;">
          ℹ️ This photo was submitted by the participant and compared against meeting attendance photos to ensure identity consistency.
        </p>
      </div>
    </div>
  </div>
  ` : ''}

  ${data.webcamSnapshots && data.webcamSnapshots.length > 0 ? `
  <!-- Webcam Snapshots Section -->
  <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 5px solid #2196f3; margin-top: 30px;">
    <h2 style="color: #1565c0; font-size: 18px; margin-bottom: 15px;">
      📸 Meeting Attendance Photos (${data.webcamSnapshots.length} captured)
    </h2>
    <p style="margin-bottom: 15px; font-size: 13px; color: #555;">
      Photos were automatically captured during the meeting to verify attendance and identity.
    </p>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px;">
      ${data.webcamSnapshots.slice(0, 6).map(snapshot => `
        <div style="background-color: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
          <img src="${snapshot.photoUrl}" alt="Webcam snapshot" style="width: 100%; height: 150px; object-fit: cover; border-radius: 5px; margin-bottom: 8px;" />
          <p style="font-size: 11px; color: #666; margin-bottom: 3px;">
            ${new Date(snapshot.capturedAt).toLocaleTimeString()}
          </p>
          <p style="font-size: 10px; color: #999;">
            ${snapshot.minuteIntoMeeting} min into meeting
          </p>
          ${snapshot.faceDetected ? `
          <p style="font-size: 10px; color: green; margin-top: 5px;">
            ✓ Face detected
            ${snapshot.faceMatchScore ? ` (${snapshot.faceMatchScore}% match)` : ''}
          </p>
          ` : ''}
        </div>
      `).join('')}
    </div>
    ${data.webcamSnapshots.length > 6 ? `
    <p style="margin-top: 15px; font-size: 12px; color: #666; text-align: center;">
      + ${data.webcamSnapshots.length - 6} more photo(s) available in online verification
    </p>
    ` : ''}
  </div>
  ` : ''}

  ${data.hostSignature ? `
  <!-- Meeting Host Signature Section -->
  <div style="background-color: #f3e5f5; padding: 20px; border-radius: 8px; border-left: 5px solid #9c27b0; margin-top: 30px;">
    <h2 style="color: #6a1b9a; font-size: 18px; margin-bottom: 15px;">
      ✍️ Meeting Host Confirmation
    </h2>
    <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
        <div>
          <p style="margin-bottom: 8px;"><strong>Host Name:</strong> ${data.hostSignature.hostName}</p>
          <p style="margin-bottom: 8px;"><strong>Email:</strong> ${data.hostSignature.hostEmail}</p>
          <p style="margin-bottom: 8px;"><strong>Role:</strong> ${data.hostSignature.hostRole.replace(/_/g, ' ')}</p>
        </div>
        <div>
          <p style="margin-bottom: 8px;"><strong>Confirmed:</strong> ${new Date(data.hostSignature.confirmedAt).toLocaleString()}</p>
          ${data.hostSignature.meetingLocation ? `<p style="margin-bottom: 8px;"><strong>Location:</strong> ${data.hostSignature.meetingLocation}</p>` : ''}
        </div>
      </div>
      <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; margin-bottom: 15px;">
        <p style="font-size: 12px; color: #555; font-style: italic; line-height: 1.5;">
          "${data.hostSignature.attestationText}"
        </p>
      </div>
      <div style="text-align: center; padding: 20px; background-color: #fafafa; border-radius: 5px;">
        <p style="font-size: 12px; color: #666; margin-bottom: 10px;">Digital Signature:</p>
        <img src="${data.hostSignature.signatureData}" alt="Host Signature" style="max-width: 300px; max-height: 100px; border: 1px solid #ddd; padding: 10px; background-color: white;" />
      </div>
    </div>
    <div style="padding: 12px; background-color: white; border-radius: 5px; border: 1px solid #9c27b0;">
      <p style="font-size: 11px; color: #555;">
        <strong>Note:</strong> This meeting host digitally confirmed the participant's attendance. The signature is legally binding and verifiable through the verification URL above.
      </p>
    </div>
  </div>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    <p><strong>ProofMeet™ Digital Court Card System</strong></p>
    <p style="margin-top: 5px;">This document is an official court compliance record with cryptographic verification and real-time attendance tracking.</p>
    <p style="margin-top: 5px;">All attendance records are verified via Zoom API webhooks, video monitoring, activity detection, and blockchain ledger.</p>
    <p style="margin-top: 10px; font-weight: bold; color: #2e7d32;">
      ✓ COMPREHENSIVE ATTENDANCE PROOF - Video, Activity & Engagement Tracked
    </p>
    <p style="margin-top: 10px; font-size: 10px;">Document ID: ${data.cardNumber || `CC-${data.caseNumber}-${Date.now()}`}</p>
    <p style="font-size: 10px;">Generated: ${new Date(data.generatedDate).toISOString()}</p>
  </div>
</body>
</html>
  `;
}

/**
 * For now, return the HTML content
 * In production, this would use puppeteer or a PDF library to convert to PDF
 */
export async function generateCourtCardPDF(data: CourtCardPDFData): Promise<string> {
  try {
    logger.info(`Generating Court Card PDF for participant: ${data.participantEmail}`);

    // Generate HTML with QR code
    const html = await generateCourtCardHTML(data);

    // TODO: In production, use puppeteer to convert HTML to PDF
    // For now, return HTML that can be rendered or converted client-side
    // Or use a library like pdfkit, jsPDF, etc.

    return html;
  } catch (error: any) {
    logger.error('Court Card PDF generation error:', error);
    throw error;
  }
}

export const pdfGeneratorService = {
  generateCourtCardPDF,
  generateCourtCardHTML,
};


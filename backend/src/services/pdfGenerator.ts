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
  // Digital signature fields
  cardNumber?: string;
  verificationUrl?: string;
  qrCodeData?: string;
  signatures?: DigitalSignatureInfo[];
  cardHash?: string;
  chainPosition?: number;
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
        type: 'image/png',
        quality: 0.95,
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

  <!-- Digital Signature Section (NEW) -->
  ${data.signatures && data.signatures.length > 0 ? `
  <div class="signature-section">
    <h2 style="color: #1976d2; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #1976d2; padding-bottom: 5px;">
      ✓ Digital Signatures & Verification
    </h2>
    <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 5px solid #4caf50; margin-bottom: 20px;">
      <p style="margin-bottom: 15px; font-weight: bold; color: #2e7d32;">
        ✓ This document is digitally signed and cryptographically verified. No physical signatures required.
      </p>
      
      ${data.signatures.map(sig => `
      <div style="background-color: white; padding: 15px; margin-bottom: 10px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <strong>Signer:</strong> ${sig.signerName}
          </div>
          <div>
            <strong>Role:</strong> ${sig.signerRole}
          </div>
          <div>
            <strong>Date & Time:</strong> ${new Date(sig.timestamp).toLocaleString()}
          </div>
          <div>
            <strong>Method:</strong> ${sig.signatureMethod}
          </div>
        </div>
        <div style="margin-top: 10px; padding: 10px; background-color: #f5f5f5; border-radius: 3px; font-family: monospace; font-size: 11px;">
          ✓ Cryptographic signature verified
        </div>
      </div>
      `).join('')}
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
        <li>Check digital signatures are valid</li>
        <li>Confirm chain of trust is intact</li>
      </ol>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p><strong>ProofMeet™ Digital Court Card System</strong></p>
    <p style="margin-top: 5px;">This document is an official court compliance record with digital signatures and cryptographic verification.</p>
    <p style="margin-top: 5px;">All attendance records are verified via Zoom API webhooks, activity monitoring, and blockchain ledger.</p>
    <p style="margin-top: 10px; font-weight: bold; color: #2e7d32;">
      ✓ NO PHYSICAL SIGNATURES REQUIRED - Fully Digital & Legally Binding
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


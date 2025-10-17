/**
 * Court Card PDF Generator
 * Generates comprehensive compliance report PDFs for participants
 */

import { logger } from '../utils/logger';

interface MeetingRecord {
  date: Date;
  meetingName: string;
  meetingProgram: string;
  duration: number;
  attendancePercent: number;
  validationStatus: string;
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
}

/**
 * Generate HTML content for Court Card PDF
 * This will be used with a PDF generation library (puppeteer, pdfkit, etc.)
 */
export function generateCourtCardHTML(data: CourtCardPDFData): string {
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

  <!-- Signature Section -->
  <div class="signature-section">
    <div class="signature-box">
      <label>Participant Acknowledgment:</label>
      <div class="signature-line">Participant Signature</div>
    </div>
    <div class="signature-box">
      <label>Court Representative Verification:</label>
      <div class="signature-line">Court Rep Signature</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p><strong>ProofMeet™</strong> - Automated Attendance Verification System</p>
    <p style="margin-top: 5px;">This document is an official court compliance record generated by ProofMeet.</p>
    <p style="margin-top: 5px;">All attendance records are verified via Zoom API webhooks and activity monitoring.</p>
    <p style="margin-top: 10px; font-size: 10px;">Document ID: CC-${data.caseNumber}-${Date.now()}</p>
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

    // Generate HTML
    const html = generateCourtCardHTML(data);

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


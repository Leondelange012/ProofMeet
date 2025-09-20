// User Types
export interface User {
  id: string;
  email: string;
  courtId: string;
  firstName?: string;
  lastName?: string;
  state: 'CA' | 'TX' | 'NY';
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Host extends User {
  isHost: true;
  hostId: string;
  courtApproved: boolean;
}

// Court Order Types
export interface CourtOrder {
  id: string;
  userId: string;
  courtCaseNumber: string;
  frequency: number; // meetings per week
  duration: number; // months
  meetingTypes: MeetingType[];
  reportInterval: 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type MeetingType = 'AA' | 'NA' | 'SMART' | 'LifeRing' | 'Other';

// Meeting Types
export interface Meeting {
  id: string;
  hostId: string;
  meetingType: MeetingType;
  meetingFormat: 'online' | 'in-person';
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  meetingId?: string; // Zoom meeting ID
  qrCode?: string; // For in-person meetings
  location?: string; // For in-person meetings
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Attendance Types
export interface Attendance {
  id: string;
  userId: string;
  meetingId: string;
  joinTime?: Date;
  leaveTime?: Date;
  duration: number; // in minutes
  attendancePercentage: number; // 0-100
  isApproved: boolean;
  approvedBy?: string; // host ID
  approvedAt?: Date;
  checkInQr?: string; // For in-person
  checkOutQr?: string; // For in-person
  isComplete: boolean;
  flags: AttendanceFlag[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceFlag {
  type: 'late_entry' | 'early_leave' | 'incomplete_checkout' | 'no_approval';
  message: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: Date;
}

// Compliance Types
export interface ComplianceReport {
  id: string;
  userId: string;
  courtOrderId: string;
  reportPeriod: {
    start: Date;
    end: Date;
  };
  totalMeetingsRequired: number;
  totalMeetingsAttended: number;
  compliancePercentage: number;
  attendanceRecords: Attendance[];
  flags: AttendanceFlag[];
  generatedAt: Date;
  generatedBy: string; // PO or system
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Zoom Integration Types
export interface ZoomMeetingData {
  meetingId: string;
  topic: string;
  startTime: string;
  duration: number;
  joinUrl: string;
  hostId: string;
}

export interface ZoomWebhookEvent {
  event: string;
  payload: {
    account_id: string;
    object: {
      uuid: string;
      id: string;
      host_id: string;
      topic: string;
      type: number;
      start_time: string;
      duration: number;
      timezone: string;
      created_at: string;
      join_url: string;
    };
  };
}

// QR Code Types
export interface QRCodeData {
  meetingId: string;
  sessionId: string;
  type: 'checkin' | 'checkout';
  expiresAt: Date;
}

// Authentication Types
export interface AuthToken {
  userId: string;
  email: string;
  role: 'user' | 'host' | 'po' | 'judge' | 'admin';
  courtId?: string;
  iat: number;
  exp: number;
}

export interface LoginRequest {
  email: string;
  password?: string; // Optional for court-verified users
}

export interface RegisterRequest {
  email: string;
  courtId: string;
  state: 'CA' | 'TX' | 'NY';
  courtCaseNumber: string;
}

// Meeting Creation Types
export interface CreateMeetingRequest {
  meetingType: MeetingType;
  meetingFormat: 'online' | 'in-person';
  scheduledStart: string; // ISO string
  scheduledEnd: string; // ISO string
  location?: string; // For in-person
  zoomMeetingId?: string; // For online
}

// Attendance Approval Types
export interface AttendanceApprovalRequest {
  attendanceId: string;
  approved: boolean;
  hostSignature: string;
  notes?: string;
}

// State-specific compliance types
export interface CaliforniaCompliance extends ComplianceReport {
  secularAlternatives: MeetingType[];
  duiEducationSeparate: boolean;
}

export interface TexasCompliance extends ComplianceReport {
  countyFormCompatible: boolean;
  dwiEducationSeparate: boolean;
}

export interface NewYorkCompliance extends ComplianceReport {
  idpAware: boolean;
  sdnylogFormat: boolean;
}

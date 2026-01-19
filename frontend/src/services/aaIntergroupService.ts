/**
 * AA Intergroup Service
 * NOTE: This service is DEPRECATED and returns empty data
 * All meetings now come from the backend database (/api/participant/meetings/available)
 * 
 * To add real meetings:
 * 1. Use the Court Rep interface to create meetings
 * 2. Import meetings into the ExternalMeeting table
 * 3. Integrate with third-party meeting APIs (AA, NA, SMART, etc.)
 */

// Define interfaces for AA meeting data
interface AAMeeting {
  id: string;
  name: string;
  program: 'AA' | 'NA' | 'SMART' | 'CMA' | 'OA' | 'GA';
  type: string;
  day: string;
  time: string;
  timezone: string;
  format: 'online' | 'in-person' | 'hybrid';
  zoomUrl?: string;
  zoomId?: string;
  zoomPassword?: string;
  location?: string;
  address?: string;
  description?: string;
  hasProofOfAttendance: boolean;
  groupContact?: string;
  tags?: string[];
  lastUpdated?: string;
}

interface MeetingsByProgram {
  [program: string]: AAMeeting[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  lastUpdated?: string;
  totalMeetings?: number;
}

// DEPRECATED: Mock data generation removed
// All meetings now loaded from backend database

export const aaIntergroupService = {
  /**
   * DEPRECATED: No longer generates mock meetings
   * All meetings now loaded from backend database
   */
  async getAllMeetings(): Promise<ApiResponse<AAMeeting[]>> {
    console.log('ℹ️  Mock meeting service is disabled. All meetings now come from backend database.');
    
    return {
      success: true,
      data: [],
      lastUpdated: new Date().toISOString(),
      totalMeetings: 0
    };
  },

  /**
   * DEPRECATED: Returns empty array
   */
  async getProofOfAttendanceMeetings(): Promise<ApiResponse<AAMeeting[]>> {
    return {
      success: true,
      data: []
    };
  },

  /**
   * DEPRECATED: Returns empty object
   * All meetings now come from /api/participant/meetings/available
   */
  async getMeetingsByProgram(): Promise<ApiResponse<MeetingsByProgram>> {
    console.log('ℹ️  Mock meeting service is disabled. All meetings now come from backend database.');
    
    return {
      success: true,
      data: {}
    };
  },

  /**
   * DEPRECATED: API investigation moved to backend
   * All AA meetings are now fetched by the backend sync service
   */
  async investigateApiStructure(): Promise<void> {
    console.log('ℹ️  API investigation is deprecated. All AA meetings are synced by backend service.');
  }
};

export type { AAMeeting };

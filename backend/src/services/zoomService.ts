/**
 * Zoom API Integration Service
 * Handles Zoom meeting creation and management
 */

import axios from 'axios';
import { logger } from '../utils/logger';

// Zoom API credentials - MUST be set in environment variables
const ZOOM_ACCOUNT_ID = process.env['ZOOM_ACCOUNT_ID'];
const ZOOM_CLIENT_ID = process.env['ZOOM_CLIENT_ID'];
const ZOOM_CLIENT_SECRET = process.env['ZOOM_CLIENT_SECRET'];

if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
  logger.error('❌ ZOOM API credentials not configured. Please set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET environment variables.');
}

interface ZoomMeetingOptions {
  topic: string;
  agenda?: string;
  duration: number; // in minutes
  startTime?: Date;
  timezone?: string;
  password?: string;
  settings?: {
    join_before_host?: boolean;
    waiting_room?: boolean;
    mute_upon_entry?: boolean;
    approval_type?: number; // 0=auto approve, 1=manual approve, 2=no registration
  };
}

interface ZoomMeeting {
  id: string;
  topic: string;
  join_url: string;
  start_url: string;
  password: string;
  start_time: string;
  duration: number;
  timezone: string;
  created_at: string;
}

class ZoomService {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  /**
   * Get OAuth access token for Zoom API
   */
  private async getAccessToken(): Promise<string> {
    try {
      // Check if we have a valid cached token
      if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
        return this.accessToken;
      }

      logger.info('Requesting new Zoom access token...');

      // Request new token using Server-to-Server OAuth
      const response = await axios.post(
        'https://zoom.us/oauth/token',
        new URLSearchParams({
          grant_type: 'account_credentials',
          account_id: ZOOM_ACCOUNT_ID,
        }),
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);

      logger.info('Zoom access token obtained successfully');
      return this.accessToken;
    } catch (error: any) {
      logger.error('Failed to get Zoom access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Zoom API');
    }
  }

  /**
   * Create a Zoom meeting
   */
  async createMeeting(options: ZoomMeetingOptions): Promise<ZoomMeeting> {
    try {
      const token = await this.getAccessToken();

      // Default meeting settings for court compliance tracking
      const meetingData = {
        topic: options.topic,
        type: 2, // Scheduled meeting
        start_time: options.startTime?.toISOString() || new Date().toISOString(),
        duration: options.duration,
        timezone: options.timezone || 'America/Los_Angeles',
        agenda: options.agenda || 'Court compliance meeting',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: options.settings?.join_before_host ?? true,
          mute_upon_entry: options.settings?.mute_upon_entry ?? false,
          waiting_room: options.settings?.waiting_room ?? false,
          approval_type: options.settings?.approval_type ?? 0, // Auto approve
          audio: 'both', // Telephone and VoIP
          auto_recording: 'cloud', // Record to cloud for compliance
          meeting_authentication: false, // Allow anyone with link to join
        },
        password: options.password || this.generateMeetingPassword(),
      };

      // Create meeting using "me" as the user (requires appropriate permissions)
      const response = await axios.post(
        'https://api.zoom.us/v2/users/me/meetings',
        meetingData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`Zoom meeting created: ${response.data.id} - ${options.topic}`);

      return {
        id: response.data.id.toString(),
        topic: response.data.topic,
        join_url: response.data.join_url,
        start_url: response.data.start_url,
        password: response.data.password,
        start_time: response.data.start_time,
        duration: response.data.duration,
        timezone: response.data.timezone,
        created_at: response.data.created_at,
      };
    } catch (error: any) {
      logger.error('Failed to create Zoom meeting:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create Zoom meeting');
    }
  }

  /**
   * Get meeting details
   */
  async getMeeting(meetingId: string): Promise<ZoomMeeting> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      return {
        id: response.data.id.toString(),
        topic: response.data.topic,
        join_url: response.data.join_url,
        start_url: response.data.start_url,
        password: response.data.password,
        start_time: response.data.start_time,
        duration: response.data.duration,
        timezone: response.data.timezone,
        created_at: response.data.created_at,
      };
    } catch (error: any) {
      logger.error('Failed to get Zoom meeting:', error.response?.data || error.message);
      throw new Error('Failed to retrieve Zoom meeting');
    }
  }

  /**
   * Delete a Zoom meeting
   */
  async deleteMeeting(meetingId: string): Promise<void> {
    try {
      const token = await this.getAccessToken();

      await axios.delete(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      logger.info(`Zoom meeting deleted: ${meetingId}`);
    } catch (error: any) {
      logger.error('Failed to delete Zoom meeting:', error.response?.data || error.message);
      throw new Error('Failed to delete Zoom meeting');
    }
  }

  /**
   * Generate a random meeting password
   */
  private generateMeetingPassword(): string {
    const chars = '0123456789';
    let password = '';
    for (let i = 0; i < 6; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Create a test meeting for court compliance tracking
   */
  async createTestMeeting(
    courtRepName: string,
    duration: number = 30,
    startInMinutes: number = 2,
    customTopic?: string
  ): Promise<ZoomMeeting> {
    const now = new Date();
    const startTime = new Date(now.getTime() + startInMinutes * 60 * 1000);

    return this.createMeeting({
      topic: customTopic || `Test Compliance Meeting - ${courtRepName}`,
      agenda: 'Test meeting for ProofMeet court compliance tracking system',
      duration: duration,
      startTime,
      timezone: 'America/Los_Angeles',
      settings: {
        join_before_host: true,
        waiting_room: false,
        mute_upon_entry: false,
        approval_type: 0,
      },
    });
  }
}

// Export singleton instance
export const zoomService = new ZoomService();


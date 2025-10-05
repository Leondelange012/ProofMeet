/**
 * AA Intergroup Service
 * Integrates with https://aa-intergroup.org/meetings/ to fetch real AA meeting data
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
}

interface MeetingsByProgram {
  [program: string]: AAMeeting[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const AA_INTERGROUP_BASE_URL = 'https://aa-intergroup.org';

// Note: This is a placeholder implementation
// We need to investigate the actual API structure of aa-intergroup.org
export const aaIntergroupService = {
  /**
   * Fetch all available AA meetings
   * TODO: Research actual API endpoints and data structure
   */
  async getAllMeetings(): Promise<ApiResponse<AAMeeting[]>> {
    try {
      // Comprehensive mock data representing a real recovery meeting directory
      const mockMeetings: AAMeeting[] = [
        // AA Meetings
        {
          id: 'aa-001',
          name: 'Morning Reflections',
          program: 'AA',
          type: 'Big Book Study',
          day: 'Monday',
          time: '08:00',
          timezone: 'PST',
          format: 'online',
          zoomUrl: 'https://zoom.us/j/123456789',
          zoomId: '123 456 789',
          zoomPassword: 'recovery',
          description: 'Morning meditation and Big Book study',
          hasProofOfAttendance: true,
          groupContact: 'morning@aa-group.org',
          tags: ['Beginner Friendly', 'Meditation']
        },
        {
          id: 'aa-002',
          name: 'Serenity Circle',
          program: 'AA',
          type: 'Open Discussion',
          day: 'Tuesday',
          time: '19:00',
          timezone: 'PST',
          format: 'online',
          zoomUrl: 'https://zoom.us/j/987654321',
          zoomId: '987 654 321',
          zoomPassword: 'serenity',
          description: 'Open discussion meeting for all',
          hasProofOfAttendance: true,
          groupContact: 'serenity@aa-group.org',
          tags: ['Open', 'Discussion']
        },
        {
          id: 'aa-003',
          name: 'Downtown Recovery',
          program: 'AA',
          type: 'Speaker Meeting',
          day: 'Wednesday',
          time: '20:00',
          timezone: 'PST',
          format: 'in-person',
          location: 'Community Center',
          address: '123 Main St, Downtown',
          description: 'Weekly speaker meeting with proof of attendance',
          hasProofOfAttendance: true,
          groupContact: 'downtown@aa-group.org',
          tags: ['Speaker', 'In-Person']
        },
        {
          id: 'aa-004',
          name: 'Step Study Group',
          program: 'AA',
          type: '12 Step Study',
          day: 'Thursday',
          time: '18:30',
          timezone: 'PST',
          format: 'hybrid',
          zoomUrl: 'https://zoom.us/j/456789123',
          location: 'St. Mary\'s Church',
          address: '456 Oak Ave',
          description: 'In-depth study of the 12 steps',
          hasProofOfAttendance: true,
          groupContact: 'steps@aa-group.org',
          tags: ['12 Steps', 'Study', 'Hybrid']
        },
        {
          id: 'aa-005',
          name: 'Women\'s Circle',
          program: 'AA',
          type: 'Women Only',
          day: 'Friday',
          time: '17:00',
          timezone: 'PST',
          format: 'online',
          zoomUrl: 'https://zoom.us/j/789123456',
          description: 'Support group for women in recovery',
          hasProofOfAttendance: true,
          groupContact: 'women@aa-group.org',
          tags: ['Women Only', 'Support']
        },
        {
          id: 'aa-006',
          name: 'Saturday Sunrise',
          program: 'AA',
          type: 'Open Meeting',
          day: 'Saturday',
          time: '07:00',
          timezone: 'PST',
          format: 'online',
          zoomUrl: 'https://zoom.us/j/321654987',
          description: 'Early morning recovery meeting',
          hasProofOfAttendance: true,
          groupContact: 'sunrise@aa-group.org',
          tags: ['Early Morning', 'Open']
        },

        // NA Meetings
        {
          id: 'na-001',
          name: 'Clean and Serene',
          program: 'NA',
          type: 'Basic Text Study',
          day: 'Monday',
          time: '19:30',
          timezone: 'PST',
          format: 'online',
          zoomUrl: 'https://zoom.us/j/111222333',
          description: 'Study of NA Basic Text',
          hasProofOfAttendance: true,
          groupContact: 'clean@na-group.org',
          tags: ['Basic Text', 'Study']
        },
        {
          id: 'na-002',
          name: 'Tuesday Night Live',
          program: 'NA',
          type: 'Open Discussion',
          day: 'Tuesday',
          time: '20:30',
          timezone: 'PST',
          format: 'in-person',
          location: 'Unity Center',
          address: '789 Pine St',
          description: 'Lively discussion meeting',
          hasProofOfAttendance: true,
          groupContact: 'tuesday@na-group.org',
          tags: ['Open', 'Discussion', 'Energetic']
        },
        {
          id: 'na-003',
          name: 'Midweek Recovery',
          program: 'NA',
          type: 'Literature Study',
          day: 'Wednesday',
          time: '18:00',
          timezone: 'PST',
          format: 'online',
          zoomUrl: 'https://zoom.us/j/444555666',
          description: 'Study of NA literature',
          hasProofOfAttendance: true,
          groupContact: 'midweek@na-group.org',
          tags: ['Literature', 'Study']
        },
        {
          id: 'na-004',
          name: 'Just for Today',
          program: 'NA',
          type: 'Meditation',
          day: 'Sunday',
          time: '10:00',
          timezone: 'PST',
          format: 'hybrid',
          zoomUrl: 'https://zoom.us/j/777888999',
          location: 'Recovery Center',
          address: '321 Elm St',
          description: 'Meditation and reflection meeting',
          hasProofOfAttendance: true,
          groupContact: 'meditation@na-group.org',
          tags: ['Meditation', 'Spiritual', 'Sunday']
        },

        // SMART Recovery Meetings
        {
          id: 'smart-001',
          name: 'SMART Tools Workshop',
          program: 'SMART',
          type: '4-Point Program',
          day: 'Monday',
          time: '18:00',
          timezone: 'PST',
          format: 'online',
          zoomUrl: 'https://zoom.us/j/101112131',
          description: 'Learn and practice SMART Recovery tools',
          hasProofOfAttendance: true,
          groupContact: 'tools@smart-recovery.org',
          tags: ['Tools', 'Workshop', 'CBT']
        },
        {
          id: 'smart-002',
          name: 'Motivation Building',
          program: 'SMART',
          type: 'Motivational Enhancement',
          day: 'Thursday',
          time: '19:00',
          timezone: 'PST',
          format: 'in-person',
          location: 'Health Center',
          address: '555 Health Way',
          description: 'Build and maintain motivation for change',
          hasProofOfAttendance: true,
          groupContact: 'motivation@smart-recovery.org',
          tags: ['Motivation', 'Change', 'Goal Setting']
        },
        {
          id: 'smart-003',
          name: 'Weekend Recovery Planning',
          program: 'SMART',
          type: 'DISARM & SMART Planning',
          day: 'Saturday',
          time: '14:00',
          timezone: 'PST',
          format: 'online',
          zoomUrl: 'https://zoom.us/j/141516171',
          description: 'Plan for challenging situations and urges',
          hasProofOfAttendance: true,
          groupContact: 'planning@smart-recovery.org',
          tags: ['Planning', 'DISARM', 'Weekend']
        },

        // Crystal Meth Anonymous (CMA)
        {
          id: 'cma-001',
          name: 'Crystal Clear',
          program: 'CMA',
          type: 'Open Meeting',
          day: 'Wednesday',
          time: '19:00',
          timezone: 'PST',
          format: 'online',
          zoomUrl: 'https://zoom.us/j/181920212',
          description: 'Support for crystal meth addiction recovery',
          hasProofOfAttendance: true,
          groupContact: 'clear@cma-group.org',
          tags: ['Open', 'Support']
        },

        // Overeaters Anonymous (OA)
        {
          id: 'oa-001',
          name: 'Food for Thought',
          program: 'OA',
          type: '12 Step Study',
          day: 'Tuesday',
          time: '18:00',
          timezone: 'PST',
          format: 'online',
          zoomUrl: 'https://zoom.us/j/222324252',
          description: '12 step approach to food addiction',
          hasProofOfAttendance: true,
          groupContact: 'food@oa-group.org',
          tags: ['12 Steps', 'Food Addiction']
        },

        // Gamblers Anonymous (GA)
        {
          id: 'ga-001',
          name: 'New Beginnings',
          program: 'GA',
          type: 'Open Discussion',
          day: 'Friday',
          time: '20:00',
          timezone: 'PST',
          format: 'in-person',
          location: 'Community Hall',
          address: '888 Recovery Rd',
          description: 'Support for gambling addiction recovery',
          hasProofOfAttendance: true,
          groupContact: 'newbeginnings@ga-group.org',
          tags: ['Gambling', 'Support', 'Open']
        }
      ];

      return {
        success: true,
        data: mockMeetings
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch AA meetings'
      };
    }
  },

  /**
   * Fetch meetings with proof of attendance capability only
   */
  async getProofOfAttendanceMeetings(): Promise<ApiResponse<AAMeeting[]>> {
    try {
      const allMeetingsResponse = await this.getAllMeetings();
      
      if (!allMeetingsResponse.success || !allMeetingsResponse.data) {
        return allMeetingsResponse;
      }

      const proofMeetings = allMeetingsResponse.data.filter(
        meeting => meeting.hasProofOfAttendance
      );

      return {
        success: true,
        data: proofMeetings
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch proof of attendance meetings'
      };
    }
  },

  /**
   * Organize meetings by program (AA, NA, SMART, etc.)
   */
  async getMeetingsByProgram(): Promise<ApiResponse<MeetingsByProgram>> {
    try {
      const allMeetingsResponse = await this.getProofOfAttendanceMeetings();
      if (!allMeetingsResponse.success || !allMeetingsResponse.data) {
        return {
          success: false,
          error: allMeetingsResponse.error || 'Failed to fetch meetings'
        };
      }

      const meetingsByProgram: MeetingsByProgram = {};
      
      allMeetingsResponse.data.forEach(meeting => {
        const program = meeting.program;
        if (!meetingsByProgram[program]) {
          meetingsByProgram[program] = [];
        }
        meetingsByProgram[program].push(meeting);
      });

      // Sort meetings within each program by day and time
      Object.keys(meetingsByProgram).forEach(program => {
        meetingsByProgram[program].sort((a, b) => {
          const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayA = dayOrder.indexOf(a.day);
          const dayB = dayOrder.indexOf(b.day);
          
          if (dayA !== dayB) {
            return dayA - dayB;
          }
          
          // If same day, sort by time
          return a.time.localeCompare(b.time);
        });
      });

      return {
        success: true,
        data: meetingsByProgram
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to organize meetings by program'
      };
    }
  },

  /**
   * Research the actual AA Intergroup API structure
   * TODO: Implement this to understand their data format
   */
  async investigateApiStructure(): Promise<void> {
    try {
      console.log('🔍 Investigating AA Intergroup API structure...');
      
      // Try to fetch their main meetings page to understand the structure
      const response = await fetch(`${AA_INTERGROUP_BASE_URL}/meetings/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/html',
          'User-Agent': 'ProofMeet-Integration/1.0'
        }
      });

      console.log('📊 AA Intergroup Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        console.log('📋 JSON Data Structure:', data);
      } else if (contentType?.includes('text/html')) {
        const html = await response.text();
        console.log('🌐 HTML Response (first 500 chars):', html.substring(0, 500));
        
        // Look for API endpoints or data structures in the HTML
        const apiMatches = html.match(/api[\/\w\-]*/gi);
        const jsonMatches = html.match(/\{[\s\S]*?\}/g);
        
        console.log('🔗 Potential API endpoints found:', apiMatches);
        console.log('📊 JSON structures found:', jsonMatches?.slice(0, 3));
      }

    } catch (error) {
      console.error('❌ Error investigating AA Intergroup API:', error);
    }
  }
};

export type { AAMeeting };

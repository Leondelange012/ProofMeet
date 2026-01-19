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
const generateComprehensiveMeetingData = (): AAMeeting[] => {
  const currentDate = new Date().toISOString();
  
  // Base meeting templates for different programs
  const meetingTemplates = {
    AA: [
      { name: 'Morning Reflections', type: 'Big Book Study', tags: ['Beginner Friendly', 'Meditation'] },
      { name: 'Serenity Circle', type: 'Open Discussion', tags: ['Open', 'Discussion'] },
      { name: 'Downtown Recovery', type: 'Speaker Meeting', tags: ['Speaker', 'In-Person'] },
      { name: 'Step Study Group', type: '12 Step Study', tags: ['12 Steps', 'Study'] },
      { name: 'Women\'s Circle', type: 'Women Only', tags: ['Women Only', 'Support'] },
      { name: 'Men\'s Group', type: 'Men Only', tags: ['Men Only', 'Support'] },
      { name: 'Young People\'s Meeting', type: 'Young People', tags: ['Young People', 'Under 30'] },
      { name: 'Newcomer\'s Welcome', type: 'Newcomer', tags: ['Newcomer', 'Beginner Friendly'] },
      { name: 'Book Study Circle', type: 'Literature Study', tags: ['Literature', 'Study'] },
      { name: 'Spiritual Awakening', type: 'Spiritual', tags: ['Spiritual', 'Meditation'] },
      { name: 'Living Sober', type: 'Topic Discussion', tags: ['Topic', 'Discussion'] },
      { name: 'Primary Purpose', type: 'Closed Meeting', tags: ['Closed', 'AA Members Only'] },
      { name: 'Happy Hour', type: 'Social', tags: ['Social', 'Fellowship'] },
      { name: 'Lunch Bunch', type: 'Open Discussion', tags: ['Lunch', 'Midday'] },
      { name: 'Candlelight Meeting', type: 'Meditation', tags: ['Meditation', 'Evening'] }
    ],
    NA: [
      { name: 'Clean and Serene', type: 'Basic Text Study', tags: ['Basic Text', 'Study'] },
      { name: 'Tuesday Night Live', type: 'Open Discussion', tags: ['Open', 'Discussion', 'Energetic'] },
      { name: 'Midweek Recovery', type: 'Literature Study', tags: ['Literature', 'Study'] },
      { name: 'Just for Today', type: 'Meditation', tags: ['Meditation', 'Spiritual'] },
      { name: 'Freedom from Bondage', type: 'Step Working', tags: ['Steps', 'Working'] },
      { name: 'New Life Group', type: 'Newcomer', tags: ['Newcomer', 'Welcome'] },
      { name: 'Spiritual Principles', type: 'Spiritual', tags: ['Spiritual', 'Principles'] },
      { name: 'Living Clean', type: 'Topic Discussion', tags: ['Topic', 'Living Clean'] }
    ],
    SMART: [
      { name: 'SMART Tools Workshop', type: '4-Point Program', tags: ['Tools', 'Workshop', 'CBT'] },
      { name: 'Motivation Building', type: 'Motivational Enhancement', tags: ['Motivation', 'Change', 'Goal Setting'] },
      { name: 'Weekend Recovery Planning', type: 'DISARM & SMART Planning', tags: ['Planning', 'DISARM', 'Weekend'] },
      { name: 'Change Planning', type: 'Change Plan', tags: ['Change Plan', 'Goals'] },
      { name: 'Urge Management', type: 'DISARM Training', tags: ['DISARM', 'Urge Management'] }
    ],
    CMA: [
      { name: 'Crystal Clear', type: 'Open Meeting', tags: ['Open', 'Support'] },
      { name: 'New Beginnings CMA', type: 'Newcomer', tags: ['Newcomer', 'Welcome'] },
      { name: 'Clean Slate', type: 'Discussion', tags: ['Discussion', 'Support'] }
    ],
    OA: [
      { name: 'Food for Thought', type: '12 Step Study', tags: ['12 Steps', 'Food Addiction'] },
      { name: 'Abstinence First', type: 'Abstinence', tags: ['Abstinence', 'Recovery'] },
      { name: 'Body Image Recovery', type: 'Topic Discussion', tags: ['Body Image', 'Self-Acceptance'] }
    ],
    GA: [
      { name: 'New Beginnings', type: 'Open Discussion', tags: ['Gambling', 'Support', 'Open'] },
      { name: 'Pressure Relief', type: 'Pressure Relief', tags: ['Financial', 'Pressure Relief'] },
      { name: 'Unity Group', type: 'Unity', tags: ['Unity', 'Fellowship'] }
    ]
  };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const times = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
  const formats: ('online' | 'in-person' | 'hybrid')[] = ['online', 'in-person', 'hybrid'];
  const locations = [
    'Community Center', 'St. Mary\'s Church', 'Unity Center', 'Recovery Center', 
    'Health Center', 'Community Hall', 'First Baptist Church', 'Methodist Church',
    'Jewish Community Center', 'YMCA', 'Library Meeting Room', 'Hospital Conference Room',
    'Treatment Center', 'Halfway House', 'Community College', 'Senior Center'
  ];
  const addresses = [
    '123 Main St', '456 Oak Ave', '789 Pine St', '321 Elm St', '555 Health Way',
    '888 Recovery Rd', '111 Hope Blvd', '222 Serenity Lane', '333 Unity Drive',
    '444 Freedom Ave', '666 Progress St', '777 Healing Way', '999 New Life Rd'
  ];

  const meetings: AAMeeting[] = [];
  let meetingId = 1;

  // Generate meetings for each program
  Object.entries(meetingTemplates).forEach(([program, templates]) => {
    templates.forEach((template) => {
      // Create multiple instances of each template across different days/times
      const instancesPerTemplate = program === 'AA' ? 4 : program === 'NA' ? 3 : 2;
      
      for (let instance = 0; instance < instancesPerTemplate; instance++) {
        const day = days[Math.floor(Math.random() * days.length)];
        const time = times[Math.floor(Math.random() * times.length)];
        const format = formats[Math.floor(Math.random() * formats.length)];
        const location = locations[Math.floor(Math.random() * locations.length)];
        const address = addresses[Math.floor(Math.random() * addresses.length)];
        
        // Create unique meeting name for multiple instances
        const meetingName = instancesPerTemplate > 1 && instance > 0 
          ? `${template.name} ${instance + 1}` 
          : template.name;

        const meeting: AAMeeting = {
          id: `${program.toLowerCase()}-${String(meetingId).padStart(3, '0')}`,
          name: meetingName,
          program: program as 'AA' | 'NA' | 'SMART' | 'CMA' | 'OA' | 'GA',
          type: template.type,
          day,
          time,
          timezone: 'PST',
          format,
          hasProofOfAttendance: true,
          groupContact: `${meetingName.toLowerCase().replace(/[^a-z0-9]/g, '')}@${program.toLowerCase()}-group.org`,
          tags: template.tags,
          lastUpdated: currentDate,
          description: `${template.type} meeting for ${program} recovery. ${format === 'online' ? 'Join us online for' : format === 'hybrid' ? 'Available both online and in-person for' : 'Meet in-person for'} fellowship and support.`
        };

        // Add format-specific details
        if (format === 'online' || format === 'hybrid') {
          meeting.zoomUrl = `https://zoom.us/j/${Math.floor(100000000 + Math.random() * 900000000)}`;
          meeting.zoomId = meeting.zoomUrl.split('/j/')[1];
          meeting.zoomPassword = ['recovery', 'serenity', 'unity', 'hope', 'faith'][Math.floor(Math.random() * 5)];
        }
        
        if (format === 'in-person' || format === 'hybrid') {
          meeting.location = location;
          meeting.address = `${address}, ${['Downtown', 'Midtown', 'Uptown', 'Westside', 'Eastside'][Math.floor(Math.random() * 5)]}`;
        }

        meetings.push(meeting);
        meetingId++;
      }
    });
  });

  return meetings;
};

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

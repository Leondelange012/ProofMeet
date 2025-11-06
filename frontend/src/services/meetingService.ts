import axios from 'axios';

// Types defined inline for deployment
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface Meeting {
  id: string;
  meetingId?: string; // For API responses
  title: string;
  description?: string;
  scheduledFor: string;
  duration: number;
  hostId: string;
  isActive: boolean;
  zoomMeetingId?: string;
  zoomJoinUrl?: string;
  zoomStartUrl?: string;
  joinUrl?: string; // Alternative name for join URL
  createdAt: string;
  updatedAt: string;
}

interface CreateMeetingRequest {
  title: string;
  description?: string;
  scheduledFor: string;
  duration: number;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://proofmeet-backend-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests (V2 compatible)
api.interceptors.request.use((config) => {
  // Try V2 auth first
  const tokenV2 = localStorage.getItem('proofmeet-auth-v2');
  if (tokenV2) {
    try {
      const authData = JSON.parse(tokenV2);
      if (authData.token) {
        config.headers.Authorization = `Bearer ${authData.token}`;
        return config;
      }
    } catch (e) {
      // Invalid token format, continue to fallback
    }
  }
  
  // Fallback to V1 auth for backward compatibility
  const tokenV1 = localStorage.getItem('proofmeet-auth');
  if (tokenV1) {
    try {
      const authData = JSON.parse(tokenV1);
      if (authData.state?.token) {
        config.headers.Authorization = `Bearer ${authData.state.token}`;
      }
    } catch (e) {
      // Invalid token format, ignore
    }
  }
  return config;
});

export const meetingService = {
  async createMeeting(data: CreateMeetingRequest): Promise<ApiResponse<Meeting>> {
    try {
      const response = await api.post('/meetings/create', data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create meeting',
      };
    }
  },

  async testZoomConnection(): Promise<ApiResponse<any>> {
    try {
      const response = await api.get('/zoom/test');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Zoom connection test failed',
      };
    }
  },

  async getMeetings(hostId: string, page = 1, limit = 10, status = 'active'): Promise<PaginatedResponse<Meeting>> {
    try {
      const response = await api.get(`/meetings/host/${hostId}`, {
        params: { page, limit, status },
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get meetings',
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }
  },

  async getAllMeetings(page = 1, limit = 20, status = 'active'): Promise<PaginatedResponse<Meeting>> {
    try {
      const response = await api.get('/meetings/all', {
        params: { page, limit, status },
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get all meetings',
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };
    }
  },

  async getMeeting(meetingId: string): Promise<ApiResponse<Meeting>> {
    try {
      const response = await api.get(`/meetings/${meetingId}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get meeting',
      };
    }
  },

  async deleteMeeting(meetingId: string): Promise<ApiResponse<void>> {
    try {
      const response = await api.delete(`/meetings/${meetingId}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete meeting',
      };
    }
  },

  async updateMeeting(meetingId: string, meetingData: Partial<CreateMeetingRequest>): Promise<ApiResponse<Meeting>> {
    try {
      const response = await api.put(`/meetings/${meetingId}`, meetingData);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update meeting',
      };
    }
  },

  async updateMeetingStatus(meetingId: string, isActive: boolean): Promise<ApiResponse<Meeting>> {
    try {
      const response = await api.patch(`/meetings/${meetingId}/status`, { isActive });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update meeting status',
      };
    }
  },
};

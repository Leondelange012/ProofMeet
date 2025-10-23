import axios from 'axios';

// ============================================
// TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type UserType = 'COURT_REP' | 'PARTICIPANT';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: UserType;
  
  // Court Rep specific
  courtName?: string;
  badgeNumber?: string;
  
  // Participant specific
  caseNumber?: string;
  courtRepId?: string;
  courtRep?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CourtRepRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  courtName?: string;
  badgeNumber?: string;
}

export interface ParticipantRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  caseNumber: string;
  courtRepEmail: string;
  phoneNumber?: string;
  isHost?: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ============================================
// API CONFIGURATION
// ============================================

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://proofmeet-backend-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('proofmeet-auth-v2');
  if (token) {
    try {
      const authData = JSON.parse(token);
      if (authData.token) {
        config.headers.Authorization = `Bearer ${authData.token}`;
      }
    } catch (e) {
      // Invalid token format, ignore
    }
  }
  return config;
});

// ============================================
// AUTH SERVICE
// ============================================

export const authServiceV2 = {
  /**
   * Register a Court Representative
   */
  async registerCourtRep(data: CourtRepRegisterRequest): Promise<ApiResponse<{ userId: string; email: string }>> {
    try {
      const response = await api.post('/auth/register/court-rep', data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed',
      };
    }
  },

  /**
   * Register a Participant
   */
  async registerParticipant(data: ParticipantRegisterRequest): Promise<ApiResponse<{ userId: string; email: string }>> {
    try {
      const response = await api.post('/auth/register/participant', data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed',
      };
    }
  },

  /**
   * Login (works for both Court Rep and Participant)
   */
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  },

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get user data',
      };
    }
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<ApiResponse> {
    try {
      const response = await api.get(`/auth/verify-email/${token}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Email verification failed',
      };
    }
  },
};


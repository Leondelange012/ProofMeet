import axios from 'axios';
import { ApiResponse, User, LoginRequest, RegisterRequest } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('proofmeet-auth');
  if (token) {
    const authData = JSON.parse(token);
    if (authData.state?.token) {
      config.headers.Authorization = `Bearer ${authData.state.token}`;
    }
  }
  return config;
});

export const authService = {
  async login(email: string): Promise<ApiResponse<{ token: string; user: User }>> {
    try {
      const response = await api.post('/auth/login', { email });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  },

  async register(data: RegisterRequest): Promise<ApiResponse<{ userId: string; email: string; courtId: string; state: string }>> {
    try {
      const response = await api.post('/auth/register', data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed',
      };
    }
  },

  async verifyUser(email: string, verified: boolean): Promise<ApiResponse> {
    try {
      const response = await api.post('/auth/verify', { email, verified });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Verification failed',
      };
    }
  },

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
};

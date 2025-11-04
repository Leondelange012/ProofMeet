/**
 * Participant Dashboard Page
 * Overview page with quick stats and navigation
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle,
  Refresh,
  MeetingRoom,
  TrendingUp,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStoreV2 } from '../hooks/useAuthStore-v2';
import { useWebSocketConnection, useWebSocketEvents } from '../hooks/useWebSocket';
import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://proofmeet-backend-production.up.railway.app/api';

const ParticipantDashboardPage: React.FC = () => {
  const { user, token } = useAuthStoreV2();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // WebSocket connection
  useWebSocketConnection();

  // WebSocket event listeners for real-time updates
  useWebSocketEvents([
    {
      event: 'meeting-started',
      callback: (data) => {
        console.log('🔔 Meeting started:', data);
        loadDashboard(true); // Background refresh
      },
    },
    {
      event: 'meeting-ended',
      callback: (data) => {
        console.log('🔔 Meeting ended:', data);
        loadDashboard(true); // Background refresh
      },
    },
    {
      event: 'attendance-updated',
      callback: (data) => {
        console.log('🔔 Attendance updated:', data);
        loadDashboard(true); // Background refresh
      },
    },
    {
      event: 'court-card-updated',
      callback: (data) => {
        console.log('🔔 Court card updated:', data);
        loadDashboard(true); // Background refresh
      },
    },
  ]);

  const loadDashboard = async (isBackgroundRefresh = false) => {
    try {
      if (isBackgroundRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const headers = { Authorization: `Bearer ${token}` };

      // Load dashboard data
      const response = await axios.get(`${API_BASE_URL}/participant/dashboard`, { headers });
      
      console.log('Dashboard response:', response.data);
      
      if (response.data.success) {
        setDashboardData(response.data.data);
        setLastUpdated(new Date());
      } else {
        setError(response.data.error || 'Failed to load dashboard');
      }
    } catch (err: any) {
      console.error('Load dashboard error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  // Initial load
  useEffect(() => {
    loadDashboard();

    // Check for success message from navigation state
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the state after showing
      window.history.replaceState({}, document.title);
    }
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard(true); // Background refresh
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const progress = dashboardData?.progress?.thisWeek;
  const requirements = dashboardData?.requirements;
  const recentAttendance = dashboardData?.recentMeetings || [];
  const progressPercentage = requirements?.meetingsPerWeek 
    ? Math.min((progress?.attended || 0) / requirements.meetingsPerWeek * 100, 100)
    : 0;

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Welcome, {user?.firstName}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track your meetings and stay compliant
          </Typography>
          {requirements?.courtName && requirements.courtName !== 'N/A' && (
            <Typography variant="body2" color="text.secondary">
              Court Representative: {requirements.courtName}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={refreshing ? <CircularProgress size={20} color="inherit" /> : <Refresh />}
            onClick={() => loadDashboard()}
            disabled={refreshing}
          >
            {refreshing ? 'Syncing...' : 'Refresh'}
          </Button>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Last updated: {lastUpdated.toLocaleTimeString()}
              {refreshing && ' • Refreshing...'}
            </Typography>
          )}
        </Box>
      </Box>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
          {location.state?.courtCard && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Court Card: <strong>{location.state.courtCard}</strong>
            </Typography>
          )}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Progress Card */}
      {requirements && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Your Progress This Week
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">
                  {progress?.attended || 0} of {requirements.meetingsPerWeek} meetings attended
                </Typography>
                <Chip
                  label={progress?.status || 'Not Started'}
                  color={
                    progress?.status === 'ON_TRACK' || progress?.status === 'COMPLIANT'
                      ? 'success'
                      : progress?.status === 'AT_RISK'
                      ? 'warning'
                      : progress?.status === 'BEHIND'
                      ? 'error'
                      : 'default'
                  }
                  size="small"
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={progressPercentage}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>

            {requirements.requiredPrograms && requirements.requiredPrograms.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                Required Programs: {requirements.requiredPrograms.join(', ')}
              </Typography>
            )}

            {progress?.averageAttendance && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Average Attendance: {progress.averageAttendance}%
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6}>
          <Card 
            elevation={1}
            sx={{ 
              height: '100%', 
              cursor: 'pointer',
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.2s ease',
              '&:hover': { 
                boxShadow: 4,
                borderColor: 'primary.main',
              }
            }} 
            onClick={() => navigate('/meetings')}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    backgroundColor: 'primary.light',
                    borderRadius: 2,
                    p: 1.5,
                    mr: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MeetingRoom sx={{ fontSize: 32, color: 'primary.main' }} />
                </Box>
                <Typography variant="h6" fontWeight="600" sx={{ flex: 1 }}>
                  Browse Meetings
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Find and join recovery meetings
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card 
            elevation={1}
            sx={{ 
              height: '100%', 
              cursor: 'pointer',
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.2s ease',
              '&:hover': { 
                boxShadow: 4,
                borderColor: 'success.main',
              }
            }} 
            onClick={() => navigate('/participant/progress')}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    backgroundColor: 'success.light',
                    borderRadius: 2,
                    p: 1.5,
                    mr: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUp sx={{ fontSize: 32, color: 'success.main' }} />
                </Box>
                <Typography variant="h6" fontWeight="600" sx={{ flex: 1 }}>
                  My Progress
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                View detailed attendance history
              </Typography>
            </CardContent>
          </Card>
        </Grid>

      </Grid>

      {/* Recent Activity Preview */}
      {recentAttendance.length > 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Recent Meetings</Typography>
              <Button 
                size="small" 
                onClick={() => navigate('/participant/progress')}
              >
                View All
              </Button>
            </Box>
            <Grid container spacing={2}>
              {recentAttendance.slice(0, 3).map((record: any) => (
                <Grid item xs={12} key={record.id}>
                  <Box 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'action.hover', 
                      borderRadius: 2,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {record.meetingName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(record.meetingDate).toLocaleDateString()} • {record.meetingProgram}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip 
                        label={`${record.attendancePercent || 0}%`}
                        size="small"
                        color={
                          Number(record.attendancePercent || 0) >= 90
                            ? 'success'
                            : Number(record.attendancePercent || 0) >= 75
                            ? 'warning'
                            : 'error'
                        }
                      />
                      {record.status === 'COMPLETED' && (
                        <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                      )}
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default ParticipantDashboardPage;

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
  Download,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStoreV2 } from '../hooks/useAuthStore-v2';
import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://proofmeet-backend-production.up.railway.app/api';

const ParticipantDashboardPage: React.FC = () => {
  const { user, token } = useAuthStoreV2();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');

      const headers = { Authorization: `Bearer ${token}` };

      // Load dashboard data
      const response = await axios.get(`${API_BASE_URL}/participant/dashboard`, { headers });
      
      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        setError(response.data.error || 'Failed to load dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCourtCard = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch the Court Card HTML with authentication
      const response = await axios.get(
        `${API_BASE_URL}/participant/my-court-card-pdf`,
        { 
          headers,
          responseType: 'blob'  // Get as blob
        }
      );

      // Create a blob URL and open it
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Clean up the blob URL after a short delay
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to download Court Card');
    }
  };

  useEffect(() => {
    loadDashboard();

    // Check for success message from navigation state
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the state after showing
      window.history.replaceState({}, document.title);
    }
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const progress = dashboardData?.thisWeek;
  const requirements = dashboardData?.requirements;
  const recentAttendance = dashboardData?.recentAttendance || [];
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
          {requirements?.courtName && (
            <Typography variant="body2" color="text.secondary">
              {requirements.courtName}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadDashboard}
        >
          Refresh
        </Button>
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
        <Grid item xs={12} sm={6} md={4}>
          <Card 
            sx={{ 
              height: '100%', 
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { 
                transform: 'translateY(-4px)',
                boxShadow: 4,
              } 
            }} 
            onClick={() => navigate('/meetings')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MeetingRoom sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Typography variant="h6">Browse Meetings</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Find and join recovery meetings
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card 
            sx={{ 
              height: '100%', 
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { 
                transform: 'translateY(-4px)',
                boxShadow: 4,
              } 
            }} 
            onClick={() => navigate('/participant/progress')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Typography variant="h6">My Progress</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                View detailed attendance history
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card 
            sx={{ 
              height: '100%', 
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { 
                transform: 'translateY(-4px)',
                boxShadow: 4,
              } 
            }} 
            onClick={handleDownloadCourtCard}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Download sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Typography variant="h6">Court Card</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Download compliance report
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

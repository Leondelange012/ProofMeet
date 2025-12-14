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
  CircularProgress,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  MeetingRoom,
  Visibility,
  Verified,
  Warning,
  Error,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStoreV2 } from '../hooks/useAuthStore-v2';
import { useWebSocketConnection, useWebSocketEvents } from '../hooks/useWebSocket';
import CourtCardViewer from '../components/CourtCardViewer';
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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedCourtCard, setSelectedCourtCard] = useState<{ attendanceId: string; cardNumber: string } | null>(null);

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
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      setError('');

      const headers = { Authorization: `Bearer ${token}` };

      // Load dashboard data
      const response = await axios.get(`${API_BASE_URL}/participant/dashboard`, { headers });
      
      console.log('Dashboard response:', response.data);
      
      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        setError(response.data.error || 'Failed to load dashboard');
      }
    } catch (err: any) {
      console.error('Load dashboard error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const openCourtCardViewer = (attendanceId: string, cardNumber: string) => {
    setSelectedCourtCard({ attendanceId, cardNumber });
    setViewerOpen(true);
  };

  const closeCourtCardViewer = () => {
    setViewerOpen(false);
    setSelectedCourtCard(null);
  };

  const getValidationStatusIcon = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <Verified sx={{ color: 'success.main', fontSize: 20 }} />;
      case 'FAILED':
        return <Error sx={{ color: 'error.main', fontSize: 20 }} />;
      case 'FLAGGED_FOR_REVIEW':
        return <Warning sx={{ color: 'warning.main', fontSize: 20 }} />;
      default:
        return null;
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

      </Grid>

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

      {/* Recent Meetings with Court Cards */}
      {recentAttendance.length > 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Recent Meetings & Court Cards</Typography>
            </Box>
            <Grid container spacing={2}>
              {recentAttendance.map((record: any) => (
                <Grid item xs={12} key={record.id}>
                  <Box 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'action.hover', 
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight="medium">
                          {record.meetingName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {new Date(record.meetingDate).toLocaleDateString()} • {record.meetingProgram}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Duration: {record.totalDurationMin || 0} minutes
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

                    {/* Court Card Section */}
                    {record.courtCard ? (
                      <Box 
                        sx={{ 
                          mt: 2, 
                          pt: 2, 
                          borderTop: '1px solid',
                          borderColor: 'divider',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getValidationStatusIcon(record.courtCard.validationStatus)}
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              Court Card: {record.courtCard.cardNumber}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              <Chip 
                                label={record.courtCard.validationStatus === 'PASSED' ? 'Compliant' : 'Non-Compliant'}
                                size="small"
                                color={record.courtCard.validationStatus === 'PASSED' ? 'success' : 'error'}
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                              <Chip 
                                label={record.courtCard.confidenceLevel}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                          </Box>
                        </Box>
                        <Tooltip title="View Court Card">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openCourtCardViewer(record.id, record.courtCard.cardNumber)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Box 
                        sx={{ 
                          mt: 2, 
                          pt: 2, 
                          borderTop: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                          {record.status === 'IN_PROGRESS' 
                            ? 'Meeting in progress - Court card will be generated upon completion' 
                            : 'Court card is being generated...'}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Court Card Viewer Modal */}
      {selectedCourtCard && (
        <CourtCardViewer
          open={viewerOpen}
          onClose={closeCourtCardViewer}
          attendanceId={selectedCourtCard.attendanceId}
          cardNumber={selectedCourtCard.cardNumber}
          token={token || ''}
        />
      )}
    </Container>
  );
};

export default ParticipantDashboardPage;

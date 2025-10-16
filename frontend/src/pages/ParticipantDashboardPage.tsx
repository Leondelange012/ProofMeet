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
  CalendarToday,
  Refresh,
  MeetingRoom,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStoreV2 } from '../hooks/useAuthStore-v2';
import axios from 'axios';
import { aaIntergroupService, AAMeeting } from '../services/aaIntergroupService';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://proofmeet-backend-production.up.railway.app/api';

const ParticipantDashboardPage: React.FC = () => {
  const { user, token } = useAuthStoreV2();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [availableMeetings, setAvailableMeetings] = useState<AAMeeting[]>([]);

  const [testMeetings, setTestMeetings] = useState<any[]>([]);
  const [joiningMeeting, setJoiningMeeting] = useState<string | null>(null);

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

      // Load available meetings (including test meetings)
      const meetingsResponse = await axios.get(`${API_BASE_URL}/participant/meetings/available`, { headers });
      if (meetingsResponse.data.success && meetingsResponse.data.data) {
        // Extract TEST meetings for quick join
        const allMeetings = meetingsResponse.data.data;
        if (allMeetings.TEST) {
          setTestMeetings(allMeetings.TEST);
        }
      }

      // Load AA meetings from intergroup service
      const aaMeetingsResponse = await aaIntergroupService.getAllMeetings();
      if (aaMeetingsResponse.success && aaMeetingsResponse.data) {
        setAvailableMeetings(aaMeetingsResponse.data.slice(0, 6));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = async (meetingId: string, meetingName: string, zoomUrl: string) => {
    try {
      setJoiningMeeting(meetingId);
      setError('');

      const headers = { Authorization: `Bearer ${token}` };

      // Start attendance tracking
      const response = await axios.post(
        `${API_BASE_URL}/participant/join-meeting`,
        {
          meetingId,
          joinMethod: 'ONLINE',
        },
        { headers }
      );

      if (response.data.success) {
        const { attendanceId } = response.data.data;

        // Open Zoom in new tab
        window.open(zoomUrl, '_blank');

        // Navigate to active meeting page
        navigate('/participant/active-meeting', {
          state: {
            attendanceId,
            meetingName,
            meetingUrl: zoomUrl,
          },
        });
      } else {
        setError(response.data.error || 'Failed to start meeting tracking');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join meeting');
    } finally {
      setJoiningMeeting(null);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const progress = dashboardData?.progress?.thisWeek;
  const requirements = dashboardData?.requirements;
  const progressPercentage = requirements?.meetingsPerWeek > 0
    ? Math.min((progress?.attended / requirements.meetingsPerWeek) * 100, 100)
    : 0;

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Welcome, {user?.firstName}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Case #{dashboardData?.participant?.caseNumber}
          </Typography>
          {dashboardData?.participant?.courtRep && (
            <Typography variant="body2" color="text.secondary">
              Officer: {dashboardData.participant.courtRep.name}
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
                    progress?.status === 'ON_TRACK'
                      ? 'success'
                      : progress?.status === 'AT_RISK'
                      ? 'warning'
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

      {/* Active Test Meetings (Court Rep Created) */}
      {testMeetings.length > 0 && (
        <Card sx={{ mb: 3, border: 2, borderColor: 'primary.main' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <MeetingRoom sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h6">🎥 Available Test Meetings</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Created by your Court Rep for compliance testing
                  </Typography>
                </Box>
              </Box>
              <Chip label="New" color="primary" size="small" />
            </Box>

            <Grid container spacing={2}>
              {testMeetings.map((meeting: any) => (
                <Grid item xs={12} key={meeting.id}>
                  <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" gutterBottom>
                            {meeting.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {meeting.dayOfWeek} at {meeting.time} {meeting.timezone && `(${meeting.timezone})`}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Duration: {meeting.durationMinutes} minutes
                          </Typography>
                          {meeting.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                              {meeting.description}
                            </Typography>
                          )}
                        </Box>
                        <Button
                          variant="contained"
                          color="primary"
                          size="large"
                          startIcon={joiningMeeting === meeting.id ? <CircularProgress size={20} color="inherit" /> : <MeetingRoom />}
                          onClick={() => handleJoinMeeting(meeting.id, meeting.name, meeting.zoomUrl)}
                          disabled={joiningMeeting === meeting.id}
                          sx={{ ml: 2 }}
                        >
                          {joiningMeeting === meeting.id ? 'Starting...' : 'Join Now'}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>📋 How it works:</strong> Click "Join Now" to start tracking. Keep the tracking page open during the meeting. Your attendance will be verified through Zoom.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6}>
          <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => navigate('/meetings')}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MeetingRoom sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Typography variant="h6">Browse All Meetings</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Find recovery meetings to attend
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => navigate('/participant/my-attendance')}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CalendarToday sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Typography variant="h6">My Attendance</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                View your attendance history
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Available Meetings */}
      {availableMeetings.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Available Recovery Meetings
              </Typography>
              <Button
                size="small"
                onClick={() => navigate('/meetings')}
                sx={{ textTransform: 'none' }}
              >
                View All
              </Button>
            </Box>
            <Grid container spacing={2}>
              {availableMeetings.map((meeting) => (
                <Grid item xs={12} md={6} key={meeting.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: 2,
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {meeting.name}
                        </Typography>
                        <Chip
                          label={meeting.program}
                          size="small"
                          color="primary"
                          sx={{ ml: 1 }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {meeting.type}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={meeting.format}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`${meeting.day} ${meeting.time}`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      {meeting.zoomUrl && (
                        <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
                          🔗 Online Meeting Available
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Recent Meetings */}
      {dashboardData?.recentMeetings && dashboardData.recentMeetings.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Meetings
            </Typography>
            {dashboardData.recentMeetings.map((meeting: any) => (
              <Box
                key={meeting.id}
                sx={{
                  p: 2,
                  mb: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body1">{meeting.meetingName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(meeting.date).toLocaleDateString()} • {meeting.duration} min
                    </Typography>
                  </Box>
                  <Chip
                    icon={<CheckCircle />}
                    label={`${meeting.attendancePercentage}%`}
                    color="success"
                    size="small"
                  />
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Requirements Set */}
      {!requirements && (
        <Alert severity="info" sx={{ mt: 3 }}>
          Your Court Representative hasn't set specific meeting requirements yet. You can still attend meetings and they will be tracked.
        </Alert>
      )}
    </Container>
  );
};

export default ParticipantDashboardPage;


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

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

const ParticipantDashboardPage: React.FC = () => {
  const { user, token } = useAuthStoreV2();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState<any>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');

      const headers = { Authorization: `Bearer ${token}` };

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

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6}>
          <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => navigate('/meetings')}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MeetingRoom sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Typography variant="h6">Browse Meetings</Typography>
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


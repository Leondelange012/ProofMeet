import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  MeetingRoom,
  Assessment,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { useAuthStore } from '../hooks/useAuthStore';

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Mock data - in real app, this would come from API
  const stats = {
    totalMeetings: 24,
    attendedMeetings: 22,
    complianceRate: 91.7,
    upcomingMeetings: 2,
    flaggedSessions: 1,
  };

  const recentMeetings = [
    {
      id: '1',
      type: 'AA',
      date: '2024-01-15',
      duration: 60,
      status: 'completed',
      compliance: 100,
    },
    {
      id: '2',
      type: 'NA',
      date: '2024-01-12',
      duration: 45,
      status: 'completed',
      compliance: 75,
    },
    {
      id: '3',
      type: 'SMART',
      date: '2024-01-10',
      duration: 60,
      status: 'flagged',
      compliance: 50,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'flagged':
        return 'error';
      default:
        return 'default';
    }
  };

  const getComplianceColor = (rate: number) => {
    if (rate >= 90) return 'success';
    if (rate >= 70) return 'warning';
    return 'error';
  };

  const handleJoinMeeting = () => {
    navigate('/meetings');
  };

  const handleViewCompliance = () => {
    navigate('/compliance');
  };

  const handleViewMeetingDetails = (meetingId: string) => {
    // For now, just navigate to meetings page
    // In a real app, this could open a details dialog or navigate to a specific meeting page
    navigate('/meetings');
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.email}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Court ID: {user?.courtId} | State: {user?.state}
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MeetingRoom color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Meetings</Typography>
              </Box>
              <Typography variant="h3">{stats.totalMeetings}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Attended</Typography>
              </Box>
              <Typography variant="h3">{stats.attendedMeetings}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Assessment color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Compliance</Typography>
              </Box>
              <Typography variant="h3">{stats.complianceRate}%</Typography>
              <LinearProgress
                variant="determinate"
                value={stats.complianceRate}
                color={getComplianceColor(stats.complianceRate)}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Warning color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Flags</Typography>
              </Box>
              <Typography variant="h3">{stats.flaggedSessions}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Meetings */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Recent Meetings
        </Typography>
        
        <Grid container spacing={2}>
          {recentMeetings.map((meeting) => (
            <Grid item xs={12} md={6} key={meeting.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6">{meeting.type}</Typography>
                    <Chip
                      label={meeting.status}
                      color={getStatusColor(meeting.status) as any}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {new Date(meeting.date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2">
                    Duration: {meeting.duration} minutes
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" gutterBottom>
                      Compliance: {meeting.compliance}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={meeting.compliance}
                      color={getComplianceColor(meeting.compliance)}
                    />
                  </Box>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small"
                    onClick={() => handleViewMeetingDetails(meeting.id)}
                  >
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Quick Actions */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            startIcon={<MeetingRoom />}
            onClick={handleJoinMeeting}
          >
            Join Meeting
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<Assessment />}
            onClick={handleViewCompliance}
          >
            View Compliance
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default DashboardPage;

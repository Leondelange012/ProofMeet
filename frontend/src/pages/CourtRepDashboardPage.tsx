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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  People,
  CheckCircle,
  Warning,
  TrendingUp,
  Refresh,
} from '@mui/icons-material';
import { useAuthStoreV2 } from '../hooks/useAuthStore-v2';
import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://proofmeet-backend-production.up.railway.app/api';

const CourtRepDashboardPage: React.FC = () => {
  const { user, token } = useAuthStoreV2();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');

      const headers = { Authorization: `Bearer ${token}` };

      // Load dashboard overview
      const dashboardRes = await axios.get(`${API_BASE_URL}/court-rep/dashboard`, { headers });
      if (dashboardRes.data.success) {
        setDashboardData(dashboardRes.data.data);
      }

      // Load participants
      const participantsRes = await axios.get(`${API_BASE_URL}/court-rep/participants`, {
        headers,
        params: { limit: 50 },
      });
      if (participantsRes.data.success) {
        setParticipants(participantsRes.data.data);
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

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Court Representative Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome, Officer {user?.lastName}
          </Typography>
          {user?.courtName && (
            <Typography variant="body2" color="text.secondary">
              {user.courtName}
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

      {/* Statistics Cards */}
      {dashboardData && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <People sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">{dashboardData.overview.totalParticipants}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Total Participants
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="h6">{dashboardData.overview.activeThisWeek}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Active This Week
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUp sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="h6">{dashboardData.overview.complianceRate}%</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Compliance Rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Warning sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography variant="h6">{dashboardData.alerts?.length || 0}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Alerts
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Participants List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Your Participants
          </Typography>

          {participants.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No participants registered yet.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Participants will appear here after they register with your email.
              </Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Case Number</TableCell>
                  <TableCell>This Week</TableCell>
                  <TableCell>Compliance</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {participants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell>
                      {participant.firstName} {participant.lastName}
                    </TableCell>
                    <TableCell>{participant.caseNumber}</TableCell>
                    <TableCell>
                      {participant.thisWeek.meetingsAttended}/{participant.thisWeek.meetingsRequired || 0}
                    </TableCell>
                    <TableCell>
                      {participant.thisWeek.averageAttendance}%
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={participant.thisWeek.status}
                        color={
                          participant.thisWeek.status === 'COMPLIANT'
                            ? 'success'
                            : participant.thisWeek.status === 'AT_RISK'
                            ? 'warning'
                            : 'error'
                        }
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            {dashboardData.recentActivity.map((activity: any) => (
              <Box
                key={activity.id}
                sx={{
                  p: 2,
                  mb: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body1">
                  {activity.participantName} completed "{activity.meetingName}"
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {activity.meetingProgram} • {activity.duration} min • {activity.attendancePercentage}% attendance
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default CourtRepDashboardPage;


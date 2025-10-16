/**
 * Participant Progress Page
 * Shows detailed attendance history and compliance tracking
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  TrendingUp,
  Refresh,
  CalendarToday,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStoreV2 } from '../hooks/useAuthStore-v2';
import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://proofmeet-backend-production.up.railway.app/api';

const ParticipantProgressPage: React.FC = () => {
  const { token } = useAuthStoreV2();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState<any>(null);

  const loadProgress = async () => {
    try {
      setLoading(true);
      setError('');

      const headers = { Authorization: `Bearer ${token}` };

      // Load dashboard data (includes progress info)
      const response = await axios.get(`${API_BASE_URL}/participant/dashboard`, { headers });
      
      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        setError(response.data.error || 'Failed to load progress data');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgress();
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
            My Progress & Attendance
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track your compliance and meeting history
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadProgress}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* This Week's Progress */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp /> This Week's Progress
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4">
                {progress?.attended || 0} / {requirements?.meetingsPerWeek || 0}
              </Typography>
              <Chip
                label={progress?.status || 'Not Started'}
                color={
                  progress?.status === 'ON_TRACK' || progress?.status === 'COMPLIANT'
                    ? 'success'
                    : progress?.status === 'AT_RISK'
                    ? 'warning'
                    : 'error'
                }
                icon={
                  progress?.status === 'ON_TRACK' || progress?.status === 'COMPLIANT' 
                    ? <CheckCircle /> 
                    : <Warning />
                }
              />
            </Box>

            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{ 
                height: 12, 
                borderRadius: 6,
                mb: 2,
              }}
            />

            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant="h5" color="primary">
                    {progress?.attended || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Meetings Attended
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant="h5" color="success.main">
                    {progress?.averageAttendance || 0}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Avg Attendance
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant="h5" color="text.primary">
                    {requirements?.meetingsPerWeek || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Required Weekly
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant="h5" color="secondary.main">
                    {Math.max((requirements?.meetingsPerWeek || 0) - (progress?.attended || 0), 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Remaining
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {requirements?.requiredPrograms && requirements.requiredPrograms.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Required Programs:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {requirements.requiredPrograms.map((program: string) => (
                  <Chip
                    key={program}
                    label={program}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Recent Attendance History */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarToday /> Recent Attendance History
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last {recentAttendance.length} meetings
            </Typography>
          </Box>

          {recentAttendance.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" gutterBottom>
                No attendance records yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Join a meeting to start building your compliance record
              </Typography>
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                onClick={() => navigate('/meetings')}
              >
                Browse Meetings
              </Button>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Meeting</TableCell>
                    <TableCell>Program</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Attendance</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentAttendance.map((record: any) => (
                    <TableRow key={record.id} hover>
                      <TableCell>
                        {new Date(record.meetingDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {record.meetingName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={record.meetingProgram}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {record.totalDurationMin ? `${record.totalDurationMin} min` : 'N/A'}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={record.status}
                          size="small"
                          color={
                            record.status === 'COMPLETED'
                              ? 'success'
                              : record.status === 'IN_PROGRESS'
                              ? 'info'
                              : 'default'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Requirements Card */}
      {requirements && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              My Court Requirements
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Meetings Per Week
                  </Typography>
                  <Typography variant="h5">
                    {requirements.meetingsPerWeek}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Minimum Attendance
                  </Typography>
                  <Typography variant="h5">
                    {requirements.minimumAttendancePercent}%
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {requirements.courtName && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', borderRadius: 2, borderLeft: 3, borderColor: 'info.main' }}>
                <Typography variant="caption" color="text.secondary">
                  Court
                </Typography>
                <Typography variant="body1">
                  {requirements.courtName}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default ParticipantProgressPage;


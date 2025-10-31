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
  IconButton,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  TrendingUp,
  Refresh,
  CalendarToday,
  Draw as SignatureIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStoreV2 } from '../hooks/useAuthStore-v2';
import { useWebSocketConnection, useWebSocketEvents } from '../hooks/useWebSocket';
import axios from 'axios';
import SignCourtCardDialog from '../components/SignCourtCardDialog';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://proofmeet-backend-production.up.railway.app/api';

const ParticipantProgressPage: React.FC = () => {
  const { token } = useAuthStoreV2();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Signing dialogs
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [selectedCourtCard, setSelectedCourtCard] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // WebSocket connection
  useWebSocketConnection();

  // WebSocket event listeners for real-time updates
  useWebSocketEvents([
    {
      event: 'meeting-started',
      callback: (data) => {
        console.log('🔔 Meeting started:', data);
        loadProgress(true); // Background refresh
      },
    },
    {
      event: 'meeting-ended',
      callback: (data) => {
        console.log('🔔 Meeting ended:', data);
        loadProgress(true); // Background refresh
      },
    },
    {
      event: 'attendance-updated',
      callback: (data) => {
        console.log('🔔 Attendance updated:', data);
        loadProgress(true); // Background refresh
      },
    },
    {
      event: 'court-card-updated',
      callback: (data) => {
        console.log('🔔 Court card updated:', data);
        loadProgress(true); // Background refresh
      },
    },
  ]);

  const loadProgress = async (isBackgroundRefresh = false) => {
    try {
      if (isBackgroundRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const headers = { Authorization: `Bearer ${token}` };

      // Load dashboard data (includes progress info)
      const response = await axios.get(`${API_BASE_URL}/participant/dashboard`, { headers });
      
      console.log('Progress data response:', response.data);
      
      if (response.data.success) {
        setDashboardData(response.data.data);
        setLastUpdated(new Date());
      } else {
        setError(response.data.error || 'Failed to load progress data');
      }
    } catch (err: any) {
      console.error('Load progress error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || err.message || 'Failed to load progress data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadProgress();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadProgress(true); // Background refresh
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [token]);

  const handleSignSuccess = () => {
    setSnackbar({
      open: true,
      message: 'Court card signed successfully!',
      severity: 'success',
    });
    loadProgress(); // Reload to show updated signature status
  };

  const openSignDialog = (courtCard: any) => {
    setSelectedCourtCard(courtCard);
    setSignDialogOpen(true);
  };

  const getSignatureStatus = (courtCard: any) => {
    if (!courtCard || !courtCard.courtCard) {
      return { participantSigned: false };
    }

    const signatures = courtCard.courtCard.signatures || [];
    const participantSigned = signatures.some((sig: any) => sig.signerRole === 'PARTICIPANT');

    return { participantSigned };
  };

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
            My Progress & Attendance
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track your compliance and meeting history
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={refreshing ? <CircularProgress size={20} color="inherit" /> : <Refresh />}
            onClick={() => loadProgress()}
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
                    Assigned Meetings
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
                    <TableCell>Signatures</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentAttendance.map((record: any) => {
                    const { participantSigned } = getSignatureStatus(record);
                    
                    return (
                    <TableRow key={record.id} hover>
                      <TableCell>
                        {new Date(record.date || record.meetingDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {record.meetingName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={record.meetingProgram || 'N/A'}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {record.duration || record.totalDurationMin ? `${record.duration || record.totalDurationMin} min` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${record.attendancePercentage || record.attendancePercent || 0}%`}
                          size="small"
                          color={
                            Number(record.attendancePercentage || record.attendancePercent || 0) >= 90
                              ? 'success'
                              : Number(record.attendancePercentage || record.attendancePercent || 0) >= 75
                              ? 'warning'
                              : 'error'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={record.validationStatus || record.status}
                          size="small"
                          color={
                            record.validationStatus === 'PASSED'
                              ? 'success'
                              : record.validationStatus === 'FAILED'
                              ? 'error'
                              : record.status === 'COMPLETED'
                              ? 'warning'
                              : record.status === 'IN_PROGRESS'
                              ? 'info'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={participantSigned ? <VerifiedIcon /> : undefined}
                          label={participantSigned ? 'You Signed' : 'Not Signed'}
                          size="small"
                          color={participantSigned ? 'success' : 'default'}
                          variant={participantSigned ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>
                        {record.status === 'COMPLETED' && record.courtCard && !participantSigned && (
                          <Tooltip title="Sign this court card">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => openSignDialog(record)}
                            >
                              <SignatureIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })}
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

      {/* Signing Dialogs */}
      {selectedCourtCard && (
        <SignCourtCardDialog
          open={signDialogOpen}
          courtCardId={selectedCourtCard.courtCard?.id || ''}
          courtCardNumber={selectedCourtCard.courtCard?.cardNumber || ''}
          onClose={() => setSignDialogOpen(false)}
          onSuccess={handleSignSuccess}
          token={token || ''}
        />
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ParticipantProgressPage;


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
  Collapse,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
} from '@mui/material';
import {
  People,
  CheckCircle,
  Warning,
  TrendingUp,
  Refresh,
  VideoCall,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';
import { useAuthStoreV2 } from '../hooks/useAuthStore-v2';
import { useWebSocketConnection, useWebSocketEvents } from '../hooks/useWebSocket';
import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://proofmeet-backend-production.up.railway.app/api';

const CourtRepDashboardPage: React.FC = () => {
  const { user, token } = useAuthStoreV2();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
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
      event: 'participant-joined',
      callback: (data) => {
        console.log('🔔 Participant joined:', data);
        loadDashboard(true); // Background refresh
      },
    },
    {
      event: 'participant-left',
      callback: (data) => {
        console.log('🔔 Participant left:', data);
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
  
  // Test meeting creation
  const [createMeetingOpen, setCreateMeetingOpen] = useState(false);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [meetingCreated, setMeetingCreated] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Meeting settings
  const [meetingSettings, setMeetingSettings] = useState({
    duration: 30,
    startInMinutes: 2,
    topic: '',
    startDateTime: '', // Custom date/time in YYYY-MM-DDTHH:MM format
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // User's local timezone
  });
  
  // Expandable participant rows
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);
  const [participantMeetings, setParticipantMeetings] = useState<{ [key: string]: any }>({});
  
  // Test meetings management
  const [testMeetings, setTestMeetings] = useState<any[]>([]);
  const [showTestMeetings, setShowTestMeetings] = useState(false);

  const loadDashboard = async (isBackgroundRefresh = false) => {
    try {
      if (isBackgroundRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const headers = { Authorization: `Bearer ${token}` };

      let dashSuccess = false;
      let partSuccess = false;

      // Load dashboard overview
      try {
        const dashboardRes = await axios.get(`${API_BASE_URL}/court-rep/dashboard`, { headers });
        if (dashboardRes.data.success) {
          setDashboardData(dashboardRes.data.data);
          dashSuccess = true;
        }
      } catch (dashError: any) {
        console.error('Dashboard overview error:', dashError);
        console.error('Dashboard error details:', dashError.response?.data);
        // Continue to load participants even if dashboard fails
      }

      // Load participants
      try {
        const participantsRes = await axios.get(`${API_BASE_URL}/court-rep/participants`, {
          headers,
          params: { limit: 50 },
        });
        if (participantsRes.data.success) {
          setParticipants(participantsRes.data.data);
          partSuccess = true;
        }
      } catch (partError: any) {
        console.error('Participants error:', partError);
        console.error('Participants error details:', partError.response?.data);
      }

      // If both failed, show error
      if (!dashSuccess && !partSuccess) {
        setError('Unable to load data. Please check the console and refresh the page.');
      } else {
        setLastUpdated(new Date());
      }
    } catch (err: any) {
      console.error('Load dashboard error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadDashboard();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard(true); // Background refresh
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [token]);

  const createTestMeeting = async () => {
    try {
      setCreatingMeeting(true);
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.post(
        `${API_BASE_URL}/court-rep/create-test-meeting`,
        {
          duration: meetingSettings.duration,
          startInMinutes: meetingSettings.startDateTime ? undefined : meetingSettings.startInMinutes,
          startDateTime: meetingSettings.startDateTime || undefined,
          timezone: meetingSettings.timezone,
          topic: meetingSettings.topic || undefined,
        },
        { headers }
      );

      if (response.data.success) {
        setMeetingCreated(response.data.data);
        setSnackbar({
          open: true,
          message: 'Test meeting created successfully!',
          severity: 'success',
        });
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to create test meeting',
        severity: 'error',
      });
    } finally {
      setCreatingMeeting(false);
    }
  };

  const loadParticipantMeetings = async (participantId: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(
        `${API_BASE_URL}/court-rep/participants/${participantId}/meetings`,
        { headers }
      );

      if (response.data.success) {
        setParticipantMeetings((prev: any) => ({
          ...prev,
          [participantId]: response.data.data,
        }));
      }
    } catch (err: any) {
      console.error('Failed to load participant meetings:', err);
    }
  };

  const toggleParticipantExpand = async (participantId: string) => {
    if (expandedParticipant === participantId) {
      setExpandedParticipant(null);
    } else {
      setExpandedParticipant(participantId);
      // Load meetings if not already loaded
      if (!participantMeetings[participantId]) {
        await loadParticipantMeetings(participantId);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSnackbar({
      open: true,
      message: 'Copied to clipboard!',
      severity: 'success',
    });
  };

  const downloadParticipantCourtCard = async (participantId: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch the Court Card HTML with authentication
      const response = await axios.get(
        `${API_BASE_URL}/court-rep/participant/${participantId}/court-card-pdf`,
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
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to download Court Card',
        severity: 'error',
      });
    }
  };

  const loadTestMeetings = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_BASE_URL}/court-rep/test-meetings`, { headers });
      
      if (response.data.success) {
        setTestMeetings(response.data.data.meetings);
      }
    } catch (error: any) {
      console.error('Failed to load test meetings:', error);
    }
  };

  const deleteTestMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to delete this test meeting? This will also delete all related attendance records.')) {
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.delete(`${API_BASE_URL}/court-rep/delete-meeting/${meetingId}`, { headers });
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Test meeting deleted successfully',
          severity: 'success',
        });
        loadTestMeetings(); // Reload the list
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to delete meeting',
        severity: 'error',
      });
    }
  };


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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<VideoCall />}
              onClick={() => setCreateMeetingOpen(true)}
            >
              Create Test Meeting
            </Button>
            <Button
              variant={showTestMeetings ? 'contained' : 'outlined'}
              color="secondary"
              onClick={() => {
                setShowTestMeetings(!showTestMeetings);
                if (!showTestMeetings) loadTestMeetings();
              }}
            >
              {showTestMeetings ? 'Hide' : 'Manage'} Test Meetings
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={refreshing ? <CircularProgress size={20} color="inherit" /> : <Refresh />}
              onClick={() => loadDashboard()}
              disabled={refreshing}
            >
              {refreshing ? 'Syncing...' : 'Sync Latest Data'}
            </Button>
          </Box>
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

      {/* Test Meetings Management */}
      {showTestMeetings && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Test Meetings ({testMeetings.length})</Typography>
              <Button size="small" startIcon={<Refresh />} onClick={loadTestMeetings}>
                Refresh List
              </Button>
            </Box>
            
            {testMeetings.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">No test meetings created yet</Typography>
              </Box>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Meeting Name</TableCell>
                      <TableCell>Zoom ID</TableCell>
                      <TableCell>Password</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {testMeetings.map((meeting: any) => (
                      <TableRow key={meeting.id}>
                        <TableCell>{meeting.name}</TableCell>
                        <TableCell>{meeting.zoomId}</TableCell>
                        <TableCell>{meeting.password}</TableCell>
                        <TableCell>{meeting.duration} min</TableCell>
                        <TableCell>{new Date(meeting.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => deleteTestMeeting(meeting.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </CardContent>
        </Card>
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
                  <TableCell />
                  <TableCell>Name</TableCell>
                  <TableCell>Case Number</TableCell>
                  <TableCell>This Week</TableCell>
                  <TableCell>Compliance</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {participants.map((participant: any) => (
                  <React.Fragment key={participant.id}>
                    <TableRow
                      hover
                      sx={{ cursor: 'pointer', '& > *': { borderBottom: 'unset' } }}
                      onClick={() => toggleParticipantExpand(participant.id)}
                    >
                      <TableCell>
                        <IconButton size="small">
                          {expandedParticipant === participant.id ? (
                            <KeyboardArrowUp />
                          ) : (
                            <KeyboardArrowDown />
                          )}
                        </IconButton>
                      </TableCell>
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
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                        <Collapse in={expandedParticipant === participant.id} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2 }}>
                            <Typography variant="h6" gutterBottom component="div">
                              Meeting History & Compliance Details
                            </Typography>
                            
                            {participantMeetings[participant.id] ? (
                              <>
                                {/* Summary Stats */}
                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                  <Grid item xs={3}>
                                    <Card variant="outlined">
                                      <CardContent>
                                        <Typography color="text.secondary" gutterBottom>
                                          Total Meetings
                                        </Typography>
                                        <Typography variant="h5">
                                          {participantMeetings[participant.id].summary.totalMeetings}
                                        </Typography>
                                      </CardContent>
                                    </Card>
                                  </Grid>
                                  <Grid item xs={3}>
                                    <Card variant="outlined">
                                      <CardContent>
                                        <Typography color="text.secondary" gutterBottom>
                                          Total Hours
                                        </Typography>
                                        <Typography variant="h5">
                                          {participantMeetings[participant.id].summary.totalHours}
                                        </Typography>
                                      </CardContent>
                                    </Card>
                                  </Grid>
                                  <Grid item xs={3}>
                                    <Card variant="outlined">
                                      <CardContent>
                                        <Typography color="text.secondary" gutterBottom>
                                          Avg Attendance
                                        </Typography>
                                        <Typography variant="h5">
                                          {participantMeetings[participant.id].summary.averageAttendance}%
                                        </Typography>
                                      </CardContent>
                                    </Card>
                                  </Grid>
                                  <Grid item xs={3}>
                                    <Card variant="outlined">
                                      <CardContent>
                                        <Typography color="text.secondary" gutterBottom>
                                          Completed
                                        </Typography>
                                        <Typography variant="h5">
                                          {participantMeetings[participant.id].summary.completedMeetings}
                                        </Typography>
                                      </CardContent>
                                    </Card>
                                  </Grid>
                                </Grid>

                                {/* Meeting Details Table */}
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Date</TableCell>
                                      <TableCell>Meeting</TableCell>
                                      <TableCell>Active/Idle</TableCell>
                                      <TableCell>Attendance</TableCell>
                                      <TableCell>Validation</TableCell>
                                      <TableCell>Court Card</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {participantMeetings[participant.id].meetings.map((meeting: any) => {
                                      const validationStatus = meeting.courtCard?.validationStatus || 'PENDING';
                                      const violations = meeting.courtCard?.violations || [];
                                      const criticalViolations = violations.filter((v: any) => v.severity === 'CRITICAL');
                                      const warningViolations = violations.filter((v: any) => v.severity === 'WARNING');
                                      const infoViolations = violations.filter((v: any) => v.severity === 'INFO');
                                      
                                      return (
                                        <TableRow 
                                          key={meeting.id}
                                          sx={{ 
                                            bgcolor: validationStatus === 'FAILED' ? 'error.lighter' : 'inherit',
                                          }}
                                        >
                                          <TableCell>
                                            {new Date(meeting.date).toLocaleDateString()}
                                          </TableCell>
                                          <TableCell>
                                            <Typography variant="body2">{meeting.meetingName}</Typography>
                                            <Chip label={meeting.meetingProgram} size="small" sx={{ mt: 0.5 }} />
                                          </TableCell>
                                          <TableCell>
                                            <Typography variant="caption" display="block" color="success.main">
                                              Active: {meeting.activeDuration || meeting.duration} min
                                            </Typography>
                                            {meeting.idleDuration > 0 && (
                                              <Typography variant="caption" display="block" color="warning.main">
                                                Idle: {meeting.idleDuration} min
                                              </Typography>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <Chip
                                              label={`${meeting.attendancePercent}%`}
                                              color={Number(meeting.attendancePercent) >= 90 ? 'success' : Number(meeting.attendancePercent) >= 80 ? 'warning' : 'error'}
                                              size="small"
                                            />
                                          </TableCell>
                                          <TableCell>
                                            <Box>
                                              <Chip
                                                label={validationStatus}
                                                color={validationStatus === 'PASSED' ? 'success' : validationStatus === 'FAILED' ? 'error' : 'default'}
                                                size="small"
                                              />
                                              
                                              {/* Critical Violations */}
                                              {criticalViolations.length > 0 && (
                                                <Box sx={{ mt: 1 }}>
                                                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                                                    CRITICAL:
                                                  </Typography>
                                                  {criticalViolations.map((v: any, idx: number) => (
                                                    <Typography key={idx} variant="caption" color="error" display="block">
                                                      • {v.message}
                                                    </Typography>
                                                  ))}
                                                </Box>
                                              )}
                                              
                                              {/* Warning Violations */}
                                              {warningViolations.length > 0 && (
                                                <Box sx={{ mt: 1 }}>
                                                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                                                    WARNINGS:
                                                  </Typography>
                                                  {warningViolations.map((v: any, idx: number) => (
                                                    <Typography key={idx} variant="caption" color="warning.main" display="block">
                                                      • {v.message}
                                                    </Typography>
                                                  ))}
                                                </Box>
                                              )}
                                              
                                              {/* Info - Good behavior */}
                                              {infoViolations.some((v: any) => v.type === 'GOOD_MONITORING') && (
                                                <Box sx={{ mt: 1 }}>
                                                  <Typography variant="caption" color="success.main" display="block">
                                                    ✓ Good monitoring behavior
                                                  </Typography>
                                                </Box>
                                              )}
                                            </Box>
                                          </TableCell>
                                          <TableCell>
                                            {meeting.courtCard ? (
                                              <Typography 
                                                variant="caption" 
                                                color="primary"
                                                sx={{ 
                                                  cursor: 'pointer',
                                                  textDecoration: 'underline',
                                                  '&:hover': { 
                                                    color: 'primary.dark',
                                                    fontWeight: 'bold'
                                                  }
                                                }}
                                                onClick={() => downloadParticipantCourtCard(participant.id)}
                                              >
                                                {meeting.courtCard.cardNumber}
                                              </Typography>
                                            ) : (
                                              <Typography variant="caption" color="text.secondary">
                                                N/A
                                              </Typography>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </>
                            ) : (
                              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                <CircularProgress size={30} />
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
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

      {/* Create Test Meeting Dialog */}
      <Dialog
        open={createMeetingOpen}
        onClose={() => {
          setCreateMeetingOpen(false);
          setMeetingCreated(null);
          setMeetingSettings({
            duration: 30,
            startInMinutes: 2,
            topic: '',
            startDateTime: '',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Test Zoom Meeting</DialogTitle>
        <DialogContent>
          {!meetingCreated ? (
            <>
              <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                Customize your test meeting settings:
              </Typography>
              
              <TextField
                fullWidth
                label="Meeting Topic (optional)"
                value={meetingSettings.topic}
                onChange={(e) => setMeetingSettings({ ...meetingSettings, topic: e.target.value })}
                margin="normal"
                helperText="Leave blank to use default topic"
              />
              
              <TextField
                fullWidth
                type="number"
                label="Duration (minutes)"
                value={meetingSettings.duration}
                onChange={(e) => setMeetingSettings({ ...meetingSettings, duration: parseInt(e.target.value) || 30 })}
                margin="normal"
                inputProps={{ min: 5, max: 120 }}
                helperText="Between 5 and 120 minutes"
              />
              
              <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                  Meeting Start Time
                </Typography>
                
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Specific Date & Time (Optional)"
                  value={meetingSettings.startDateTime}
                  onChange={(e) => setMeetingSettings({ ...meetingSettings, startDateTime: e.target.value })}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  helperText={meetingSettings.startDateTime ? "Using custom date/time" : "Or use quick start below"}
                />
                
                {!meetingSettings.startDateTime && (
                  <TextField
                    fullWidth
                    type="number"
                    label="Or Start in (minutes)"
                    value={meetingSettings.startInMinutes}
                    onChange={(e) => setMeetingSettings({ ...meetingSettings, startInMinutes: parseInt(e.target.value) || 2 })}
                    margin="normal"
                    inputProps={{ min: 1, max: 60 }}
                    helperText="How many minutes from now should the meeting start?"
                  />
                )}
                
                <TextField
                  fullWidth
                  label="Timezone"
                  value={meetingSettings.timezone}
                  onChange={(e) => setMeetingSettings({ ...meetingSettings, timezone: e.target.value })}
                  margin="normal"
                  select
                  SelectProps={{ native: true }}
                  helperText="Your local timezone is auto-detected"
                >
                  <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                    {Intl.DateTimeFormat().resolvedOptions().timeZone} (Local)
                  </option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                  <option value="America/Denver">America/Denver (MST/MDT)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                  <option value="America/Phoenix">America/Phoenix (MST - No DST)</option>
                  <option value="America/Anchorage">America/Anchorage (AKST/AKDT)</option>
                  <option value="Pacific/Honolulu">Pacific/Honolulu (HST)</option>
                  <option value="UTC">UTC</option>
                </TextField>
              </Box>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                The meeting will:
                <ul>
                  <li>
                    {meetingSettings.startDateTime 
                      ? `Start at ${new Date(meetingSettings.startDateTime).toLocaleString()}`
                      : `Start in ${meetingSettings.startInMinutes} minute${meetingSettings.startInMinutes !== 1 ? 's' : ''}`
                    }
                  </li>
                  <li>Last for {meetingSettings.duration} minutes</li>
                  <li>Be available for participants to join and track attendance</li>
                  <li>Generate court cards and compliance reports</li>
                </ul>
              </Alert>
            </>
          ) : (
            <Box>
              <Alert severity="success" sx={{ mb: 3 }}>
                Test meeting created successfully! Share the details below with participants.
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Meeting Topic"
                    value={meetingCreated.topic}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Join URL"
                    value={meetingCreated.joinUrl}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <Button
                          size="small"
                          onClick={() => copyToClipboard(meetingCreated.joinUrl)}
                        >
                          Copy
                        </Button>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Meeting Password"
                    value={meetingCreated.password}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Start Time"
                    value={new Date(meetingCreated.startTime).toLocaleString()}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Next Steps:
                    </Typography>
                    <Typography variant="body2" component="div">
                      1. Share the join URL with participants
                    </Typography>
                    <Typography variant="body2" component="div">
                      2. Have participants join the meeting
                    </Typography>
                    <Typography variant="body2" component="div">
                      3. Use the "Join Meeting" feature in the participant dashboard
                    </Typography>
                    <Typography variant="body2" component="div">
                      4. After the meeting, check compliance data here in the PO dashboard
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!meetingCreated ? (
            <>
              <Button onClick={() => setCreateMeetingOpen(false)}>Cancel</Button>
              <Button
                onClick={createTestMeeting}
                variant="contained"
                disabled={creatingMeeting}
                startIcon={creatingMeeting ? <CircularProgress size={20} /> : <VideoCall />}
              >
                {creatingMeeting ? 'Creating...' : 'Create Meeting'}
              </Button>
            </>
          ) : (
            <Button onClick={() => {
              setCreateMeetingOpen(false);
              setMeetingCreated(null);
              setMeetingSettings({
                duration: 30,
                startInMinutes: 2,
                topic: '',
                startDateTime: '',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              });
              loadDashboard(); // Refresh to show new meeting
            }} variant="contained">
              Done
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CourtRepDashboardPage;


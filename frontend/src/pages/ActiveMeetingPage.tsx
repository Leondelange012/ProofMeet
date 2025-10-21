/**
 * Active Meeting Page
 * Shows active meeting tracking status
 * Tracking is fully automatic via Zoom webhooks - no manual controls needed
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Alert,
  Chip,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  CheckCircle,
  VideoCall,
  Assessment,
  ExitToApp,
  CheckCircleOutline,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStoreV2 } from '../hooks/useAuthStore-v2';
import ActivityMonitor from '../components/ActivityMonitor';
import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://proofmeet-backend-production.up.railway.app/api';

const ActiveMeetingPage: React.FC = () => {
  const { token } = useAuthStoreV2();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Try to get from navigation state or sessionStorage
  const stateData = location.state || {};
  const [attendanceId] = useState<string>(
    stateData.attendanceId || sessionStorage.getItem('activeAttendanceId') || ''
  );
  const [meetingName] = useState<string>(
    stateData.meetingName || sessionStorage.getItem('activeMeetingName') || ''
  );
  const [meetingUrl] = useState<string>(
    stateData.meetingUrl || sessionStorage.getItem('activeMeetingUrl') || ''
  );
  
  // Leave meeting state
  const [leavingMeeting, setLeavingMeeting] = useState(false);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [leaveResult, setLeaveResult] = useState<any>(null);

  // Persist to sessionStorage when data changes
  useEffect(() => {
    if (attendanceId) {
      sessionStorage.setItem('activeAttendanceId', attendanceId);
      sessionStorage.setItem('activeMeetingName', meetingName);
      sessionStorage.setItem('activeMeetingUrl', meetingUrl);
    }
  }, [attendanceId, meetingName, meetingUrl]);

  // Clear session storage when component unmounts
  useEffect(() => {
    return () => {
      // Only clear if navigating away intentionally
      // Don't clear on refresh
    };
  }, []);

  // If no attendance ID after checking both sources, redirect
  useEffect(() => {
    if (!attendanceId) {
      navigate('/participant/dashboard');
    }
  }, [attendanceId, navigate]);

  const handleReturnToDashboard = () => {
    // Clear session storage
    sessionStorage.removeItem('activeAttendanceId');
    sessionStorage.removeItem('activeMeetingName');
    sessionStorage.removeItem('activeMeetingUrl');
    navigate('/participant/dashboard');
  };

  const handleLeaveMeeting = async () => {
    try {
      setLeavingMeeting(true);
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.post(
        `${API_BASE_URL}/participant/leave-meeting`,
        { attendanceId },
        { headers }
      );

      if (response.data.success) {
        setLeaveResult(response.data);
        setLeaveDialog(true);
        
        // Clear session storage
        sessionStorage.removeItem('activeAttendanceId');
        sessionStorage.removeItem('activeMeetingName');
        sessionStorage.removeItem('activeMeetingUrl');
      }
    } catch (error: any) {
      console.error('Leave meeting error:', error);
      alert(error.response?.data?.error || 'Failed to end meeting tracking');
    } finally {
      setLeavingMeeting(false);
    }
  };

  const handleCloseLeaveDialog = () => {
    setLeaveDialog(false);
    navigate('/participant/dashboard');
  };

  if (!attendanceId) {
    return null;
  }

  return (
    <Container maxWidth="md">
      {/* Activity Monitor - sends heartbeats while page is open */}
      <ActivityMonitor
        attendanceId={attendanceId}
        token={token!}
      />

      <Box sx={{ mt: 4 }}>
        {/* Header */}
        <Card sx={{ mb: 3, bgcolor: 'success.main', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h5" gutterBottom>
                  🎥 Meeting Tracking Active
                </Typography>
                <Typography variant="body1">
                  {meetingName || 'Active Meeting'}
                </Typography>
              </Box>
              <Chip
                icon={<CheckCircle />}
                label="Tracking Active"
                color="success"
                sx={{ bgcolor: 'white', color: 'success.main', fontWeight: 'bold' }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment /> How Tracking Works
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>✅ Fully Automatic via Zoom</strong>
              </Typography>
              <Typography variant="body2" component="div">
                • Your join time is recorded when you enter the Zoom meeting
                <br />
                • Your leave time is recorded when you exit the Zoom meeting
                <br />
                • Activity monitoring runs in this tab (keep it open)
                <br />
                • Everything is validated automatically - no manual actions needed!
              </Typography>
            </Alert>

            <Alert severity="success">
              <Typography variant="body2">
                <strong>What to do:</strong> Just attend your Zoom meeting normally. 
                Attendance is tracked via Zoom webhooks automatically.
              </Typography>
            </Alert>
          </CardContent>
        </Card>

        {/* Zoom Meeting Link */}
        {meetingUrl && (
          <Card sx={{ mb: 3, border: 2, borderColor: 'primary.main' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VideoCall /> Zoom Meeting
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Click below to join or return to your Zoom meeting:
              </Typography>
              <Button
                variant="contained"
                fullWidth
                size="large"
                href={meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<VideoCall />}
              >
                Open Zoom Meeting
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Important Instructions */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📋 Important
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Keep this tab open</strong> during the meeting for activity monitoring
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Attend the Zoom meeting</strong> with the same email you used to register ({token ? 'verified' : 'required'})
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Your attendance ends automatically</strong> when you leave the Zoom meeting
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Court Card will be generated</strong> automatically after the meeting
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Validation Information */}
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            <strong>⚖️ Attendance Validation:</strong>
          </Typography>
          <Typography variant="body2" component="div">
            • Must attend at least <strong>80% of the meeting duration</strong>
            <br />
            • Join/leave times verified via Zoom webhooks
            <br />
            • Activity monitoring provides supplementary evidence
            <br />
            • Court Card shows PASSED or FAILED based on validation
          </Typography>
        </Alert>

        {/* Leave Meeting Actions */}
        <Card sx={{ mb: 3, border: 2, borderColor: 'error.main' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ExitToApp /> End Meeting
            </Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Ready to leave?</strong>
              </Typography>
              <Typography variant="body2">
                Click the button below when you've left the Zoom meeting to immediately stop tracking and generate your Court Card.
              </Typography>
            </Alert>
            <Button
              variant="contained"
              color="error"
              fullWidth
              size="large"
              startIcon={leavingMeeting ? <CircularProgress size={20} color="inherit" /> : <ExitToApp />}
              onClick={handleLeaveMeeting}
              disabled={leavingMeeting}
            >
              {leavingMeeting ? 'Ending Tracking...' : 'I Have Left the Meeting - Stop Tracking'}
            </Button>
          </CardContent>
        </Card>

        {/* Return to Dashboard (without ending) */}
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You can safely return to your dashboard while the meeting is still ongoing. 
              Your tracking will continue via Zoom webhooks.
            </Typography>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleReturnToDashboard}
            >
              Return to Dashboard (Keep Tracking Active)
            </Button>
          </CardContent>
        </Card>
      </Box>

      {/* Leave Meeting Result Dialog */}
      <Dialog open={leaveDialog} onClose={handleCloseLeaveDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleOutline color="success" />
          Meeting Tracking Complete
        </DialogTitle>
        <DialogContent>
          {leaveResult && (
            <Box>
              <Alert 
                severity={
                  leaveResult.data.status === 'APPROVED' ? 'success' 
                  : leaveResult.data.status === 'REJECTED' ? 'error' 
                  : 'warning'
                }
                sx={{ mb: 2 }}
              >
                <Typography variant="body2" gutterBottom>
                  <strong>{leaveResult.message}</strong>
                </Typography>
              </Alert>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Duration
                  </Typography>
                  <Typography variant="h6">
                    {leaveResult.data.duration} min
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Attendance %
                  </Typography>
                  <Typography variant="h6">
                    {Math.round(leaveResult.data.attendancePercentage)}%
                  </Typography>
                </Grid>
                
                {leaveResult.data.courtCardNumber && (
                  <Grid item xs={12}>
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Court Card Number
                      </Typography>
                      <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                        {leaveResult.data.courtCardNumber}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {leaveResult.data.engagementLevel && (
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Engagement
                    </Typography>
                    <Typography variant="body1">
                      {leaveResult.data.engagementLevel}
                    </Typography>
                  </Grid>
                )}

                {leaveResult.data.status && (
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Chip 
                      label={leaveResult.data.status}
                      color={
                        leaveResult.data.status === 'APPROVED' ? 'success'
                        : leaveResult.data.status === 'REJECTED' ? 'error'
                        : 'warning'
                      }
                      size="small"
                    />
                  </Grid>
                )}
              </Grid>

              {leaveResult.data.flags && leaveResult.data.flags.length > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="caption" display="block" gutterBottom>
                    Notes:
                  </Typography>
                  {leaveResult.data.flags.map((flag: string, index: number) => (
                    <Typography key={index} variant="caption" display="block">
                      • {flag}
                    </Typography>
                  ))}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLeaveDialog} variant="contained" fullWidth>
            Return to Dashboard
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ActiveMeetingPage;

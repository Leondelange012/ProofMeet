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
} from '@mui/material';
import {
  CheckCircle,
  VideoCall,
  Assessment,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStoreV2 } from '../hooks/useAuthStore-v2';
import ActivityMonitor from '../components/ActivityMonitor';

const ActiveMeetingPage: React.FC = () => {
  const { token } = useAuthStoreV2();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Try to get from navigation state or sessionStorage
  const stateData = location.state || {};
  const [attendanceId, setAttendanceId] = useState<string>(
    stateData.attendanceId || sessionStorage.getItem('activeAttendanceId') || ''
  );
  const [meetingName, setMeetingName] = useState<string>(
    stateData.meetingName || sessionStorage.getItem('activeMeetingName') || ''
  );
  const [meetingUrl, setMeetingUrl] = useState<string>(
    stateData.meetingUrl || sessionStorage.getItem('activeMeetingUrl') || ''
  );

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

        {/* Return to Dashboard */}
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You can safely refresh this page - your tracking will continue.
              When you're done with the meeting, return to your dashboard:
            </Typography>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleReturnToDashboard}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default ActiveMeetingPage;

/**
 * Active Meeting Page
 * Shows active meeting tracking status
 * Tracking is FULLY AUTOMATIC via Zoom webhooks - NO manual controls
 * This page is informational only - participant cannot manually stop tracking
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
  Info,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import ActivityMonitor from '../components/ActivityMonitor';

const ActiveMeetingPage: React.FC = () => {
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
    // Don't clear session storage - tracking continues!
    // Just navigate back to dashboard
    navigate('/participant/dashboard');
  };

  if (!attendanceId) {
    return null;
  }

  return (
    <Container maxWidth="md">
      {/* Activity Monitor - ALWAYS ACTIVE */}
      <ActivityMonitor
        attendanceId={attendanceId}
        initialCameraStatus={true}
        initialAudioStatus={true}
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
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>✅ Fully Automatic - Zero Manual Actions Required!</strong>
              </Typography>
              <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                <strong>How it works:</strong>
                <br />
                • <strong>Join:</strong> Detected automatically when you enter Zoom
                <br />
                • <strong>Leave:</strong> Detected automatically when you exit Zoom
                <br />
                • <strong>Activity:</strong> Monitored passively while this tab is open
                <br />
                • <strong>Court Card:</strong> Generated automatically after meeting ends
                <br />
                <br />
                <strong>⚠️ Important:</strong> You cannot manually start or stop tracking. 
                This ensures accuracy and prevents tampering.
              </Typography>
            </Alert>

            <Alert severity="info">
              <Typography variant="body2">
                <strong>What to do:</strong> Simply attend your Zoom meeting as normal. 
                Everything else is handled by our secure webhook system.
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

        {/* Requirements & Validation */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Info /> Requirements & Validation
            </Typography>
            <Box component="ul" sx={{ pl: 2, mb: 0 }}>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Keep this tab open</strong> for supplementary activity monitoring
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Use the same email</strong> in Zoom as your ProofMeet registration
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Must attend 80%+</strong> of meeting duration to pass validation
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Join/leave times</strong> verified via secure Zoom webhooks
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Court Card</strong> generated automatically when you leave Zoom
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* No Manual Controls - Webhook Only */}
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            <strong>🔒 Secure Verification System</strong>
          </Typography>
          <Typography variant="body2">
            You cannot manually start or stop tracking. All attendance data comes directly from 
            Zoom's secure webhook system. This prevents tampering and ensures court-admissible accuracy.
          </Typography>
        </Alert>

        {/* Return to Dashboard */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 View Your Progress
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Return to your dashboard at any time. Your meeting tracking continues automatically 
              via Zoom webhooks - no need to keep this page open.
            </Typography>
            <Button
              variant="contained"
              fullWidth
              size="large"
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

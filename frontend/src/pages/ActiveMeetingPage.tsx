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
// WebcamSnapshotCapture disabled - conflicts with Zoom camera access

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
        {/* Webcam Snapshot Capture - DISABLED
            Reason: Camera can only be accessed by one app at a time.
            If ProofMeet captures webcam, Zoom cannot use it for video.
            Since Zoom webhooks are PRIMARY tracking, webcam snapshots are not needed.
        */}
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
                <strong>✅ Zoom-Based Tracking - Fully Automatic!</strong>
              </Typography>
              <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                <strong>How it works:</strong>
                <br />
                • <strong>Join:</strong> Zoom tells us when you enter the meeting
                <br />
                • <strong>Leave:</strong> Zoom tells us when you exit the meeting
                <br />
                • <strong>Duration:</strong> Calculated directly from Zoom timestamps
                <br />
                • <strong>Court Card:</strong> Generated automatically after meeting ends
                <br />
                <br />
                <strong>✨ New:</strong> You don't need to keep this page open! Tracking happens 
                entirely through Zoom webhooks. This page is optional for supplementary activity data only.
                <br />
                <br />
                <strong>📹 Camera:</strong> Your camera is free for Zoom! We don't capture webcam 
                snapshots to avoid conflicts with Zoom's video feature.
              </Typography>
            </Alert>

            <Alert severity="info">
              <Typography variant="body2">
                <strong>What to do:</strong> Simply attend your Zoom meeting as normal. 
                Your attendance is tracked directly by Zoom's secure webhook system.
                <br /><br />
                <strong>Note:</strong> You can close this page and return to your dashboard. 
                Tracking will continue automatically via Zoom.
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
                <strong>Use the same email</strong> in Zoom as your ProofMeet registration
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Must attend 80%+</strong> of meeting duration to pass validation
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>All tracking happens in Zoom</strong> - this page is optional
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

        {/* Zoom-Based Tracking Info */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            <strong>🔒 Zoom-Based Tracking</strong>
          </Typography>
          <Typography variant="body2">
            All attendance data comes directly from Zoom's secure webhook system. Your join time, 
            leave time, and duration are recorded automatically when you attend the Zoom meeting.
            This ensures court-admissible accuracy and prevents tampering.
          </Typography>
        </Alert>

        {/* Return to Dashboard */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 View Your Progress
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Return to your dashboard at any time. Your attendance is tracked entirely through 
              Zoom webhooks, so there's no need to keep this page open while in your meeting.
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

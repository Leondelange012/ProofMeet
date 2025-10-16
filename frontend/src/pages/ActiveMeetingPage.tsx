/**
 * Active Meeting Page
 * Shows active meeting tracking with completion button
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle,
  AccessTime,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStoreV2 } from '../hooks/useAuthStore-v2';
import ActivityMonitor from '../components/ActivityMonitor';

const ActiveMeetingPage: React.FC = () => {
  const { token } = useAuthStoreV2();
  const navigate = useNavigate();
  const location = useLocation();
  const { attendanceId, meetingName, meetingUrl } = location.state || {};

  const [error] = useState('');
  const [duration, setDuration] = useState(0);
  const [startTime] = useState(Date.now());

  // Update duration every second
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setDuration(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Format duration as HH:MM:SS
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Attendance is now fully automatic via Zoom webhooks
  // No manual completion needed!

  // If no attendance ID, redirect back
  useEffect(() => {
    if (!attendanceId) {
      navigate('/participant/dashboard');
    }
  }, [attendanceId, navigate]);

  if (!attendanceId) {
    return null;
  }

  return (
    <Container maxWidth="md">
      {/* Activity Monitor */}
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
                  🎥 Meeting In Progress
                </Typography>
                <Typography variant="body1">
                  {meetingName || 'Active Meeting'}
                </Typography>
              </Box>
              <Chip
                icon={<CheckCircle />}
                label="Tracking Active"
                color="success"
                sx={{ bgcolor: 'white', color: 'success.main' }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Duration Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ textAlign: 'center' }}>
              <AccessTime sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h3" gutterBottom sx={{ fontFamily: 'monospace' }}>
                {formatDuration(duration)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Meeting Duration
              </Typography>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Attendance Progress
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min((duration / 3600) * 100, 100)} // Assume 60 min meeting
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {duration >= 3600 ? 'Meeting goal reached!' : `${Math.floor((3600 - duration) / 60)} minutes to full hour`}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            <strong>What's Happening:</strong>
          </Typography>
          <Typography variant="body2" component="div">
            ✅ Your attendance is being tracked<br />
            ✅ Activity monitoring is active<br />
            ✅ Zoom participation is being verified<br />
            ✅ Stay active to maintain compliance
          </Typography>
        </Alert>

        {/* Zoom Link */}
        {meetingUrl && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Meeting Link
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                href={meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ mb: 1 }}
              >
                Open Zoom Meeting
              </Button>
              <Typography variant="caption" color="text.secondary">
                Keep this window open while attending the meeting
              </Typography>
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Automatic Completion Info */}
        <Card sx={{ bgcolor: 'success.lighter', border: 2, borderColor: 'success.main' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="success.dark">
              ✅ Fully Automatic Tracking
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Your attendance will be <strong>automatically recorded</strong> when you leave the Zoom meeting.
              No manual actions needed!
            </Typography>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>How it works:</strong>
                <br />
                • Zoom tracks your actual join/leave times
                <br />
                • Activity monitoring records your presence
                <br />
                • Court Card is auto-generated when you leave
                <br />
                • Compliance is automatically validated (80% rule)
                <br />
                • Your Court Rep receives automatic updates
              </Typography>
            </Alert>
          </CardContent>
        </Card>

        {/* Info */}
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="body2">
            ✨ <strong>Just attend the meeting!</strong> Everything else is tracked automatically via Zoom webhooks.
          </Typography>
        </Alert>
      </Box>
    </Container>
  );
};

export default ActiveMeetingPage;


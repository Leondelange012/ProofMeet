import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  QrCodeScanner,
  VideoCall,
  LocationOn,
  Schedule,
} from '@mui/icons-material';
import { useAuthStore } from '../hooks/useAuthStore';

const MeetingPage: React.FC = () => {
  const { user } = useAuthStore();
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [meetingId, setMeetingId] = useState('');
  const [meetings, setMeetings] = useState<any[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);

  // Load available meetings for participants
  useEffect(() => {
    loadAvailableMeetings();
  }, []);

  const loadAvailableMeetings = async () => {
    try {
      const { meetingService } = await import('../services/meetingService');
      // For participants, we'll load all active meetings (simplified for demo)
      // In a real system, this would be based on court assignments
      const response = await meetingService.getAllMeetings();
      if (response.success && response.data) {
        setMeetings(response.data);
      } else {
        // Fallback to static meetings if API fails
        setMeetings(staticMeetings);
      }
    } catch (error) {
      console.error('Failed to load meetings:', error);
      // Fallback to static meetings
      setMeetings(staticMeetings);
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  // Static fallback meetings
  const staticMeetings = [
    {
      id: '1',
      title: 'AA Meeting',
      format: 'online',
      scheduledFor: '2024-01-20T19:00:00Z',
      duration: 60,
      location: null,
      zoomJoinUrl: null,
      status: 'upcoming',
    },
    {
      id: '2', 
      title: 'NA Meeting',
      format: 'in-person',
      scheduledFor: '2024-01-22T18:00:00Z',
      duration: 45,
      location: 'Community Center, Room 101',
      zoomJoinUrl: null,
      status: 'upcoming',
    },
  ];

  const handleJoinOnlineMeeting = (zoomJoinUrl: string) => {
    // Use the full Zoom join URL
    window.open(zoomJoinUrl, '_blank');
  };

  const handleQrScan = () => {
    setQrScannerOpen(true);
  };

  const handleQrScannerClose = () => {
    setQrScannerOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'primary';
      case 'active':
        return 'success';
      case 'completed':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Meetings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Join online meetings or check in to in-person sessions
        </Typography>
      </Box>

      {/* Join Meeting by ID */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Join Meeting by ID
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="Meeting ID"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              variant="outlined"
              size="small"
            />
            <Button
              variant="contained"
              onClick={() => handleJoinOnlineMeeting(meetingId)}
              disabled={!meetingId}
            >
              Join
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Upcoming Meetings */}
      <Grid container spacing={3}>
        {meetings.map((meeting) => (
          <Grid item xs={12} md={6} key={meeting.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">{meeting.title || meeting.type}</Typography>
                  <Chip
                    label={meeting.isActive ? 'active' : (meeting.status || 'upcoming')}
                    color={getStatusColor(meeting.isActive ? 'active' : (meeting.status || 'upcoming')) as any}
                    size="small"
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Schedule sx={{ mr: 1, fontSize: 20 }} />
                  <Typography variant="body2">
                    {formatDateTime(meeting.scheduledFor || meeting.scheduledStart)}
                  </Typography>
                </Box>

                {meeting.format === 'online' ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <VideoCall sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="body2">Online Meeting</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LocationOn sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="body2">{meeting.location}</Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {meeting.zoomJoinUrl ? (
                    <Button
                      variant="contained"
                      startIcon={<VideoCall />}
                      onClick={() => handleJoinOnlineMeeting(meeting.zoomJoinUrl)}
                    >
                      Join Zoom Meeting
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      startIcon={<QrCodeScanner />}
                      onClick={handleQrScan}
                    >
                      Check In with QR
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* QR Scanner Dialog */}
      <Dialog open={qrScannerOpen} onClose={handleQrScannerClose} maxWidth="sm" fullWidth>
        <DialogTitle>Scan QR Code to Check In</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <QrCodeScanner sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Point your camera at the QR code displayed at the meeting location
            </Typography>
            {/* In real app, this would be a QR code scanner component */}
            <Box
              sx={{
                width: 200,
                height: 200,
                border: '2px dashed #ccc',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mt: 2,
                mx: 'auto',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                QR Scanner Placeholder
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleQrScannerClose}>Cancel</Button>
          <Button variant="contained" onClick={handleQrScannerClose}>
            Check In
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MeetingPage;

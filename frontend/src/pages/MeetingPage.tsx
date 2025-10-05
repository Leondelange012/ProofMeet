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
import { aaIntergroupService } from '../services/aaIntergroupService';

const MeetingPage: React.FC = () => {
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [meetingId, setMeetingId] = useState('');
  const [meetings, setMeetings] = useState<any[]>([]);


  // Load available meetings for participants
  useEffect(() => {
    loadAvailableMeetings();
  }, []);

  const loadAvailableMeetings = async () => {
    try {
      console.log('🔍 Loading available AA meetings...');
      
      const response = await aaIntergroupService.getProofOfAttendanceMeetings();
      if (response.success && response.data) {
        setMeetings(response.data);
        console.log(`✅ Loaded ${response.data.length} AA meetings available for attendance tracking`);
      } else {
        console.error('❌ Failed to load AA meetings:', response.error);
        setMeetings([]);
      }
    } catch (error) {
      console.error('❌ Failed to load AA meetings:', error);
      setMeetings([]);
    }
  };

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

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Available AA Meetings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Join court-approved AA meetings with proof of attendance capability.
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
                  <Typography variant="h6">{meeting.name}</Typography>
                  <Chip
                    label={meeting.type}
                    color="primary"
                    size="small"
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Schedule sx={{ mr: 1, fontSize: 20 }} />
                  <Typography variant="body2">
                    {meeting.day} at {meeting.time} ({meeting.timezone})
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
                    <Typography variant="body2">{meeting.location || meeting.address}</Typography>
                  </Box>
                )}

                {meeting.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {meeting.description}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {meeting.zoomUrl ? (
                    <Button
                      variant="contained"
                      startIcon={<VideoCall />}
                      onClick={() => handleJoinOnlineMeeting(meeting.zoomUrl)}
                    >
                      Join Meeting
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

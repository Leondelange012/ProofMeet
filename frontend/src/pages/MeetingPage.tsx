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
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  QrCodeScanner,
  VideoCall,
  LocationOn,
  Schedule,
  MeetingRoom,
} from '@mui/icons-material';
import { aaIntergroupService } from '../services/aaIntergroupService';
import axios from 'axios';
import { useAuthStoreV2 } from '../hooks/useAuthStore-v2';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://proofmeet-backend-production.up.railway.app/api';

const MeetingPage: React.FC = () => {
  const { token } = useAuthStoreV2();
  const navigate = useNavigate();
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [meetingId, setMeetingId] = useState('');
  const [meetingsByProgram, setMeetingsByProgram] = useState<{ [program: string]: any[] }>({});
  const [loading, setLoading] = useState(true);
  const [joiningMeeting, setJoiningMeeting] = useState<string | null>(null);
  const [error, setError] = useState('');


  // Load available meetings for participants
  useEffect(() => {
    loadAvailableMeetings();
  }, []);

  const loadAvailableMeetings = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading recovery meetings organized by program...');
      
      // Load from AA Intergroup Service
      const response = await aaIntergroupService.getMeetingsByProgram();
      let allMeetings: { [program: string]: any[] } = {};
      
      if (response.success && response.data) {
        allMeetings = { ...response.data };
      }

      // Load from backend API (includes test meetings)
      if (token) {
        try {
          const headers = { Authorization: `Bearer ${token}` };
          const backendResponse = await axios.get(`${API_BASE_URL}/participant/meetings/available`, { headers });
          
          if (backendResponse.data.success && backendResponse.data.data) {
            // Merge backend meetings with AA Intergroup meetings
              const backendMeetings = backendResponse.data.data as { [program: string]: any[] };
              Object.keys(backendMeetings).forEach((program: string) => {
                if (allMeetings[program]) {
                  allMeetings[program] = [...allMeetings[program], ...backendMeetings[program]];
                } else {
                  allMeetings[program] = backendMeetings[program];
                }
              });
          }
        } catch (error) {
          console.error('Failed to load backend meetings:', error);
        }
      }

      setMeetingsByProgram(allMeetings);
      const totalMeetings = Object.values(allMeetings).reduce((sum: number, meetings: any[]) => sum + meetings.length, 0);
      console.log(`✅ Loaded ${totalMeetings} meetings across ${Object.keys(allMeetings).length} programs`);
    } catch (error) {
      console.error('❌ Failed to load recovery meetings:', error);
      setMeetingsByProgram({});
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOnlineMeeting = (zoomJoinUrl: string) => {
    // Use the full Zoom join URL
    window.open(zoomJoinUrl, '_blank');
  };

  const handleJoinMeeting = async (meetingId: string, meetingName: string, zoomUrl: string) => {
    try {
      setJoiningMeeting(meetingId);
      setError('');

      const headers = { Authorization: `Bearer ${token}` };

      console.log('Joining meeting:', { meetingId, meetingName, zoomUrl });

      // Start attendance tracking
      const response = await axios.post(
        `${API_BASE_URL}/participant/join-meeting`,
        {
          meetingId,
          joinMethod: 'ONLINE',
        },
        { headers }
      );

      console.log('Join meeting response:', response.data);

      if (response.data.success) {
        const { attendanceId } = response.data.data;

        // Open Zoom in new tab
        window.open(zoomUrl, '_blank');

        // Navigate to active meeting page
        navigate('/participant/active-meeting', {
          state: {
            attendanceId,
            meetingName,
            meetingUrl: zoomUrl,
          },
        });
      } else {
        const errorMsg = response.data.error || 'Failed to start meeting tracking';
        console.error('Join meeting failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to join meeting';
      console.error('Join meeting error:', err);
      setError(errorMsg);
    } finally {
      setJoiningMeeting(null);
    }
  };

  const handleQrScan = () => {
    setQrScannerOpen(true);
  };

  const handleQrScannerClose = () => {
    setQrScannerOpen(false);
  };

  return (
    <Container maxWidth="lg">
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Recovery Meeting Directory
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Join court-approved recovery meetings with proof of attendance capability.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          {Object.keys(meetingsByProgram).length > 0 && (
            <>
              Showing {(Object.values(meetingsByProgram) as any[][]).reduce((sum: number, meetings: any[]) => sum + meetings.length, 0)} meetings 
              across {Object.keys(meetingsByProgram).length} recovery programs. 
              <Button 
                size="small" 
                onClick={loadAvailableMeetings}
                sx={{ ml: 1, textTransform: 'none' }}
              >
                🔄 Refresh
              </Button>
            </>
          )}
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMeetingId(e.target.value)}
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

      {/* Recovery Meetings by Program */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <Typography>Loading recovery meetings...</Typography>
        </Box>
      ) : (
        Object.keys(meetingsByProgram).map((program: string) => (
          <Box key={program} sx={{ mb: 4 }}>
            {/* Program Header */}
            <Typography variant="h5" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
              {program === 'AA' && '🔵 Alcoholics Anonymous (AA)'}
              {program === 'NA' && '🟢 Narcotics Anonymous (NA)'}
              {program === 'SMART' && '🟡 SMART Recovery'}
              {program === 'CMA' && '🟣 Crystal Meth Anonymous (CMA)'}
              {program === 'OA' && '🟠 Overeaters Anonymous (OA)'}
              {program === 'GA' && '🔴 Gamblers Anonymous (GA)'}
              {!['AA', 'NA', 'SMART', 'CMA', 'OA', 'GA'].includes(program) && `📋 ${program}`}
            </Typography>
            
            {/* Meetings Grid for this Program */}
            <Grid container spacing={3}>
              {meetingsByProgram[program].map((meeting: any) => (
                <Grid item xs={12} md={6} lg={4} key={meeting.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                          {meeting.name}
                        </Typography>
                        <Chip
                          label={meeting.type}
                          color="primary"
                          size="small"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Schedule sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {meeting.day} at {meeting.time} ({meeting.timezone})
                        </Typography>
                      </Box>

                      {meeting.format === 'online' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <VideoCall sx={{ mr: 1, fontSize: 18, color: 'success.main' }} />
                          <Typography variant="body2" color="success.main">
                            Online Meeting
                          </Typography>
                        </Box>
                      ) : meeting.format === 'hybrid' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <VideoCall sx={{ mr: 1, fontSize: 18, color: 'info.main' }} />
                          <Typography variant="body2" color="info.main">
                            Hybrid (Online + In-Person)
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <LocationOn sx={{ mr: 1, fontSize: 18, color: 'warning.main' }} />
                          <Typography variant="body2" color="warning.main">
                            {meeting.location || meeting.address}
                          </Typography>
                        </Box>
                      )}

                      {meeting.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.875rem' }}>
                          {meeting.description}
                        </Typography>
                      )}

                      {meeting.tags && meeting.tags.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                          {meeting.tags.map((tag: string, index: number) => (
                            <Chip
                              key={index}
                              label={tag}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: '20px' }}
                            />
                          ))}
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 'auto' }}>
                        {meeting.zoomUrl ? (
                          <>
                            {/* For test meetings or meetings with ProofMeet capability, use proper tracking */}
                            {(program === 'TEST' || meeting.hasProofCapability) ? (
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={joiningMeeting === meeting.id ? <CircularProgress size={16} color="inherit" /> : <MeetingRoom />}
                                onClick={() => handleJoinMeeting(meeting.id, meeting.name, meeting.zoomUrl)}
                                disabled={joiningMeeting === meeting.id}
                                sx={{ fontSize: '0.8rem' }}
                              >
                                {joiningMeeting === meeting.id ? 'Starting...' : 'Join Now'}
                              </Button>
                            ) : (
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<VideoCall />}
                                onClick={() => handleJoinOnlineMeeting(meeting.zoomUrl)}
                                sx={{ fontSize: '0.8rem' }}
                              >
                                Join Meeting
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<QrCodeScanner />}
                            onClick={handleQrScan}
                            sx={{ fontSize: '0.8rem' }}
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
          </Box>
        ))
      )}

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

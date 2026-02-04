import React, { useState, useEffect, useMemo } from 'react';
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
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Slider,
} from '@mui/material';
import {
  QrCodeScanner,
  VideoCall,
  LocationOn,
  Schedule,
  MeetingRoom,
  Home,
  Search,
  FilterList,
  Public,
  AccessTime,
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import axios from 'axios';
import { useAuthStoreV2 } from '../hooks/useAuthStore-v2';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://proofmeet-backend-production.up.railway.app/api';

// Common timezones list (fallback for older browsers)
const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
  'UTC',
];

const MeetingPage: React.FC = () => {
  const { token } = useAuthStoreV2();
  const navigate = useNavigate();
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [meetingId, setMeetingId] = useState('');
  const [meetingsByProgram, setMeetingsByProgram] = useState<{ [program: string]: any[] }>({});
  const [loading, setLoading] = useState(true);
  const [joiningMeeting, setJoiningMeeting] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  // Search/Filter State
  const [searchZoomId, setSearchZoomId] = useState('');
  const [debouncedSearchZoomId, setDebouncedSearchZoomId] = useState(''); // Debounced version for API calls
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [userTimezone, setUserTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [timeRange, setTimeRange] = useState<number[]>([0, 48]); // Time range slider [start, end] in 30-min intervals (0=00:00, 48=24:00/midnight)
  const [showAllMeetings, setShowAllMeetings] = useState(false);
  const [allAvailablePrograms, setAllAvailablePrograms] = useState<string[]>([]); // All programs from database

  // Debounce search input to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchZoomId(searchZoomId);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchZoomId]);

  // Calculate total meeting count for display
  const totalMeetings = useMemo(() => {
    return Object.values(meetingsByProgram).reduce(
      (sum: number, meetings: any[]) => sum + meetings.length,
      0
    );
  }, [meetingsByProgram]);

  // Use all available programs from database for dropdown (loaded separately)
  const availablePrograms = allAvailablePrograms;

  // Helper function to convert meeting time to user's timezone and get hour
  const getMeetingStartHourInTimezone = (meeting: any, timezone: string): number | null => {
    try {
      if (meeting.startTime) {
        // For test meetings with actual start times
        const meetingDate = new Date(meeting.startTime);
        const timeString = meetingDate.toLocaleString('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          hour12: false,
        });
        return parseInt(timeString, 10);
      } else if (meeting.time && meeting.timezone) {
        // For recurring meetings: parse time and convert timezone
        // meeting.time format: "7:00 PM" or "19:00"
        const timeMatch = meeting.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!timeMatch) return null;

        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const isPM = timeMatch[3]?.toUpperCase() === 'PM';
        const isAM = timeMatch[3]?.toUpperCase() === 'AM';

        // Convert to 24-hour format
        if (isPM && hours !== 12) hours += 12;
        if (isAM && hours === 12) hours = 0;

        // Create a date object in the meeting's timezone
        // Use today's date with the meeting time
        const today = new Date();
        const meetingDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
        
        // Parse in meeting's timezone and convert to user's timezone
        const meetingLocalTime = new Date(meetingDateStr + ' UTC'); // Simplified - assumes UTC for now
        const userTimeString = meetingLocalTime.toLocaleString('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          hour12: false,
        });
        return parseInt(userTimeString, 10);
      }
      return null;
    } catch (error) {
      console.error('Error converting meeting time:', error);
      return null;
    }
  };

  // Helper to convert slider value (0-48) to hours and minutes
  const sliderValueToTime = (value: number): { hours: number; minutes: number } => {
    const hours = Math.floor(value / 2);
    const minutes = (value % 2) * 30;
    return { hours, minutes };
  };

  // Helper to format slider value as time string
  const formatSliderValue = (value: number): string => {
    const { hours, minutes } = sliderValueToTime(value);
    // Display 24:00 as the end of day instead of 00:00
    if (value === 48) {
      return '24:00';
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Apply client-side time range filter (timezone-specific, done after server filtering)
  const displayMeetingsByProgram = useMemo(() => {
    const hasTimeFilter = timeRange[0] !== 0 || timeRange[1] !== 48;
    
    // Start with server-filtered results (already grouped by program)
    let resultByProgram = { ...meetingsByProgram };
    
    // Apply time range filter if needed (client-side only for timezone conversion)
    if (hasTimeFilter) {
      const filteredByProgram: { [key: string]: any[] } = {};
      
      Object.keys(resultByProgram).forEach(program => {
        const meetings = resultByProgram[program];
        const filtered = meetings.filter(m => {
          const meetingHour = getMeetingStartHourInTimezone(m, userTimezone);
          if (meetingHour === null) return true; // Include if we can't determine time

          // Convert meeting hour to comparable format (hour * 2 for 30-min intervals)
          // This maps 0-23 hours to 0-46 slider values (each hour = 2 intervals of 30min)
          const meetingValue = meetingHour * 2;
          
          const start = timeRange[0];
          const end = timeRange[1];

          // Handle wrap-around (e.g., 22:00 to 02:00)
          if (start <= end) {
            return meetingValue >= start && meetingValue <= end;
          } else {
            // Time range wraps around midnight
            return meetingValue >= start || meetingValue <= end;
          }
        });
        
        if (filtered.length > 0) {
          filteredByProgram[program] = filtered;
        }
      });
      
      return filteredByProgram;
    }
    
    return resultByProgram;
  }, [meetingsByProgram, timeRange, userTimezone]);

  // Calculate displayed meeting count after time filter
  const displayedMeetingCount = useMemo(() => {
    return Object.values(displayMeetingsByProgram).reduce(
      (sum: number, meetings: any[]) => sum + meetings.length,
      0
    );
  }, [displayMeetingsByProgram]);

  // Convert meeting time to user's timezone
  const convertToUserTimezone = (meeting: any): string => {
    if (meeting.startTime) {
      // For test meetings with actual start times
      const meetingDate = new Date(meeting.startTime);
      return meetingDate.toLocaleString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: userTimezone,
      });
    }
    // For recurring meetings
    return `${meeting.day} at ${meeting.time} (${meeting.timezone})`;
  };

  const clearFilters = () => {
    setSearchZoomId('');
    setSelectedProgram('');
    setSelectedDate(null);
    setTimeRange([0, 48]);
    setShowAllMeetings(false);
  };

  // Load all available programs for dropdown (runs once on mount)
  const loadAllPrograms = async () => {
    try {
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_BASE_URL}/participant/meetings/programs`, { headers });
      
      if (response.data.success && response.data.data) {
        setAllAvailablePrograms(response.data.data);
        console.log(`✅ Loaded ${response.data.data.length} available program categories`);
      }
    } catch (error) {
      console.error('❌ Failed to load programs:', error);
    }
  };

  // Load available meetings for participants with server-side filtering
  const loadAvailableMeetings = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading meetings from database...');
      
      if (!token) {
        setMeetingsByProgram({});
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // Build query parameters for server-side filtering
      const params = new URLSearchParams();
      
      // Add filters
      if (selectedProgram) {
        params.append('program', selectedProgram);
      }
      
      if (debouncedSearchZoomId.trim()) {
        // Remove spaces from Zoom ID search (e.g., "881 1306 9602" -> "88113069602")
        const cleanedZoomId = debouncedSearchZoomId.trim().replace(/\s+/g, '');
        params.append('zoomId', cleanedZoomId);
      }
      
      if (selectedDate) {
        const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
        params.append('day', dayName);
      }
      
      // Determine if we should apply limit
      const hasFilters = selectedProgram || debouncedSearchZoomId.trim() || selectedDate;
      if (!hasFilters && !showAllMeetings) {
        params.append('limit', '9'); // Only show 9 by default when no filters
      }
      
      const url = `${API_BASE_URL}/participant/meetings/available${params.toString() ? `?${params}` : ''}`;
      const backendResponse = await axios.get(url, { headers });
      
      if (backendResponse.data.success && backendResponse.data.data) {
        const backendMeetings = backendResponse.data.data as { [program: string]: any[] };
        setMeetingsByProgram(backendMeetings);
        
        const totalMeetings = Object.values(backendMeetings).reduce(
          (sum: number, meetings: any[]) => sum + meetings.length, 
          0
        );
        console.log(`✅ Loaded ${totalMeetings} meetings across ${Object.keys(backendMeetings).length} programs`);
      }
    } catch (error) {
      console.error('❌ Failed to load meetings:', error);
      setMeetingsByProgram({});
    } finally {
      setLoading(false);
    }
  };

  // Load all available programs on mount (runs once)
  useEffect(() => {
    loadAllPrograms();
  }, [token]);

  // Reload meetings when filters change (using debounced search)
  useEffect(() => {
    loadAvailableMeetings();
  }, [selectedProgram, debouncedSearchZoomId, selectedDate, showAllMeetings]);

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Tooltip title="Back to Dashboard">
            <IconButton
              onClick={() => navigate('/participant/dashboard')}
              color="primary"
              sx={{ 
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover',
                }
              }}
            >
              <Home />
            </IconButton>
          </Tooltip>
          <Typography variant="h4">
            Recovery Meeting Directory
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Join court-approved recovery meetings with proof of attendance capability.
        </Typography>
      </Box>

      {/* Search and Filter Section */}
      <Card sx={{ mb: 4, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <FilterList color="primary" />
          <Typography variant="h6">
            Search Meetings
          </Typography>
        </Box>
        
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {/* Zoom Meeting ID Search */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Zoom Meeting ID"
              placeholder="Search by ID..."
              value={searchZoomId}
              onChange={(e) => setSearchZoomId(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>

          {/* Timezone Selector */}
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              fullWidth
              options={COMMON_TIMEZONES}
              value={userTimezone}
              onChange={(_, newValue) => newValue && setUserTimezone(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Your Timezone"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <Public sx={{ mr: 1, color: 'text.secondary' }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          {/* Date Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Meeting Date"
                value={selectedDate}
                onChange={(newDate) => setSelectedDate(newDate)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                  actionBar: {
                    actions: ['clear', 'today'],
                  },
                }}
              />
            </LocalizationProvider>
          </Grid>

          {/* Program/Category Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedProgram}
                label="Category"
                onChange={(e) => setSelectedProgram(e.target.value)}
              >
                <MenuItem value="">
                  <em>All Categories</em>
                </MenuItem>
                {availablePrograms.map(program => (
                  <MenuItem key={program} value={program}>
                    {program}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Time Range Slider */}
          <Grid item xs={12}>
            <Box sx={{ px: 2, pt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccessTime sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Meeting Time: {formatSliderValue(timeRange[0])} - {formatSliderValue(timeRange[1])}
                  {timeRange[0] !== 0 || timeRange[1] !== 48 ? ` (${userTimezone.split('/')[1] || userTimezone})` : ' (All Day)'}
                </Typography>
              </Box>
              <Slider
                value={timeRange}
                onChange={(_, newValue) => setTimeRange(newValue as number[])}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => formatSliderValue(value)}
                min={0}
                max={48}
                step={1}
                marks={[
                  { value: 0, label: '00:00' },
                  { value: 12, label: '06:00' },
                  { value: 24, label: '12:00' },
                  { value: 36, label: '18:00' },
                  { value: 48, label: '24:00' },
                ]}
                sx={{ mt: 1 }}
              />
            </Box>
          </Grid>
        </Grid>

        {/* Filter Actions */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={clearFilters}
            disabled={!searchZoomId && !selectedProgram && !selectedDate && timeRange[0] === 0 && timeRange[1] === 48}
          >
            Clear Filters
          </Button>
          <Typography variant="body2" color="text.secondary">
            {displayedMeetingCount === 0
              ? 'No meetings found'
              : `Showing ${displayedMeetingCount} meeting${displayedMeetingCount !== 1 ? 's' : ''}`}
          </Typography>
          {!showAllMeetings && totalMeetings > 9 && displayedMeetingCount >= 9 && (
            <Button
              variant="text"
              size="small"
              onClick={() => setShowAllMeetings(true)}
            >
              Show All Meetings
            </Button>
          )}
        </Box>
      </Card>

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
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading meetings...</Typography>
        </Box>
      ) : displayedMeetingCount === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No meetings found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search criteria or clear filters to see all meetings.
          </Typography>
          <Button
            variant="outlined"
            onClick={clearFilters}
            sx={{ mt: 2 }}
          >
            Clear Filters
          </Button>
        </Card>
      ) : (
        Object.keys(displayMeetingsByProgram).map((program: string) => (
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
              {displayMeetingsByProgram[program].map((meeting: any) => (
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
                          {convertToUserTimezone(meeting)}
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

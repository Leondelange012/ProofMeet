import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  MeetingRoom,
  People,
  Add,
  Warning,
  QrCode,
  Delete,
  Edit,
  Visibility,
} from '@mui/icons-material';
import { useAuthStore } from '../hooks/useAuthStore';
import { aaIntergroupService } from '../services/aaIntergroupService';

const HostDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [createMeetingError, setCreateMeetingError] = useState<string | null>(null);
  const [createMeetingSuccess, setCreateMeetingSuccess] = useState<string | null>(null);
  
  // Meeting creation form state
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    description: '',
    scheduledFor: new Date(Date.now() + 60 * 60 * 1000), // Default to 1 hour from now
    duration: 60
  });

  // State for real meetings
  const [meetings, setMeetings] = useState<any[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);
  
  // State for meeting management
  const [editingMeeting, setEditingMeeting] = useState<any>(null);
  const [isDeletingMeeting, setIsDeletingMeeting] = useState(false);
  const [viewingMeeting, setViewingMeeting] = useState<any>(null);
  
  // Mock data - in real app, this would come from API
  const hostStats = {
    totalMeetings: meetings.length || 15,
    activeMeetings: meetings.filter(m => m.isActive).length || 2,
    totalParticipants: 45,
    pendingApprovals: 3,
  };

  // Load real meetings
  useEffect(() => {
    if (user?.id) {
      loadMeetings();
    }
  }, [user?.id]);

  const loadMeetings = async () => {
    try {
      setIsLoadingMeetings(true);
      console.log('🔍 Loading AA meetings from Intergroup...');
      
      const response = await aaIntergroupService.getProofOfAttendanceMeetings();
      if (response.success && response.data) {
        setMeetings(response.data);
        console.log(`✅ Loaded ${response.data.length} AA meetings with proof of attendance`);
      } else {
        console.error('❌ Failed to load AA meetings:', response.error);
        setMeetings([]);
      }
    } catch (error) {
      console.error('❌ Failed to load AA meetings:', error);
      setMeetings([]);
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) {
      return;
    }
    
    setIsDeletingMeeting(true);
    try {
      const { meetingService } = await import('../services/meetingService');
      const response = await meetingService.deleteMeeting(meetingId);
      if (response.success) {
        setMeetings(meetings.filter(m => m.id !== meetingId));
        setCreateMeetingSuccess('Meeting deleted successfully!');
        setTimeout(() => setCreateMeetingSuccess(null), 3000);
      } else {
        setCreateMeetingError(response.error || 'Failed to delete meeting');
      }
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      setCreateMeetingError('Failed to delete meeting');
    } finally {
      setIsDeletingMeeting(false);
    }
  };

  const handleEditMeeting = (meeting: any) => {
    setEditingMeeting(meeting);
    setMeetingForm({
      title: meeting.title,
      description: meeting.description || '',
      scheduledFor: new Date(meeting.scheduledFor),
      duration: meeting.duration
    });
    setOpenCreateDialog(true);
  };

  const handleViewMeetingDetails = (meeting: any) => {
    setViewingMeeting(meeting);
  };


  const pendingApprovals = [
    {
      id: '1',
      userId: 'user1',
      courtId: 'CA-12345',
      meetingId: 'meeting1',
      joinTime: '2024-01-20T19:05:00Z',
      leaveTime: '2024-01-20T19:55:00Z',
      duration: 50,
      attendancePercentage: 83.3,
      flags: ['late_entry'],
    },
    {
      id: '2',
      userId: 'user2',
      courtId: 'CA-12346',
      meetingId: 'meeting1',
      joinTime: '2024-01-20T19:00:00Z',
      leaveTime: '2024-01-20T20:00:00Z',
      duration: 60,
      attendancePercentage: 100,
      flags: [],
    },
    {
      id: '3',
      userId: 'user3',
      courtId: 'CA-12347',
      meetingId: 'meeting1',
      joinTime: '2024-01-20T19:10:00Z',
      leaveTime: '2024-01-20T19:30:00Z',
      duration: 20,
      attendancePercentage: 33.3,
      flags: ['late_entry', 'early_leave'],
    },
  ];

  const handleApproveAttendance = (attendance: any) => {
    setSelectedAttendance(attendance);
    setApprovalDialogOpen(true);
  };

  const handleApprovalSubmit = (approved: boolean, notes?: string) => {
    // In real app, this would call the API
    console.log('Approving attendance:', selectedAttendance?.id, approved, notes);
    setApprovalDialogOpen(false);
    setSelectedAttendance(null);
  };

  const handleGenerateQR = (meetingId: string) => {
    // In real app, this would generate a QR code for the meeting
    console.log('Generating QR code for meeting:', meetingId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'upcoming':
        return 'primary';
      case 'completed':
        return 'default';
      default:
        return 'default';
    }
  };

  const getFlagColor = (flag: string) => {
    switch (flag) {
      case 'late_entry':
        return 'warning';
      case 'early_leave':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleCreateMeeting = async () => {
    setIsCreatingMeeting(true);
    setCreateMeetingError(null);
    setCreateMeetingSuccess(null);

    try {
      // Import meetingService at the top of the file
      const { meetingService } = await import('../services/meetingService');
      
      const meetingData = {
        title: meetingForm.title,
        description: meetingForm.description,
        scheduledFor: meetingForm.scheduledFor.toISOString(),
        duration: meetingForm.duration
      };

      let response;
      if (editingMeeting) {
        // Update existing meeting
        response = await meetingService.updateMeeting(editingMeeting.id, meetingData);
      } else {
        // Create new meeting
        response = await meetingService.createMeeting(meetingData);
      }

      if (response.success) {
        if (editingMeeting) {
          setCreateMeetingSuccess(`Meeting "${meetingForm.title}" updated successfully!`);
          setMeetings(meetings.map(m => m.id === editingMeeting.id ? { ...m, ...meetingData } : m));
        } else {
          const joinUrl = response.data?.joinUrl || response.data?.zoomJoinUrl || 'No join URL available';
          setCreateMeetingSuccess(`Meeting "${meetingForm.title}" created successfully! Join URL: ${joinUrl}`);
          // Reload meetings to show the new one
          loadMeetings();
        }
        
        // Reset form and editing state
        setMeetingForm({
          title: '',
          description: '',
          scheduledFor: new Date(Date.now() + 60 * 60 * 1000),
          duration: 60
        });
        setEditingMeeting(null);
        
        // Close dialog after 10 seconds to allow copying the URL
        setTimeout(() => {
          setOpenCreateDialog(false);
          setCreateMeetingSuccess(null);
        }, 10000);
      } else {
        setCreateMeetingError(response.error || `Failed to ${editingMeeting ? 'update' : 'create'} meeting`);
      }
    } catch (error: any) {
      setCreateMeetingError(`Failed to ${editingMeeting ? 'update' : 'create'} meeting: ` + error.message);
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h4" gutterBottom>
            Meeting Monitor Dashboard
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={loadMeetings}
              disabled={isLoadingMeetings}
            >
              {isLoadingMeetings ? 'Loading...' : 'Refresh AA Meetings'}
            </Button>
          </Box>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Monitor participant attendance in AA meetings and verify compliance for court reporting.
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MeetingRoom color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">AA Meetings</Typography>
              </Box>
              <Typography variant="h3">{hostStats.totalMeetings}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <People color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Participants</Typography>
              </Box>
              <Typography variant="h3">{hostStats.totalAttendees}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MeetingRoom color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Active Now</Typography>
              </Box>
              <Typography variant="h3">{hostStats.activeMeetings}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Warning color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Pending Approvals</Typography>
              </Box>
              <Typography variant="h3">{hostStats.pendingApprovals}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Meetings */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Available AA Meetings
          </Typography>
          
          <Grid container spacing={2}>
            {meetings.map((meeting) => (
              <Grid item xs={12} md={6} key={meeting.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6">{meeting.title || meeting.type}</Typography>
                      <Chip
                        label={meeting.isActive ? 'active' : (meeting.status || 'upcoming')}
                        color={getStatusColor(meeting.isActive ? 'active' : (meeting.status || 'upcoming')) as any}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {new Date(meeting.scheduledFor || meeting.scheduledStart).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      Attendees: {meeting.attendees}
                    </Typography>
                    {meeting.location && (
                      <Typography variant="body2" color="text.secondary">
                        {meeting.location}
                      </Typography>
                    )}
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      {meeting.format === 'in-person' && (
                        <Button
                          size="small"
                          startIcon={<QrCode />}
                          onClick={() => handleGenerateQR(meeting.id)}
                        >
                          Generate QR
                        </Button>
                      )}
                      
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewMeetingDetails(meeting)}
                            color="primary"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Edit Meeting">
                          <IconButton
                            size="small"
                            onClick={() => handleEditMeeting(meeting)}
                            color="primary"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Delete Meeting">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteMeeting(meeting.id)}
                            disabled={isDeletingMeeting}
                            color="error"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Pending Approvals
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Court ID</TableCell>
                  <TableCell>Join Time</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell align="right">Attendance %</TableCell>
                  <TableCell>Flags</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingApprovals.map((attendance) => (
                  <TableRow key={attendance.id}>
                    <TableCell>{attendance.courtId}</TableCell>
                    <TableCell>
                      {new Date(attendance.joinTime).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>{attendance.duration} min</TableCell>
                    <TableCell align="right">
                      {attendance.attendancePercentage}%
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {attendance.flags.map((flag, index) => (
                          <Chip
                            key={index}
                            label={flag.replace('_', ' ')}
                            color={getFlagColor(flag) as any}
                            size="small"
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleApproveAttendance(attendance)}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Review Attendance</DialogTitle>
        <DialogContent>
          {selectedAttendance && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Court ID:</strong> {selectedAttendance.courtId}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Join Time:</strong> {new Date(selectedAttendance.joinTime).toLocaleString()}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Leave Time:</strong> {new Date(selectedAttendance.leaveTime).toLocaleString()}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Duration:</strong> {selectedAttendance.duration} minutes
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Attendance:</strong> {selectedAttendance.attendancePercentage}%
              </Typography>
              
              {selectedAttendance.flags.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Flags:</strong>
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {selectedAttendance.flags.map((flag: string, index: number) => (
                      <Chip
                        key={index}
                        label={flag.replace('_', ' ')}
                        color={getFlagColor(flag) as any}
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes (optional)"
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => handleApprovalSubmit(false)}
          >
            Reject
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => handleApprovalSubmit(true)}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Meeting Details Dialog */}
      <Dialog open={!!viewingMeeting} onClose={() => setViewingMeeting(null)} maxWidth="md" fullWidth>
        <DialogTitle>Meeting Details</DialogTitle>
        <DialogContent>
          {viewingMeeting && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Title:</strong>
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {viewingMeeting.title}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Status:</strong>
                  </Typography>
                  <Chip 
                    label={viewingMeeting.isActive ? 'Active' : 'Inactive'} 
                    color={viewingMeeting.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Scheduled Date:</strong>
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {new Date(viewingMeeting.scheduledFor).toLocaleString()}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Duration:</strong>
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {viewingMeeting.duration} minutes
                  </Typography>
                </Grid>

                {viewingMeeting.description && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Description:</strong>
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {viewingMeeting.description}
                    </Typography>
                  </Grid>
                )}

                {viewingMeeting.zoomJoinUrl && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Zoom Join URL:</strong>
                    </Typography>
                    <Typography variant="body1" gutterBottom sx={{ wordBreak: 'break-all' }}>
                      <a href={viewingMeeting.zoomJoinUrl} target="_blank" rel="noopener noreferrer">
                        {viewingMeeting.zoomJoinUrl}
                      </a>
                    </Typography>
                  </Grid>
                )}

                {viewingMeeting.meetingId && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Meeting ID:</strong>
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {viewingMeeting.meetingId}
                    </Typography>
                  </Grid>
                )}

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Created:</strong>
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {new Date(viewingMeeting.createdAt).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingMeeting(null)}>Close</Button>
          {viewingMeeting && (
            <>
              <Button 
                onClick={() => {
                  setViewingMeeting(null);
                  handleEditMeeting(viewingMeeting);
                }}
                startIcon={<Edit />}
              >
                Edit Meeting
              </Button>
              {viewingMeeting.zoomJoinUrl && (
                <Button 
                  variant="contained"
                  onClick={() => window.open(viewingMeeting.zoomJoinUrl, '_blank')}
                  startIcon={<MeetingRoom />}
                >
                  Join Meeting
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Create Meeting Dialog */}
      <Dialog open={openCreateDialog} onClose={() => {
        setOpenCreateDialog(false);
        setEditingMeeting(null);
        setMeetingForm({
          title: '',
          description: '',
          scheduledFor: new Date(Date.now() + 60 * 60 * 1000),
          duration: 60
        });
      }} maxWidth="md" fullWidth>
        <DialogTitle>{editingMeeting ? 'Edit Meeting' : 'Create New Meeting'}</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              {createMeetingError && (
                <Alert severity="error">{createMeetingError}</Alert>
              )}
              {createMeetingSuccess && (
                <Alert severity="success">{createMeetingSuccess}</Alert>
              )}
              
              <TextField
                fullWidth
                label="Meeting Title"
                value={meetingForm.title}
                onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                required
                placeholder="e.g., AA Meeting - Downtown Group"
              />
              
              <TextField
                fullWidth
                label="Description"
                value={meetingForm.description}
                onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
                multiline
                rows={3}
                placeholder="Meeting description or notes"
              />
              
              <DateTimePicker
                label="Scheduled Date & Time"
                value={meetingForm.scheduledFor}
                onChange={(newValue) => setMeetingForm({ ...meetingForm, scheduledFor: newValue || new Date() })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true
                  }
                }}
              />
              
              <TextField
                fullWidth
                label="Duration (minutes)"
                type="number"
                value={meetingForm.duration}
                onChange={(e) => setMeetingForm({ ...meetingForm, duration: parseInt(e.target.value) || 60 })}
                required
                inputProps={{ min: 15, max: 480 }}
              />
            </Box>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)} disabled={isCreatingMeeting}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateMeeting}
            disabled={isCreatingMeeting || !meetingForm.title}
            startIcon={isCreatingMeeting ? <CircularProgress size={20} /> : <Add />}
          >
            {isCreatingMeeting 
              ? (editingMeeting ? 'Updating...' : 'Creating...') 
              : (editingMeeting ? 'Update Meeting' : 'Create Meeting')
            }
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HostDashboardPage;

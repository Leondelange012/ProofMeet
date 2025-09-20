import React, { useState } from 'react';
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
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  MeetingRoom,
  People,
  Assessment,
  CheckCircle,
  Warning,
  QrCode,
} from '@mui/icons-material';

const HostDashboardPage: React.FC = () => {
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);

  // Mock data - in real app, this would come from API
  const hostStats = {
    totalMeetings: 15,
    activeMeetings: 2,
    totalAttendees: 45,
    pendingApprovals: 3,
  };

  const meetings = [
    {
      id: '1',
      type: 'AA',
      format: 'online',
      scheduledStart: '2024-01-20T19:00:00Z',
      scheduledEnd: '2024-01-20T20:00:00Z',
      attendees: 8,
      status: 'active',
    },
    {
      id: '2',
      type: 'NA',
      format: 'in-person',
      scheduledStart: '2024-01-22T18:00:00Z',
      scheduledEnd: '2024-01-22T19:00:00Z',
      location: 'Community Center, Room 101',
      attendees: 12,
      status: 'upcoming',
    },
  ];

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

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Host Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage meetings and approve attendance
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MeetingRoom color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Meetings</Typography>
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
                <Typography variant="h6">Total Attendees</Typography>
              </Box>
              <Typography variant="h3">{hostStats.totalAttendees}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Assessment color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Active Meetings</Typography>
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
            My Meetings
          </Typography>
          
          <Grid container spacing={2}>
            {meetings.map((meeting) => (
              <Grid item xs={12} md={6} key={meeting.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6">{meeting.type}</Typography>
                      <Chip
                        label={meeting.status}
                        color={getStatusColor(meeting.status) as any}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {new Date(meeting.scheduledStart).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      Attendees: {meeting.attendees}
                    </Typography>
                    {meeting.location && (
                      <Typography variant="body2" color="text.secondary">
                        {meeting.location}
                      </Typography>
                    )}
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      {meeting.format === 'in-person' && (
                        <Button
                          size="small"
                          startIcon={<QrCode />}
                          onClick={() => handleGenerateQR(meeting.id)}
                        >
                          Generate QR
                        </Button>
                      )}
                      <Button size="small" variant="outlined">
                        View Details
                      </Button>
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
    </Container>
  );
};

export default HostDashboardPage;

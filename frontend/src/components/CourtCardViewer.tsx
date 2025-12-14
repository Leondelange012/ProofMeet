/**
 * Court Card Viewer Component
 * Displays court card details in a modal with download option
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Close,
  Download,
  CheckCircle,
  Warning,
  Error,
  VideoCall,
  Assessment,
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://proofmeet-backend-production.up.railway.app/api';

interface CourtCardViewerProps {
  open: boolean;
  onClose: () => void;
  attendanceId: string;
  cardNumber: string;
  token: string;
}

const CourtCardViewer: React.FC<CourtCardViewerProps> = ({
  open,
  onClose,
  attendanceId,
  cardNumber,
  token,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cardData, setCardData] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open && attendanceId) {
      loadCourtCardData();
    }
  }, [open, attendanceId]);

  const loadCourtCardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(
        `${API_BASE_URL}/participant/attendance/${attendanceId}`,
        { headers }
      );

      if (response.data.success) {
        setCardData(response.data.data);
      } else {
        setError('Failed to load court card details');
      }
    } catch (err: any) {
      console.error('Load court card error:', err);
      setError(err.response?.data?.error || 'Failed to load court card');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      setDownloading(true);
      setError('');

      console.log('Downloading PDF for attendance:', attendanceId);

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(
        `${API_BASE_URL}/participant/court-card-pdf/${attendanceId}`,
        {
          headers,
          responseType: 'blob',
        }
      );

      console.log('PDF response received:', response.status, response.headers['content-type']);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CourtCard_${cardNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      console.log('PDF download initiated successfully');
    } catch (err: any) {
      console.error('Download error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        headers: err.response?.headers,
      });
      
      // Try to extract error message from blob if it's JSON
      let errorMessage = 'Failed to download PDF';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const jsonError = JSON.parse(text);
          errorMessage = jsonError.error || errorMessage;
        } catch (parseErr) {
          // Not JSON, use default message
        }
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setError(errorMessage);
    } finally {
      setDownloading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASSED':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'FLAGGED_FOR_REVIEW':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <CheckCircle color="success" />;
      case 'FAILED':
        return <Error color="error" />;
      case 'FLAGGED_FOR_REVIEW':
        return <Warning color="warning" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Court Card: {cardNumber}</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : cardData ? (
          <Box>
            {/* Status Header */}
            <Card sx={{ mb: 3, bgcolor: getStatusColor(cardData.courtCard?.validationStatus) + '.lighter' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {getStatusIcon(cardData.courtCard?.validationStatus)}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">
                      {cardData.courtCard?.validationStatus === 'PASSED' ? 'Compliant' : 'Non-Compliant'}
                    </Typography>
                  </Box>
                  <Chip
                    label={cardData.courtCard?.confidenceLevel || 'MEDIUM'}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Meeting Details */}
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VideoCall color="primary" />
              Meeting Information
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Meeting Name</Typography>
                <Typography variant="body1" fontWeight="medium">{cardData.meetingName}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Program</Typography>
                <Typography variant="body1" fontWeight="medium">{cardData.meetingProgram}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Date</Typography>
                <Typography variant="body1">{new Date(cardData.meetingDate).toLocaleDateString()}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Scheduled Duration</Typography>
                <Typography variant="body1">{cardData.courtCard?.meetingDurationMin || 0} minutes</Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Attendance Metrics */}
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment color="primary" />
              Attendance Metrics
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Join Time</Typography>
                <Typography variant="body1">{new Date(cardData.joinTime).toLocaleTimeString()}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Leave Time</Typography>
                <Typography variant="body1">
                  {cardData.leaveTime ? new Date(cardData.leaveTime).toLocaleTimeString() : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Total Duration</Typography>
                <Typography variant="h5" color="primary.main">
                  {cardData.totalDurationMin || 0} minutes
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Attendance Rate</Typography>
                <Typography variant="h5" color={Number(cardData.attendancePercent) >= 80 ? 'success.main' : 'error.main'}>
                  {Number(cardData.attendancePercent || 0).toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Active Time</Typography>
                <Typography variant="body1">{cardData.activeDurationMin || 0} minutes</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Idle Time</Typography>
                <Typography variant="body1">{cardData.idleDurationMin || 0} minutes</Typography>
              </Grid>
            </Grid>

            {/* Violations (if any) */}
            {cardData.courtCard?.violations && (cardData.courtCard.violations as any[]).length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom color="error">
                  Violations
                </Typography>
                <List dense>
                  {(cardData.courtCard.violations as any[]).map((violation: any, index: number) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {violation.severity === 'CRITICAL' ? (
                          <Error color="error" />
                        ) : (
                          <Warning color="warning" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={violation.type?.replace(/_/g, ' ')}
                        secondary={violation.message}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {/* Verification Details */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" align="center">
              Generated on {cardData.courtCard?.generatedAt ? new Date(cardData.courtCard.generatedAt).toLocaleString() : 'N/A'}
            </Typography>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          startIcon={downloading ? <CircularProgress size={20} /> : <Download />}
          onClick={downloadPDF}
          disabled={downloading || loading || !!error}
        >
          {downloading ? 'Downloading...' : 'Download PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CourtCardViewer;


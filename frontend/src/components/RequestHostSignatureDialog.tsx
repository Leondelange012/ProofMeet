/**
 * Request Host Signature Dialog
 * Allows participant to request meeting host to sign their court card
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Email as EmailIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://proofmeet-backend-production.up.railway.app/api';

interface RequestHostSignatureDialogProps {
  open: boolean;
  attendanceRecordId: string;
  meetingName: string;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}

export const RequestHostSignatureDialog: React.FC<RequestHostSignatureDialogProps> = ({
  open,
  attendanceRecordId,
  meetingName,
  onClose,
  onSuccess,
  token,
}) => {
  const [hostEmail, setHostEmail] = useState('');
  const [hostName, setHostName] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRequest = async () => {
    if (!hostEmail) {
      setError('Host email is required');
      return;
    }

    if (!hostEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setRequesting(true);
      setError('');

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(
        `${API_BASE_URL}/verification/request-host-signature/${attendanceRecordId}`,
        {
          hostEmail,
          hostName: hostName || undefined,
        },
        { headers }
      );

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      }
    } catch (err: any) {
      console.error('Request host signature error:', err);
      setError(err.response?.data?.error || 'Failed to send request');
    } finally {
      setRequesting(false);
    }
  };

  const handleClose = () => {
    setHostEmail('');
    setHostName('');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EmailIcon /> Request Host Signature
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Request the meeting host or team leader to verify your attendance at <strong>{meetingName}</strong>.
          </Alert>

          {success ? (
            <Alert severity="success">
              Request sent successfully! The host will receive an email with a link to sign your court card.
            </Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                The meeting host will receive an email with a unique verification link. They can review your
                attendance details and provide their digital signature to confirm you attended.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                type="email"
                label="Host Email Address"
                value={hostEmail}
                onChange={(e) => setHostEmail(e.target.value)}
                placeholder="host@aa-meeting.org"
                required
                disabled={requesting}
                sx={{ mb: 2 }}
                helperText="Email address of the meeting host or team leader"
              />

              <TextField
                fullWidth
                label="Host Name (Optional)"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="John Smith"
                disabled={requesting}
                helperText="If you know the host's name, enter it here"
              />
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={requesting}>
          {success ? 'Close' : 'Cancel'}
        </Button>
        {!success && (
          <Button
            variant="contained"
            onClick={handleRequest}
            disabled={requesting || !hostEmail}
            startIcon={requesting ? <CircularProgress size={20} /> : <EmailIcon />}
          >
            {requesting ? 'Sending...' : 'Send Request'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default RequestHostSignatureDialog;


/**
 * Sign Court Card Dialog
 * Allows participant to digitally sign their court card with password verification
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
import { Draw as SignatureIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://proofmeet-backend-production.up.railway.app/api';

interface SignCourtCardDialogProps {
  open: boolean;
  courtCardId: string;
  courtCardNumber: string;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}

export const SignCourtCardDialog: React.FC<SignCourtCardDialogProps> = ({
  open,
  courtCardId,
  courtCardNumber,
  onClose,
  onSuccess,
  token,
}) => {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  const handleSign = async () => {
    if (!password) {
      setError('Password is required');
      return;
    }

    try {
      setSigning(true);
      setError('');

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(
        `${API_BASE_URL}/participant/sign-court-card/${courtCardId}`,
        {
          password,
          confirmText: confirmText || undefined,
        },
        { headers }
      );

      if (response.data.success) {
        onSuccess();
        handleClose();
      }
    } catch (err: any) {
      console.error('Sign court card error:', err);
      setError(err.response?.data?.error || 'Failed to sign court card');
    } finally {
      setSigning(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmText('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SignatureIcon /> Sign Court Card
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            You are about to digitally sign court card <strong>{courtCardNumber}</strong>.
            This confirms that you attended the meeting and that the attendance record is accurate.
          </Alert>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            <strong>By signing, you attest that:</strong>
            <ul>
              <li>You personally attended this meeting</li>
              <li>The attendance time and duration are accurate</li>
              <li>You understand this is a legal attestation</li>
            </ul>
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            type="password"
            label="Enter Your Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Confirm with your password"
            required
            disabled={signing}
            sx={{ mb: 2 }}
            helperText="Your password is required to verify your identity"
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Confirmation Statement (Optional)"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="I confirm that I attended this meeting and the attendance record is accurate."
            disabled={signing}
            helperText="You can add additional notes if needed"
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={signing}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSign}
          disabled={signing || !password}
          startIcon={signing ? <CircularProgress size={20} /> : <SignatureIcon />}
        >
          {signing ? 'Signing...' : 'Sign Court Card'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SignCourtCardDialog;


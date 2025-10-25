/**
 * Meeting Host Signature Page
 * Allows AA meeting hosts to digitally sign attendance records
 */

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import SignatureCanvas from 'react-signature-canvas';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export const HostSignaturePage: React.FC = () => {
  const { attendanceRecordId } = useParams<{ attendanceRecordId: string }>();
  const [searchParams] = useSearchParams();
  const verificationCode = searchParams.get('code');

  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [hostName, setHostName] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [hostPhone, setHostPhone] = useState('');
  const [hostRole, setHostRole] = useState('MEETING_LEADER');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [signatureMethod, setSignatureMethod] = useState<'DRAWN' | 'TYPED'>('DRAWN');
  const [typedSignature, setTypedSignature] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const signaturePadRef = useRef<SignatureCanvas>(null);

  // Load attendance record details
  useEffect(() => {
    const loadAttendanceRecord = async () => {
      try {
        const API_BASE_URL =
          (import.meta as any).env?.VITE_API_BASE_URL ||
          'https://proofmeet-backend-production.up.railway.app/api';

        const response = await fetch(`${API_BASE_URL}/verify/${attendanceRecordId}`);
        
        if (!response.ok) {
          throw new Error('Attendance record not found');
        }

        const data = await response.json();
        setAttendanceData(data.data);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error loading attendance record:', err);
        setError(err.message || 'Failed to load attendance record');
        setIsLoading(false);
      }
    };

    if (attendanceRecordId) {
      loadAttendanceRecord();
    }
  }, [attendanceRecordId]);

  // Clear signature
  const clearSignature = () => {
    signaturePadRef.current?.clear();
  };

  // Submit signature
  const handleSubmit = async () => {
    if (!hostName || !hostEmail) {
      setError('Please fill in your name and email');
      return;
    }

    if (!verificationCode) {
      setError('Invalid verification code');
      return;
    }

    let signatureData = '';

    if (signatureMethod === 'DRAWN') {
      if (signaturePadRef.current?.isEmpty()) {
        setError('Please provide a signature');
        return;
      }
      signatureData = signaturePadRef.current?.toDataURL() || '';
    } else {
      if (!typedSignature.trim()) {
        setError('Please type your name for signature');
        return;
      }
      // Create a simple canvas with typed text
      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = '48px "Brush Script MT", cursive';
        ctx.fillText(typedSignature, 20, 100);
        signatureData = canvas.toDataURL();
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const API_BASE_URL =
        (import.meta as any).env?.VITE_API_BASE_URL ||
        'https://proofmeet-backend-production.up.railway.app/api';

      const attestationText = `I, ${hostName}, confirm that ${attendanceData?.courtCard?.participantName || 'the participant'} attended the ${attendanceData?.courtCard?.meetingName || 'meeting'} on ${new Date(attendanceData?.courtCard?.meetingDate || '').toLocaleDateString()}. I served as ${hostRole.replace('_', ' ').toLowerCase()} for this meeting.`;

      const response = await fetch(`${API_BASE_URL}/verification/host-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendanceRecordId,
          hostName,
          hostEmail,
          hostPhone: hostPhone || undefined,
          signatureData,
          attestationText,
          meetingLocation: meetingLocation || undefined,
          verificationCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit signature');
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Error submitting signature:', err);
      setError(err.message || 'Failed to submit signature');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading attendance record...
        </Typography>
      </Container>
    );
  }

  if (success) {
    return (
      <Container maxWidth="md" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Thank You!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your signature has been recorded successfully. The participant's court card now
            includes your verification of their attendance.
          </Typography>
          <Alert severity="success" sx={{ mt: 3 }}>
            This attendance record is now verified by a meeting host.
          </Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Meeting Host Signature
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Please review the attendance information and provide your digital signature to confirm
          the participant's attendance.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Attendance Information */}
        {attendanceData && (
          <Box sx={{ mt: 3, mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Attendance Details
            </Typography>
            <Typography variant="body2">
              <strong>Participant:</strong> {attendanceData.courtCard?.participantName}
            </Typography>
            <Typography variant="body2">
              <strong>Meeting:</strong> {attendanceData.courtCard?.meetingName}
            </Typography>
            <Typography variant="body2">
              <strong>Program:</strong> {attendanceData.courtCard?.meetingProgram}
            </Typography>
            <Typography variant="body2">
              <strong>Date:</strong>{' '}
              {new Date(attendanceData.courtCard?.meetingDate).toLocaleDateString()}
            </Typography>
            <Typography variant="body2">
              <strong>Time:</strong> {new Date(attendanceData.courtCard?.joinTime).toLocaleTimeString()} -{' '}
              {new Date(attendanceData.courtCard?.leaveTime).toLocaleTimeString()}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Host Information */}
        <Typography variant="h6" gutterBottom>
          Your Information
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          <TextField
            label="Full Name *"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Email Address *"
            type="email"
            value={hostEmail}
            onChange={(e) => setHostEmail(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Phone Number (Optional)"
            type="tel"
            value={hostPhone}
            onChange={(e) => setHostPhone(e.target.value)}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Your Role</InputLabel>
            <Select
              value={hostRole}
              label="Your Role"
              onChange={(e) => setHostRole(e.target.value)}
            >
              <MenuItem value="MEETING_LEADER">Meeting Leader</MenuItem>
              <MenuItem value="SPONSOR">Sponsor</MenuItem>
              <MenuItem value="SECRETARY">Secretary</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Meeting Location (Optional)"
            value={meetingLocation}
            onChange={(e) => setMeetingLocation(e.target.value)}
            fullWidth
            placeholder="e.g., First Baptist Church, Room 5"
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Signature */}
        <Typography variant="h6" gutterBottom>
          Your Signature
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Button
            variant={signatureMethod === 'DRAWN' ? 'contained' : 'outlined'}
            onClick={() => setSignatureMethod('DRAWN')}
            sx={{ mr: 1 }}
          >
            Draw Signature
          </Button>
          <Button
            variant={signatureMethod === 'TYPED' ? 'contained' : 'outlined'}
            onClick={() => setSignatureMethod('TYPED')}
          >
            Type Signature
          </Button>
        </Box>

        {signatureMethod === 'DRAWN' ? (
          <Box>
            <Box
              sx={{
                border: '2px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <SignatureCanvas
                ref={signaturePadRef}
                canvasProps={{
                  width: 500,
                  height: 200,
                  style: { width: '100%', height: '200px' },
                }}
              />
            </Box>
            <Button variant="outlined" size="small" onClick={clearSignature}>
              Clear Signature
            </Button>
          </Box>
        ) : (
          <TextField
            label="Type your full name"
            value={typedSignature}
            onChange={(e) => setTypedSignature(e.target.value)}
            fullWidth
            sx={{
              '& input': {
                fontFamily: '"Brush Script MT", cursive',
                fontSize: '24px',
              },
            }}
          />
        )}

        {/* Attestation */}
        <Alert severity="info" sx={{ mt: 3 }}>
          By signing below, I confirm that the participant named above attended this meeting and
          that the information provided is accurate to the best of my knowledge.
        </Alert>

        {/* Submit Button */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={isSubmitting}
            fullWidth
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Submit Signature'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default HostSignaturePage;


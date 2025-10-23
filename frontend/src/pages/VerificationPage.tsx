/**
 * Public Court Card Verification Page
 * No authentication required - anyone can verify court cards
 */

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Grid,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Container,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Verified as VerifiedIcon,
  QrCode as QrCodeIcon,
  History as HistoryIcon,
  Link as LinkIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

interface VerificationData {
  isValid: boolean;
  cardNumber: string;
  participantName: string;
  meetingDetails: {
    name: string;
    date: string;
    program: string;
    duration: number;
  };
  signatures: Array<{
    signerName: string;
    signerRole: string;
    timestamp: string;
    signatureMethod: string;
  }>;
  validationStatus: string;
  issueDate: string;
  expirationDate?: string;
  verificationUrl: string;
  qrCodeData: string;
  chainOfTrustValid: boolean;
  warnings: string[];
}

interface SignatureVerification {
  isValid: boolean;
  validSignatures: number;
  totalSignatures: number;
  details: Array<{
    signerName: string;
    signerRole: string;
    isValid: boolean;
    timestamp: string;
  }>;
}

interface AuditStats {
  totalAuditEntries: number;
  verificationAttempts: number;
  signatureCount: number;
  tamperingDetected: boolean;
  lastVerification: {
    timestamp: string;
    ipAddress: string;
  } | null;
}

export default function VerificationPage() {
  const { courtCardId } = useParams<{ courtCardId: string }>();
  const [searchParams] = useSearchParams();
  const verificationHash = searchParams.get('hash');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [signatureVerification, setSignatureVerification] = useState<SignatureVerification | null>(null);
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [chainValid, setChainValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (courtCardId) {
      verifyCourtCard();
    }
  }, [courtCardId]);

  const verifyCourtCard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Main verification
      const verifyUrl = verificationHash
        ? `${API_URL}/api/verify/${courtCardId}?hash=${verificationHash}`
        : `${API_URL}/api/verify/${courtCardId}`;

      const response = await axios.get(verifyUrl);
      setVerificationData(response.data.data);

      // Get signature verification
      try {
        const sigResponse = await axios.get(`${API_URL}/api/verify/${courtCardId}/signatures`);
        setSignatureVerification(sigResponse.data.data);
      } catch (err) {
        console.error('Failed to verify signatures:', err);
      }

      // Get chain of trust
      try {
        const chainResponse = await axios.get(`${API_URL}/api/verify/${courtCardId}/chain-of-trust`);
        setChainValid(chainResponse.data.data.isValid);
      } catch (err) {
        console.error('Failed to verify chain:', err);
      }

      // Get audit stats
      try {
        const auditResponse = await axios.get(`${API_URL}/api/verify/${courtCardId}/audit-trail`);
        setAuditStats(auditResponse.data.data.statistics);
      } catch (err) {
        console.error('Failed to get audit stats:', err);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to verify court card');
    } finally {
      setLoading(false);
    }
  };

  const downloadVerificationCertificate = () => {
    // Create verification certificate
    const certificate = `
VERIFICATION CERTIFICATE
========================

Court Card Verification Report
Generated: ${new Date().toLocaleString()}

Card Number: ${verificationData?.cardNumber}
Participant: ${verificationData?.participantName}
Meeting: ${verificationData?.meetingDetails.name}
Date: ${new Date(verificationData?.meetingDetails.date || '').toLocaleDateString()}

Verification Status: ${verificationData?.isValid ? 'VALID ✓' : 'INVALID ✗'}
Validation Status: ${verificationData?.validationStatus}
Chain of Trust: ${chainValid ? 'VALID ✓' : 'INVALID ✗'}

Digital Signatures: ${signatureVerification?.validSignatures}/${signatureVerification?.totalSignatures} Valid

Verified by: ProofMeet Verification System
Verification URL: ${verificationData?.verificationUrl}

This certificate confirms that the court card has been verified as authentic.
    `;

    const blob = new Blob([certificate], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification-${verificationData?.cardNumber}.txt`;
    a.click();
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" icon={<ErrorIcon />}>
          <Typography variant="h6">Verification Failed</Typography>
          <Typography>{error}</Typography>
        </Alert>
      </Container>
    );
  }

  if (!verificationData) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning">No verification data available</Alert>
      </Container>
    );
  }

  const isValid = verificationData.isValid && verificationData.validationStatus === 'PASSED';

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          ⚖️ Court Card Verification
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          ProofMeet Digital Verification System
        </Typography>
      </Box>

      {/* Main Verification Status */}
      <Paper
        elevation={3}
        sx={{
          p: 4,
          mb: 3,
          backgroundColor: isValid ? '#e8f5e9' : '#ffebee',
          borderLeft: `8px solid ${isValid ? '#4caf50' : '#f44336'}`,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            {isValid ? (
              <CheckCircleIcon sx={{ fontSize: 60, color: '#4caf50' }} />
            ) : (
              <ErrorIcon sx={{ fontSize: 60, color: '#f44336' }} />
            )}
          </Grid>
          <Grid item xs>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
              {isValid ? '✓ VERIFIED & VALID' : '✗ VERIFICATION FAILED'}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Card Number: {verificationData.cardNumber}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Chip
                label={`Status: ${verificationData.validationStatus}`}
                color={verificationData.validationStatus === 'PASSED' ? 'success' : 'error'}
                sx={{ mr: 1 }}
              />
              <Chip
                label={chainValid ? 'Chain Valid ✓' : 'Chain Invalid ✗'}
                color={chainValid ? 'success' : 'error'}
                sx={{ mr: 1 }}
              />
              <Chip
                label={`${signatureVerification?.validSignatures || 0} Signatures`}
                color="primary"
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Warnings */}
      {verificationData.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningIcon />}>
          <Typography variant="h6">Warnings:</Typography>
          <ul>
            {verificationData.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Participant Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <VerifiedIcon sx={{ mr: 1 }} /> Participant Information
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Full Name
              </Typography>
              <Typography variant="h6">{verificationData.participantName}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Card Number
              </Typography>
              <Typography variant="h6">{verificationData.cardNumber}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Meeting Details */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            Meeting Details
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Meeting Name
              </Typography>
              <Typography variant="h6">{verificationData.meetingDetails.name}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Program
              </Typography>
              <Typography variant="h6">{verificationData.meetingDetails.program}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Date
              </Typography>
              <Typography variant="h6">
                {new Date(verificationData.meetingDetails.date).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Duration
              </Typography>
              <Typography variant="h6">{verificationData.meetingDetails.duration} minutes</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Digital Signatures */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SecurityIcon sx={{ mr: 1 }} /> Digital Signatures
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {signatureVerification && (
            <Alert
              severity={signatureVerification.isValid ? 'success' : 'error'}
              sx={{ mb: 2 }}
            >
              <Typography variant="h6">
                {signatureVerification.validSignatures} of {signatureVerification.totalSignatures} signatures
                verified
              </Typography>
            </Alert>
          )}
          <List>
            {verificationData.signatures.map((sig, index) => (
              <ListItem key={index} sx={{ backgroundColor: '#f5f5f5', mb: 1, borderRadius: 1 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon sx={{ color: '#4caf50' }} />
                      <Typography variant="h6">{sig.signerName}</Typography>
                      <Chip label={sig.signerRole} size="small" color="primary" />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2">
                        Signed: {new Date(sig.timestamp).toLocaleString()}
                      </Typography>
                      <Typography variant="body2">Method: {sig.signatureMethod}</Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Verification Details Accordion */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <QrCodeIcon sx={{ mr: 1 }} /> Verification Details
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Verification URL
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinkIcon fontSize="small" />
                <Typography
                  variant="body1"
                  sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                >
                  {verificationData.verificationUrl}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Issue Date
              </Typography>
              <Typography variant="body1">
                {new Date(verificationData.issueDate).toLocaleString()}
              </Typography>
            </Grid>
            {verificationData.expirationDate && (
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Expiration Date
                </Typography>
                <Typography variant="body1">
                  {new Date(verificationData.expirationDate).toLocaleDateString()}
                </Typography>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Audit Statistics */}
      {auditStats && (
        <Accordion sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <HistoryIcon sx={{ mr: 1 }} /> Audit Trail & Statistics
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Total Audit Entries
                </Typography>
                <Typography variant="h4">{auditStats.totalAuditEntries}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Verification Attempts
                </Typography>
                <Typography variant="h4">{auditStats.verificationAttempts}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Signature Count
                </Typography>
                <Typography variant="h4">{auditStats.signatureCount}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Tampering Detected
                </Typography>
                <Typography variant="h4" color={auditStats.tamperingDetected ? 'error' : 'success'}>
                  {auditStats.tamperingDetected ? 'YES' : 'NO'}
                </Typography>
              </Grid>
              {auditStats.lastVerification && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Last Verification
                  </Typography>
                  <Typography variant="body1">
                    {new Date(auditStats.lastVerification.timestamp).toLocaleString()} from{' '}
                    {auditStats.lastVerification.ipAddress}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={downloadVerificationCertificate}
        >
          Download Verification Certificate
        </Button>
        <Button variant="outlined" size="large" onClick={() => window.print()}>
          Print This Page
        </Button>
      </Box>

      {/* Footer */}
      <Box sx={{ mt: 4, p: 3, backgroundColor: '#f5f5f5', borderRadius: 1, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          This is an official ProofMeet digital court card verification.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          All attendance records are cryptographically signed and verified.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Verified at: {new Date().toLocaleString()}
        </Typography>
      </Box>
    </Container>
  );
}


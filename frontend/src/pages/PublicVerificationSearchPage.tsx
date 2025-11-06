/**
 * Public Verification Search Page
 * Allows courts to search for and verify court cards
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Container,
  Grid,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  QrCode as QrCodeIcon,
  Email as EmailIcon,
  Description as DescriptionIcon,
  Gavel as GavelIcon,
} from '@mui/icons-material';

const API_URL = (import.meta as any).env?.VITE_API_BASE_URL?.replace('/api', '') || 'https://proofmeet-backend-production.up.railway.app';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`search-tabpanel-${index}`}
      aria-labelledby={`search-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface SearchResult {
  id: string;
  cardNumber: string;
  participantName: string;
  meetingName: string;
  meetingProgram: string;
  meetingDate: string;
  validationStatus: string;
  verificationUrl: string;
}

export default function PublicVerificationSearchPage() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [participantSummary, setParticipantSummary] = useState<any>(null);

  // Form values
  const [cardNumber, setCardNumber] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [caseNumber, setCaseNumber] = useState('');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError(null);
    setSearchResults([]);
    setParticipantSummary(null);
  };

  const searchByCardNumber = async () => {
    try {
      setLoading(true);
      setError(null);
      setSearchResults([]);

      const response = await axios.get(`${API_URL}/api/verify/card-number/${cardNumber}`);
      
      // Redirect to verification page
      const courtCard = response.data.data;
      navigate(`/verify/${courtCard.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Court card not found');
    } finally {
      setLoading(false);
    }
  };

  const searchByEmail = async () => {
    try {
      setLoading(true);
      setError(null);
      setSearchResults([]);
      setParticipantSummary(null);

      const response = await axios.get(`${API_URL}/api/verify/participant/${participantEmail}`);
      const data = response.data.data;

      setParticipantSummary(data.summary);
      setSearchResults(data.courtCards);
    } catch (err: any) {
      setError(err.response?.data?.error || 'No court cards found for this participant');
    } finally {
      setLoading(false);
    }
  };

  const searchByCaseNumber = async () => {
    try {
      setLoading(true);
      setError(null);
      setSearchResults([]);
      setParticipantSummary(null);

      const response = await axios.get(`${API_URL}/api/verify/case/${caseNumber}`);
      const data = response.data.data;

      setParticipantSummary(data.summary);
      setSearchResults(data.courtCards);
    } catch (err: any) {
      setError(err.response?.data?.error || 'No court cards found for this case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          🔍 Court Card Verification Search
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Search and verify attendance records - No login required
        </Typography>
      </Box>

      {/* Search Card */}
      <Card elevation={3}>
        <CardContent>
          <Tabs value={tabValue} onChange={handleTabChange} centered sx={{ mb: 3 }}>
            <Tab icon={<DescriptionIcon />} label="Card Number" />
            <Tab icon={<EmailIcon />} label="Participant Email" />
            <Tab icon={<GavelIcon />} label="Case Number" />
          </Tabs>

          {/* Card Number Search */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ maxWidth: 600, mx: 'auto' }}>
              <Typography variant="body1" gutterBottom color="text.secondary">
                Enter the court card number (e.g., CC-2024-12345-001)
              </Typography>
              <TextField
                fullWidth
                label="Court Card Number"
                placeholder="CC-2024-12345-001"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<SearchIcon />}
                onClick={searchByCardNumber}
                disabled={loading || !cardNumber}
              >
                {loading ? <CircularProgress size={24} /> : 'Search & Verify'}
              </Button>
            </Box>
          </TabPanel>

          {/* Email Search */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ maxWidth: 600, mx: 'auto' }}>
              <Typography variant="body1" gutterBottom color="text.secondary">
                Enter the participant's email address to see all their court cards
              </Typography>
              <TextField
                fullWidth
                type="email"
                label="Participant Email"
                placeholder="participant@example.com"
                value={participantEmail}
                onChange={(e) => setParticipantEmail(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<SearchIcon />}
                onClick={searchByEmail}
                disabled={loading || !participantEmail}
              >
                {loading ? <CircularProgress size={24} /> : 'Search All Cards'}
              </Button>
            </Box>
          </TabPanel>

          {/* Case Number Search */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ maxWidth: 600, mx: 'auto' }}>
              <Typography variant="body1" gutterBottom color="text.secondary">
                Enter the court case number to see all attendance records
              </Typography>
              <TextField
                fullWidth
                label="Case Number"
                placeholder="12345"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<SearchIcon />}
                onClick={searchByCaseNumber}
                disabled={loading || !caseNumber}
              >
                {loading ? <CircularProgress size={24} /> : 'Search All Cards'}
              </Button>
            </Box>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      {/* Summary Statistics */}
      {participantSummary && (
        <Paper elevation={2} sx={{ mt: 3, p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Summary Statistics
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="primary.main">
                  {participantSummary.totalMeetings}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Meetings
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="primary.main">
                  {participantSummary.totalHours}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Hours
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="success.main">
                  {participantSummary.passedValidation}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Passed Validation
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color="primary.main">
                  {participantSummary.complianceRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Compliance Rate
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Court Cards Found ({searchResults.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List>
              {searchResults.map((result) => (
                <ListItem
                  key={result.id}
                  sx={{
                    mb: 2,
                    backgroundColor: '#f5f5f5',
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: '#e0e0e0' },
                  }}
                  onClick={() => navigate(`/verify/${result.id}`)}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6">{result.cardNumber}</Typography>
                        <Chip
                          label={result.validationStatus}
                          size="small"
                          color={result.validationStatus === 'PASSED' ? 'success' : 'error'}
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2">
                          <strong>Participant:</strong> {result.participantName}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Meeting:</strong> {result.meetingName} ({result.meetingProgram})
                        </Typography>
                        <Typography variant="body2">
                          <strong>Date:</strong> {new Date(result.meetingDate).toLocaleDateString()}
                        </Typography>
                      </>
                    }
                  />
                  <Button variant="outlined" size="small">
                    View Details
                  </Button>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Paper elevation={1} sx={{ mt: 4, p: 3, backgroundColor: '#f9f9f9' }}>
        <Typography variant="h6" gutterBottom>
          <QrCodeIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          How to Verify Court Cards
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              1. QR Code
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Scan the QR code on the court card with your smartphone camera for instant verification.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              2. Card Number
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter the card number (e.g., CC-2024-12345-001) to verify a specific meeting.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              3. Email or Case Number
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Search by participant email or case number to see all attendance records.
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Footer */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          ProofMeet™ Digital Court Card Verification System
        </Typography>
        <Typography variant="caption" color="text.secondary">
          All records are cryptographically signed and tamper-proof
        </Typography>
      </Box>
    </Container>
  );
}


import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Link as MuiLink,
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStoreV2 } from '../hooks/useAuthStore-v2';
import { authServiceV2 } from '../services/authService-v2';

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login } = useAuthStoreV2();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    const response = await authServiceV2.login(email, password);
    
    if (response.success && response.data) {
      login(response.data.token, response.data.user);
      
      // Redirect based on user type
      if (response.data.user.userType === 'COURT_REP') {
        navigate('/court-rep/dashboard');
      } else {
        navigate('/participant/dashboard');
      }
    } else {
      setError(response.error || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography component="h1" variant="h4" gutterBottom>
              ProofMeet
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Court-Ordered Meeting Attendance Tracker
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />

            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <MuiLink component={Link} to="/register/court-rep" underline="hover">
                  Register as Court Rep
                </MuiLink>
                <Typography color="text.secondary">|</Typography>
                <MuiLink component={Link} to="/register/participant" underline="hover">
                  Register as Participant
                </MuiLink>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;

import React, { useState } from 'react';
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Link as MuiLink,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { Gavel, Visibility, VisibilityOff } from '@mui/icons-material';
import { authServiceV2, CourtRepRegisterRequest } from '../services/authService-v2';

const RegisterCourtRepPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<CourtRepRegisterRequest>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    courtName: '',
    badgeNumber: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    const result = await authServiceV2.registerCourtRep(formData);

    if (result.success) {
      setSuccess('Registration successful! Please check your email to verify your account.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } else {
      setError(result.error || 'Registration failed');
    }

    setLoading(false);
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Card>
          <CardContent sx={{ p: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Gavel sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom>
                Court Representative Registration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Register with your official court or probation email address
              </Typography>
            </Box>

            {/* Error/Success Messages */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Official Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                margin="normal"
                helperText="Use your court or probation email (e.g., @probation.ca.gov)"
              />

              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                required
                margin="normal"
                helperText="Minimum 8 characters"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        onMouseDown={(e) => e.preventDefault()}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />

                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </Box>

              <TextField
                fullWidth
                label="Court/Organization Name"
                name="courtName"
                value={formData.courtName}
                onChange={handleChange}
                margin="normal"
                helperText="e.g., Los Angeles County Probation"
              />

              <TextField
                fullWidth
                label="Badge/ID Number"
                name="badgeNumber"
                value={formData.badgeNumber}
                onChange={handleChange}
                margin="normal"
                helperText="Optional"
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Register as Court Representative'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <MuiLink component={Link} to="/login">
                    Sign In
                  </MuiLink>
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Are you a participant?{' '}
                  <MuiLink component={Link} to="/register/participant">
                    Register as Participant
                  </MuiLink>
                </Typography>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default RegisterCourtRepPage;


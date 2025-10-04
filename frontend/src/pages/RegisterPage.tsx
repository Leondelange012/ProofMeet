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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
  courtId: yup.string().required('Court ID is required'),
  state: yup.string().required('State is required'),
  courtCaseNumber: yup.string().required('Court case number is required'),
  userType: yup.string().oneOf(['participant', 'host']).required('User type is required'),
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  phoneNumber: yup.string().required('Phone number is required'),
  dateOfBirth: yup.string().required('Date of birth is required'),
});

type RegisterFormData = {
  email: string;
  password: string;
  confirmPassword: string;
  courtId: string;
  state: string;
  courtCaseNumber: string;
  userType: 'participant' | 'host';
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: string;
};

const RegisterPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    control,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(schema),
  });

  const userType = watch('userType');

  const steps = ['Account Type', 'Personal Information', 'Court Information', 'Review & Submit'];

  // Clear errors when step changes
  React.useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [currentStep]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Submitting registration data:', data);
      
      const response = await authService.register({
        email: data.email,
        password: data.password,
        courtId: data.courtId,
        state: data.state,
        courtCaseNumber: data.courtCaseNumber,
        isHost: data.userType === 'host',
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        dateOfBirth: data.dateOfBirth,
      });
      
      console.log('Registration response:', response);
      
      if (response.success) {
        setSuccess('Registration submitted successfully! Please check your email for verification instructions. Court administrators will review your application.');
        toast.success('Registration submitted!');
        // Don't navigate immediately - let user read the success message
        setTimeout(() => {
          navigate('/login');
        }, 5000);
      } else {
        console.error('Registration failed:', response.error);
        setError(response.error || 'Registration failed');
        toast.error('Registration failed: ' + (response.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError('An error occurred during registration: ' + (err.message || 'Unknown error'));
      toast.error('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    // Clear any previous errors when moving to next step
    setError(null);
    setSuccess(null);
    
    // Validate current step before proceeding
    const currentStepFields = getCurrentStepFields(currentStep);
    
    // Trigger validation for current step fields
    trigger(currentStepFields).then((isValid) => {
      if (isValid) {
        setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      }
    });
  };

  const getCurrentStepFields = (step: number): (keyof RegisterFormData)[] => {
    switch (step) {
      case 0:
        return ['userType'];
      case 1:
        return ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'phoneNumber', 'dateOfBirth'];
      case 2:
        return ['state', 'courtId', 'courtCaseNumber'];
      case 3:
        return [];
      default:
        return [];
    }
  };

  const handleBack = () => {
    // Clear any previous errors when going back
    setError(null);
    setSuccess(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend" sx={{ mb: 2 }}>
                Are you registering as a meeting host or participant?
              </FormLabel>
              <Controller
                name="userType"
                control={control}
                render={({ field }) => (
                  <RadioGroup {...field} row>
                    <FormControlLabel 
                      value="participant" 
                      control={<Radio />} 
                      label="Participant - I need to attend court-ordered meetings" 
                    />
                    <FormControlLabel 
                      value="host" 
                      control={<Radio />} 
                      label="Host - I facilitate meetings (AA, NA, SMART Recovery, etc.)" 
                    />
                  </RadioGroup>
                )}
              />
              {errors.userType && (
                <Typography color="error" variant="caption">
                  {errors.userType.message}
                </Typography>
              )}
            </FormControl>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                {...register('firstName')}
                label="First Name"
                fullWidth
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
              />
              <TextField
                {...register('lastName')}
                label="Last Name"
                fullWidth
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
              />
            </Box>
            <TextField
              {...register('email')}
              label="Email Address"
              type="email"
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                {...register('password')}
                label="Password"
                type="password"
                fullWidth
                error={!!errors.password}
                helperText={errors.password?.message}
              />
              <TextField
                {...register('confirmPassword')}
                label="Confirm Password"
                type="password"
                fullWidth
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
              />
            </Box>
            <TextField
              {...register('phoneNumber')}
              label="Phone Number"
              fullWidth
              error={!!errors.phoneNumber}
              helperText={errors.phoneNumber?.message}
            />
            <TextField
              {...register('dateOfBirth')}
              label="Date of Birth"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              error={!!errors.dateOfBirth}
              helperText={errors.dateOfBirth?.message}
            />
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.state}>
                  <InputLabel>State</InputLabel>
                  <Select {...field} label="State">
                    <MenuItem value="CA">California</MenuItem>
                    <MenuItem value="TX">Texas</MenuItem>
                    <MenuItem value="NY">New York</MenuItem>
                    <MenuItem value="FL">Florida</MenuItem>
                    <MenuItem value="IL">Illinois</MenuItem>
                    <MenuItem value="PA">Pennsylvania</MenuItem>
                    <MenuItem value="OH">Ohio</MenuItem>
                    <MenuItem value="GA">Georgia</MenuItem>
                    <MenuItem value="NC">North Carolina</MenuItem>
                    <MenuItem value="MI">Michigan</MenuItem>
                  </Select>
                  {errors.state && (
                    <Typography color="error" variant="caption">
                      {errors.state.message}
                    </Typography>
                  )}
                </FormControl>
              )}
            />

            <TextField
              {...register('courtId')}
              label="Court ID / Court Name"
              fullWidth
              error={!!errors.courtId}
              helperText={errors.courtId?.message || "Enter your court's identifier or full name"}
            />

            <TextField
              {...register('courtCaseNumber')}
              label="Court Case Number"
              fullWidth
              error={!!errors.courtCaseNumber}
              helperText={errors.courtCaseNumber?.message || "Enter your case number as it appears on court documents"}
            />
          </Box>
        );

      case 3:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" gutterBottom>
              Review Your Information
            </Typography>
            <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
              <Typography><strong>Account Type:</strong> {userType === 'host' ? 'Meeting Host' : 'Participant'}</Typography>
              <Typography><strong>Name:</strong> {watch('firstName')} {watch('lastName')}</Typography>
              <Typography><strong>Email:</strong> {watch('email')}</Typography>
              <Typography><strong>Password:</strong> ••••••••</Typography>
              <Typography><strong>Phone:</strong> {watch('phoneNumber')}</Typography>
              <Typography><strong>Date of Birth:</strong> {watch('dateOfBirth')}</Typography>
              <Typography><strong>State:</strong> {watch('state')}</Typography>
              <Typography><strong>Court ID:</strong> {watch('courtId')}</Typography>
              <Typography><strong>Case Number:</strong> {watch('courtCaseNumber')}</Typography>
            </Paper>
            <Alert severity="info">
              After submission, you will receive an email verification link. Your account will be reviewed by court administrators before activation.
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          marginTop: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography component="h1" variant="h4" gutterBottom>
              ProofMeet Registration
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Court-Ordered Meeting Attendance System
            </Typography>
          </Box>

          <Stepper activeStep={currentStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

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

          <Box component="form" noValidate>
            {renderStepContent(currentStep)}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button
                disabled={currentStep === 0}
                onClick={handleBack}
              >
                Back
              </Button>
              
              {currentStep === steps.length - 1 ? (
                <Button
                  type="button"
                  variant="contained"
                  disabled={isLoading}
                  onClick={handleSubmit(onSubmit)}
                >
                  {isLoading ? <CircularProgress size={24} /> : 'Submit Registration'}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="contained"
                  onClick={handleNext}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link to="/login" style={{ textDecoration: 'none' }}>
                Sign in here
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterPage;

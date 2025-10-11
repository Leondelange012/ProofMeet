// React import removed - not needed with new JSX transform
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterCourtRepPage from './pages/RegisterCourtRepPage';
import RegisterParticipantPage from './pages/RegisterParticipantPage';
import CourtRepDashboardPage from './pages/CourtRepDashboardPage';
import ParticipantDashboardPage from './pages/ParticipantDashboardPage';
import MeetingPage from './pages/MeetingPage';
import CompliancePage from './pages/CompliancePage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Hooks
import { useAuthStoreV2 } from './hooks/useAuthStore-v2';

// Create theme inspired by Online Intergroup AA
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00D9FF', // Bright cyan accent
      light: '#4DD0E1',
      dark: '#00ACC1',
      contrastText: '#0A2952',
    },
    secondary: {
      main: '#4DD0E1', // Light cyan
      light: '#B3E5FC',
      dark: '#00ACC1',
      contrastText: '#0A2952',
    },
    background: {
      default: '#0A2952', // Dark navy blue
      paper: '#0D3A6F', // Lighter navy for cards
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B3E5FC', // Light blue
    },
    success: {
      main: '#4CAF50',
      light: '#81C784',
    },
    warning: {
      main: '#FF9800',
      light: '#FFB74D',
    },
    error: {
      main: '#F44336',
      light: '#EF5350',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 217, 255, 0.3)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #00D9FF 0%, #4DD0E1 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #00ACC1 0%, #00D9FF 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(77, 208, 225, 0.15)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'rgba(77, 208, 225, 0.3)',
            boxShadow: '0 8px 30px rgba(0, 217, 255, 0.2)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(135deg, #0A2952 0%, #0D3A6F 100%)',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'linear-gradient(180deg, #0A2952 0%, #0D3A6F 100%)',
          borderRight: '1px solid rgba(77, 208, 225, 0.15)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
        colorPrimary: {
          background: 'linear-gradient(135deg, #00D9FF 0%, #4DD0E1 100%)',
          color: '#0A2952',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
        },
        bar: {
          background: 'linear-gradient(90deg, #00D9FF 0%, #4DD0E1 100%)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(77, 208, 225, 0.3)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(77, 208, 225, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00D9FF',
            },
          },
        },
      },
    },
  },
});

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const { isAuthenticated, userType } = useAuthStoreV2();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <div className="App">
            <Toaster position="top-right" />
            <Routes>
              {/* Public routes */}
              <Route 
                path="/login" 
                element={
                  isAuthenticated ? <Navigate to={userType === 'COURT_REP' ? '/court-rep/dashboard' : '/participant/dashboard'} replace /> : <LoginPage />
                } 
              />
              
              <Route 
                path="/register/court-rep" 
                element={
                  isAuthenticated ? <Navigate to="/court-rep/dashboard" replace /> : <RegisterCourtRepPage />
                } 
              />
              
              <Route 
                path="/register/participant" 
                element={
                  isAuthenticated ? <Navigate to="/participant/dashboard" replace /> : <RegisterParticipantPage />
                } 
              />
              
              {/* Legacy registration route - redirect to choice */}
              <Route 
                path="/register" 
                element={<Navigate to="/register/participant" replace />} 
              />
              
              {/* Court Rep routes */}
              <Route
                path="/court-rep/dashboard"
                element={
                  <ProtectedRoute requiredUserType="COURT_REP">
                    <Layout>
                      <CourtRepDashboardPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              {/* Participant routes */}
              <Route
                path="/participant/dashboard"
                element={
                  <ProtectedRoute requiredUserType="PARTICIPANT">
                    <Layout>
                      <ParticipantDashboardPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/meetings"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <MeetingPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/compliance"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CompliancePage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              {/* Legacy Host route - redirect to Court Rep */}
              <Route
                path="/host/dashboard"
                element={<Navigate to="/court-rep/dashboard" replace />}
              />
              
              {/* Default redirect based on user type */}
              <Route path="/" element={
                isAuthenticated 
                  ? <Navigate to={userType === 'COURT_REP' ? '/court-rep/dashboard' : '/participant/dashboard'} replace />
                  : <Navigate to="/login" replace />
              } />
              
              {/* 404 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

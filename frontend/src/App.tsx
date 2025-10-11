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

// Professional Modern Theme - Balanced & User-Friendly
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0891B2', // Refined teal - professional, trustworthy
      light: '#06B6D4',
      dark: '#0E7490',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#F97316', // Warm orange - energy, hope, calls-to-action
      light: '#FB923C',
      dark: '#EA580C',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F8F9FA', // Soft off-white
      paper: '#FFFFFF', // Pure white cards
    },
    text: {
      primary: '#1F2937', // Dark gray (easier on eyes than black)
      secondary: '#6B7280', // Medium gray
    },
    success: {
      main: '#10B981', // Modern green
      light: '#34D399',
      dark: '#059669',
    },
    warning: {
      main: '#F59E0B', // Amber
      light: '#FBBF24',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444', // Modern red
      light: '#F87171',
      dark: '#DC2626',
    },
    info: {
      main: '#3B82F6', // Blue for info (used sparingly)
      light: '#60A5FA',
      dark: '#2563EB',
    },
    divider: '#E5E7EB',
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.025em',
      color: '#111827',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#111827',
    },
    h3: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
      color: '#111827',
    },
    h4: {
      fontWeight: 600,
      color: '#1F2937',
    },
    h5: {
      fontWeight: 600,
      color: '#1F2937',
    },
    h6: {
      fontWeight: 600,
      color: '#374151',
    },
    body1: {
      color: '#374151',
    },
    body2: {
      color: '#6B7280',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    ...Array(18).fill('none'),
  ] as any,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 20px',
          fontWeight: 600,
          boxShadow: 'none',
          transition: 'all 0.2s ease',
        },
        contained: {
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
            backgroundColor: 'rgba(8, 145, 178, 0.04)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 12,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          backgroundImage: 'none',
          color: '#1F2937',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          borderBottom: '1px solid #E5E7EB',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FAFBFC',
          borderRight: '1px solid #E5E7EB',
          backgroundImage: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.8125rem',
        },
        filled: {
          backgroundColor: '#F3F4F6',
          color: '#374151',
          '&:hover': {
            backgroundColor: '#E5E7EB',
          },
        },
        colorPrimary: {
          backgroundColor: '#DBEAFE',
          color: '#1E40AF',
        },
        colorSecondary: {
          backgroundColor: '#FED7AA',
          color: '#9A3412',
        },
        colorSuccess: {
          backgroundColor: '#D1FAE5',
          color: '#065F46',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 8,
          borderRadius: 4,
          backgroundColor: '#E5E7EB',
        },
        bar: {
          borderRadius: 4,
          backgroundColor: '#0891B2',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#FFFFFF',
            '& fieldset': {
              borderColor: '#D1D5DB',
              borderWidth: '1.5px',
            },
            '&:hover fieldset': {
              borderColor: '#9CA3AF',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#0891B2',
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '4px 8px',
          '&.Mui-selected': {
            backgroundColor: '#EFF6FF',
            color: '#0891B2',
            '&:hover': {
              backgroundColor: '#DBEAFE',
            },
            '& .MuiListItemIcon-root': {
              color: '#0891B2',
            },
          },
          '&:hover': {
            backgroundColor: '#F9FAFB',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
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

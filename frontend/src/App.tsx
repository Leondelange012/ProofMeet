// React import removed - not needed with new JSX transform
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RegisterCourtRepPage from './pages/RegisterCourtRepPage';
import RegisterParticipantPage from './pages/RegisterParticipantPage';
import DashboardPage from './pages/DashboardPage';
import CourtRepDashboardPage from './pages/CourtRepDashboardPage';
import ParticipantDashboardPage from './pages/ParticipantDashboardPage';
import MeetingPage from './pages/MeetingPage';
import CompliancePage from './pages/CompliancePage';
import HostDashboardPage from './pages/HostDashboardPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Hooks
import { useAuthStoreV2 } from './hooks/useAuthStore-v2';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
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

// React import removed - not needed with new JSX transform
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MeetingPage from './pages/MeetingPage';
import CompliancePage from './pages/CompliancePage';
import HostDashboardPage from './pages/HostDashboardPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Hooks
import { useAuthStore } from './hooks/useAuthStore';

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
  const { isAuthenticated } = useAuthStore();

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
                  isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
                } 
              />
              
              <Route 
                path="/register" 
                element={
                  isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
                } 
              />
              
              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <DashboardPage />
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
              
              {/* Host routes */}
              <Route
                path="/host/dashboard"
                element={
                  <ProtectedRoute requiredRole="host">
                    <Layout>
                      <HostDashboardPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* 404 */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

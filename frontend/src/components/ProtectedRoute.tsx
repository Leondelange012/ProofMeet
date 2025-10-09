import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStoreV2 } from '../hooks/useAuthStore-v2';
import { UserType } from '../services/authService-v2';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: UserType;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredUserType 
}) => {
  const { isAuthenticated, user, userType } = useAuthStoreV2();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredUserType && userType !== requiredUserType) {
    // Redirect to appropriate dashboard
    const redirectPath = userType === 'COURT_REP' ? '/court-rep/dashboard' : '/participant/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

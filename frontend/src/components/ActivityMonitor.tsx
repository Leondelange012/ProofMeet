/**
 * Activity Monitor Component
 * Tracks user activity (mouse/keyboard) and sends heartbeats to backend
 * This verifies the participant is actually present during the meeting
 */

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Box, Chip } from '@mui/material';
import { FiberManualRecord } from '@mui/icons-material';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://proofmeet-backend-production.up.railway.app/api';

interface ActivityMonitorProps {
  attendanceId: string;
  token: string;
  onActivityChange?: (isActive: boolean) => void;
}

const ActivityMonitor: React.FC<ActivityMonitorProps> = ({
  attendanceId,
  token,
  onActivityChange,
}) => {
  const [isActive, setIsActive] = useState(true);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const activityCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Configuration
  const IDLE_THRESHOLD = 120000; // 2 minutes of no activity = idle
  const HEARTBEAT_INTERVAL = 30000; // Send heartbeat every 30 seconds

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      setLastActivityTime(Date.now());
      if (!isActive) {
        setIsActive(true);
        onActivityChange?.(true);
      }
    };

    // Listen to user interactions
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    // Listen to page visibility
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, onActivityChange]);

  // Check for idle state
  useEffect(() => {
    activityCheckInterval.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityTime;
      const shouldBeActive = timeSinceActivity < IDLE_THRESHOLD;

      if (shouldBeActive !== isActive) {
        setIsActive(shouldBeActive);
        onActivityChange?.(shouldBeActive);
      }
    }, 5000); // Check every 5 seconds

    return () => {
      if (activityCheckInterval.current) {
        clearInterval(activityCheckInterval.current);
      }
    };
  }, [lastActivityTime, isActive, onActivityChange]);

  // Send heartbeat to backend
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        await axios.post(
          `${API_BASE_URL}/participant/activity-heartbeat`,
          {
            attendanceId,
            activityType: isActive ? 'ACTIVE' : 'IDLE',
            metadata: {
              timestamp: new Date().toISOString(),
              pageVisible: !document.hidden,
              timeSinceLastActivity: Date.now() - lastActivityTime,
            },
          },
          { headers }
        );

        console.log(`💓 Activity heartbeat sent: ${isActive ? 'ACTIVE' : 'IDLE'}`);
      } catch (error) {
        console.error('Failed to send activity heartbeat:', error);
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval for recurring heartbeats
    heartbeatInterval.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, [attendanceId, token, isActive, lastActivityTime]);

  // Warn if user is about to become idle
  useEffect(() => {
    const timeSinceActivity = Date.now() - lastActivityTime;
    const timeUntilIdle = IDLE_THRESHOLD - timeSinceActivity;

    if (timeUntilIdle < 30000 && timeUntilIdle > 0 && isActive) {
      console.warn(`⚠️ User will be marked idle in ${Math.floor(timeUntilIdle / 1000)} seconds`);
    }
  }, [lastActivityTime, isActive]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1000,
      }}
    >
      <Chip
        icon={<FiberManualRecord />}
        label={isActive ? 'Tracking Active' : 'Idle Detected'}
        color={isActive ? 'success' : 'warning'}
        size="small"
        sx={{
          animation: isActive ? 'pulse 2s infinite' : 'none',
          '@keyframes pulse': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.7 },
            '100%': { opacity: 1 },
          },
        }}
      />
    </Box>
  );
};

export default ActivityMonitor;


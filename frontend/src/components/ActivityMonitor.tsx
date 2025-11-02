/**
 * Activity Monitor Component - TIER 2 ENHANCED
 * Tracks detailed user engagement and sends enriched heartbeats to backend
 * This verifies the participant is actually present and engaged during the meeting
 * 
 * Enhanced Features:
 * - Tab focus tracking
 * - Separate mouse/keyboard activity
 * - Device fingerprinting
 * - Audio/video status (when available)
 * - Engagement scoring
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
  initialCameraStatus?: boolean; // Allow parent to specify camera status
  initialAudioStatus?: boolean;  // Allow parent to specify audio status
}

interface EnhancedActivityData {
  mouseActivity: number;
  keyboardActivity: number;
  tabFocusTime: number;
  lastMouseMove: number;
  lastKeyPress: number;
}

const ActivityMonitor: React.FC<ActivityMonitorProps> = ({
  attendanceId,
  token,
  onActivityChange,
  initialCameraStatus = true,  // Default to true - assume camera is on
  initialAudioStatus = true,   // Default to true - assume audio is on
}) => {
  const [isActive, setIsActive] = useState(true);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [tabFocused, setTabFocused] = useState(!document.hidden);
  const [cameraOn] = useState(initialCameraStatus);
  const [audioOn] = useState(initialAudioStatus);
  const [deviceId] = useState(() => {
    // Generate or retrieve persistent device ID
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = `device-${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('deviceId', id);
    }
    return id;
  });
  
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const activityCheckInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Enhanced activity tracking (Tier 2)
  const activityData = useRef<EnhancedActivityData>({
    mouseActivity: 0,
    keyboardActivity: 0,
    tabFocusTime: 0,
    lastMouseMove: Date.now(),
    lastKeyPress: Date.now(),
  });

  // Configuration
  const IDLE_THRESHOLD = 120000; // 2 minutes of no activity = idle
  const HEARTBEAT_INTERVAL = 30000; // Send heartbeat every 30 seconds

  // Track user activity - ENHANCED (Tier 2)
  useEffect(() => {
    const updateActivity = () => {
      setLastActivityTime(Date.now());
      if (!isActive) {
        setIsActive(true);
        onActivityChange?.(true);
      }
    };

    // Track mouse activity separately
    const handleMouseActivity = () => {
      activityData.current.mouseActivity++;
      activityData.current.lastMouseMove = Date.now();
      updateActivity();
    };

    // Track keyboard activity separately
    const handleKeyboardActivity = () => {
      activityData.current.keyboardActivity++;
      activityData.current.lastKeyPress = Date.now();
      updateActivity();
    };

    // Listen to user interactions
    window.addEventListener('mousemove', handleMouseActivity);
    window.addEventListener('mousedown', handleMouseActivity);
    window.addEventListener('keypress', handleKeyboardActivity);
    window.addEventListener('keydown', handleKeyboardActivity);
    window.addEventListener('scroll', updateActivity);
    window.addEventListener('touchstart', updateActivity);

    // Listen to page visibility and track focus time
    const handleVisibilityChange = () => {
      const focused = !document.hidden;
      setTabFocused(focused);
      if (focused) {
        updateActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track tab focus time
    const focusTimeInterval = setInterval(() => {
      if (!document.hidden) {
        activityData.current.tabFocusTime += 1000; // Add 1 second
      }
    }, 1000);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseActivity);
      window.removeEventListener('mousedown', handleMouseActivity);
      window.removeEventListener('keypress', handleKeyboardActivity);
      window.removeEventListener('keydown', handleKeyboardActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(focusTimeInterval);
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

  // Send heartbeat to backend - ENHANCED (Tier 2)
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        // Enhanced metadata for Tier 2 fraud detection
        const now = Date.now();
        const metadata = {
          timestamp: new Date().toISOString(),
          pageVisible: !document.hidden,
          tabFocused,
          timeSinceLastActivity: now - lastActivityTime,
          // Separate mouse/keyboard tracking
          mouseMovement: now - activityData.current.lastMouseMove < 30000,
          keyboardActivity: now - activityData.current.lastKeyPress < 30000,
          // Engagement metrics
          mouseActivityCount: activityData.current.mouseActivity,
          keyboardActivityCount: activityData.current.keyboardActivity,
          tabFocusTimeMs: activityData.current.tabFocusTime,
          // Device fingerprinting
          deviceId,
          // Audio/video status (from user confirmation or detection)
          audioActive: audioOn,
          videoActive: cameraOn,
        };
        
        await axios.post(
          `${API_BASE_URL}/participant/activity-heartbeat`,
          {
            attendanceId,
            activityType: isActive ? 'ACTIVE' : 'IDLE',
            metadata,
          },
          { headers }
        );

        console.log(`💓 Enhanced heartbeat sent: ${isActive ? 'ACTIVE' : 'IDLE'}`, {
          mouse: metadata.mouseActivityCount,
          keyboard: metadata.keyboardActivityCount,
          focusTime: `${Math.round(metadata.tabFocusTimeMs / 1000)}s`,
          video: cameraOn ? 'ON' : 'OFF',
          audio: audioOn ? 'ON' : 'OFF',
        });
        
        // Reset counters after sending
        activityData.current.mouseActivity = 0;
        activityData.current.keyboardActivity = 0;
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
  }, [attendanceId, token, isActive, lastActivityTime, cameraOn, audioOn]);

  // Auto-leave detection when tab closes or user navigates away
  useEffect(() => {
    const handleBeforeUnload = (_e: BeforeUnloadEvent) => {
      // Send leave meeting request using sendBeacon (doesn't wait for response)
      const leaveUrl = `${API_BASE_URL}/participant/leave-meeting`;
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      const body = JSON.stringify({ attendanceId });
      
      // Use sendBeacon for reliable delivery even when page is closing
      const blob = new Blob([body], { type: 'application/json' });
      
      try {
        // Modern browsers support sendBeacon with custom headers via Blob
        navigator.sendBeacon(leaveUrl, blob);
        console.log('🚪 Auto-leave triggered: tab closing');
      } catch (error) {
        // Fallback: synchronous fetch (may not complete)
        console.warn('sendBeacon failed, attempting synchronous leave:', error);
        fetch(leaveUrl, {
          method: 'POST',
          headers,
          body,
          keepalive: true, // Keep request alive even after page unload
        }).catch(err => console.error('Failed to send leave request:', err));
      }
      
      // Don't show confirmation dialog (per user requirement)
      // e.preventDefault();
      // e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [attendanceId, token]);

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
        label={
          isActive 
            ? (tabFocused ? 'Tracking Active' : 'Active (Background)') 
            : 'Idle Detected'
        }
        color={isActive ? (tabFocused ? 'success' : 'info') : 'warning'}
        size="small"
        sx={{
          animation: isActive && tabFocused ? 'pulse 2s infinite' : 'none',
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


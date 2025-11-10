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
import { Box, Chip } from '@mui/material';
import { FiberManualRecord } from '@mui/icons-material';
import { authServiceV2 } from '../services/authService-v2';

interface ActivityMonitorProps {
  attendanceId: string;
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
  const activityThrottle = useRef<NodeJS.Timeout | null>(null);
  const isCurrentlyInMeeting = useRef<boolean>(true); // Track if user is currently in meeting
  const lastWindowState = useRef<boolean>(!document.hidden);
  
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
  const ACTIVITY_THROTTLE_MS = 2000; // Throttle activity events to every 2 seconds
  const WINDOW_HIDDEN_THRESHOLD = 5000; // 5 seconds hidden = leave event

  // Track user activity - ENHANCED (Tier 2)
  useEffect(() => {
    const updateActivity = () => {
      setLastActivityTime(Date.now());
      if (!isActive) {
        setIsActive(true);
        onActivityChange?.(true);
      }
    };

    // Track mouse activity separately and send to backend
    const handleMouseActivity = (event?: MouseEvent) => {
      activityData.current.mouseActivity++;
      activityData.current.lastMouseMove = Date.now();
      updateActivity();
      
      // Throttle activity event sending
      if (activityThrottle.current === null) {
        activityThrottle.current = setTimeout(async () => {
          try {
            const result = await authServiceV2.trackActivity(attendanceId, 'MOUSE_MOVE', {
              x: event?.clientX,
              y: event?.clientY,
              timestamp: new Date().toISOString(),
            });
            if (!result.success) {
              console.error('❌ Failed to track mouse activity:', result.error);
            } else {
              console.debug('✅ Mouse activity tracked');
            }
          } catch (error: any) {
            console.error('❌ Error tracking mouse activity:', error?.message || error);
          }
          activityThrottle.current = null;
        }, ACTIVITY_THROTTLE_MS);
      }
    };

    // Track keyboard activity separately and send to backend
    const handleKeyboardActivity = (event?: KeyboardEvent) => {
      activityData.current.keyboardActivity++;
      activityData.current.lastKeyPress = Date.now();
      updateActivity();
      
      // Send keyboard event immediately (less frequent than mouse)
      authServiceV2.trackActivity(attendanceId, 'KEYBOARD', {
        key: event?.key,
        code: event?.code,
        timestamp: new Date().toISOString(),
      }).then((result) => {
        if (!result.success) {
          console.error('❌ Failed to track keyboard activity:', result.error);
        } else {
          console.debug('✅ Keyboard activity tracked');
        }
      }).catch((error: any) => {
        console.error('❌ Error tracking keyboard activity:', error?.message || error);
      });
    };

    // Listen to user interactions
    window.addEventListener('mousemove', handleMouseActivity);
    window.addEventListener('mousedown', (e) => {
      handleMouseActivity(e);
      // Also send click event
      authServiceV2.trackActivity(attendanceId, 'CLICK', {
        button: e.button,
        x: e.clientX,
        y: e.clientY,
        timestamp: new Date().toISOString(),
      }).then((result) => {
        if (!result.success) {
          console.error('❌ Failed to track click:', result.error);
        } else {
          console.debug('✅ Click activity tracked');
        }
      }).catch((error: any) => {
        console.error('❌ Error tracking click:', error?.message || error);
      });
    });
    window.addEventListener('keypress', handleKeyboardActivity);
    window.addEventListener('keydown', handleKeyboardActivity);
    window.addEventListener('scroll', () => {
      updateActivity();
      authServiceV2.trackActivity(attendanceId, 'SCROLL', {
        timestamp: new Date().toISOString(),
      }).then((result) => {
        if (!result.success) {
          console.error('❌ Failed to track scroll:', result.error);
        } else {
          console.debug('✅ Scroll activity tracked');
        }
      }).catch((error: any) => {
        console.error('❌ Error tracking scroll:', error?.message || error);
      });
    });
    window.addEventListener('touchstart', updateActivity);

    // Listen to page visibility and track focus time
    // Also track leave/rejoin events when window visibility changes
    const handleVisibilityChange = async () => {
      const isNowVisible = !document.hidden;
      const wasVisible = lastWindowState.current;
      
      setTabFocused(isNowVisible);
      
      // Track window state changes for leave/rejoin detection
      if (!wasVisible && isNowVisible) {
        // Window was hidden, now visible - potentially rejoined
        // Wait a bit to see if it's a real rejoin or just a brief flash
        setTimeout(async () => {
          if (!document.hidden && isCurrentlyInMeeting.current === false) {
            console.log('🔄 Window became visible - recording rejoin event');
            try {
              const result = await authServiceV2.rejoinMeeting(attendanceId);
              if (result.success) {
                isCurrentlyInMeeting.current = true;
                console.log('✅ Rejoin event recorded successfully');
              }
            } catch (error) {
              console.error('Failed to record rejoin:', error);
            }
          }
        }, 1000);
      } else if (wasVisible && !isNowVisible) {
        // Window was visible, now hidden - potentially left
        // Wait threshold before recording leave (in case it's just a brief blur)
        setTimeout(async () => {
          if (document.hidden && isCurrentlyInMeeting.current === true) {
            console.log('👋 Window hidden for threshold - recording leave event');
            try {
              const result = await authServiceV2.leaveMeetingTemp(
                attendanceId,
                'Window hidden/tab switched'
              );
              if (result.success) {
                isCurrentlyInMeeting.current = false;
                console.log('✅ Leave event recorded successfully');
              }
            } catch (error) {
              console.error('Failed to record leave:', error);
            }
          }
        }, WINDOW_HIDDEN_THRESHOLD);
      }
      
      lastWindowState.current = isNowVisible;
      
      if (isNowVisible) {
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
      if (activityThrottle.current) {
        clearTimeout(activityThrottle.current);
      }
    };
  }, [isActive, onActivityChange, attendanceId]);

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
  // Uses new track-activity endpoint for consistent activity tracking
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
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
          // Meeting state
          inMeeting: isCurrentlyInMeeting.current,
        };
        
        // Send activity status via new track-activity endpoint
        await authServiceV2.trackActivity(
          attendanceId,
          isActive ? 'ACTIVE' : 'IDLE',
          metadata
        );

        console.log(`💓 Enhanced heartbeat sent: ${isActive ? 'ACTIVE' : 'IDLE'}`, {
          mouse: metadata.mouseActivityCount,
          keyboard: metadata.keyboardActivityCount,
          focusTime: `${Math.round(metadata.tabFocusTimeMs / 1000)}s`,
          video: cameraOn ? 'ON' : 'OFF',
          audio: audioOn ? 'ON' : 'OFF',
          inMeeting: isCurrentlyInMeeting.current,
        });
        
        // Reset counters after sending
        activityData.current.mouseActivity = 0;
        activityData.current.keyboardActivity = 0;
      } catch (error: any) {
        console.error('❌ Failed to send activity heartbeat:', error?.message || error);
        console.error('❌ Full error:', error);
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
  }, [attendanceId, isActive, lastActivityTime, tabFocused, cameraOn, audioOn]);

  // Note: Auto-leave detection removed - relies on server-side auto-completion
  // The scheduler will automatically complete meetings after their scheduled window ends
  // This ensures reliable processing even if user closes browser/Zoom abruptly

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


/**
 * Webcam Snapshot Capture Component
 * Automatically captures webcam snapshots during meetings for verification
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface WebcamSnapshotCaptureProps {
  attendanceRecordId: string;
  autoCapture?: boolean; // Automatically capture snapshots every X minutes
  captureIntervalMinutes?: number; // How often to capture (default: 10 minutes)
  onSnapshotCaptured?: (snapshotId: string) => void;
}

export const WebcamSnapshotCapture: React.FC<WebcamSnapshotCaptureProps> = ({
  attendanceRecordId,
  autoCapture = true,
  captureIntervalMinutes = 10,
  onSnapshotCaptured,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [meetingStartTime] = useState<Date>(new Date());
  const [lastCaptureTime, setLastCaptureTime] = useState<Date | null>(null);

  // Start webcam
  const startWebcam = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error accessing webcam:', err);
      setError('Unable to access webcam. Please ensure camera permissions are enabled.');
    }
  }, []);

  // Stop webcam
  const stopWebcam = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Capture snapshot
  const captureSnapshot = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;

    setIsCapturing(true);
    setError(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Canvas context not available');
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to base64 image
      const photoData = canvas.toDataURL('image/jpeg', 0.8);

      // Calculate how many minutes into the meeting
      const minuteIntoMeeting = Math.floor(
        (Date.now() - meetingStartTime.getTime()) / (1000 * 60)
      );

      // Upload to backend
      const API_BASE_URL =
        (import.meta as any).env?.VITE_API_BASE_URL ||
        'https://proofmeet-backend-production.up.railway.app/api';
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/verification/webcam-snapshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          attendanceRecordId,
          photoData,
          minuteIntoMeeting,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload snapshot');
      }

      const data = await response.json();
      setCaptureCount((prev) => prev + 1);
      setLastCaptureTime(new Date());

      if (onSnapshotCaptured) {
        onSnapshotCaptured(data.data.snapshotId);
      }
    } catch (err: any) {
      console.error('Error capturing snapshot:', err);
      setError(err.message || 'Failed to capture snapshot');
    } finally {
      setIsCapturing(false);
    }
  }, [attendanceRecordId, isCapturing, meetingStartTime, onSnapshotCaptured]);

  // Auto-capture effect
  useEffect(() => {
    if (!autoCapture || !stream) return;

    const intervalMs = captureIntervalMinutes * 60 * 1000;
    const interval = setInterval(() => {
      captureSnapshot();
    }, intervalMs);

    // Capture first snapshot after 30 seconds
    const initialTimeout = setTimeout(() => {
      captureSnapshot();
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [autoCapture, captureIntervalMinutes, stream, captureSnapshot]);

  // Start webcam on mount
  useEffect(() => {
    startWebcam();
    return () => {
      stopWebcam();
    };
  }, [startWebcam, stopWebcam]);

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        maxWidth: 600,
        mx: 'auto',
        mt: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <CameraAltIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">Identity Verification</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {stream && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Your webcam is being used to verify your attendance. Snapshots are captured every{' '}
          {captureIntervalMinutes} minutes.
        </Alert>
      )}

      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          bgcolor: '#000',
          borderRadius: 2,
          overflow: 'hidden',
          mb: 2,
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        {isCapturing && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
            }}
          >
            <CircularProgress color="primary" />
          </Box>
        )}
      </Box>

      {/* Hidden canvas for capturing snapshots */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Chip
            icon={<CheckCircleIcon />}
            label={`${captureCount} snapshot${captureCount !== 1 ? 's' : ''} captured`}
            color="success"
            size="small"
          />
          {lastCaptureTime && (
            <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
              Last: {lastCaptureTime.toLocaleTimeString()}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={captureSnapshot}
          disabled={!stream || isCapturing}
        >
          Capture Now
        </Button>
      </Box>
    </Paper>
  );
};

export default WebcamSnapshotCapture;


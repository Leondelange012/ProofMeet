/**
 * ID Photo Upload Component
 * Allows participants to upload their ID photo for identity verification
 */

import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Card,
  CardMedia,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface IDPhotoUploadProps {
  onUploadComplete?: () => void;
}

export const IDPhotoUpload: React.FC<IDPhotoUploadProps> = ({ onUploadComplete }) => {
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [idType, setIdType] = useState<string>('');
  const [idState, setIdState] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoData(e.target?.result as string);
      setError(null);
      setShowCamera(false);
    };
    reader.readAsDataURL(file);
  };

  // Start camera
  const startCamera = async () => {
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
        setShowCamera(true);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please ensure camera permissions are enabled.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setShowCamera(false);
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to base64 image
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhotoData(photoDataUrl);
    stopCamera();
  };

  // Upload photo
  const handleUpload = async () => {
    if (!photoData) {
      setError('Please select or capture a photo');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const API_BASE_URL =
        (import.meta as any).env?.VITE_API_BASE_URL ||
        'https://proofmeet-backend-production.up.railway.app/api';
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/verification/id-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          photoData,
          idType: idType || undefined,
          idState: idState || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload ID photo');
      }

      setSuccess(true);
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err: any) {
      console.error('Error uploading ID photo:', err);
      setError(err.message || 'Failed to upload ID photo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Upload ID Photo
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload a photo of your government-issued ID for identity verification. This helps ensure
        that you are the person attending the meetings.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
          ID photo uploaded successfully! Court representatives will verify your identity.
        </Alert>
      )}

      {!success && (
        <>
          {/* Photo preview */}
          {photoData && !showCamera && (
            <Card sx={{ mb: 3 }}>
              <CardMedia
                component="img"
                image={photoData}
                alt="ID Photo Preview"
                sx={{ maxHeight: 400, objectFit: 'contain' }}
              />
            </Card>
          )}

          {/* Camera view */}
          {showCamera && (
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16/9',
                  bgcolor: '#000',
                  borderRadius: 2,
                  overflow: 'hidden',
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
              </Box>
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button variant="contained" onClick={capturePhoto} fullWidth>
                  Capture Photo
                </Button>
                <Button variant="outlined" onClick={stopCamera} fullWidth>
                  Cancel
                </Button>
              </Box>
            </Box>
          )}

          {/* Hidden canvas for capturing camera photos */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Upload options */}
          {!showCamera && !photoData && (
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<CloudUploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                fullWidth
              >
                Choose File
              </Button>
              <Button
                variant="outlined"
                startIcon={<CameraAltIcon />}
                onClick={startCamera}
                fullWidth
              >
                Use Camera
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </Box>
          )}

          {/* ID details (optional) */}
          {photoData && !showCamera && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                ID Details (Optional)
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>ID Type</InputLabel>
                  <Select
                    value={idType}
                    label="ID Type"
                    onChange={(e) => setIdType(e.target.value)}
                  >
                    <MenuItem value="DRIVERS_LICENSE">Driver's License</MenuItem>
                    <MenuItem value="STATE_ID">State ID</MenuItem>
                    <MenuItem value="PASSPORT">Passport</MenuItem>
                    <MenuItem value="OTHER">Other</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>State</InputLabel>
                  <Select
                    value={idState}
                    label="State"
                    onChange={(e) => setIdState(e.target.value)}
                  >
                    <MenuItem value="CA">California</MenuItem>
                    <MenuItem value="NY">New York</MenuItem>
                    <MenuItem value="TX">Texas</MenuItem>
                    <MenuItem value="FL">Florida</MenuItem>
                    {/* Add more states as needed */}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleUpload}
                  disabled={isUploading}
                  fullWidth
                >
                  {isUploading ? <CircularProgress size={24} /> : 'Upload ID Photo'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setPhotoData(null);
                    setIdType('');
                    setIdState('');
                  }}
                  disabled={isUploading}
                  fullWidth
                >
                  Choose Different Photo
                </Button>
              </Box>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};

export default IDPhotoUpload;


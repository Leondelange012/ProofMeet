import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Assessment,
  Download,
  Warning,
  CheckCircle,
} from '@mui/icons-material';

const CompliancePage: React.FC = () => {
  const [reportPeriod, setReportPeriod] = useState('monthly');

  // Mock data - in real app, this would come from API
  const complianceData = {
    currentPeriod: {
      start: '2024-01-01',
      end: '2024-01-31',
      required: 12,
      attended: 11,
      percentage: 91.7,
    },
    recentReports: [
      {
        id: '1',
        period: 'December 2023',
        required: 12,
        attended: 12,
        percentage: 100,
        status: 'compliant',
      },
      {
        id: '2',
        period: 'November 2023',
        required: 12,
        attended: 10,
        percentage: 83.3,
        status: 'warning',
      },
      {
        id: '3',
        period: 'October 2023',
        required: 12,
        attended: 8,
        percentage: 66.7,
        status: 'non-compliant',
      },
    ],
    attendanceHistory: [
      {
        id: '1',
        date: '2024-01-15',
        type: 'AA',
        duration: 60,
        status: 'completed',
        compliance: 100,
      },
      {
        id: '2',
        date: '2024-01-12',
        type: 'NA',
        duration: 45,
        status: 'completed',
        compliance: 75,
      },
      {
        id: '3',
        date: '2024-01-10',
        type: 'SMART',
        duration: 30,
        status: 'flagged',
        compliance: 50,
      },
      {
        id: '4',
        date: '2024-01-08',
        type: 'AA',
        duration: 60,
        status: 'completed',
        compliance: 100,
      },
    ],
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'success';
      case 'warning':
        return 'warning';
      case 'non-compliant':
        return 'error';
      case 'completed':
        return 'success';
      case 'flagged':
        return 'error';
      default:
        return 'default';
    }
  };

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 70) return 'warning';
    return 'error';
  };

  const handleDownloadReport = () => {
    // In real app, this would generate and download a PDF report
    console.log('Downloading compliance report...');
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Compliance Reports
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your meeting attendance and compliance status
        </Typography>
      </Box>

      {/* Current Period Overview */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Current Period</Typography>
            <Chip
              label={`${complianceData.currentPeriod.percentage}% Compliant`}
              color={getComplianceColor(complianceData.currentPeriod.percentage) as any}
            />
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Meetings Required
              </Typography>
              <Typography variant="h4">
                {complianceData.currentPeriod.required}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Meetings Attended
              </Typography>
              <Typography variant="h4">
                {complianceData.currentPeriod.attended}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Compliance Rate
              </Typography>
              <Typography variant="h4">
                {complianceData.currentPeriod.percentage}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={complianceData.currentPeriod.percentage}
                color={getComplianceColor(complianceData.currentPeriod.percentage)}
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Report Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Report Period</InputLabel>
          <Select
            value={reportPeriod}
            label="Report Period"
            onChange={(e) => setReportPeriod(e.target.value)}
          >
            <MenuItem value="weekly">Weekly</MenuItem>
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="quarterly">Quarterly</MenuItem>
          </Select>
        </FormControl>
        
        <Button
          variant="contained"
          startIcon={<Download />}
          onClick={handleDownloadReport}
        >
          Download Report
        </Button>
      </Box>

      {/* Recent Reports */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Reports
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Period</TableCell>
                  <TableCell align="right">Required</TableCell>
                  <TableCell align="right">Attended</TableCell>
                  <TableCell align="right">Compliance</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {complianceData.recentReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>{report.period}</TableCell>
                    <TableCell align="right">{report.required}</TableCell>
                    <TableCell align="right">{report.attended}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {report.percentage}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={report.percentage}
                          color={getComplianceColor(report.percentage)}
                          sx={{ width: 60, height: 6 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={report.status}
                        color={getStatusColor(report.status) as any}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Attendance History
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Duration</TableCell>
                  <TableCell align="right">Compliance</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {complianceData.attendanceHistory.map((attendance) => (
                  <TableRow key={attendance.id}>
                    <TableCell>
                      {new Date(attendance.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{attendance.type}</TableCell>
                    <TableCell align="right">{attendance.duration} min</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {attendance.compliance}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={attendance.compliance}
                          color={getComplianceColor(attendance.compliance)}
                          sx={{ width: 60, height: 6 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={attendance.status}
                        color={getStatusColor(attendance.status) as any}
                        size="small"
                        icon={
                          attendance.status === 'completed' ? (
                            <CheckCircle />
                          ) : (
                            <Warning />
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Container>
  );
};

export default CompliancePage;

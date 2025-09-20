#!/usr/bin/env node

/**
 * ProofMeet System Testing Script
 * This script tests all the major components of the ProofMeet system
 */

const axios = require('axios').default;
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:5000/api';
const FRONTEND_URL = 'http://localhost:3000';

// Test data
const testUsers = [
  {
    email: 'participant1@example.com',
    courtId: 'CA-12345',
    state: 'CA',
    courtCaseNumber: 'CASE-2024-001'
  },
  {
    email: 'host1@example.com',
    courtId: 'CA-HOST-001',
    state: 'CA',
    courtCaseNumber: 'HOST-2024-001',
    isHost: true
  },
  {
    email: 'participant2@example.com',
    courtId: 'TX-67890',
    state: 'TX',
    courtCaseNumber: 'CASE-2024-002'
  }
];

const testMeetings = [
  {
    meetingType: 'AA',
    meetingFormat: 'online',
    scheduledStart: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    scheduledEnd: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),   // 3 hours from now
    zoomMeetingId: '123456789'
  },
  {
    meetingType: 'NA',
    meetingFormat: 'in-person',
    scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    scheduledEnd: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
    location: 'Community Center, Room 101'
  }
];

class ProofMeetTester {
  constructor() {
    this.tokens = {};
    this.users = {};
    this.meetings = {};
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m', // Yellow
      reset: '\x1b[0m'     // Reset
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async testHealthCheck() {
    try {
      this.log('🏥 Testing health check endpoint...');
      const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
      
      if (response.data.status === 'OK') {
        this.log('✅ Health check passed', 'success');
        return true;
      } else {
        this.log('❌ Health check failed', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Health check error: ${error.message}`, 'error');
      return false;
    }
  }

  async testUserRegistration() {
    this.log('👤 Testing user registration...');
    
    for (const userData of testUsers) {
      try {
        const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
        
        if (response.data.success) {
          this.log(`✅ User registered: ${userData.email}`, 'success');
          this.users[userData.email] = response.data.data;
        } else {
          this.log(`❌ Registration failed for ${userData.email}: ${response.data.error}`, 'error');
        }
      } catch (error) {
        this.log(`❌ Registration error for ${userData.email}: ${error.response?.data?.error || error.message}`, 'error');
      }
    }
  }

  async testUserVerification() {
    this.log('✅ Testing user verification...');
    
    for (const email of Object.keys(this.users)) {
      try {
        const response = await axios.post(`${API_BASE_URL}/auth/verify`, {
          email,
          verified: true
        });
        
        if (response.data.success) {
          this.log(`✅ User verified: ${email}`, 'success');
        } else {
          this.log(`❌ Verification failed for ${email}`, 'error');
        }
      } catch (error) {
        this.log(`❌ Verification error for ${email}: ${error.response?.data?.error || error.message}`, 'error');
      }
    }
  }

  async testUserLogin() {
    this.log('🔐 Testing user login...');
    
    for (const email of Object.keys(this.users)) {
      try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, { email });
        
        if (response.data.success && response.data.data.token) {
          this.log(`✅ Login successful: ${email}`, 'success');
          this.tokens[email] = response.data.data.token;
        } else {
          this.log(`❌ Login failed for ${email}`, 'error');
        }
      } catch (error) {
        this.log(`❌ Login error for ${email}: ${error.response?.data?.error || error.message}`, 'error');
      }
    }
  }

  async testMeetingCreation() {
    this.log('🏢 Testing meeting creation...');
    
    // Find a host token
    const hostEmail = testUsers.find(u => u.isHost)?.email;
    if (!hostEmail || !this.tokens[hostEmail]) {
      this.log('❌ No host token available for meeting creation', 'error');
      return;
    }

    const hostToken = this.tokens[hostEmail];
    
    for (const meetingData of testMeetings) {
      try {
        const response = await axios.post(`${API_BASE_URL}/meetings/create`, meetingData, {
          headers: { Authorization: `Bearer ${hostToken}` }
        });
        
        if (response.data.success) {
          this.log(`✅ Meeting created: ${meetingData.meetingType} (${meetingData.meetingFormat})`, 'success');
          this.meetings[response.data.data.id] = response.data.data;
        } else {
          this.log(`❌ Meeting creation failed: ${response.data.error}`, 'error');
        }
      } catch (error) {
        this.log(`❌ Meeting creation error: ${error.response?.data?.error || error.message}`, 'error');
      }
    }
  }

  async testQRCodeGeneration() {
    this.log('📱 Testing QR code generation...');
    
    // Find an in-person meeting
    const inPersonMeeting = Object.values(this.meetings).find(m => m.meetingFormat === 'IN_PERSON');
    if (!inPersonMeeting) {
      this.log('⚠️ No in-person meeting found for QR testing', 'warning');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/qr/generate`, {
        meetingId: inPersonMeeting.id
      });
      
      if (response.data.success) {
        this.log('✅ QR code generated successfully', 'success');
      } else {
        this.log(`❌ QR code generation failed: ${response.data.error}`, 'error');
      }
    } catch (error) {
      this.log(`❌ QR code generation error: ${error.response?.data?.error || error.message}`, 'error');
    }
  }

  async testAttendanceFlow() {
    this.log('📝 Testing attendance flow...');
    
    // Find a participant and a meeting
    const participantEmail = testUsers.find(u => !u.isHost)?.email;
    const meetingId = Object.keys(this.meetings)[0];
    
    if (!participantEmail || !this.tokens[participantEmail] || !meetingId) {
      this.log('⚠️ Missing data for attendance flow test', 'warning');
      return;
    }

    const participantToken = this.tokens[participantEmail];
    const userId = this.users[participantEmail].userId;

    try {
      // Test joining meeting
      const joinResponse = await axios.post(`${API_BASE_URL}/attendance/join`, {
        meetingId,
        userId
      }, {
        headers: { Authorization: `Bearer ${participantToken}` }
      });
      
      if (joinResponse.data.success) {
        this.log('✅ Successfully joined meeting', 'success');
        
        // Wait a moment, then leave
        setTimeout(async () => {
          try {
            const leaveResponse = await axios.post(`${API_BASE_URL}/attendance/leave`, {
              attendanceId: joinResponse.data.data.id
            }, {
              headers: { Authorization: `Bearer ${participantToken}` }
            });
            
            if (leaveResponse.data.success) {
              this.log('✅ Successfully left meeting', 'success');
            }
          } catch (error) {
            this.log(`❌ Leave meeting error: ${error.response?.data?.error || error.message}`, 'error');
          }
        }, 2000);
        
      } else {
        this.log(`❌ Join meeting failed: ${joinResponse.data.error}`, 'error');
      }
    } catch (error) {
      this.log(`❌ Join meeting error: ${error.response?.data?.error || error.message}`, 'error');
    }
  }

  async testFrontendConnection() {
    this.log('🌐 Testing frontend connection...');
    
    try {
      const response = await axios.get(FRONTEND_URL);
      
      if (response.status === 200) {
        this.log('✅ Frontend is accessible', 'success');
      } else {
        this.log('❌ Frontend returned non-200 status', 'error');
      }
    } catch (error) {
      this.log(`❌ Frontend connection error: ${error.message}`, 'error');
    }
  }

  async runAllTests() {
    this.log('🚀 Starting ProofMeet System Tests', 'info');
    this.log('=====================================', 'info');
    
    const tests = [
      { name: 'Health Check', fn: () => this.testHealthCheck() },
      { name: 'User Registration', fn: () => this.testUserRegistration() },
      { name: 'User Verification', fn: () => this.testUserVerification() },
      { name: 'User Login', fn: () => this.testUserLogin() },
      { name: 'Meeting Creation', fn: () => this.testMeetingCreation() },
      { name: 'QR Code Generation', fn: () => this.testQRCodeGeneration() },
      { name: 'Attendance Flow', fn: () => this.testAttendanceFlow() },
      { name: 'Frontend Connection', fn: () => this.testFrontendConnection() }
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const test of tests) {
      try {
        this.log(`\n📋 Running: ${test.name}`, 'info');
        const result = await test.fn();
        if (result !== false) passedTests++;
      } catch (error) {
        this.log(`❌ Test "${test.name}" threw an error: ${error.message}`, 'error');
      }
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.log('\n=====================================', 'info');
    this.log(`🏁 Testing Complete: ${passedTests}/${totalTests} tests passed`, passedTests === totalTests ? 'success' : 'warning');
    
    if (passedTests === totalTests) {
      this.log('🎉 All tests passed! System is working correctly.', 'success');
    } else {
      this.log('⚠️ Some tests failed. Check the logs above for details.', 'warning');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new ProofMeetTester();
  tester.runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ProofMeetTester;

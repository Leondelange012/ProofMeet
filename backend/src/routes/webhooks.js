const express = require('express');
const router = express.Router();

// Zoom webhook verification endpoint
router.get('/zoom', (req, res) => {
  // Zoom sends a GET request with a challenge parameter for verification
  const challenge = req.query.challenge;
  
  if (challenge) {
    console.log('📞 Zoom webhook verification request received');
    // Echo back the challenge to verify our endpoint
    res.status(200).json({
      challenge: challenge
    });
  } else {
    res.status(400).json({ error: 'No challenge parameter provided' });
  }
});

// Zoom webhook events handler
router.post('/zoom', (req, res) => {
  try {
    const event = req.body;
    
    console.log('📅 Zoom webhook event received:', event.event);
    console.log('Event data:', JSON.stringify(event, null, 2));
    
    // Handle different event types
    switch (event.event) {
      case 'meeting.started':
        handleMeetingStarted(event);
        break;
        
      case 'meeting.ended':
        handleMeetingEnded(event);
        break;
        
      case 'meeting.participant_joined':
        handleParticipantJoined(event);
        break;
        
      case 'meeting.participant_left':
        handleParticipantLeft(event);
        break;
        
      default:
        console.log('⚠️ Unhandled event type:', event.event);
    }
    
    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('❌ Error processing Zoom webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Event handlers
function handleMeetingStarted(event) {
  console.log('🟢 Meeting started:', event.payload.object.id);
  // TODO: Update meeting status in database
}

function handleMeetingEnded(event) {
  console.log('🔴 Meeting ended:', event.payload.object.id);
  // TODO: Update meeting status and calculate attendance
}

function handleParticipantJoined(event) {
  const participant = event.payload.object.participant;
  console.log('👋 Participant joined:', participant.user_name, participant.email);
  // TODO: Record join time in attendance table
}

function handleParticipantLeft(event) {
  const participant = event.payload.object.participant;
  console.log('👋 Participant left:', participant.user_name, participant.email);
  // TODO: Record leave time in attendance table
}

module.exports = router;

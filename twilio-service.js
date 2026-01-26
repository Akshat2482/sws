// Twilio Voice Calling Service for Emergency Alerts
// Simplified version for beginners

const twilio = require('twilio');

class TwilioVoiceService {
  constructor() {
    // Load configuration from environment variables
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    this.mockMode = process.env.TWILIO_MOCK_MODE === 'true';

    // Initialize Twilio client (unless in mock mode)
    if (!this.mockMode) {
      if (!this.accountSid || !this.authToken || !this.fromNumber) {
        console.error('❌ ERROR: Twilio credentials not configured in .env file');
        console.error('   Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER');
        return;
      }

      this.client = twilio(this.accountSid, this.authToken);
      console.log('✅ Twilio Voice Service initialized');
    } else {
      console.log('🧪 Twilio Voice Service in MOCK MODE (no real calls will be made)');
    }
  }

  /**
   * Make an emergency voice call
   * @param {string} toNumber - Phone number to call (E.164 format: +1234567890)
   * @param {number} temperature - Current temperature in Fahrenheit
   * @returns {Promise<object>} Call result with SID and status
   */
  async makeEmergencyCall(toNumber, temperature) {
    const message = this.buildEmergencyMessage(temperature);

    // MOCK MODE: Just log what would happen, don't make real call
    if (this.mockMode) {
      console.log('🧪 MOCK CALL - Would call:', toNumber);
      console.log('   Message:', message);

      return {
        sid: 'MOCK_CALL_' + Date.now(),
        status: 'completed',
        to: toNumber,
        from: this.fromNumber || 'MOCK_NUMBER',
        mock: true
      };
    }

    // REAL MODE: Make actual Twilio call
    try {
      const call = await this.client.calls.create({
        to: toNumber,
        from: this.fromNumber,
        twiml: this.generateTwiML(message),
        statusCallback: process.env.SERVER_URL + '/api/twilio/call-status',
        statusCallbackEvent: ['completed'],
        timeout: 60  // Ring for 60 seconds before giving up
      });

      console.log(`📞 Emergency call initiated to ${toNumber}`);
      console.log(`   Call SID: ${call.sid}`);

      return {
        sid: call.sid,
        status: call.status,
        to: call.to,
        from: call.from
      };

    } catch (error) {
      console.error(`❌ Failed to make emergency call to ${toNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Build the emergency message to be spoken
   * @param {number} temperature - Current temperature in Fahrenheit
   * @returns {string} Message to be spoken
   */
  buildEmergencyMessage(temperature) {
    const message =
      `Emergency alert from your Smart Weather Station. ` +
      `Critical high temperature detected: ${Math.round(temperature)} degrees Fahrenheit. ` +
      `This is a fire hazard warning. ` +
      `Please check your weather station immediately. ` +
      `This message will repeat.`;

    return message;
  }

  /**
   * Generate TwiML (Twilio Markup Language) for the voice call
   * @param {string} message - Message to speak
   * @returns {string} TwiML XML
   */
  generateTwiML(message) {
    const voiceName = process.env.TWILIO_VOICE_NAME || 'Polly.Joanna';

    // TwiML format: Speak the message twice for clarity
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voiceName}" language="en-US">${message}</Say>
  <Pause length="1"/>
  <Say voice="${voiceName}" language="en-US">${message}</Say>
</Response>`;

    return twiml;
  }

  /**
   * Check if service is properly configured and ready
   * @returns {boolean} True if service is ready
   */
  isReady() {
    if (this.mockMode) return true;
    return !!(this.client && this.fromNumber);
  }
}

// Export the service
module.exports = TwilioVoiceService;

/**
 * AWS Lambda Function - Emergency Calling Service
 *
 * This function is triggered by AWS IoT when high temperature is detected.
 * It calls emergency contacts via Twilio when temperature >= 100°F
 *
 * Triggered by: AWS IoT Rule
 * Dependencies: aws-sdk, twilio
 */

const AWS = require('aws-sdk');
const twilio = require('twilio');

// Initialize AWS Services
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Configuration from Environment Variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE || 'EmergencyContacts';
const EMERGENCY_TEMP_THRESHOLD = parseInt(process.env.EMERGENCY_TEMP_THRESHOLD) || 85; // Fahrenheit (85 for demo, 100 for production)
const COOLDOWN_PERIOD = 15 * 60 * 1000; // 15 minutes in milliseconds

// Initialize Twilio Client
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

/**
 * Main Lambda Handler
 * @param {Object} event - IoT message payload { tempF, hum, air, light, date }
 * @param {Object} context - Lambda context
 */
exports.handler = async (event, context) => {
    console.log('📊 Received sensor data:', JSON.stringify(event));

    try {
        // Extract temperature from IoT message
        const temperature = event.tempF;

        if (!temperature) {
            console.log('⚠️  No temperature data in event');
            return { statusCode: 400, body: 'Missing temperature data' };
        }

        console.log(`🌡️  Current temperature: ${temperature}°F`);

        // Check if emergency threshold is met
        if (temperature < EMERGENCY_TEMP_THRESHOLD) {
            console.log(`✅ Temperature ${temperature}°F is below threshold ${EMERGENCY_TEMP_THRESHOLD}°F - No action needed`);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Temperature normal',
                    temperature: temperature,
                    threshold: EMERGENCY_TEMP_THRESHOLD
                })
            };
        }

        // EMERGENCY DETECTED!
        console.log(`🚨 EMERGENCY! Temperature ${temperature}°F >= ${EMERGENCY_TEMP_THRESHOLD}°F`);

        // Get emergency contacts from DynamoDB
        const contacts = await getEmergencyContacts();

        if (!contacts || contacts.length === 0) {
            console.log('⚠️  No emergency contacts configured');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'No emergency contacts to call',
                    temperature: temperature
                })
            };
        }

        console.log(`📞 Found ${contacts.length} emergency contact(s)`);

        // Check cooldown for each contact
        const contactsToCall = [];
        for (const contact of contacts) {
            if (!contact.enabled) {
                console.log(`⏭️  Skipping disabled contact: ${contact.name}`);
                continue;
            }

            const canCall = await checkCooldown(contact.contactId);
            if (canCall) {
                contactsToCall.push(contact);
            } else {
                console.log(`⏱️  Contact ${contact.name} is in cooldown period`);
            }
        }

        if (contactsToCall.length === 0) {
            console.log('⏱️  All contacts are in cooldown period');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'All contacts in cooldown',
                    temperature: temperature
                })
            };
        }

        console.log(`📞 Calling ${contactsToCall.length} contact(s)...`);

        // Make emergency calls
        const callResults = await makeEmergencyCalls(contactsToCall, temperature);

        // Update cooldown timestamps in DynamoDB
        await updateCooldowns(contactsToCall);

        console.log('✅ Emergency calls completed:', callResults);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Emergency calls initiated',
                temperature: temperature,
                contactsCalled: callResults.length,
                results: callResults
            })
        };

    } catch (error) {
        console.error('❌ Error in Lambda function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message,
                stack: error.stack
            })
        };
    }
};

/**
 * Get emergency contacts from DynamoDB
 */
async function getEmergencyContacts() {
    try {
        const params = {
            TableName: DYNAMODB_TABLE
        };

        const result = await dynamodb.scan(params).promise();
        return result.Items || [];

    } catch (error) {
        console.error('❌ Error fetching contacts from DynamoDB:', error);
        throw error;
    }
}

/**
 * Check if contact can be called (cooldown check)
 * @param {string} contactId - Contact ID
 * @returns {boolean} - True if can call
 */
async function checkCooldown(contactId) {
    try {
        const params = {
            TableName: DYNAMODB_TABLE,
            Key: { contactId: contactId }
        };

        const result = await dynamodb.get(params).promise();

        if (!result.Item || !result.Item.lastEmergencyCall) {
            return true; // Never called before
        }

        const lastCallTime = result.Item.lastEmergencyCall;
        const timeSinceLastCall = Date.now() - lastCallTime;

        return timeSinceLastCall > COOLDOWN_PERIOD;

    } catch (error) {
        console.error('❌ Error checking cooldown:', error);
        return true; // Allow call if error checking
    }
}

/**
 * Make emergency calls to all contacts
 * @param {Array} contacts - Array of contact objects
 * @param {number} temperature - Current temperature
 * @returns {Array} - Array of call results
 */
async function makeEmergencyCalls(contacts, temperature) {
    const results = [];

    for (const contact of contacts) {
        try {
            console.log(`📞 Calling ${contact.name} at ${contact.phone}...`);

            const call = await twilioClient.calls.create({
                to: contact.phone,
                from: TWILIO_PHONE_NUMBER,
                twiml: buildEmergencyTwiML(temperature),
                statusCallback: process.env.TWILIO_CALLBACK_URL,
                statusCallbackEvent: ['completed'],
                timeout: 60
            });

            results.push({
                contactId: contact.contactId,
                name: contact.name,
                phone: contact.phone,
                callSid: call.sid,
                status: 'initiated'
            });

            console.log(`✅ Call initiated to ${contact.name} - SID: ${call.sid}`);

        } catch (error) {
            console.error(`❌ Failed to call ${contact.name}:`, error.message);
            results.push({
                contactId: contact.contactId,
                name: contact.name,
                phone: contact.phone,
                error: error.message
            });
        }
    }

    return results;
}

/**
 * Build TwiML for emergency message
 * @param {number} temperature - Current temperature
 * @returns {string} - TwiML XML
 */
function buildEmergencyTwiML(temperature) {
    const message =
        `Emergency alert from your Smart Weather Station. ` +
        `Critical high temperature detected: ${Math.round(temperature)} degrees Fahrenheit. ` +
        `This is a fire hazard warning. ` +
        `Please check your weather station immediately. ` +
        `This message will repeat.`;

    const voiceName = process.env.TWILIO_VOICE_NAME || 'Polly.Joanna';

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voiceName}" language="en-US">${message}</Say>
  <Pause length="1"/>
  <Say voice="${voiceName}" language="en-US">${message}</Say>
</Response>`;
}

/**
 * Update cooldown timestamps for called contacts
 * @param {Array} contacts - Array of contacts that were called
 */
async function updateCooldowns(contacts) {
    const timestamp = Date.now();

    for (const contact of contacts) {
        try {
            const params = {
                TableName: DYNAMODB_TABLE,
                Key: { contactId: contact.contactId },
                UpdateExpression: 'SET lastEmergencyCall = :timestamp',
                ExpressionAttributeValues: {
                    ':timestamp': timestamp
                }
            };

            await dynamodb.update(params).promise();
            console.log(`✅ Updated cooldown for ${contact.name}`);

        } catch (error) {
            console.error(`❌ Error updating cooldown for ${contact.name}:`, error);
        }
    }
}

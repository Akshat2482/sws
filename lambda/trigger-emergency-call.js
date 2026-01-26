/**
 * AWS Lambda Function - Trigger Emergency Call (Browser-Initiated)
 *
 * This function is called by the browser when temperature threshold is exceeded.
 * It triggers the emergency calling system to make Twilio calls.
 *
 * Triggered by: Browser via API Gateway POST /api/emergency-call
 */

const AWS = require('aws-sdk');
const twilio = require('twilio');

// Initialize AWS Services
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Configuration from Environment Variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const DYNAMODB_TABLE = process.env.EMERGENCY_CONTACTS_TABLE || 'EmergencyContacts';
const COOLDOWN_PERIOD = 0; // No cooldown - immediate calls allowed

// Initialize Twilio Client
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

/**
 * Main Lambda Handler
 */
exports.handler = async (event, context) => {
    console.log('📨 Browser-initiated emergency call request:', JSON.stringify(event));

    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS preflight
    const method = event.requestContext?.http?.method || event.httpMethod;
    if (method === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // Parse request body
        const body = JSON.parse(event.body || '{}');
        const temperature = body.temperature;
        const reason = body.reason || 'High temperature detected';

        if (!temperature) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing temperature data' })
            };
        }

        console.log(`🌡️ Temperature: ${temperature}°F - Reason: ${reason}`);

        // Fetch emergency contacts from DynamoDB
        const contacts = await getEmergencyContacts();

        if (contacts.length === 0) {
            console.log('⚠️ No emergency contacts found');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'No emergency contacts configured',
                    temperature: temperature
                })
            };
        }

        console.log(`📞 Found ${contacts.length} emergency contact(s)`);

        // Filter contacts based on cooldown
        const now = Date.now();
        const contactsToCall = contacts.filter(contact => {
            if (!contact.enabled) return false;

            const lastCall = contact.lastEmergencyCall ? new Date(contact.lastEmergencyCall).getTime() : 0;
            const timeSinceLastCall = now - lastCall;

            if (timeSinceLastCall < COOLDOWN_PERIOD) {
                const minutesRemaining = Math.ceil((COOLDOWN_PERIOD - timeSinceLastCall) / 60000);
                console.log(`⏳ Skipping ${contact.name} - cooldown (${minutesRemaining} min remaining)`);
                return false;
            }

            return true;
        });

        if (contactsToCall.length === 0) {
            console.log('⏳ All contacts in cooldown period');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'All contacts in cooldown period (15 minutes)',
                    temperature: temperature
                })
            };
        }

        console.log(`📞 Calling ${contactsToCall.length} contact(s)...`);

        // Make calls to emergency contacts
        const callResults = await Promise.all(
            contactsToCall.map(contact => makeEmergencyCall(contact, temperature))
        );

        console.log('✅ Emergency calls completed:', callResults);

        return {
            statusCode: 200,
            headers,
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
            headers,
            body: JSON.stringify({
                error: error.message,
                stack: error.stack
            })
        };
    }
};

/**
 * Fetch emergency contacts from DynamoDB
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
 * Make emergency call via Twilio
 */
async function makeEmergencyCall(contact, temperature) {
    const callMessage = `Emergency alert from your Smart Weather Station.
    Critical high temperature detected: ${temperature} degrees Fahrenheit.
    This is a fire hazard warning.
    Please check your weather station immediately.
    This message will repeat.`;

    try {
        console.log(`📞 Calling ${contact.name} at ${contact.phone}...`);

        const call = await twilioClient.calls.create({
            to: contact.phone,
            from: TWILIO_PHONE_NUMBER,
            twiml: `
                <Response>
                    <Say voice="Polly.Joanna" loop="2">
                        ${callMessage}
                    </Say>
                </Response>
            `
        });

        console.log(`✅ Call initiated to ${contact.name} - SID: ${call.sid}`);

        // Update last call time in DynamoDB
        await updateLastCallTime(contact.contactId);

        return {
            contactId: contact.contactId,
            name: contact.name,
            phone: contact.phone,
            callSid: call.sid,
            status: 'initiated'
        };

    } catch (error) {
        console.error(`❌ Failed to call ${contact.name}:`, error);
        return {
            contactId: contact.contactId,
            name: contact.name,
            phone: contact.phone,
            error: error.message,
            status: 'failed'
        };
    }
}

/**
 * Update last emergency call timestamp in DynamoDB
 */
async function updateLastCallTime(contactId) {
    try {
        const params = {
            TableName: DYNAMODB_TABLE,
            Key: { contactId: contactId },
            UpdateExpression: 'SET lastEmergencyCall = :now',
            ExpressionAttributeValues: {
                ':now': new Date().toISOString()
            }
        };

        await dynamodb.update(params).promise();
        console.log(`✅ Updated cooldown for ${contactId}`);
    } catch (error) {
        console.error(`❌ Failed to update cooldown for ${contactId}:`, error);
    }
}

# Emergency Calling Setup Guide (For Beginners)

## What Was Added

Your Smart Weather Station now has **emergency voice calling**! When the temperature reaches **100°F or higher**, the system will automatically call your emergency contacts to alert them.

---

## ✅ What's Already Done

1. ✅ Twilio npm package installed
2. ✅ Emergency calling service created (`twilio-service.js`)
3. ✅ Server code updated with emergency call logic
4. ✅ API endpoints added for managing contacts
5. ✅ Currently running in **MOCK MODE** (no real calls yet)

---

## 🔧 Next Steps to Enable Real Calls

### Step 1: Create a Twilio Account (10 minutes)

1. **Go to Twilio**: Visit https://www.twilio.com/try-twilio
2. **Sign up for free**: You'll get $15 in free credit!
3. **Verify your email and phone number**

### Step 2: Get Your Twilio Credentials (5 minutes)

Once logged in to Twilio Console (https://console.twilio.com/):

1. **Get Account SID and Auth Token**:
   - On the dashboard, you'll see:
     - Account SID: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
     - Auth Token: Click "View" to reveal it
   - Copy both of these!

2. **Get a Phone Number**:
   - Click "Get a Twilio phone number"
   - Twilio will assign you a free phone number (e.g., `+1234567890`)
   - Copy this number!

### Step 3: Update Your .env File (3 minutes)

Open the file: `C:\Akshat 2025\sws\.env`

Replace these lines with your real Twilio credentials:

```env
# Emergency Calling Configuration (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx    ← Paste your Account SID here
TWILIO_AUTH_TOKEN=your_auth_token_here                 ← Paste your Auth Token here
TWILIO_PHONE_NUMBER=+1234567890                        ← Paste your Twilio phone number here
TWILIO_VOICE_NAME=Polly.Joanna
ENABLE_EMERGENCY_CALLS=true
TWILIO_MOCK_MODE=true                                  ← Keep as true for testing first
SERVER_URL=http://localhost:3000
```

**Save the file!**

### Step 4: Restart the Server (1 minute)

1. Stop the current server (Press Ctrl+C in the terminal)
2. Start it again:
   ```bash
   cd "C:\Akshat 2025\sws"
   node server.js
   ```

You should see:
```
✅ Twilio Voice Service initialized
✅ Emergency Calling Service Ready
```

---

## 📞 How to Add Emergency Contacts

You can add emergency contacts using the API or by adding a UI to your dashboard. Here's how to add contacts via API:

### Using curl (Command Line):

```bash
curl -X POST http://localhost:3000/api/emergency-contacts \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "YOUR_PUSH_SUBSCRIPTION_ENDPOINT",
    "contact": {
      "name": "Mom",
      "phone": "+1234567890"
    }
  }'
```

### Important Notes:

- **Phone Format**: Must use E.164 format: `+1234567890` (country code + number, no spaces)
- **Max Contacts**: You can add up to 5 emergency contacts
- **Get Endpoint**: Check your `push-subscriptions.json` file for the endpoint URL

---

## 🧪 Testing with Mock Mode (Recommended First!)

Before making real calls, test with mock mode:

1. **Keep `TWILIO_MOCK_MODE=true` in .env**
2. **Add an emergency contact** (see above)
3. **Trigger a test call**:

```bash
curl -X POST http://localhost:3000/api/test-emergency-call \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "YOUR_PUSH_SUBSCRIPTION_ENDPOINT",
    "contactId": "YOUR_CONTACT_ID"
  }'
```

You'll see in the server logs:
```
🧪 MOCK CALL - Would call: +1234567890
   Message: Emergency alert from your Smart Weather Station...
```

**No real call is made!** This is safe for testing.

---

## 📞 Enable Real Calls

When you're ready for real calls:

1. **Update .env**:
   ```env
   TWILIO_MOCK_MODE=false    ← Change to false
   ```

2. **Restart server**:
   ```bash
   node server.js
   ```

3. **Test with your own phone number first**:
   - Add your phone as a contact
   - Trigger a test call
   - You should receive a real phone call!

---

## 🚨 How It Works

**Emergency Trigger**: When temperature ≥ 100°F

**What Happens**:
1. System detects temperature is 100°F or higher
2. Checks if 15 minutes have passed since last emergency call (cooldown)
3. Calls ALL enabled emergency contacts
4. Each contact hears this message (spoken 2 times):

   > "Emergency alert from your Smart Weather Station.
   > Critical high temperature detected: 105 degrees Fahrenheit.
   > This is a fire hazard warning.
   > Please check your weather station immediately.
   > This message will repeat."

**Call Duration**: ~30 seconds
**Cost**: ~$0.01 per call (very cheap!)

---

## 💰 Costs

**Twilio Pricing**:
- Voice calls: $0.014 per minute
- Your calls: ~0.5 minutes = **~$0.01 per call**

**Examples**:
- 1 emergency with 1 contact = $0.01
- 1 emergency with 3 contacts = $0.03
- 10 emergencies per month with 2 contacts = $0.20/month

**Very affordable!** Your $15 free credit = ~1,500 emergency calls!

---

## 🔧 API Endpoints Reference

### Add Emergency Contact
```
POST /api/emergency-contacts
Body: { "endpoint": "...", "contact": { "name": "...", "phone": "+..." } }
```

### Get All Contacts
```
GET /api/emergency-contacts/:endpoint
```

### Update Contact
```
PUT /api/emergency-contacts/:contactId
Body: { "endpoint": "...", "updates": { "name": "...", "enabled": true } }
```

### Delete Contact
```
DELETE /api/emergency-contacts/:contactId
Body: { "endpoint": "..." }
```

### Test Call
```
POST /api/test-emergency-call
Body: { "endpoint": "...", "contactId": "..." }
```

---

## ⚠️ Safety Notes

1. **Test First**: Always test with mock mode before enabling real calls
2. **Cooldown**: 15-minute cooldown prevents spam (won't call repeatedly)
3. **Validate Phone Numbers**: Must use E.164 format (+1234567890)
4. **Not 911**: This system calls personal contacts only, not emergency services
5. **Sensor Accuracy**: Make sure your DHT11 sensor is working correctly

---

## 🐛 Troubleshooting

### "Emergency call service not configured"
- Check your `.env` file has correct Twilio credentials
- Make sure `ENABLE_EMERGENCY_CALLS=true`
- Restart the server

### "Invalid phone number format"
- Use E.164 format: `+1234567890`
- Include country code (+1 for USA)
- No spaces, dashes, or parentheses

### Calls not triggering
- Check temperature is actually ≥ 100°F
- Verify contacts are enabled (`enabled: true`)
- Check if cooldown period is active (15 minutes)
- Look at server logs for error messages

### Mock calls work but real calls don't
- Verify Twilio credentials are correct
- Check `TWILIO_MOCK_MODE=false` in .env
- Make sure you have credit in your Twilio account
- Check Twilio console for error logs

---

## 📊 Monitoring

Check your Twilio console to see:
- Call history
- Call durations
- Costs
- Failed calls
- Credit balance

Dashboard: https://console.twilio.com/

---

## 🎉 You're All Set!

Your emergency calling system is ready! When temperature hits 100°F:
1. ✅ System detects emergency
2. ✅ Waits for cooldown (if applicable)
3. ✅ Calls all enabled contacts
4. ✅ Speaks emergency message

**Stay safe!** 🔥🚨

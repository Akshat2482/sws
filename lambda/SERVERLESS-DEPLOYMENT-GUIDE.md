# Complete Serverless Deployment Guide
## Smart Weather Station - No Local Server Required!

---

## 🎯 What You're Building

A **100% serverless** Smart Weather Station with:
- ✅ **Emergency calling** when temp ≥ 100°F (Twilio voice calls)
- ✅ **Push notifications** for all alerts (browser notifications)
- ✅ **REST API** to manage subscriptions
- ✅ **No server running on your computer!**
- ✅ **Works 24/7** even when your computer is off

---

## 📊 Architecture Overview

```
ESP32 Sensor
    ↓
AWS IoT Core (Topic: sws-data)
    ↓
5 IoT Rules (filter by thresholds)
    ↓
    ┌─────────────┬──────────────┐
    ↓             ↓              ↓
Lambda 1      Lambda 2      Lambda 3
Emergency     Push          Subscription
Calling       Notifications  API
    ↓             ↓              ↓
Twilio       Web Push      DynamoDB
Calls        Browser       Storage
```

---

## 📋 Prerequisites

Before you start:
- ✅ AWS Account with admin access
- ✅ Twilio Account (Account SID, Auth Token, Phone Number)
- ✅ Your VAPID keys (from .env file)
- ✅ ESP32 already publishing to AWS IoT topic `sws-data`
- ✅ 60 minutes to complete deployment

---

## 🚀 Step-by-Step Deployment

### Part 1: Create DynamoDB Tables (10 minutes)

#### Table 1: EmergencyContacts

1. Go to **DynamoDB Console**: https://console.aws.amazon.com/dynamodb
2. Click **"Create table"**
3. **Settings**:
   - **Table name**: `EmergencyContacts`
   - **Partition key**: `contactId` (String)
   - **Billing mode**: On-demand
4. Click **"Create table"**
5. Wait for status: "Active"

**Add Your Contact:**
1. Click table → **"Explore table items"** → **"Create item"**
2. Switch to **"JSON view"**
3. Paste:
```json
{
  "contactId": "contact-akshat-001",
  "name": "Akshat",
  "phone": "+18016967235",
  "priority": 1,
  "enabled": true,
  "addedAt": "2026-01-24T20:00:00Z",
  "lastEmergencyCall": null
}
```
4. Click **"Create item"**

✅ **Emergency contacts table ready!**

#### Table 2: PushSubscriptions

1. Click **"Create table"** again
2. **Settings**:
   - **Table name**: `PushSubscriptions`
   - **Partition key**: `endpoint` (String)
   - **Billing mode**: On-demand
3. Click **"Create table"**
4. Wait for status: "Active"

✅ **Push subscriptions table ready!**

---

### Part 2: Package Lambda Functions (5 minutes)

**On your computer:**

1. Open Command Prompt or PowerShell
2. Navigate to lambda folder:
   ```bash
   cd "C:\Akshat 2025\sws\lambda"
   ```

3. Run deployment script:
   ```bash
   deploy-all.bat
   ```

This will create 3 .zip files:
- ✅ `emergency-calling-lambda.zip`
- ✅ `push-notification-lambda.zip`
- ✅ `subscription-api-lambda.zip`

**Wait for "SUCCESS!" message**

---

### Part 3: Deploy Lambda Functions (30 minutes)

#### Lambda 1: Emergency Calling Function

**Create Function:**
1. Go to **Lambda Console**: https://console.aws.amazon.com/lambda
2. Click **"Create function"**
3. **Settings**:
   - **Function name**: `EmergencyCallingFunction`
   - **Runtime**: Node.js 18.x
   - **Architecture**: x86_64
4. Click **"Create function"**

**Upload Code:**
1. Scroll to **"Code source"**
2. Click **"Upload from"** → **".zip file"**
3. Choose `emergency-calling-lambda.zip`
4. Click **"Save"**

**Configure Environment Variables:**
1. Go to **"Configuration"** → **"Environment variables"** → **"Edit"**
2. Add these:

| Key | Value |
|-----|-------|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Your Twilio number (e.g., +17722767849) |
| `DYNAMODB_TABLE` | `EmergencyContacts` |
| `TWILIO_VOICE_NAME` | `Polly.Joanna` |

3. Click **"Save"**

**Increase Timeout:**
1. Go to **"Configuration"** → **"General configuration"** → **"Edit"**
2. **Timeout**: `30 seconds`
3. **Memory**: `256 MB`
4. Click **"Save"**

**Add Permissions:**
1. Go to **"Configuration"** → **"Permissions"**
2. Click the **execution role name** (opens IAM)
3. Click **"Add permissions"** → **"Attach policies"**
4. Search and select: **"AmazonDynamoDBFullAccess"**
5. Click **"Add permissions"**

✅ **Lambda 1 deployed!**

---

#### Lambda 2: Push Notification Function

**Create Function:**
1. In Lambda Console, click **"Create function"**
2. **Settings**:
   - **Function name**: `PushNotificationFunction`
   - **Runtime**: Node.js 18.x
3. Click **"Create function"**

**Upload Code:**
1. **"Upload from"** → **".zip file"**
2. Choose `push-notification-lambda.zip`
3. Click **"Save"**

**Configure Environment Variables:**
1. **"Configuration"** → **"Environment variables"** → **"Edit"**
2. Add:

| Key | Value |
|-----|-------|
| `VAPID_PUBLIC_KEY` | (Copy from your .env file) |
| `VAPID_PRIVATE_KEY` | (Copy from your .env file) |
| `VAPID_SUBJECT` | `mailto:akshat@smartweatherstation.com` |
| `PUSH_SUBSCRIPTIONS_TABLE` | `PushSubscriptions` |

3. Click **"Save"**

**Increase Timeout & Add Permissions:**
1. Timeout: `15 seconds`
2. Memory: `256 MB`
3. Add **"AmazonDynamoDBFullAccess"** permission (same as Lambda 1)

✅ **Lambda 2 deployed!**

---

#### Lambda 3: Subscription API Function

**Create Function:**
1. Click **"Create function"**
2. **Settings**:
   - **Function name**: `SubscriptionAPIFunction`
   - **Runtime**: Node.js 18.x
3. Click **"Create function"**

**Upload Code:**
1. **"Upload from"** → **".zip file"**
2. Choose `subscription-api-lambda.zip`
3. Click **"Save"**

**Configure Environment Variables:**
1. Add:

| Key | Value |
|-----|-------|
| `VAPID_PUBLIC_KEY` | (Copy from your .env file) |
| `PUSH_SUBSCRIPTIONS_TABLE` | `PushSubscriptions` |

2. Click **"Save"**

**Timeout & Permissions:**
1. Timeout: `10 seconds`
2. Add **"AmazonDynamoDBFullAccess"** permission

✅ **Lambda 3 deployed!**

---

### Part 4: Create AWS IoT Rules (10 minutes)

**Get Your Lambda ARNs First:**
1. In each Lambda function page, copy the **Function ARN** (top right)
2. It looks like: `arn:aws:lambda:us-east-1:123456789012:function:FunctionName`

**You'll need ARNs for:**
- EmergencyCallingFunction
- PushNotificationFunction

---

#### Rule 1: Emergency Temperature Alert

1. Go to **AWS IoT Console**: https://console.aws.amazon.com/iot
2. Click **"Message routing"** → **"Rules"** → **"Create rule"**

**Step 1 - Properties:**
- **Rule name**: `EmergencyTemperatureAlert`
- **Description**: `Calls emergency contacts when temp >= 100F`
- Click **"Next"**

**Step 2 - SQL Statement:**
```sql
SELECT * FROM 'sws-data' WHERE tempF >= 100
```
- Click **"Next"**

**Step 3 - Rule Actions:**
- Choose **"Lambda"**
- **Function**: `EmergencyCallingFunction`
- Click **"Next"**

**Step 4 - Review:**
- Click **"Create"**
- **Allow** IoT to invoke Lambda (if prompted)

✅ **Emergency rule created!**

---

#### Rule 2: High Temperature Alert (Push)

1. **"Create rule"** again

**Properties:**
- **Rule name**: `HighTemperatureAlert`
- Click **"Next"**

**SQL:**
```sql
SELECT *, 'temp' AS alertType FROM 'sws-data' WHERE tempF >= 70
```
- Click **"Next"**

**Action:**
- Choose **"Lambda"**
- **Function**: `PushNotificationFunction`
- Click **"Next"** → **"Create"**

✅ **Temperature push rule created!**

---

#### Rule 3: High Humidity Alert

**Properties:**
- **Rule name**: `HighHumidityAlert`

**SQL:**
```sql
SELECT *, 'hum' AS alertType FROM 'sws-data' WHERE hum >= 60
```

**Action:**
- Lambda: `PushNotificationFunction`

✅ **Humidity rule created!**

---

#### Rule 4: Poor Air Quality Alert

**Properties:**
- **Rule name**: `PoorAirQualityAlert`

**SQL:**
```sql
SELECT *, 'air' AS alertType FROM 'sws-data' WHERE air >= 800
```

**Action:**
- Lambda: `PushNotificationFunction`

✅ **Air quality rule created!**

---

#### Rule 5: Low Light Alert

**Properties:**
- **Rule name**: `LowLightAlert`

**SQL:**
```sql
SELECT *, 'light' AS alertType FROM 'sws-data' WHERE light <= 200
```

**Action:**
- Lambda: `PushNotificationFunction`

✅ **Light rule created!**

---

### Part 5: Create API Gateway (10 minutes)

1. Go to **API Gateway Console**: https://console.aws.amazon.com/apigateway
2. Click **"Create API"**
3. Choose **"HTTP API"** → **"Build"**

**Step 1 - Integrations:**
- Click **"Add integration"**
- **Integration type**: Lambda
- **Lambda function**: `SubscriptionAPIFunction`
- **API name**: `SmartWeatherStationAPI`
- Click **"Next"**

**Step 2 - Configure routes:**
Add these 4 routes (click "Add route" for each):

| Method | Resource path |
|--------|---------------|
| GET | `/api/vapid-public-key` |
| POST | `/api/subscribe` |
| POST | `/api/unsubscribe` |
| GET | `/api/subscriptions` |

- Click **"Next"**

**Step 3 - Define stages:**
- **Stage name**: `prod`
- Click **"Next"**

**Step 4 - Review:**
- Click **"Create"**

**Enable CORS:**
1. Click **"CORS"** in left sidebar
2. **Access-Control-Allow-Origin**: `*`
3. **Access-Control-Allow-Headers**: `content-type`
4. **Access-Control-Allow-Methods**: `GET, POST, OPTIONS`
5. Click **"Save"**

**Get Your API URL:**
1. Click **"Stages"** → **"prod"**
2. Copy the **"Invoke URL"** (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com`)
3. **Save this URL** - you'll need it for your dashboard!

✅ **API Gateway deployed!**

---

### Part 6: Test Everything! (10 minutes)

#### Test 1: Emergency Calling

1. Go to **Lambda Console** → `EmergencyCallingFunction`
2. Click **"Test"** tab → **"Create new event"**
3. **Event name**: `HighTempTest`
4. **Event JSON**:
```json
{
  "tempF": 105,
  "hum": 50,
  "air": 0,
  "light": 2000
}
```
5. Click **"Save"** → **"Test"**

**Expected:**
- ✅ Execution succeeds
- ✅ Your phone rings! (+18016967235)
- ✅ CloudWatch logs show "Call initiated"

---

#### Test 2: Push Notifications

1. Go to `PushNotificationFunction`
2. **Test event**:
```json
{
  "tempF": 85,
  "hum": 50,
  "air": 0,
  "light": 2000,
  "alertType": "temp"
}
```
3. Click **"Test"**

**Expected:**
- ✅ Execution succeeds
- ✅ Logs show "No subscriptions" (normal - dashboard not connected yet)

---

#### Test 3: API Gateway

Open browser and visit:
```
https://YOUR-API-URL.execute-api.us-east-1.amazonaws.com/api/vapid-public-key
```

**Expected:**
```json
{"publicKey":"BDvqN8ASdjk6gruoXAD4u49xp6V3eT..."}
```

✅ **All tests passed!**

---

#### Test 4: Real Sensor Data

**Option A:** Heat your sensor above 100°F

**Option B:** Publish test data from IoT Console
1. Go to **IoT Console** → **MQTT test client**
2. **Publish to topic**: `sws-data`
3. **Message**:
```json
{
  "tempF": 102,
  "hum": 65,
  "air": 850,
  "light": 150,
  "date": 1234567890
}
```
4. Click **"Publish"**

**Expected:**
- ✅ Emergency call triggered (temp ≥ 100°F)
- ✅ Push notifications queued (multiple thresholds exceeded)
- ✅ Check CloudWatch logs to verify

---

### Part 7: Update Your Dashboard (5 minutes)

Your dashboard needs to use the new API Gateway URL instead of local server.

**Find this in your index.html** (around line 1250):
```javascript
const API_URL = 'http://localhost:3000';
```

**Replace with your API Gateway URL:**
```javascript
const API_URL = 'https://YOUR-API-URL.execute-api.us-east-1.amazonaws.com';
```

**Save and upload index.html to your S3 bucket / CloudFront**

✅ **Dashboard now uses serverless API!**

---

## 🎉 Deployment Complete!

### What You Built

✅ **3 Lambda Functions** (emergency calling, push notifications, API)
✅ **2 DynamoDB Tables** (contacts, subscriptions)
✅ **5 IoT Rules** (1 emergency + 4 push alerts)
✅ **1 API Gateway** (REST API for subscriptions)
✅ **100% Serverless** (no local server needed!)

---

## 💰 Cost Breakdown

**Monthly Costs** (assuming 10 emergencies/month, 100 regular alerts):

| Service | Usage | Cost |
|---------|-------|------|
| Lambda | 200 invocations | **FREE** (1M free tier) |
| DynamoDB | 500 reads/writes | **FREE** (25 GB free tier) |
| API Gateway | 100 requests | **FREE** (1M free tier) |
| IoT Rules | 1,000 messages | **FREE** (250K free tier) |
| Twilio Calls | 10 calls | **$0.10** |
| **TOTAL** | | **~$0.10/month** |

**First year:** Virtually FREE with AWS Free Tier!

---

## 📊 Monitoring & Logs

### CloudWatch Logs

**View logs for each Lambda:**
1. Lambda Console → Your function
2. **"Monitor"** → **"View logs in CloudWatch"**
3. Click latest log stream

**Look for:**
- `🚨 EMERGENCY DETECTED` (emergency calling)
- `📱 Found X subscription(s)` (push notifications)
- `✅ Call initiated` (Twilio success)

### Twilio Call Logs

**View call history:**
1. Twilio Console → Call logs
2. See: all calls, durations, costs

### DynamoDB Item Count

**Check stored data:**
1. DynamoDB Console → Your table
2. **"Explore table items"**
3. See all contacts/subscriptions

---

## 🔧 Managing Your System

### Add Emergency Contact

**In DynamoDB:**
1. Go to `EmergencyContacts` table
2. **"Create item"** → **"JSON view"**
3. Paste:
```json
{
  "contactId": "contact-mom-002",
  "name": "Mom",
  "phone": "+1234567890",
  "priority": 2,
  "enabled": true,
  "addedAt": "2026-01-24T20:00:00Z",
  "lastEmergencyCall": null
}
```

### Disable Emergency Calling Temporarily

**Edit contact:**
1. Find contact in DynamoDB
2. Change `"enabled": true` → `"enabled": false`

### Adjust IoT Rule Thresholds

**Edit rule:**
1. IoT Console → Rules → Select rule
2. Click **"Edit"**
3. Modify SQL (e.g., change `WHERE tempF >= 100` to `WHERE tempF >= 110`)
4. Click **"Update"**

---

## 🐛 Troubleshooting

### No emergency call received?

**Check CloudWatch logs:**
1. Does Lambda run? Check invocation count
2. Error messages? Check execution logs
3. Contact enabled? Check DynamoDB

**Common issues:**
- Wrong Twilio credentials
- Phone number format incorrect (+1234567890)
- Cooldown active (15 min)

### Push notifications not working?

**Check:**
1. Are there subscriptions in DynamoDB?
2. Is VAPID key correct in environment variables?
3. Check CloudWatch logs for errors

### API Gateway 404 error?

**Verify:**
1. All routes are configured
2. Lambda integration is correct
3. CORS is enabled
4. URL includes `/api/` prefix

### Lambda timeout?

**Increase timeout:**
1. Lambda → Configuration → General
2. Set to 30-60 seconds
3. Save

---

## 📚 Architecture Diagram

```
┌─────────────┐
│   ESP32     │
│   Sensor    │
└──────┬──────┘
       │ MQTT Publish
       ↓
┌─────────────────────┐
│   AWS IoT Core      │
│  Topic: sws-data    │
└──────┬──────────────┘
       │
       ├────────────┬──────────┬──────────┬──────────┐
       ↓            ↓          ↓          ↓          ↓
   [Rule 1]    [Rule 2]   [Rule 3]   [Rule 4]   [Rule 5]
   temp≥100    temp≥70    hum≥60     air≥800    light≤200
       │            │          │          │          │
       ↓            └──────────┴──────────┴──────────┘
   Lambda 1                     Lambda 2
   Emergency                    Push
   Calling                      Notifications
       │                            │
       ↓                            ↓
   ┌────────┐                  ┌─────────┐
   │ Twilio │                  │Web Push │
   │  Call  │                  │ Browser │
   └────────┘                  └─────────┘
       ↓                            ↑
   📞 Your Phone                    │
                                    │
┌──────────────┐              ┌────────────┐
│  Dashboard   │──── API ────→│  Lambda 3  │
│   Browser    │    Gateway   │ Subscription│
└──────────────┘              │    API     │
                              └──────┬─────┘
                                     │
                              ┌──────┴─────────┐
                              │   DynamoDB     │
                              │ - Emergency    │
                              │   Contacts     │
                              │ - Push         │
                              │   Subscriptions│
                              └────────────────┘
```

---

## 🆘 Need Help?

**Resources:**
- Lambda logs: CloudWatch Console
- IoT activity: IoT Console → Test → MQTT client
- Twilio logs: Twilio Console → Call logs
- AWS costs: Billing Dashboard

**Test commands:**
```bash
# Publish test message
aws iot-data publish --topic sws-data --payload '{"tempF":105,"hum":50,"air":0,"light":2000}'

# Test API endpoint
curl https://YOUR-API-URL/api/vapid-public-key
```

---

## 🎉 Congratulations!

You now have a **100% serverless** Smart Weather Station!

**What happens automatically:**
1. ✅ ESP32 publishes sensor data every 5 seconds
2. ✅ IoT Rules filter and route messages
3. ✅ Emergency calls when temp ≥ 100°F
4. ✅ Push notifications for all alerts
5. ✅ Dashboard connects via API Gateway
6. ✅ Everything runs 24/7 without your computer!

**Cost:** ~$0.10/month (just Twilio calls)

**Maintenance:** Zero! AWS manages everything!

---

**🚀 Your weather station is now in the cloud! 🎊**

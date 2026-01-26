# AWS Lambda Emergency Calling - Deployment Guide

## 🎯 What You're Deploying

A **serverless** emergency calling system that:
- ✅ Triggers automatically when temperature ≥ 100°F
- ✅ Calls your emergency contacts via Twilio
- ✅ Uses AWS Lambda (no server to manage!)
- ✅ Stores contacts in DynamoDB
- ✅ Costs ~$0.01 per emergency

---

## 📋 Prerequisites

- ✅ AWS Account with admin access
- ✅ Twilio Account (you already have this!)
- ✅ AWS CLI installed (optional but recommended)
- ✅ Your ESP32 already publishing to AWS IoT

---

## 🚀 Step-by-Step Deployment

### Step 1: Create DynamoDB Table (5 minutes)

**In AWS Console:**

1. Go to **DynamoDB Console**: https://console.aws.amazon.com/dynamodb
2. Click **"Create table"**
3. **Enter settings**:
   - **Table name**: `EmergencyContacts`
   - **Partition key**: `contactId` (String)
   - **Table settings**: Use default settings
   - **Billing mode**: On-demand (pay per request)
4. Click **"Create table"**
5. **Wait** for table to be created (1-2 minutes)

✅ **Table created!**

---

### Step 2: Add Your Emergency Contact to DynamoDB (3 minutes)

**In DynamoDB Console:**

1. Click on **"EmergencyContacts"** table
2. Click **"Explore table items"**
3. Click **"Create item"**
4. Click **"JSON view"**
5. **Paste this** (with YOUR phone number):

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

6. Click **"Create item"**

✅ **Contact added!**

**To add more contacts**: Repeat with different `contactId` values (contact-002, contact-003, etc.)

---

### Step 3: Create Lambda Function (10 minutes)

#### 3.1 Package the Lambda Function

**On your computer:**

1. Open terminal/command prompt
2. Navigate to lambda folder:
   ```bash
   cd "C:\Akshat 2025\sws\lambda"
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create deployment package:
   ```bash
   # On Windows (using PowerShell):
   Compress-Archive -Path emergency-calling-lambda.js,node_modules -DestinationPath emergency-calling-lambda.zip -Force

   # OR on Mac/Linux:
   zip -r emergency-calling-lambda.zip emergency-calling-lambda.js node_modules/
   ```

✅ **You now have `emergency-calling-lambda.zip`**

#### 3.2 Create Lambda Function in AWS

**In AWS Console:**

1. Go to **Lambda Console**: https://console.aws.amazon.com/lambda
2. Click **"Create function"**
3. **Configure function**:
   - **Function name**: `EmergencyCallingFunction`
   - **Runtime**: Node.js 18.x (or latest)
   - **Architecture**: x86_64
   - **Permissions**: Create new role with basic Lambda permissions
4. Click **"Create function"**

#### 3.3 Upload Code

1. In the function page, scroll to **"Code source"**
2. Click **"Upload from"** → **".zip file"**
3. Choose `emergency-calling-lambda.zip`
4. Click **"Save"**

✅ **Code uploaded!**

#### 3.4 Configure Environment Variables

1. Go to **"Configuration"** tab → **"Environment variables"**
2. Click **"Edit"** → **"Add environment variable"**
3. **Add these variables**:

| Key | Value |
|-----|-------|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID (starts with AC...) |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number (+17722767849) |
| `DYNAMODB_TABLE` | `EmergencyContacts` |
| `TWILIO_VOICE_NAME` | `Polly.Joanna` |

4. Click **"Save"**

✅ **Environment configured!**

#### 3.5 Increase Timeout

1. Go to **"Configuration"** → **"General configuration"**
2. Click **"Edit"**
3. **Change timeout**: `30 seconds` (default is 3 seconds, not enough for calls)
4. **Memory**: 256 MB (default is fine)
5. Click **"Save"**

#### 3.6 Add DynamoDB Permissions

1. Go to **"Configuration"** → **"Permissions"**
2. Click on the **execution role name** (opens IAM)
3. Click **"Add permissions"** → **"Attach policies"**
4. Search for **"AmazonDynamoDBFullAccess"**
5. Check the box and click **"Add permissions"**

✅ **Lambda function ready!**

---

### Step 4: Create AWS IoT Rule (5 minutes)

**In AWS IoT Console:**

1. Go to **AWS IoT Console**: https://console.aws.amazon.com/iot
2. Click **"Message routing"** → **"Rules"**
3. Click **"Create rule"**

#### 4.1 Rule Properties

- **Rule name**: `EmergencyTemperatureAlert`
- **Description**: `Triggers Lambda when temperature >= 100°F`

Click **"Next"**

#### 4.2 SQL Statement

**Paste this SQL**:

```sql
SELECT * FROM 'sws-data' WHERE tempF >= 100
```

This filters messages to only trigger when temperature is 100°F or higher!

Click **"Next"**

#### 4.3 Rule Actions

1. Click **"Lambda"** action
2. **Select function**: `EmergencyCallingFunction`
3. Click **"Next"**

#### 4.4 Review and Create

1. Review settings
2. Click **"Create"**

✅ **IoT Rule created!**

**Important**: AWS will ask permission for IoT to invoke your Lambda. Click **"Allow"**.

---

### Step 5: Test the System (5 minutes)

#### 5.1 Test Lambda Function Directly

1. Go to **Lambda Console** → Your function
2. Click **"Test"** tab
3. **Create new test event**:
   - **Event name**: `HighTempTest`
   - **Template**: hello-world
   - **Replace with**:

```json
{
  "tempF": 105,
  "hum": 50,
  "air": 0,
  "light": 2000
}
```

4. Click **"Save"**
5. Click **"Test"**

**You should**:
- ✅ See "Execution result: succeeded"
- ✅ Receive a phone call on +18016967235
- ✅ See logs showing call was made

#### 5.2 Check CloudWatch Logs

1. Go to **"Monitor"** tab → **"View logs in CloudWatch"**
2. Click latest log stream
3. You should see:
   ```
   🚨 EMERGENCY! Temperature 105°F >= 100°F
   📞 Found 1 emergency contact(s)
   📞 Calling Akshat at +18016967235...
   ✅ Call initiated to Akshat - SID: CAxxxxx
   ```

✅ **Lambda test successful!**

#### 5.3 Test with Real Sensor Data

**Option A: Heat up your sensor**
- Carefully heat the DHT11 sensor above 100°F
- Wait for ESP32 to publish data
- Your phone should ring!

**Option B: Test from AWS IoT Console**
1. Go to **AWS IoT Console** → **MQTT test client**
2. **Publish to topic**: `sws-data`
3. **Message**:
```json
{
  "tempF": 102,
  "hum": 45,
  "air": 0,
  "light": 1500,
  "date": 1234567890
}
```
4. Click **"Publish"**
5. **Your phone should ring!**

---

## 💰 Cost Breakdown

**Per Emergency Event**:
- Lambda execution: $0.0000002 (virtually free!)
- DynamoDB reads: $0.0000003
- Twilio call: $0.01
- **Total: ~$0.01 per emergency**

**Monthly (assuming 10 emergencies)**:
- Lambda: Free tier covers it
- DynamoDB: Free tier covers it
- Twilio: $0.10
- **Total: ~$0.10/month**

**AWS Free Tier** (first 12 months):
- Lambda: 1M requests/month FREE
- DynamoDB: 25 GB storage FREE
- IoT: 250,000 messages FREE

---

## 🎛️ Managing Emergency Contacts

### Add a Contact

**In DynamoDB Console:**

1. Go to **EmergencyContacts** table
2. Click **"Create item"**
3. Paste JSON:

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

4. Click **"Create item"**

### Disable a Contact (without deleting)

1. Find the contact in DynamoDB
2. Click **"Edit"**
3. Change `"enabled": true` to `"enabled": false`
4. Click **"Save"**

### Delete a Contact

1. Find the contact
2. Click **"Actions"** → **"Delete item"**

---

## 🔧 Troubleshooting

### No phone call received?

**Check CloudWatch Logs**:
1. Lambda Console → Monitor → View logs
2. Look for error messages

**Common issues**:
- ❌ Wrong Twilio credentials → Check environment variables
- ❌ No contacts in DynamoDB → Add contact
- ❌ Contact disabled → Set `enabled: true`
- ❌ Cooldown active → Wait 15 minutes or remove `lastEmergencyCall`

### Lambda timeout error?

- Increase timeout to 30-60 seconds in Lambda configuration

### Permission errors?

- Make sure Lambda execution role has DynamoDB permissions

### IoT Rule not triggering?

1. Go to IoT Console → Test → MQTT test client
2. Subscribe to `sws-data` topic
3. Verify ESP32 is publishing data
4. Check SQL statement matches your topic name

---

## 🎉 You're Done!

Your serverless emergency calling system is live!

**What happens now**:
1. ✅ ESP32 publishes temperature to `sws-data` topic
2. ✅ When temp ≥ 100°F, IoT Rule triggers Lambda
3. ✅ Lambda checks DynamoDB for contacts
4. ✅ Lambda calls enabled contacts via Twilio
5. ✅ 15-minute cooldown prevents spam
6. ✅ You get emergency phone call!

**No server to maintain!** AWS handles everything automatically! 🚀

---

## 📊 Monitoring

**View Lambda metrics**:
- Lambda Console → Monitor tab
- See: invocations, errors, duration, throttles

**View DynamoDB metrics**:
- DynamoDB Console → Your table → Metrics tab
- See: read/write capacity, item counts

**View call logs**:
- Twilio Console → Call logs
- See: all calls made, durations, costs

---

## 🔄 Updates

**To update Lambda code**:
1. Modify `emergency-calling-lambda.js`
2. Re-package: `Compress-Archive -Path emergency-calling-lambda.js,node_modules -DestinationPath emergency-calling-lambda.zip -Force`
3. Upload new .zip in Lambda Console

**No restart needed!** Changes take effect immediately.

---

## 🆘 Need Help?

**Common resources**:
- Lambda logs: CloudWatch Console
- IoT activity: AWS IoT → Activity
- Call logs: Twilio Console → Call logs
- Costs: AWS Billing Dashboard

**Test anytime**:
```bash
# Publish test message to IoT
aws iot-data publish --topic sws-data --payload '{"tempF":105,"hum":50,"air":0,"light":2000}'
```

---

**Congratulations! You have a fully serverless emergency calling system! 🎉🔥📞**

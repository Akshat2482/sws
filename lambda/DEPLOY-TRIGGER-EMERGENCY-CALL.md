# Deploy Trigger Emergency Call Lambda Function

## Step 2: Package and Deploy to AWS

### Prerequisites
- Node.js installed on your computer
- AWS Console access to us-east-1 (Virginia) region

---

## Part A: Create Deployment Package

### 1. Open Command Prompt/Terminal in lambda folder
```bash
cd "C:\Akshat 2025\sws\lambda"
```

### 2. Create a temporary deployment folder
```bash
mkdir trigger-emergency-call-deploy
cd trigger-emergency-call-deploy
```

### 3. Copy files
```bash
copy ..\trigger-emergency-call.js .
copy ..\trigger-emergency-call-package.json package.json
```

### 4. Install dependencies
```bash
npm install
```

### 5. Create ZIP file
Right-click on these items and select "Send to > Compressed (zipped) folder":
- trigger-emergency-call.js
- node_modules folder
- package.json

Name the zip file: `trigger-emergency-call.zip`

---

## Part B: Create Lambda Function in AWS Console

### 1. Go to AWS Lambda
- Open AWS Console: https://console.aws.amazon.com/lambda/
- **IMPORTANT:** Make sure you're in **us-east-1 (N. Virginia)** region (top-right corner)

### 2. Create Function
- Click **"Create function"**
- Choose **"Author from scratch"**
- Function name: `TriggerEmergencyCallFunction`
- Runtime: **Node.js 18.x** or **Node.js 20.x**
- Architecture: **x86_64**
- Click **"Create function"**

### 3. Upload Code
- In the "Code" tab, click **"Upload from"** → **".zip file"**
- Click **"Upload"** and select `trigger-emergency-call.zip`
- Click **"Save"**

### 4. Configure Runtime Settings
- Click **"Runtime settings"** → **"Edit"**
- Handler: `trigger-emergency-call.handler`
- Click **"Save"**

### 5. Set Environment Variables
- Go to **"Configuration"** tab → **"Environment variables"**
- Click **"Edit"** → **"Add environment variable"**
- Add these variables:

| Key | Value | Notes |
|-----|-------|-------|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID | From Twilio Console |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token | From Twilio Console |
| `TWILIO_PHONE_NUMBER` | Your Twilio Phone Number | Format: +1xxxxxxxxxx |
| `EMERGENCY_CONTACTS_TABLE` | `EmergencyContacts` | DynamoDB table name |

- Click **"Save"**

### 6. Increase Timeout
- Go to **"Configuration"** → **"General configuration"** → **"Edit"**
- Timeout: **30 seconds** (default 3 seconds is too short for Twilio calls)
- Click **"Save"**

### 7. Add Permissions (IAM Role)
- Go to **"Configuration"** → **"Permissions"**
- Click on the **Role name** (opens in new tab)
- Click **"Add permissions"** → **"Attach policies"**
- Search and attach these policies:
  - ✅ `AmazonDynamoDBFullAccess` (to read emergency contacts)
  - ✅ `CloudWatchLogsFullAccess` (to write logs)
- Click **"Attach policies"**

---

## Part C: Test the Lambda

### 1. Create Test Event
- Go back to Lambda function
- Click **"Test"** tab
- Event name: `TestEmergencyCall`
- Template: **API Gateway HTTP API**
- Replace the event JSON with:

```json
{
  "body": "{\"temperature\": 105, \"reason\": \"High temperature detected\"}",
  "requestContext": {
    "http": {
      "method": "POST"
    }
  },
  "rawPath": "/api/emergency-call",
  "headers": {
    "content-type": "application/json"
  }
}
```

- Click **"Save"**
- Click **"Test"**

### 2. Check Results
- Look for **"Execution result: succeeded"** (green)
- Check the response:
```json
{
  "statusCode": 200,
  "body": "{\"message\":\"Emergency calls initiated\",\"temperature\":105,\"contactsCalled\":1}"
}
```

- Check CloudWatch Logs for:
  - `📨 Browser-initiated emergency call request`
  - `🌡️ Temperature: 105°F`
  - `📞 Found X emergency contact(s)`
  - `✅ Call initiated to...`

---

## ✅ Success Checklist

- [ ] Lambda function created in **us-east-1**
- [ ] Code uploaded from zip file
- [ ] Handler set to `trigger-emergency-call.handler`
- [ ] All 4 environment variables configured
- [ ] Timeout increased to 30 seconds
- [ ] IAM permissions added (DynamoDB, CloudWatch)
- [ ] Test event executed successfully
- [ ] Test call received on emergency contact phone

---

## Troubleshooting

**Error: "Cannot find module 'trigger-emergency-call'"**
- Fix: Check Handler is exactly `trigger-emergency-call.handler`

**Error: "Missing Twilio credentials"**
- Fix: Verify all environment variables are set correctly

**Error: "Access denied to DynamoDB"**
- Fix: Attach `AmazonDynamoDBFullAccess` policy to Lambda role

**Error: "Task timed out after 3 seconds"**
- Fix: Increase timeout to 30 seconds in General configuration

---

**Next Step:** After this Lambda works, we'll add the API Gateway route!

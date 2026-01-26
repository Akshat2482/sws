# Emergency Calling Lambda Function

## 📁 What's in This Folder

| File | Purpose |
|------|---------|
| `emergency-calling-lambda.js` | Main Lambda function code |
| `package.json` | Node.js dependencies |
| `dynamodb-schema.json` | DynamoDB table structure |
| `iot-rule.json` | AWS IoT Rule configuration |
| `sample-contact.json` | Example contact data |
| `DEPLOYMENT-GUIDE.md` | **START HERE** - Complete deployment instructions |
| `deploy.bat` | Windows script to package Lambda |

---

## 🚀 Quick Start

### 1. Read the Deployment Guide

Open `DEPLOYMENT-GUIDE.md` - it has complete step-by-step instructions!

### 2. Package the Lambda Function

**On Windows:**
```bash
deploy.bat
```

**On Mac/Linux:**
```bash
npm install
zip -r emergency-calling-lambda.zip emergency-calling-lambda.js node_modules/
```

### 3. Deploy to AWS

Follow steps in `DEPLOYMENT-GUIDE.md`:
1. Create DynamoDB table
2. Upload Lambda function
3. Create IoT Rule
4. Test!

---

## 🎯 Architecture

```
ESP32 Sensor
    ↓
AWS IoT Core (Topic: sws-data)
    ↓
IoT Rule (Filter: tempF >= 100)
    ↓
Lambda Function
    ↓
DynamoDB (Get contacts) + Twilio (Make calls)
```

---

## 💡 Key Features

- ✅ **Serverless** - No server to manage
- ✅ **15-minute cooldown** - Prevents spam calls
- ✅ **Multiple contacts** - Call as many as you need
- ✅ **Enable/disable** - Turn contacts on/off
- ✅ **Cost effective** - ~$0.01 per emergency
- ✅ **AWS Free Tier** - First year is virtually free

---

## 📊 Environment Variables Required

Set these in Lambda configuration:

| Variable | Example | Where to Get |
|----------|---------|--------------|
| `TWILIO_ACCOUNT_SID` | ACxxxxx... | Twilio Console |
| `TWILIO_AUTH_TOKEN` | abc123... | Twilio Console |
| `TWILIO_PHONE_NUMBER` | +17722767849 | Twilio Console |
| `DYNAMODB_TABLE` | EmergencyContacts | Create in AWS |
| `TWILIO_VOICE_NAME` | Polly.Joanna | (Optional) |

---

## 🧪 Testing

### Test Lambda Directly

In Lambda Console → Test tab:

```json
{
  "tempF": 105,
  "hum": 50,
  "air": 0,
  "light": 2000
}
```

### Test via IoT

In IoT MQTT Test Client, publish to `sws-data`:

```json
{
  "tempF": 102,
  "hum": 45,
  "air": 0,
  "light": 1500,
  "date": 1234567890
}
```

---

## 📖 Full Documentation

See **DEPLOYMENT-GUIDE.md** for:
- Complete deployment steps
- DynamoDB setup
- IoT Rule configuration
- Troubleshooting
- Cost breakdown
- Monitoring

---

## 🆘 Support

**Check CloudWatch Logs** for debugging:
- Lambda Console → Monitor → View logs in CloudWatch

**Common Issues**:
- No call? → Check environment variables and DynamoDB contacts
- Timeout? → Increase Lambda timeout to 30 seconds
- Permission error? → Add DynamoDB permissions to Lambda role

---

**Happy deploying! 🚀**

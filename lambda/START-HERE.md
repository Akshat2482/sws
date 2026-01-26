# 🚀 START HERE - Complete Serverless Smart Weather Station

## 📁 What's in This Folder

Your **complete serverless** emergency calling and push notification system!

---

## 🎯 Quick Overview

### 3 Lambda Functions Created:

| Function | File | What It Does |
|----------|------|--------------|
| **1. Emergency Calling** | `emergency-calling-lambda.js` | Calls your phone when temp ≥ 100°F |
| **2. Push Notifications** | `push-notification-lambda.js` | Sends browser alerts for all thresholds |
| **3. Subscription API** | `subscription-api-lambda.js` | REST API to manage subscriptions |

### Architecture:

```
ESP32 → AWS IoT → 5 IoT Rules → 3 Lambda Functions → Twilio + Web Push
                                        ↓
                                   DynamoDB (2 tables)
                                        ↑
                                   API Gateway ← Dashboard
```

**Result:** 100% serverless, works 24/7, no computer needed!

---

## 📋 File Guide

### **Core Lambda Functions** (Upload these to AWS)
- `emergency-calling-lambda.js` - Emergency voice calling logic
- `push-notification-lambda.js` - Push notification logic
- `subscription-api-lambda.js` - API for managing subscriptions

### **Package Files** (Dependencies)
- `package.json` - Emergency calling dependencies
- `package-push.json` - Push notification dependencies
- `package-api.json` - API dependencies

### **Deployment Scripts**
- `deploy-all.bat` - **RUN THIS FIRST** - Packages all 3 Lambda functions
- `deploy.bat` - Package just emergency calling (legacy)

### **Configuration Files**
- `dynamodb-schema.json` - EmergencyContacts table structure
- `push-subscriptions-schema.json` - PushSubscriptions table structure
- `iot-rules-all.json` - All 5 IoT Rule configurations
- `api-gateway-config.json` - API Gateway setup reference

### **Sample Data**
- `sample-contact.json` - Example emergency contact
- `sample-push-subscription.json` - Example push subscription

### **Documentation** (📖 READ THESE)
- **`SERVERLESS-DEPLOYMENT-GUIDE.md`** ← **START HERE!** Complete step-by-step guide
- `DEPLOYMENT-GUIDE.md` - Emergency calling only (simpler, use if you only want emergency calls)
- `README.md` - Quick reference

---

## 🚀 Quick Start (3 Steps)

### **Step 1: Package Lambda Functions** (2 minutes)

Open Command Prompt in this folder and run:
```bash
deploy-all.bat
```

This creates 3 .zip files ready for AWS!

---

### **Step 2: Deploy to AWS** (60 minutes)

Open and follow: **`SERVERLESS-DEPLOYMENT-GUIDE.md`**

It has complete instructions with:
- ✅ Create 2 DynamoDB tables
- ✅ Upload 3 Lambda functions
- ✅ Create 5 IoT Rules
- ✅ Set up API Gateway
- ✅ Test everything

---

### **Step 3: Update Dashboard** (5 minutes)

Replace API URL in your `index.html`:
```javascript
const API_URL = 'https://YOUR-API-GATEWAY-URL';
```

---

## 💰 Cost

**Monthly:** ~$0.10 (just Twilio calls)
**Everything else:** FREE (AWS Free Tier)

---

## 🎯 What You Get

### Emergency Calling (Voice)
- ✅ Calls you when temp ≥ 100°F
- ✅ Text-to-speech emergency message
- ✅ 15-minute cooldown
- ✅ Multiple contacts supported

### Push Notifications (Browser)
- ✅ Temperature alerts
- ✅ Humidity alerts
- ✅ Air quality alerts
- ✅ Light level alerts
- ✅ 5-minute cooldown per type
- ✅ Custom thresholds per user

### REST API
- ✅ Subscribe to notifications
- ✅ Manage subscriptions
- ✅ Get VAPID key
- ✅ Unsubscribe

### Serverless Benefits
- ✅ **No server to run!**
- ✅ **Works when computer is off**
- ✅ **Auto-scales automatically**
- ✅ **AWS manages everything**
- ✅ **Only pay for what you use**

---

## 📊 Comparison: Before vs After

### Before (Local Server):
- ❌ Computer must run 24/7
- ❌ High electricity cost
- ❌ If computer off = no alerts
- ❌ Manual maintenance
- ❌ Single point of failure

### After (Serverless):
- ✅ No computer needed
- ✅ $0 when sensors normal
- ✅ Always works 24/7
- ✅ AWS maintains it
- ✅ Auto-scales, never fails

---

## 🔧 Troubleshooting

### Can't package Lambda functions?
- Make sure you're in the `lambda` folder
- Run `npm install` first
- Try running as Administrator

### Lambda timeout errors?
- Increase timeout to 30-60 seconds in Lambda configuration
- Check CloudWatch logs for specific errors

### No calls/notifications?
- Check DynamoDB has your contacts
- Verify environment variables in Lambda
- Check IoT Rules are enabled
- View CloudWatch logs

---

## 📚 Documentation Order

**For complete serverless (recommended):**
1. Read: `SERVERLESS-DEPLOYMENT-GUIDE.md` (this has EVERYTHING)

**For emergency calling only:**
1. Read: `DEPLOYMENT-GUIDE.md` (simpler, just Twilio calls)

**For quick reference:**
1. Read: `README.md` (architecture overview)

---

## ✅ Deployment Checklist

Before you start, have ready:
- [ ] AWS Account (with admin access)
- [ ] Twilio Account SID
- [ ] Twilio Auth Token
- [ ] Twilio Phone Number
- [ ] VAPID Public Key (from .env)
- [ ] VAPID Private Key (from .env)
- [ ] 60 minutes of time

---

## 🆘 Need Help?

**Common Issues:**
- "Function not found" → Check function name matches exactly
- "Permission denied" → Add DynamoDB permissions to Lambda role
- "No subscriptions" → Normal until dashboard connects
- "Timeout" → Increase Lambda timeout setting

**Check logs:**
```bash
# View Lambda logs
AWS Console → Lambda → Your function → Monitor → View logs

# Test IoT publishing
AWS Console → IoT → Test → MQTT test client
```

---

## 🎉 Ready to Deploy?

**Open this file and follow step-by-step:**

📖 **`SERVERLESS-DEPLOYMENT-GUIDE.md`**

It has screenshots, code examples, and troubleshooting!

---

**Good luck! You're building something awesome! 🚀**

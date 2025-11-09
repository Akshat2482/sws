# ✅ Simple IAM Setup Guide

This is the **simplest** way to connect your dashboard to AWS IoT - using direct IAM user credentials.

---

## 🚀 Quick Setup (5 Steps)

### Step 1: Create IAM User

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users** → **Create user**
3. Username: `weather-station-dashboard`
4. Click **Next**

### Step 2: Attach IAM Policy

1. Select **Attach policies directly**
2. Click **Create policy**
3. Click **JSON** tab
4. Copy and paste the content from `IAM_POLICY_SIMPLE.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "IoTConnect",
      "Effect": "Allow",
      "Action": "iot:Connect",
      "Resource": "arn:aws:iot:us-east-1:487902005635:client/*"
    },
    {
      "Sid": "IoTSubscribe",
      "Effect": "Allow",
      "Action": "iot:Subscribe",
      "Resource": "arn:aws:iot:us-east-1:487902005635:topicfilter/sws-data"
    },
    {
      "Sid": "IoTReceive",
      "Effect": "Allow",
      "Action": "iot:Receive",
      "Resource": "arn:aws:iot:us-east-1:487902005635:topic/sws-data"
    }
  ]
}
```

5. Click **Next**
6. Policy name: `WeatherStationIoTPolicy`
7. Click **Create policy**
8. Go back to the user creation tab
9. Refresh the policy list
10. Select `WeatherStationIoTPolicy`
11. Click **Next** → **Create user**

### Step 3: Create Access Keys

1. Click on the user `weather-station-dashboard`
2. Go to **Security credentials** tab
3. Scroll to **Access keys**
4. Click **Create access key**
5. Select **Third-party service** or **Other**
6. Click **Next** → **Create access key**
7. **IMPORTANT:** Copy both:
   - Access key ID (e.g., `AKIAIOSFODNN7EXAMPLE`)
   - Secret access key (e.g., `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)
8. Click **Done**

---

## 🎯 Step 4: Use the Dashboard

### Open the Dashboard

```bash
npm run dashboard-iam
```

Or manually:
```bash
open dashboard-iam.html
```

### Enter Your Credentials

The dashboard will show a configuration panel. Enter:

1. **AWS Region:** `us-east-1`
2. **IoT Endpoint:** `a2jxq81rsqt8vu-ats.iot.us-east-1.amazonaws.com`
3. **AWS Access Key ID:** (paste your access key ID)
4. **AWS Secret Access Key:** (paste your secret access key)

### Click Connect

Click the **"🔌 Connect to AWS IoT"** button.

You should see:
- Status changes to "Connected" ✅
- Sensor data starts appearing
- Charts updating in real-time

---

## ✅ What You Should See

**In the Browser Console (F12):**
```
🔌 Connecting to AWS IoT...
✅ AWS SDK configured with IAM credentials
✅ Signed WebSocket URL created
✅✅✅ Connected to AWS IoT Core successfully!
📡 Subscribed to: sws-data
📨 Message received: {"tempF":72,"hum":45,"air":450,"light":2000}
```

**On the Dashboard:**
- Temperature, humidity, air quality, and light data updating
- Charts showing trends
- Green "Connected" status indicator

---

## 🔧 Troubleshooting

### Connection Closes Immediately

**Problem:** Dashboard connects but closes right away.

**Solution:** Check your IAM policy. Make sure:
- Policy is attached to the user
- Resource ARNs are correct (especially the topic name `sws-data`)
- All three actions are included (Connect, Subscribe, Receive)

### "Access Denied" Error

**Problem:** Console shows permission errors.

**Solution:**
1. Verify the IAM policy is attached to the user
2. Make sure the policy JSON is exactly as shown above
3. Wait 1-2 minutes for IAM changes to propagate

### No Data Appearing

**Problem:** Connected but no sensor data showing.

**Solution:**
1. Check if your ESP32 is online and publishing data
2. Verify the topic name is `sws-data` in both:
   - The ESP32 firmware
   - The IAM policy
   - The dashboard code

---

## 📋 Comparison: IAM vs Cognito vs Server

| Approach | Complexity | Security | Use Case |
|----------|-----------|----------|----------|
| **IAM User** (this guide) | ⭐ Simple | ⚠️ Credentials in browser | **Demo/Testing** |
| **Cognito Identity Pool** | ⭐⭐ Medium | ✅ Temporary credentials | **Production** |
| **server.js Backend** | ⭐⭐⭐ Complex | ✅✅ Credentials never exposed | **Enterprise** |

### When to Use IAM User Credentials

✅ **Good for:**
- Quick demos
- Local testing
- Development environment
- Single user access

❌ **Not recommended for:**
- Production websites
- Public deployment
- Multi-user systems
- Anything internet-facing

**Why?** IAM credentials are permanent and if someone inspects your browser, they can see and copy your access keys.

---

## 🎯 Next Steps

### For Demo/Testing:
You're done! Just use `npm run dashboard-iam` and enter your credentials.

### For Production:
Use the Cognito approach:
1. Set up Cognito Identity Pool (see `COGNITO_SETUP.md`)
2. Apply the Cognito IAM policy (see `IAM_POLICY_FINAL_CORRECTED.json`)
3. Use `npm run dashboard-cognito`

### For Maximum Security:
Keep using your existing `server.js`:
```bash
npm start
```

---

## 📝 Summary

**You created:**
- ✅ IAM user: `weather-station-dashboard`
- ✅ IAM policy: `WeatherStationIoTPolicy`
- ✅ Access key ID and secret access key

**To use:**
```bash
npm run dashboard-iam
```

Enter your credentials and click Connect. Done! 🎉

---

## ⚠️ Security Note

**IMPORTANT:** These are permanent AWS credentials.

**Do NOT:**
- ❌ Commit them to git
- ❌ Share them publicly
- ❌ Deploy to a public website
- ❌ Leave them in production code

**For production, use:**
- Cognito Identity Pool (temporary credentials)
- Backend server (credentials never exposed)

This approach is **only for demos and local testing**.

---

## 🗑️ Clean Up (When Done Testing)

To delete the IAM user:
1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users**
3. Select `weather-station-dashboard`
4. Click **Delete**
5. Follow the confirmation steps

This will revoke all access keys and remove the user.

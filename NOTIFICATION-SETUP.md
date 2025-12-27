# 🔔 Push Notification Setup Guide

## Overview
Your Smart Weather Station now has push notification support! Get alerts on your phone when sensor values exceed your custom thresholds.

## ✅ What's Been Added

### Frontend (index.html)
- 🔔 Notification bell button in header
- ⚙️ Threshold configuration modal
- 📱 Web Push API integration
- 💾 LocalStorage for threshold persistence

### Service Worker (service-worker.js)
- 📨 Push event handler
- 🖱️ Notification click handler
- 🔄 Auto-focus app on click

### Backend (server.js)
- 📡 Push subscription endpoints
- 🔍 Automatic threshold checking
- 💾 Subscription persistence (JSON file)
- 🚨 Alert cooldown (5 minutes per alert type)

---

## 🚀 Setup Instructions

### Step 1: Install Dependencies
```bash
cd "C:\Akshat 2025\sws"
npm install web-push
```

### Step 2: Generate VAPID Keys
VAPID keys are required for web push notifications.

```bash
npx web-push generate-vapid-keys
```

This will output something like:
```
=======================================

Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U

Private Key:
UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls

=======================================
```

### Step 3: Add VAPID Keys to .env
Create or update your `.env` file:

```bash
# Existing AWS config...
AWS_IOT_ENDPOINT=a2jxq81rsqt8vu-ats.iot.us-east-1.amazonaws.com
AWS_REGION=us-east-1
AWS_IOT_TOPIC=sws-data
PORT=3000

# NEW: Add these lines with YOUR generated keys
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
VAPID_PRIVATE_KEY=UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls
VAPID_SUBJECT=mailto:your-email@example.com
```

**⚠️ Replace with YOUR actual keys from Step 2!**

### Step 4: Start the Server
```bash
node server.js
```

You should see:
```
✅ VAPID keys configured for push notifications
🔔 Push Notification System Ready
📊 Active subscriptions: 0

🚀 Server running on http://localhost:3000
```

---

## 📱 How to Use

### Enable Notifications (Browser)

1. **Open the app:** `http://localhost:3000/index.html`
2. **Click the bell icon** 🔔 in the header
3. **Set your thresholds:**
   - Max Temperature: 80°F
   - Max Humidity: 70%
   - Max Air Quality: 1000
   - Min Light Level: 100
4. **Click "Save & Enable"**
5. **Allow notifications** when the browser prompts

### Test Notifications

You can test by:
1. **Manual trigger:** Blow hot air on the DHT11 sensor to raise temperature
2. **Cover the light sensor** to drop light levels below threshold
3. **Wait 5 seconds** for ESP32 to send new data

You'll receive a notification like:
```
🌤️ Smart Weather Station Alert

🌡️ High temperature: 85°F (limit: 80°F)
💡 Low light: 50 (limit: 100)
```

---

## 🏗️ System Architecture

```
┌─────────────┐
│   ESP32-S3  │  Reads sensors every 5 seconds
└──────┬──────┘
       │ MQTT (AWS IoT)
       ▼
┌──────────────────┐
│  AWS IoT Core    │  Message broker
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   server.js      │  Node.js backend
│  - Checks limits │
│  - Triggers push │
└──────┬───────────┘
       │ Web Push API
       ▼
┌──────────────────┐
│  Service Worker  │  Receives push
│  (background)    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Your Phone 📱   │  Shows notification
└──────────────────┘
```

---

## 🔧 Configuration

### Threshold Settings
Edit thresholds in the app:
- Click bell icon → Adjust values → Save

Or edit directly in browser console:
```javascript
localStorage.setItem('notificationThresholds', JSON.stringify({
    maxTemp: 85,
    maxHumidity: 75,
    maxAirQuality: 1500,
    minLight: 50
}));
```

### Alert Cooldown
By default, each alert type has a **5-minute cooldown** to prevent spam.

To change, edit `server.js` line 370:
```javascript
if (!lastAlert.temp || Date.now() - lastAlert.temp > 300000) { // 300000 = 5 minutes
```

---

## 📂 Files Modified

| File | Changes |
|------|---------|
| `service-worker.js` | Added push & click handlers |
| `index.html` | Added bell UI, subscription logic, threshold checking |
| `server.js` | Added web-push integration, endpoints, threshold checking |
| `package.json` | Added `web-push` dependency |
| `.env` | Added VAPID keys |

---

## 🐛 Troubleshooting

### "VAPID keys not configured"
- Run: `npx web-push generate-vapid-keys`
- Add keys to `.env` file
- Restart server

### Notifications not appearing
1. **Check browser permission:** Settings → Notifications → Allow localhost
2. **Check server logs:** Should see "✅ Alert sent to..."
3. **Try Chrome:** Best support for Web Push
4. **Check thresholds:** Are they actually exceeded?

### "Failed to subscribe"
- Make sure server is running on `http://localhost:3000`
- Check browser console for errors
- Try clearing browser cache and reloading

### Subscriptions not persisting
- Check if `push-subscriptions.json` exists in project root
- Make sure server has write permissions

---

## 📊 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/vapid-public-key` | GET | Get public VAPID key |
| `/api/subscribe` | POST | Subscribe to notifications |
| `/api/unsubscribe` | POST | Unsubscribe |
| `/api/notify` | POST | Manual notification (testing) |

### Test Notification (curl)
```bash
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "subscription": {...},
    "alerts": ["Test alert!"]
  }'
```

---

## 🚀 Next Steps

1. ✅ **Test on browser first**
2. ⬜ Upload changes to CloudFront
3. ⬜ Rebuild Android TWA app with `bubblewrap update && bubblewrap build`
4. ⬜ Test on Android phone

---

## 📱 Android TWA Deployment

Once tested:

1. **Update CloudFront files:**
   - Upload new `index.html`
   - Upload new `service-worker.js`

2. **Rebuild Android app:**
   ```bash
   cd SWS-App2
   bubblewrap update
   bubblewrap build
   ```

3. **Sign and install:**
   ```bash
   # Follow previous signing steps
   # Transfer APK to phone
   # Install and test notifications
   ```

---

## 💡 Tips

- **Battery:** Notifications use minimal battery (service worker is efficient)
- **Privacy:** Subscriptions stored locally, no data sent to third parties
- **Offline:** Notifications require internet connection
- **Multiple devices:** Each device gets its own subscription

---

**Need help?** Check the troubleshooting section or review server logs!

🎉 **Enjoy your real-time weather alerts!**

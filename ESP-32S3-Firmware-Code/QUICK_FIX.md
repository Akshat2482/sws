# QUICK FIX - TLS Memory Error (-32512)

## The Problem

Your ESP32 is running out of RAM when trying to establish TLS connection to AWS IoT.

Error: `aws_client: last SSL error code: -32512` = Not enough memory for TLS

## The Solution (5 minutes)

### ✅ Step 1: Change Arduino IDE Setting

1. Open Arduino IDE
2. Go to **Tools → Partition Scheme**
3. Select: **"Minimal SPIFFS (1.9MB APP with OTA/190KB SPIFFS)"**
   
   Or even better: **"Huge APP (3MB No OTA/1MB SPIFFS)"**

4. Click **Upload** (→ button)

### ✅ Step 2: Verify It's Working

Open **Serial Monitor** (115200 baud) and look for:

```
Smart Weather Station Starting...
Free Heap: 290000    ← Should be > 200,000
...
aws_client: Free heap before TLS: 280000
aws_client: TLS handshake starting (insecure=1)...
aws_client: TLS handshake successful!  ← SUCCESS!
aws_client: connected
Published sensor payload to AWS: {...}  ← DATA FLOWING!
```

## Why This Works

The default partition scheme leaves too little RAM for your app. TLS handshake needs ~150KB of free RAM, and the default partition doesn't provide enough.

By changing to "Minimal SPIFFS" or "Huge APP", you're giving more memory to your application.

## Visual Guide

### Before (Current - Failing):
```
[App: 1.3MB] [OTA: 1.3MB] [SPIFFS: 1.5MB]
              ↑ Taking up RAM you need!
Free RAM: ~100KB ❌ Not enough for TLS
```

### After (Fixed):
```
[App: 1.9MB] [OTA: none] [SPIFFS: 190KB]
                          ↑ Much smaller!
Free RAM: ~290KB ✅ Plenty for TLS!
```

## If It Still Doesn't Work

Check Serial Monitor output for:

```
Free Heap: [???]  ← What number do you see?
```

### If < 150,000:
Try **"Huge APP (3MB No OTA)"** partition instead

### If > 200,000 but still fails:
Reply with the full Serial Monitor output starting from boot

## Alternative Quick Fixes

### Option A: Restart ESP32 Before Test
Unplug and replug the ESP32 to ensure clean boot with maximum RAM.

### Option B: Reduce MQTT Buffer
Edit `aws_client.cpp` line 123:
```cpp
mqttClient.setBufferSize(512);  // Change from 1024 to 512
```

### Option C: Disable BLE After WiFi Connects
(More advanced - ask if needed)

---

## TL;DR

**Arduino IDE → Tools → Partition Scheme → "Minimal SPIFFS" → Upload**

That's it! This should fix the -32512 error.


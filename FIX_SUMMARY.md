# AWS IoT Connection Fix - Summary

## Problem Identified

Your ESP32 was failing to connect to AWS IoT Core with this error:
```
aws_client: tcp/tls connect failed
aws_client: secureClient.connected()=0
```

**Root Cause**: TLS handshake failing because `AWS_INSECURE` was set to `0` (secure mode), but the embedded certificates in the code may not match your actual AWS IoT Thing.

## What I Fixed

### 1. Temporarily Enabled Insecure Mode
**File**: `c++/main-v1/aws_client.h`

Changed `AWS_INSECURE` from `0` → `1` to bypass certificate validation for testing.

**Why**: This lets us verify the connection logic works before dealing with certificate issues.

### 2. Added Comprehensive Debug Logging
**File**: `c++/main-v1/aws_client.cpp`

Enhanced logging to show:
- Certificate loading status
- Certificate lengths (to detect empty/truncated certs)
- TLS handshake progress
- Detailed error messages
- SSL error codes
- Troubleshooting suggestions

### 3. Increased MQTT Buffer Size
**File**: `c++/main-v1/aws_client.cpp`

Added `mqttClient.setBufferSize(512);` to handle larger TLS packets.

### 4. Better Error Handling
Added helpful suggestions when TLS fails, including checking:
- Certificate match
- Time sync
- Certificate format

## What You Need to Do

### ✅ Step 1: Test Insecure Mode (Now)

1. **Upload the updated code** to your ESP32
2. **Open Serial Monitor** at 115200 baud
3. **Look for this output**:

**SUCCESS** will look like:
```
=========================================
aws_client: initializing AWS IoT client
aws_client: endpoint: a2jxq81rsqt8vu-ats.iot.us-east-1.amazonaws.com
aws_client: ⚠️  INSECURE MODE - TLS certs not validated
aws_client: This is OK for testing, but NOT for production!
...
aws_client: TLS handshake starting (insecure=1)...
aws_client: TLS handshake successful!
aws_client: MQTT client id: iotconsole-42003a69-5bde-42d1-aba3-46dd56ed0594
aws_client: connected
Published sensor payload to AWS: {"tempF":72.5,...}
```

### ✅ Step 2: Fix Certificates (After Step 1 Works)

If insecure mode works, you need to replace the certificates in the code with YOUR certificates.

#### Get Certificates from AWS:

1. Go to **AWS IoT Console** → **Security** → **Certificates**
2. Click your certificate (or create new one)
3. Download 3 files:
   - Device certificate (`.pem.crt`)
   - Private key (`.key`)
   - Root CA (`AmazonRootCA1.pem`)

#### Update Code:

Edit `c++/main-v1/aws_client.cpp` and replace:

1. **AWS_ROOT_CA** (lines ~13-34) with contents of `AmazonRootCA1.pem`
2. **AWS_CLIENT_CERT** (lines ~35-56) with contents of your certificate
3. **AWS_PRIVATE_KEY** (lines ~57-85) with contents of your private key
4. **MQTT_CLIENT_ID** (line ~10) with your Thing name or keep the current one

**Important**: Copy the ENTIRE certificate including `-----BEGIN` and `-----END` lines!

### ✅ Step 3: Re-enable Secure Mode (After Certificates Updated)

Once certificates are updated:

1. Edit `c++/main-v1/aws_client.h`
2. Change line 24: `#define AWS_INSECURE 1` → `#define AWS_INSECURE 0`
3. Upload and test again

You should see:
```
aws_client: SECURE MODE - validating TLS certificates
aws_client: Root CA loaded
aws_client: Client certificate loaded
aws_client: Private key loaded
...
aws_client: TLS handshake successful!
```

## Files Modified

1. ✅ `c++/main-v1/aws_client.h` - Temporarily enabled insecure mode
2. ✅ `c++/main-v1/aws_client.cpp` - Added debug logging and better error handling
3. 📄 `c++/main-v1/AWS_IOT_TROUBLESHOOTING.md` - Comprehensive troubleshooting guide

## Common Issues & Quick Fixes

### If Insecure Mode Still Fails:
- Check AWS IoT endpoint is correct
- Verify WiFi is connected
- Check ESP32 has enough free RAM (`ESP.getFreeHeap()`)
- Verify your Thing exists in AWS Console

### If Secure Mode Fails (After Updating Certs):
- Verify you copied ENTIRE certificate (no truncation)
- Check certificate is ACTIVE in AWS Console
- Verify policy is attached to certificate
- Make sure no extra spaces or newlines in the PEM strings

### If Connected but Can't Publish:
- Check AWS IoT Policy allows `iot:Publish` on your topic
- Verify topic name matches: `devices/esp32/sensors`
- Check AWS IoT Test console to see if messages arrive

## Testing Your Connection

### 1. Check Serial Monitor
Look for successful connection messages and sensor data being published.

### 2. AWS IoT Test Console
1. Go to AWS IoT Console → **Test** → **MQTT test client**
2. Subscribe to topic: `devices/esp32/sensors`
3. You should see messages every 5 seconds:
```json
{
  "tempF": 72.5,
  "hum": 55.2,
  "air": 450,
  "light": 1850,
  "date": 123456789,
  "topic": "sws-data"
}
```

### 3. Check Certificate Status
AWS IoT Console → **Security** → **Certificates** → Your cert should be:
- Status: **ACTIVE** ✅
- Has policy attached ✅
- Has Thing attached ✅

## Next Steps After Connection Works

1. ✅ Verify data appears in AWS IoT Test console
2. ✅ Let it run for 10-15 minutes to verify stability
3. ✅ Check reconnection works (power cycle the ESP32)
4. ✅ Start the Node.js proxy server: `npm start`
5. ✅ Open dashboard: `http://localhost:3000/dashboard.html`

## Need More Help?

See the detailed troubleshooting guide:
- Read: `c++/main-v1/AWS_IOT_TROUBLESHOOTING.md`

Share this info if you need help:
1. Full serial monitor output from boot to error
2. Certificate lengths from the debug output
3. Whether insecure mode works
4. Your AWS region

---

## Summary

**Immediate Action**: Upload the code and test. Insecure mode should now work.

**After Testing**: Update certificates and re-enable secure mode.

**Expected Time**: 5 minutes to test, 15 minutes to update certificates properly.

Good luck! 🚀


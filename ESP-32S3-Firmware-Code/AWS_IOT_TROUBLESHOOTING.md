# AWS IoT Connection Troubleshooting Guide

## Current Issue: TLS Handshake Failing

Based on your error log showing:
```
aws_client: tcp/tls connect failed
aws_client: secureClient.connected()=0
```

The plain TCP connection works, but TLS handshake fails. This guide will help you fix it.

## Step 1: Test with Insecure Mode (Already Done)

I've temporarily set `AWS_INSECURE=1` in `aws_client.h`. This will bypass certificate validation for testing.

**Upload the updated code and check if connection works now.**

### Expected Output (Success):
```
aws_client: ⚠️  INSECURE MODE - TLS certs not validated
aws_client: TLS handshake starting (insecure=1)...
aws_client: TLS handshake successful!
aws_client: connected
Published sensor payload to AWS: {"tempF":...}
```

### If it still fails:
- Check ESP32 has enough RAM (run `ESP.getFreeHeap()` in code)
- Verify AWS IoT endpoint is correct in `aws_client.cpp`
- Check your AWS IoT Thing is active in AWS Console

## Step 2: Fix Certificates for Production

Once insecure mode works, you need to replace the certificates in `aws_client.cpp` with YOUR certificates.

### Get Your Certificates from AWS IoT Console

1. **Go to AWS IoT Console** → Security → Certificates
2. **Find your certificate** (or create new one)
3. **Download 3 files:**
   - `xxxxxx-certificate.pem.crt` (Device Certificate)
   - `xxxxxx-private.pem.key` (Private Key)
   - `AmazonRootCA1.pem` (Root CA)

### Update aws_client.cpp

Replace the certificate strings at lines 13-85 in `aws_client.cpp`:

#### Replace AWS_ROOT_CA (lines 13-34)

Open `AmazonRootCA1.pem` and copy the entire contents:

```cpp
static const char AWS_ROOT_CA[] = R"EOF(
-----BEGIN CERTIFICATE-----
[PASTE YOUR ROOT CA HERE - ALL LINES]
-----END CERTIFICATE-----
)EOF";
```

#### Replace AWS_CLIENT_CERT (lines 35-56)

Open your `xxxxxx-certificate.pem.crt` and copy:

```cpp
static const char AWS_CLIENT_CERT[] = R"KEY(
-----BEGIN CERTIFICATE-----
[PASTE YOUR DEVICE CERTIFICATE HERE - ALL LINES]
-----END CERTIFICATE-----
)KEY";
```

#### Replace AWS_PRIVATE_KEY (lines 57-85)

Open your `xxxxxx-private.pem.key` and copy:

```cpp
static const char AWS_PRIVATE_KEY[] = R"KEY(
-----BEGIN RSA PRIVATE KEY-----
[PASTE YOUR PRIVATE KEY HERE - ALL LINES]
-----END RSA PRIVATE KEY-----
)KEY";
```

### Update Client ID

The MQTT Client ID at line 10 should match your Thing name or be unique:

```cpp
static const char *MQTT_CLIENT_ID = "your-thing-name-here";
```

Or use the one from your AWS IoT Console (currently: `iotconsole-42003a69-5bde-42d1-aba3-46dd56ed0594`)

## Step 3: Enable Secure Mode

After updating certificates:

1. Open `aws_client.h`
2. Change `AWS_INSECURE` from `1` to `0`:

```cpp
#ifndef AWS_INSECURE
#define AWS_INSECURE 0  // ← Change this to 0
#endif
```

3. **Upload** the code
4. **Watch Serial Monitor** for detailed output

### Expected Output (Success):
```
aws_client: SECURE MODE - validating TLS certificates
aws_client: Root CA loaded
aws_client: Client certificate loaded
aws_client: Private key loaded
aws_client: Certificate lengths:
  - Root CA: 1188 bytes
  - Client cert: 1220 bytes
  - Private key: 1675 bytes
...
aws_client: TLS handshake starting (insecure=0)...
aws_client: TLS handshake successful!
aws_client: connected
```

## Common Issues & Solutions

### Issue 1: "TLS failed in secure mode"
**Cause**: Certificates don't match your AWS IoT Thing

**Solution**: 
1. Verify you copied the ENTIRE certificate (including BEGIN/END lines)
2. Make sure no extra spaces or line breaks
3. Check the certificate is attached to your Thing in AWS Console
4. Verify the certificate is ACTIVE (not revoked)

### Issue 2: "time not synced, TLS may fail"
**Cause**: ESP32 system time is wrong

**Solution**:
- Wait 10-15 seconds after WiFi connects for NTP sync
- Check router allows NTP traffic (UDP port 123)
- Try changing NTP servers in code:
  ```cpp
  configTime(0, 0, "time.nist.gov", "pool.ntp.org");
  ```

### Issue 3: "last SSL error code: -76" (or other negative)
**Cause**: Various TLS errors

**Common error codes**:
- `-76`: Memory allocation failed (not enough RAM)
- `-30592`: SSL/TLS handshake failed
- `-0x7680`: Certificate verification failed

**Solution**:
- Increase `mqttClient.setBufferSize(512)` to `1024`
- Add to setup(): `ESP.setMaxAllocHeap(4096);`
- Ensure certificates are correctly formatted

### Issue 4: "MQTT failed, rc=-2 (MQTT_CONNECT_FAILED)"
**Cause**: TLS connected but MQTT connection failed

**Solution**:
- Check AWS IoT Policy is attached to certificate
- Verify policy allows `iot:Connect` for your client ID
- Check client ID is unique and matches policy

### Issue 5: Connection works but no data published
**Cause**: Policy doesn't allow publish

**Solution**: Attach this policy to your certificate:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iot:*",
      "Resource": "*"
    }
  ]
}
```

## Verification Checklist

Before asking for help, verify:

- [ ] Plain TCP connection works (you should see "plain TCP connect OK")
- [ ] Time is synced (epoch > 1600000000)
- [ ] WiFi is connected
- [ ] AWS IoT endpoint is correct
- [ ] Certificates match your AWS IoT Thing
- [ ] Certificate is ACTIVE in AWS Console
- [ ] Policy is attached to certificate
- [ ] Client ID matches (or policy allows any client)

## Debug Output to Share

If you need help, share this output from Serial Monitor:

```
aws_client: initializing AWS IoT client
aws_client: endpoint: xxxxx
aws_client: client ID: xxxxx
aws_client: Certificate lengths: [lengths]
aws_client: connecting to [endpoint]
aws_client: resolved endpoint to [IP]
aws_client: current epoch: [timestamp]
aws_client: TLS handshake starting (insecure=X)...
[error messages]
```

## Next Steps After Connection Works

1. **Test data flow**: Check AWS IoT Test console for messages
2. **Re-enable secure mode**: Set `AWS_INSECURE=0`
3. **Monitor stability**: Let it run for a few hours
4. **Implement certificate storage**: Move certs to SPIFFS/LittleFS
5. **Update policy**: Restrict to minimum required permissions

## Quick Test Commands

### Check AWS IoT from Command Line:
```bash
# Subscribe to topic
aws iot-data subscribe --topic devices/esp32/sensors

# Check Thing status
aws iot describe-thing --thing-name your-thing-name

# List certificates
aws iot list-certificates
```

### ESP32 Quick Tests:
Add to `setup()` for debugging:
```cpp
Serial.println("Free heap: " + String(ESP.getFreeHeap()));
Serial.println("Chip model: " + String(ESP.getChipModel()));
Serial.println("SDK version: " + String(ESP.getSdkVersion()));
```

## Getting More Help

If you're still stuck:
1. Post the FULL serial monitor output (from boot to error)
2. Confirm your AWS region
3. Share the certificate lengths from the output
4. Confirm if insecure mode works

---

**Remember**: Insecure mode is for TESTING ONLY. Always use secure mode (AWS_INSECURE=0) in production!


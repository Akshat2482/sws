# BLE Discovery Troubleshooting Guide

## Problem: Browser Cannot Discover ESP32S3

If your browser cannot find the ESP32S3 device when you click "Connect to ESP32S3", follow these steps:

---

## 1. Check if BLE is Actually Running on ESP32

### Open Serial Monitor (115200 baud)

Look for these messages during startup:

✅ **BLE IS RUNNING** - You should see:
```
=== BLE INITIALIZATION START ===
BLE device initialized with name: ESP32S3
BLE service created
=== BLE ADVERTISING STARTED (ESP32S3) ===
Device should now be visible to browsers!
```

❌ **BLE IS NOT RUNNING** - If you see:
```
WiFi already connected - skipping BLE initialization
```

**Problem:** Your ESP32 auto-connected to saved WiFi credentials, so BLE was disabled to save memory.

---

## 2. Solution: Force BLE to Start

The ESP32 only starts BLE if WiFi is **NOT** connected (see `main-v1.ino` lines 91-98).

### Option A: Clear Stored WiFi Credentials

Add this code to `setup()` in `main-v1.ino` **BEFORE** `wifi_manager_try_autoconnect()`:

```cpp
void setup() {
  Serial.begin(115200);
  delay(1000);

  // ADD THIS TO CLEAR SAVED WIFI
  prefs.begin("wifi", false);
  prefs.clear();
  prefs.end();
  Serial.println("⚠️ WiFi credentials cleared!");

  // ... rest of setup
  wifi_manager_try_autoconnect();
```

Upload, then restart ESP32. BLE will now start because no WiFi is saved.

### Option B: Remove Auto-Connect from Stored WiFi

Edit `wifi_manager.cpp` line 250-252:

**Before:**
```cpp
String storedSSID = prefs.getString("ssid", "AkshtAhwin2G");
String storedPass = prefs.getString("pass", "virtualwings");
```

**After:**
```cpp
String storedSSID = prefs.getString("ssid", "");  // Empty default
String storedPass = prefs.getString("pass", "");  // Empty default
```

This removes the hardcoded defaults that auto-connect.

### Option C: Always Start BLE (Not Recommended - Memory Issues)

Edit `main-v1.ino` lines 91-98:

**Before:**
```cpp
if (!wifi_manager_is_connected()) {
    Serial.println("WiFi not connected - starting BLE for provisioning...");
    wifi_manager_init();
} else {
    Serial.println("WiFi already connected - skipping BLE initialization");
}
```

**After:**
```cpp
// Always start BLE regardless of WiFi status
Serial.println("Starting BLE for provisioning...");
wifi_manager_init();
```

⚠️ **Warning:** This may cause memory issues with AWS IoT TLS connections!

---

## 3. Browser Requirements

### Supported Browsers
- ✅ Chrome 56+ (Windows, Mac, Linux, Android)
- ✅ Edge 79+ (Windows, Mac)
- ✅ Opera 43+
- ❌ Safari (no Web Bluetooth support)
- ❌ Firefox (no Web Bluetooth support)
- ❌ iOS browsers (Apple blocks Web Bluetooth on iOS)

### Enable Web Bluetooth (if needed)

**Chrome/Edge:**
1. Go to `chrome://flags` or `edge://flags`
2. Search for "bluetooth"
3. Enable "Experimental Web Platform features"
4. Restart browser

---

## 4. Verify BLE is Broadcasting

### Check on ESP32 Serial Monitor

After startup, you should see periodic status checks:
```
=== BLE STATUS CHECK ===
BLE Advertising Active: YES
Device Connected: NO
```

If "BLE Advertising Active: NO", BLE is not running.

### Check with Bluetooth Scanner App

Use a phone app to verify ESP32S3 is broadcasting:
- **Android:** "nRF Connect" app
- **iOS:** "LightBlue" app

Look for device named **"ESP32S3"** with service UUID `12345678-1234-1234-1234-1234567890ab`

---

## 5. Use Debug Scanner in HTML

1. Open `wifi-setup.html`
2. Click **"Scan All BLE"** button
3. Browser will show ALL nearby BLE devices
4. Select any device to see debug info
5. Check if ESP32S3 appears in the list

The debug log will show:
- Device name
- Device ID
- Available services
- Whether it's your ESP32

---

## 6. Common Issues

### Issue: "No Bluetooth adapter found"
- **Solution:** Make sure your computer has Bluetooth hardware
- Check Bluetooth is enabled in system settings

### Issue: Device list is empty in browser
- **Solution:**
  - ESP32 might not be advertising (check Serial Monitor)
  - Move ESP32 closer (BLE range is ~10 meters)
  - Restart ESP32 and try again

### Issue: ESP32S3 appears but connection fails
- **Solution:**
  - Check service UUID matches: `12345678-1234-1234-1234-1234567890ab`
  - Make sure ESP32 is not already connected to another device
  - Restart both ESP32 and browser

### Issue: After WiFi connects once, BLE never works again
- **Solution:** This is by design to save memory for AWS IoT
  - Clear stored credentials (see Option A above)
  - Or modify code to always start BLE (Option C)

---

## 7. Verification Checklist

Before asking for help, verify:

- [ ] Serial Monitor shows "BLE ADVERTISING STARTED"
- [ ] Using Chrome or Edge browser (not Safari/Firefox)
- [ ] Web Bluetooth enabled in browser flags
- [ ] Computer Bluetooth is turned on
- [ ] ESP32 is within 10 meters
- [ ] ESP32S3 appears in "Scan All BLE" debug scan
- [ ] No other device is connected to ESP32S3

---

## 8. Hardware-Specific Issues

### ESP32-S3 vs ESP32 Classic

The code is configured for ESP32-S3. If using regular ESP32:
- BLE should work the same
- Memory constraints may be tighter
- Ensure "Minimal SPIFFS" partition scheme in Arduino IDE

### Power Issues

Low power can cause BLE to be unreliable:
- Use USB cable with data + power pins
- Try different USB port
- Use external 5V power supply if needed

---

## Need More Help?

1. Check Serial Monitor output and paste relevant logs
2. Run "Scan All BLE" and share debug results
3. Verify ESP32S3 appears in phone Bluetooth scanner
4. Check which browser and version you're using

# Arduino IDE Settings for ESP32 AWS IoT

## Critical Issue: TLS Memory Error (-32512)

Error code `-32512` means `MBEDTLS_ERR_SSL_ALLOC_FAILED` - the ESP32 doesn't have enough RAM for TLS.

## ✅ REQUIRED Arduino IDE Settings

### Step 1: Select Correct Board

Go to **Tools** menu and set:

```
Board: "ESP32 Dev Module"
```

Or if you have a specific board:
- ESP32-WROOM-32
- ESP32-DevKitC
- ESP32-WROVER (has PSRAM - best option!)

### Step 2: Partition Scheme (CRITICAL!)

Go to **Tools → Partition Scheme** and select:

```
✅ "Minimal SPIFFS (1.9MB APP with OTA/190KB SPIFFS)"
```

Or even better:
```
✅ "No OTA (2MB APP/2MB SPIFFS)"  
✅ "Huge APP (3MB No OTA/1MB SPIFFS)"
```

**Why?** This gives your app more RAM by reducing partition sizes.

### Step 3: PSRAM (If Available)

If your board has PSRAM (ESP32-WROVER), enable it:

Go to **Tools → PSRAM** and select:
```
✅ "Enabled"
```

### Step 4: Flash Frequency

Go to **Tools → Flash Frequency**:
```
✅ "80MHz"
```

### Step 5: Upload Speed

Go to **Tools → Upload Speed**:
```
✅ "115200" (or "921600" if your board supports it)
```

### Step 6: CPU Frequency

Go to **Tools → CPU Frequency**:
```
✅ "240MHz (WiFi/BT)"
```

### Step 7: Flash Size

Go to **Tools → Flash Size**:
```
✅ "4MB (32Mb)"
```

## Complete Arduino IDE Settings

```
Board:              "ESP32 Dev Module"
Upload Speed:       "115200"
CPU Frequency:      "240MHz (WiFi/BT)"
Flash Frequency:    "80MHz"
Flash Mode:         "QIO"
Flash Size:         "4MB (32Mb)"
Partition Scheme:   "Minimal SPIFFS (1.9MB APP with OTA/190KB SPIFFS)"
                    OR "Huge APP (3MB No OTA/1MB SPIFFS)"
Core Debug Level:   "None" (or "Info" for debugging)
PSRAM:              "Enabled" (if your board has it)
```

## How to Check if It's Working

After uploading with these settings, check Serial Monitor for:

```
Smart Weather Station Starting...
========================================
Chip Model: ESP32-D0WDQ6
Free Heap: 290000+     ← Should be > 200KB
Free PSRAM: 4194252    ← If you have PSRAM
========================================

aws_client: Free heap: 290000+
aws_client: Free heap before TLS: 280000+
aws_client: TLS handshake starting (insecure=1)...
aws_client: TLS handshake successful!  ← SUCCESS!
```

## If Still Failing

### Option 1: Reduce Memory Usage

Add this to `main-v1.ino` at the top:

```cpp
// Reduce BLE memory if not needed during AWS connection
#define CONFIG_BT_NIMBLE_MAX_CONNECTIONS 1
```

### Option 2: Disconnect BLE Before AWS

Modify `wifi_manager.cpp` to end BLE after WiFi connects:

```cpp
// After successful WiFi connection
BLEDevice::deinit(true);  // Free BLE memory
```

### Option 3: Use Different TLS Library

If nothing works, consider using `esp-mqtt` library instead of `PubSubClient`:
- Better memory management
- Native AWS IoT support
- Requires code changes

## Expected Memory Usage

### Minimum Requirements:
- Free Heap: **> 200KB** before TLS connection
- Free Heap: **> 150KB** during TLS handshake
- Free Heap: **> 100KB** after connection

### Check Your Memory:

The code now prints memory at each stage:
1. At boot
2. At AWS init
3. Before TLS connection
4. After TLS connection

## Troubleshooting by Memory Amount

### If Free Heap < 150KB:
```
❌ Problem: Not enough RAM
✅ Solution: Use "Huge APP" partition scheme
✅ Solution: Reduce MQTT buffer: mqttClient.setBufferSize(512);
✅ Solution: Disable BLE after WiFi connects
```

### If Free Heap 150-200KB:
```
⚠️  Borderline - may work
✅ Try: Increase partition scheme
✅ Try: Reboot ESP32 before connecting to AWS
```

### If Free Heap > 200KB but still fails:
```
✅ Should work with insecure mode
❌ If failing, check:
   - WiFi is stable
   - AWS endpoint is correct
   - Time is synced (epoch > 1600000000)
```

## Quick Fix Commands

### In Arduino IDE:
1. Close Arduino IDE
2. Reopen Arduino IDE
3. Tools → Board → ESP32 Dev Module
4. Tools → Partition Scheme → **Minimal SPIFFS**
5. Sketch → Upload
6. Tools → Serial Monitor (115200 baud)

### Look for these lines:
```
Free Heap: 290000      ← Good! (> 200KB)
TLS handshake successful!  ← Success!
aws_client: connected   ← Working!
```

## Alternative: Use Arduino ESP32 Core 2.x

If using ESP32 Core 3.x causes issues, try downgrading:

1. Tools → Board → Boards Manager
2. Search "esp32"
3. Click "esp32 by Espressif"
4. Select version **2.0.14** (more stable for some boards)
5. Click Install

## Still Not Working?

Share this output:
```
Chip Model: [?]
Free Heap: [?]
Free PSRAM: [?]
Partition Scheme: [?]
aws_client: last SSL error code: [?]
```

---

**TL;DR**: Change partition scheme to "Minimal SPIFFS" or "Huge APP" in Arduino IDE Tools menu, then reupload.


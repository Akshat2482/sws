# Changes Summary

## Date: October 16, 2025

### Critical Bug Fixes

#### 1. Fixed `scanRequested` Variable Shadowing Bug
**File**: `c++/main-v1/wifi_manager.cpp`

**Problem**: The `wifi_manager_loop()` function declared a local `static bool scanRequested` that shadowed the global flag, preventing Wi-Fi scan requests from working.

**Fix**: Removed the local static variable and used the global `scanRequested` flag directly.

**Impact**: Wi-Fi scanning via BLE now works correctly when clients send "SCAN" command.

### Security Improvements

#### 2. Disabled Insecure Mode by Default
**File**: `c++/main-v1/aws_client.h`

**Changes**:
- Changed `AWS_INSECURE` default from `1` to `0`
- Added security warning comment
- TLS certificate validation now enabled by default

**Impact**: Production deployments now have proper TLS security enabled.

#### 3. Added Security Warnings
**File**: `c++/main-v1/aws_client.cpp`

**Changes**:
- Added comprehensive security warning at top of file
- Documented best practices:
  - Store certificates in SPIFFS/LittleFS
  - Remove credentials from source control
  - Use secure elements for private keys
  - Rotate certificates regularly

**Impact**: Developers are now warned about embedded credential risks.

### Documentation Updates

#### 4. Updated Library Requirements
**File**: `c++/main-v1/README.md`

**Changes**:
- Removed incorrect BME280 reference
- Added missing libraries:
  - Adafruit SSD1306
  - Adafruit GFX Library
- Clarified DHT sensor library requirement

**Impact**: Users can now install all required libraries correctly.

#### 5. Added Hardware Pin Mapping
**File**: `c++/main-v1/README.md`

**Added**:
```
Hardware Pin Mapping:
- DHT11 Temperature/Humidity Sensor: GPIO 4
- MQ135 Air Quality Sensor (analog): GPIO 34 (ADC1_CH6)
- LDR Light Sensor (analog): GPIO 35 (ADC1_CH7)
- SSD1306 OLED Display (I2C): SDA=GPIO 21, SCL=GPIO 22, Address=0x3C
```

**Impact**: Clear hardware setup instructions for users.

### Code Cleanup

#### 6. Removed Unused Constants
**File**: `c++/main-v1/wifi_manager.cpp`

**Changes**:
- Removed unused `SCAN_INTERVAL` constant
- Removed unused `lastScanMillis` variable

**Impact**: Cleaner, more maintainable code.

#### 7. Fixed Comment Inconsistencies
**File**: `c++/main-v1/sensor_manager.cpp`

**Changed**: "Update every 1 second" → "Update interval: 5 seconds"

**Impact**: Comments now match actual behavior (5000ms interval).

### New Features

#### 8. Created Live Dashboard with AWS IoT Integration
**New Files**:
- `dashboard.html` - Real-time dashboard connecting via WebSocket
- `smart-weather-station-live.html` - Alternative dashboard with direct AWS SDK
- `server.js` - Node.js proxy server bridging AWS IoT and WebSocket clients

**Features**:
- Real-time sensor data visualization
- Auto-reconnection on disconnect
- Historical data charts
- Material Design icons for sensors
- Connection status indicators
- Ping/keepalive mechanism

**Impact**: Users can now view live sensor data in a web browser.

#### 9. Enhanced Package Configuration
**File**: `package.json`

**Added**:
- Proper npm scripts:
  - `npm start` - Start proxy server
  - `npm run dev` - Development mode with auto-restart
  - `npm run dashboard` - Launch static dashboard
  - `npm run wifi-setup` - Launch Wi-Fi setup page
- Dependencies:
  - express
  - ws (WebSocket)
  - aws-iot-device-sdk
  - cors
  - dotenv
- Dev dependencies:
  - nodemon

**Impact**: Professional Node.js project structure.

#### 10. Created Comprehensive Documentation

**New Files**:
- `README.md` - Main project documentation with quick start
- `SETUP.md` - Detailed setup guide with troubleshooting
- `env.example` - Environment variable template
- `.gitignore` - Prevent committing secrets

**Content Includes**:
- Architecture diagrams
- Hardware wiring guide
- AWS IoT policy examples
- Troubleshooting section
- Security best practices
- API documentation

**Impact**: Complete documentation for new users.

## Summary Statistics

- **Files Modified**: 5
- **Files Created**: 7
- **Bugs Fixed**: 1 critical
- **Security Issues Addressed**: 2
- **Documentation Pages Added**: 3
- **New Features**: Live dashboard with WebSocket integration

## Testing Recommendations

1. **Test Wi-Fi Scanning**: Use BLE to send "SCAN" command and verify networks are returned
2. **Test TLS Connection**: With `AWS_INSECURE=0`, verify ESP32 connects to AWS IoT
3. **Test Dashboard**: Start proxy server and verify real-time data updates
4. **Test Reconnection**: Disconnect/reconnect ESP32 and verify auto-recovery
5. **Test BLE Provisioning**: Provision new Wi-Fi credentials via web interface

## Migration Notes

### For Existing Users

If you were using the previous version:

1. **Update `aws_client.h`**: The default for `AWS_INSECURE` is now `0`. If you need to test without certificates, explicitly set it to `1` in your build.

2. **Install New Libraries**: Run Arduino Library Manager and install:
   - Adafruit SSD1306
   - Adafruit GFX Library

3. **Wi-Fi Scanning**: BLE scan functionality now works correctly. No changes needed on your end.

4. **Dashboard**: To use the live dashboard:
   ```bash
   npm install
   cp env.example .env
   # Edit .env with your settings
   npm start
   ```

## Next Steps

Recommended improvements for future versions:

1. **Certificate Management**: Implement SPIFFS/LittleFS storage for certificates
2. **OTA Updates**: Add over-the-air firmware update capability
3. **Data Persistence**: Store historical data in DynamoDB
4. **Authentication**: Add user authentication to web dashboard
5. **Multi-Device**: Support multiple ESP32 devices
6. **Alerts**: Implement threshold-based notifications
7. **Mobile App**: Create native mobile application

## Credits

All changes implemented by AI assistant based on code analysis and best practices.


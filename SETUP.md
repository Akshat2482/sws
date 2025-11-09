# Smart Weather Station - Setup Guide

## Overview

This project consists of:
1. **ESP32 Firmware** - Reads sensors and publishes to AWS IoT
2. **Web Dashboard** - Real-time visualization of sensor data
3. **Proxy Server** - Bridges AWS IoT and web dashboard

## Quick Start

### 1. ESP32 Firmware Setup

See `c++/main-v1/README.md` for detailed firmware setup instructions.

**Quick steps:**
```bash
# Install Arduino IDE and ESP32 board support
# Install libraries: PubSubClient, DHT sensor library, Adafruit SSD1306, Adafruit GFX
# Open c++/main-v1/main-v1.ino
# Update AWS credentials in aws_client.cpp
# Upload to ESP32
```

### 2. Wi-Fi Provisioning

**Option A: Via BLE (Recommended)**
```bash
npm run wifi-setup
# Click "Connect to ESP32" and follow prompts
```

**Option B: Manual**
Edit credentials in the firmware and reupload.

### 3. Dashboard Setup

#### Install Dependencies
```bash
npm install
```

#### Configure AWS IoT

1. **Create AWS IoT Thing**
   - Go to AWS IoT Console
   - Create a new Thing
   - Create and download certificates
   - Attach a policy that allows `iot:Connect`, `iot:Subscribe`, `iot:Receive`

2. **Setup Certificates**
   ```bash
   mkdir certs
   # Copy your certificates to certs/
   cp ~/Downloads/xxxxx-certificate.pem.crt certs/certificate.pem.crt
   cp ~/Downloads/xxxxx-private.pem.key certs/private.pem.key
   # Download Amazon Root CA 1
   curl -o certs/AmazonRootCA1.pem https://www.amazontrust.com/repository/AmazonRootCA1.pem
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your AWS IoT endpoint and settings
   ```

4. **Start the Server**
   ```bash
   npm start
   ```

5. **Open Dashboard**
   ```
   http://localhost:3000/dashboard.html
   ```

## Architecture

```
┌─────────────┐
│   ESP32     │
│  (Sensors)  │
└──────┬──────┘
       │ MQTT/TLS
       ↓
┌─────────────────┐
│  AWS IoT Core   │
└──────┬──────────┘
       │ MQTT/TLS
       ↓
┌─────────────────┐
│  Proxy Server   │
│   (Node.js)     │
└──────┬──────────┘
       │ WebSocket
       ↓
┌─────────────────┐
│  Web Dashboard  │
│    (Browser)    │
└─────────────────┘
```

## AWS IoT Policy Example

Attach this policy to your certificate:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iot:Connect"
      ],
      "Resource": "arn:aws:iot:REGION:ACCOUNT_ID:client/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iot:Subscribe"
      ],
      "Resource": "arn:aws:iot:REGION:ACCOUNT_ID:topicfilter/devices/esp32/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iot:Receive"
      ],
      "Resource": "arn:aws:iot:REGION:ACCOUNT_ID:topic/devices/esp32/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iot:Publish"
      ],
      "Resource": "arn:aws:iot:REGION:ACCOUNT_ID:topic/devices/esp32/*"
    }
  ]
}
```

Replace `REGION` and `ACCOUNT_ID` with your AWS region and account ID.

## Troubleshooting

### ESP32 not connecting to AWS IoT

1. Check serial monitor for error messages
2. Verify time is synced (NTP)
3. Check AWS_INSECURE flag (set to 1 for testing, 0 for production)
4. Verify certificates are correct
5. Check AWS IoT policy permissions

### Dashboard not receiving data

1. Check server is running: `http://localhost:3000/health`
2. Verify ESP32 is publishing (check serial monitor)
3. Check AWS IoT Test console to see if messages arrive
4. Verify certificate paths in `.env`

### BLE connection fails

1. Use Chrome or Edge (Web Bluetooth required)
2. Must be HTTPS or localhost
3. Check ESP32 is advertising (serial monitor should show "BLE advertising started")

## Development

### Watch mode (auto-restart on changes)
```bash
npm run dev
```

### Test different dashboards
```bash
# Static demo dashboard
npm run dashboard

# Wi-Fi setup page
npm run wifi-setup
```

## Hardware Pin Mapping

| Component | Pin | Notes |
|-----------|-----|-------|
| DHT11 | GPIO 4 | Temperature/Humidity |
| MQ135 | GPIO 34 (ADC) | Air Quality |
| LDR | GPIO 35 (ADC) | Light Sensor |
| SSD1306 (SDA) | GPIO 21 | OLED Display |
| SSD1306 (SCL) | GPIO 22 | OLED Display |

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit certificates or private keys** - They are in `.gitignore`
2. **Rotate credentials regularly** - Use AWS IoT fleet provisioning for production
3. **Use IAM roles** - Consider AWS Lambda + API Gateway instead of direct credentials
4. **Enable TLS** - Set `AWS_INSECURE=0` in production firmware
5. **Implement authentication** - Add user auth to the web dashboard for production

## License

MIT


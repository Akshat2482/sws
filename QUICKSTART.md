# Quick Start Guide - Smart Weather Station

Get your weather station running in 15 minutes!

## Prerequisites Checklist

- [ ] ESP32 board
- [ ] DHT11, MQ135, LDR sensors, SSD1306 display
- [ ] Arduino IDE installed
- [ ] Node.js v16+ installed
- [ ] AWS account (free tier works)
- [ ] Chrome or Edge browser

## Step 1: Flash ESP32 Firmware (5 minutes)

```bash
# 1. Open Arduino IDE
# 2. Install ESP32 board support (v3.x)
#    Tools -> Board -> Boards Manager -> "esp32" by Espressif

# 3. Install libraries (Sketch -> Include Library -> Manage Libraries):
#    - PubSubClient
#    - DHT sensor library
#    - Adafruit SSD1306
#    - Adafruit GFX Library

# 4. Open sketch: File -> Open -> c++/main-v1/main-v1.ino

# 5. Select board and port:
#    Tools -> Board -> ESP32 Dev Module
#    Tools -> Port -> (your COM port)

# 6. Click Upload (→) button
```

## Step 2: Provision Wi-Fi (2 minutes)

```bash
# 1. Install Node.js dependencies
npm install

# 2. Start Wi-Fi setup page
npm run wifi-setup

# 3. In the browser:
#    - Click "Connect to ESP32"
#    - Select your device (ESP32-Configurator)
#    - Click "Scan"
#    - Select your Wi-Fi network
#    - Enter password
#    - Click "Connect"

# 4. Wait for "Connected: xxx.xxx.xxx.xxx" message
```

## Step 3: Setup AWS IoT (5 minutes)

```bash
# 1. Go to AWS IoT Console (console.aws.amazon.com/iot)

# 2. Create a Thing:
#    Manage -> Things -> Create -> Create single thing
#    Name: "weather-station-esp32"
#    Click Next -> Next -> Create thing

# 3. Create certificates:
#    Security -> Certificates -> Create
#    Download all 3 files:
#    - xxxxx-certificate.pem.crt
#    - xxxxx-private.pem.key
#    - AmazonRootCA1.pem
#    Click "Activate" -> "Done"

# 4. Create and attach policy:
#    Security -> Policies -> Create
#    Name: "WeatherStationPolicy"
#    Policy document:
```

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["iot:*"],
      "Resource": ["*"]
    }
  ]
}
```

```bash
#    Create -> Go back to Certificates -> Click your cert
#    Actions -> Attach policy -> Select "WeatherStationPolicy"

# 5. Get your endpoint:
#    Settings -> Device data endpoint
#    Copy the endpoint (e.g., xxxxx-ats.iot.us-east-1.amazonaws.com)
```

## Step 4: Configure Certificates (2 minutes)

```bash
# 1. Create certs folder
mkdir certs

# 2. Copy downloaded certificates
cp ~/Downloads/*-certificate.pem.crt certs/certificate.pem.crt
cp ~/Downloads/*-private.pem.key certs/private.pem.key
cp ~/Downloads/AmazonRootCA1.pem certs/AmazonRootCA1.pem

# 3. Create .env file
cp env.example .env

# 4. Edit .env with your endpoint
# Change AWS_IOT_ENDPOINT to your endpoint from Step 3.5
```

## Step 5: Start Dashboard (1 minute)

```bash
# 1. Start the proxy server
npm start

# 2. Open browser to:
http://localhost:3000/dashboard.html

# 3. You should see:
#    - "Connected to AWS IoT" (green dot)
#    - Real-time sensor data updating every 5 seconds
```

## Verification

✅ **ESP32 Serial Monitor** should show:
```
WiFi connected: xxx.xxx.xxx.xxx
aws_client: connected
Published sensor payload to AWS: {"tempF":72.1,...}
```

✅ **Dashboard** should show:
- Green "Connected" status
- Live temperature, humidity, air quality, light data
- "Updated: HH:MM:SS" timestamps
- Chart with air quality trend

✅ **AWS IoT Test Console** (Test -> Subscribe to topic):
- Subscribe to `devices/esp32/sensors`
- Should see JSON messages every 5 seconds

## Troubleshooting

### ESP32 won't connect to AWS
```bash
# Check Serial Monitor output
# Look for errors after "aws_client: connecting..."

# Common issues:
# 1. Time not synced -> Wait 10 seconds after Wi-Fi connects
# 2. Certificate error -> Verify files in c++/main-v1/aws_client.cpp
# 3. Endpoint wrong -> Check AWS_IOT_ENDPOINT in aws_client.cpp
```

### Dashboard shows "Disconnected"
```bash
# Check server console for errors

# Common issues:
# 1. Certificates not found -> Check certs/ folder
# 2. Wrong endpoint in .env -> Verify AWS_IOT_ENDPOINT
# 3. Policy not attached -> Check AWS IoT Console -> Certificates

# Test server:
curl http://localhost:3000/health
# Should return: {"status":"ok","awsIotConnected":true,...}
```

### BLE pairing fails
```bash
# Requirements:
# - Chrome or Edge browser (not Firefox/Safari)
# - HTTPS or localhost
# - ESP32 powered and advertising

# Check Serial Monitor for:
# "BLE advertising started (ESP32-Configurator)"
```

## Quick Commands Reference

```bash
# Wi-Fi setup
npm run wifi-setup

# Start dashboard server
npm start

# Development mode (auto-restart)
npm run dev

# Check server health
curl http://localhost:3000/health

# View static demo
npm run dashboard
```

## Hardware Connections

```
DHT11 Data  → ESP32 GPIO 4
MQ135 Aout  → ESP32 GPIO 34
LDR         → ESP32 GPIO 35 (via voltage divider)
OLED SDA    → ESP32 GPIO 21
OLED SCL    → ESP32 GPIO 22
```

## What's Next?

- 📖 Read [README.md](README.md) for full documentation
- 🔧 See [SETUP.md](SETUP.md) for advanced setup
- 📋 Check [CHANGES.md](CHANGES.md) for recent updates
- 🔒 Review security section in README before production use

## Support

Having issues? Check:
1. Serial Monitor output (115200 baud)
2. Server console logs
3. AWS IoT Test console
4. Browser console (F12)

---

🎉 **Congratulations!** Your weather station is now live!


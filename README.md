# 🌤️ Smart Weather Station

A complete IoT weather monitoring system using ESP32, AWS IoT Core, and real-time web dashboard.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-ESP32-green.svg)
![AWS](https://img.shields.io/badge/AWS-IoT%20Core-orange.svg)

## Features

- 🌡️ Real-time temperature and humidity monitoring (DHT11)
- 💨 Air quality sensing (MQ135)
- 💡 Light level detection (LDR)
- 📱 BLE-based Wi-Fi provisioning
- ☁️ Cloud connectivity via AWS IoT Core
- 📊 Live web dashboard with historical charts
- 🖥️ Local OLED display (SSD1306)
- 🔒 Secure MQTT over TLS
- 📡 Auto-reconnection and error handling

## Architecture

```
ESP32 + Sensors → AWS IoT Core → Node.js Proxy → Web Dashboard
```

## Hardware Requirements

- ESP32 development board
- DHT11 temperature/humidity sensor
- MQ135 air quality sensor
- LDR (Light Dependent Resistor)
- SSD1306 OLED display (128x64, I2C)
- Breadboard and jumper wires
- Resistors (10kΩ for LDR voltage divider)

### Wiring Diagram

| Component | ESP32 Pin | Notes |
|-----------|-----------|-------|
| DHT11 Data | GPIO 4 | + pull-up resistor |
| MQ135 Analog Out | GPIO 34 (ADC1_CH6) | 0-3.3V |
| LDR | GPIO 35 (ADC1_CH7) | voltage divider |
| OLED SDA | GPIO 21 | I2C |
| OLED SCL | GPIO 22 | I2C |
| OLED Address | 0x3C | |

## Software Setup

### Prerequisites

- **Arduino IDE** with ESP32 board support
- **Node.js** v16+ and npm
- **AWS Account** with IoT Core access
- **Chrome/Edge browser** (for Web Bluetooth)

### 1. Firmware Setup

```bash
# Install Arduino IDE and ESP32 board support (v3.x)
# Install required libraries via Library Manager:
# - PubSubClient
# - DHT sensor library (by Adafruit)
# - Adafruit SSD1306
# - Adafruit GFX Library

# Open the sketch
# File -> Open -> ESP-32S3-Firmware-Code/ESP-32S3-Firmware-Code.ino

# Configure AWS credentials in aws_client.cpp
# Upload to ESP32
```

See [ESP-32S3-Firmware-Code/README.md](ESP-32S3-Firmware-Code/README.md) for detailed firmware instructions.

### 2. Wi-Fi Provisioning

```bash
npm install
npm run wifi-setup
```

Open the web page, click "Connect to ESP32", scan for networks, and send credentials.

### 3. Dashboard Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp env.example .env

# Download AWS IoT certificates
# Place them in ./certs/ directory

# Edit .env with your AWS IoT endpoint
nano .env

# Start the proxy server
npm start

# Open dashboard at http://localhost:3000/smart-weather-station-dashboard.html
```

See [SETUP.md](SETUP.md) for detailed setup instructions.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp env.example .env
# Edit .env with your AWS IoT settings

# 3. Add certificates to certs/ folder

# 4. Start the server
npm start

# 5. Open http://localhost:3000/smart-weather-station-dashboard.html
```

## Project Structure

```
.
├── ESP-32S3-Firmware-Code/
│   ├── ESP-32S3-Firmware-Code.ino       # Main sketch
│   ├── wifi_manager.*    # BLE + Wi-Fi provisioning
│   ├── sensor_manager.*  # Sensor reading + display
│   └── aws_client.*      # AWS IoT MQTT client
├── smart-weather-station-dashboard.html            # Live dashboard (connects to proxy)
├── wifi-setup.html           # BLE Wi-Fi provisioning page
├── server.js                 # Node.js WebSocket proxy
├── package.json              # Node.js dependencies
├── env.example               # Environment template
├── README.md                 # This file
└── SETUP.md                  # Detailed setup guide
```

## Usage

### Provisioning Wi-Fi

1. Power on ESP32
2. Open `http://localhost:8080` (run `npm run wifi-setup`)
3. Click "Connect to ESP32"
4. Select your ESP32 device
5. Click "Scan" to discover networks
6. Enter SSID and password
7. Click "Connect"

### Viewing Dashboard

1. Ensure ESP32 is connected to Wi-Fi and AWS IoT
2. Start proxy server: `npm start`
3. Open dashboard: `http://localhost:3000/smart-weather-station-dashboard.html`
4. Watch real-time sensor data update automatically

### Monitoring

- **Serial Monitor**: Connect at 115200 baud to see logs
- **AWS IoT Test Console**: Subscribe to `devices/esp32/sensors`
- **Health Check**: `http://localhost:3000/health`

## API Endpoints

### Proxy Server

- `GET /` - Serves dashboard
- `GET /health` - Server health check
- `GET /api/status` - Connection status
- `WS /` - WebSocket for real-time data

### Data Format

The ESP32 publishes JSON to `devices/esp32/sensors`:

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

## Configuration

### Firmware Configuration

Edit `ESP-32S3-Firmware-Code/aws_client.cpp`:
- `AWS_IOT_ENDPOINT` - Your AWS IoT endpoint
- `AWS_ROOT_CA` - Amazon Root CA certificate
- `AWS_CLIENT_CERT` - Device certificate
- `AWS_PRIVATE_KEY` - Device private key

Edit `ESP-32S3-Firmware-Code/aws_client.h`:
- `AWS_INSECURE` - Set to 0 for production (enables TLS verification)

### Server Configuration

Edit `.env`:
```bash
AWS_IOT_ENDPOINT=your-endpoint.iot.region.amazonaws.com
AWS_REGION=us-east-1
AWS_IOT_TOPIC=devices/esp32/sensors
AWS_IOT_PRIVATE_KEY_PATH=./certs/private.pem.key
AWS_IOT_CERTIFICATE_PATH=./certs/certificate.pem.crt
AWS_IOT_CA_PATH=./certs/AmazonRootCA1.pem
PORT=3000
```

## Security Considerations

⚠️ **Important:**

1. **Never commit certificates or private keys** to version control
2. Set `AWS_INSECURE=0` in production firmware
3. Use AWS IoT device provisioning for production deployments
4. Rotate credentials regularly
5. Implement proper authentication for the web dashboard
6. Use HTTPS in production
7. Restrict AWS IoT policies to minimum required permissions

See [SETUP.md](SETUP.md) for AWS IoT policy examples.

## Troubleshooting

### ESP32 Issues

**Problem**: ESP32 not connecting to AWS IoT
- Check serial output for errors
- Verify NTP time sync
- Check certificate format (PEM)
- Verify AWS IoT policy permissions
- Try `AWS_INSECURE=1` for testing

**Problem**: BLE not advertising
- Check serial output for "BLE advertising started"
- Verify ESP32 BLE is not disabled
- Try power cycling the device

### Server Issues

**Problem**: Dashboard not receiving data
- Check server is running: `http://localhost:3000/health`
- Verify certificates in `certs/` folder
- Check `.env` configuration
- View server console for errors

**Problem**: WebSocket connection failed
- Ensure server is running on port 3000
- Check firewall settings
- Try `ws://localhost:3000` in browser console

### AWS IoT Issues

**Problem**: Messages not arriving in AWS IoT
- Check AWS IoT Test console
- Verify thing/certificate is active
- Check policy permissions
- Verify endpoint URL is correct

## Development

```bash
# Development mode (auto-restart)
npm run dev

# Run static dashboard
npm run dashboard

# Run Wi-Fi setup page
npm run wifi-setup
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- ESP32 Arduino Core by Espressif
- Adafruit sensor libraries
- AWS IoT Device SDK
- Chart.js for visualizations

## Support

For issues and questions:
- Check [SETUP.md](SETUP.md) for detailed setup
- Review troubleshooting section above
- Check serial monitor output
- Verify AWS IoT configuration

## Roadmap

- [ ] Add more sensors (BME280, UV, rain)
- [ ] Implement OTA firmware updates
- [ ] Add data logging to DynamoDB
- [ ] Create mobile app
- [ ] Add alerts and notifications
- [ ] Implement user authentication
- [ ] Add data export functionality
- [ ] Support multiple devices

---

Made with ❤️ for IoT enthusiasts


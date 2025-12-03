Project: ESP32 BLE WiFi + Sensors + AWS IoT

Quick setup (Windows / VS Code / Arduino):

1) Install ESP32 board support in Arduino IDE:
   - Open Arduino -> Tools -> Board -> Boards Manager -> search "esp32" and install "esp32 by Espressif Systems" (version 3.x recommended)

2) Install required libraries in Arduino IDE Library Manager:
   - PubSubClient
   - DHT sensor library (by Adafruit)
   - Adafruit SSD1306
   - Adafruit GFX Library
   - ArduinoJson (by Benoit Blanchon) - Required for HTTP time sync fallback

3) ⚠️ IMPORTANT: Configure partition scheme (REQUIRED for AWS IoT TLS):
   - Tools → Partition Scheme → "Minimal SPIFFS (1.9MB APP with OTA/190KB SPIFFS)"
   - OR "Huge APP (3MB No OTA/1MB SPIFFS)"
   - This is CRITICAL - default partition causes TLS memory errors!

4) Open the folder `c:\Akshat 2025\SWS\c++\main-v1` in VS Code (optional, for IntelliSense).
   - The `.vscode/c_cpp_properties.json` file contains common include paths for the ESP32 cores. If your esp32 core version is different (not 3.3.0), edit the paths to match the installed core under `%USERPROFILE%\\AppData\\Local\\Arduino15\\packages\\esp32\\hardware\\esp32`.

5) Compile/upload in Arduino IDE:
   - Open the sketch folder in Arduino IDE (File -> Open -> choose `main-v1` folder)
   - Select the ESP32 board and port, then Verify/Upload.

5) Serial Monitor:
   - Open Serial Monitor at 115200 baud to see logs and debug prints.

Hardware Pin Mapping:
- DHT11 Temperature/Humidity Sensor: GPIO 4
- MQ135 Air Quality Sensor (analog): GPIO 34 (ADC1_CH6)
- LDR Light Sensor (analog): GPIO 35 (ADC1_CH7)
- SSD1306 OLED Display (I2C): SDA=GPIO 21, SCL=GPIO 22, Address=0x3C

Notes:
- The project uses PubSubClient as a fallback MQTT client. For production AWS IoT TLS, configure certs in `aws_client.cpp` or implement SPIFFS cert loading.
- If you prefer PlatformIO, move files into a PlatformIO project and add lib_deps for PubSubClient and sensor libraries.
- ⚠️ Security: AWS credentials are currently embedded in aws_client.cpp for development. For production, load from secure storage and remove from source control.

If anything is missing or your setup uses different paths/versions, tell me which Arduino core version you installed and I will update the VS Code config file accordingly.

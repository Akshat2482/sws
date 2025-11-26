#include "sensor_manager.h"
#include "aws_client.h"
#include <Wire.h>
#include <WiFi.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#include <DHT.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define OLED_SDA 8  // ESP32-S3 I2C Data
#define OLED_SCL 9  // ESP32-S3 I2C Clock
#define OLED_ADDRESS 0x3C  // I2C address for SH1106 (1.3 inch display)

// Create SH1106 display object
Adafruit_SH1106G display = Adafruit_SH1106G(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

#define MQ135_PIN 5 // ESP32-S3 compatible digital input
#define LDR_PIN 6   // ESP32-S3 compatible analog input

// Update interval: 5 seconds
unsigned long lastUpdate = 0;
const unsigned long updateInterval = 5000; // 5 seconds
static bool sensorsInitialized = false;

// ----- Helper functions -----
String classifyAirQuality(bool digitalValue)
{
    if (digitalValue == HIGH)
        return "Poor";
    else
        return "Good";
}

String classifyLight(int value) {
  static String prevState = "Unknown";
  String baseState;
  String currentState;

  // --- Base classification (depends on your sensor behavior) ---
  if (value > 4000)
    baseState = "Dark";
  else if (value > 1500)
    baseState = "Dim";
  else
    baseState = "Bright";

  // --- Determine message based on change ---
  if (prevState == "Unknown") {
    // first reading
    currentState = "Entering " + baseState;
  } else if (baseState != prevState) {
    currentState = "Exiting " + prevState;
    Serial.print("Value: ");
    Serial.print(value);
    Serial.print(" → ");
    Serial.println(currentState);

    // immediately show entering new state too
    currentState = "Entering " + baseState;
  } else {
    currentState = baseState; // no change, just state name
  }

  // --- Output the message ---
  Serial.print("Value: ");
  Serial.print(value);
  Serial.print(" → ");
  Serial.println(currentState);

  prevState = baseState; // update previous base state
  return currentState;
}

// ----- Initialization -----
void sensors_init()
{
    Serial.println("Initializing sensors with OLED display...");
    Serial.print("Free heap at sensor init: ");
    Serial.println(ESP.getFreeHeap());

    dht.begin();

    // Set pin modes
    pinMode(MQ135_PIN, INPUT); // Digital input for MQ135 DO pin
    pinMode(LDR_PIN, INPUT);   // Analog input for LDR

    // Initialize I2C with custom pins
    Wire.begin(OLED_SDA, OLED_SCL);

    // Initialize SH1106 display (1.3 inch)
    if (!display.begin(OLED_ADDRESS, true))
    {
        Serial.println(F("SH1106 OLED not found - continuing without display"));
        // Don't hang, just continue without display
    }
    else
    {
        // Sleek boot animation
        display.clearDisplay();

        // Title
        display.setTextSize(2);
        display.setTextColor(SH110X_WHITE);
        display.setCursor(24, 12);
        display.print("WEATHER");
        display.setTextSize(1);
        display.setCursor(45, 30);
        display.print("SYS");
        display.display();
        delay(500);

        // Minimal loading bar
        display.drawRect(24, 44, 80, 6, SH110X_WHITE);
        for (int i = 0; i < 76; i += 12) {
            display.fillRect(26, 46, i, 2, SH110X_WHITE);
            display.display();
            delay(80);
        }
        delay(300);

        Serial.println("SH1106 1.3\" OLED initialized!");
    }

    Serial.println("Sensors initialized successfully!");
}

// ----- Main Update -----
void sensors_update()
{
    // Lazy initialization - only init sensors on first call
    if (!sensorsInitialized)
    {
        sensors_init();
        sensorsInitialized = true;
        Serial.println("Sensors initialized on first call");
    }

    if (millis() - lastUpdate < updateInterval)
        return;
    lastUpdate = millis();

    float humidity = dht.readHumidity();
    float tempF = dht.readTemperature(true); // Fahrenheit
    bool airValue = digitalRead(MQ135_PIN);  // Digital reading
    int lightValue = analogRead(LDR_PIN);
   

    if (isnan(humidity) || isnan(tempF))
    {
        Serial.println(F("Failed to read from DHT sensor!"));

        // Minimal error display
        display.clearDisplay();
        display.drawFastHLine(0, 0, 128, SH110X_WHITE);
        display.drawFastHLine(0, 1, 128, SH110X_WHITE);

        display.setTextSize(2);
        display.setTextColor(SH110X_WHITE);
        display.setCursor(30, 20);
        display.print("ERROR");

        display.setTextSize(1);
        display.setCursor(35, 42);
        display.print("DHT FAIL");

        // Blinking error indicator
        for (int i = 0; i < 3; i++) {
            display.fillCircle(64, 55, 3, SH110X_WHITE);
            display.display();
            delay(200);
            display.fillCircle(64, 55, 3, SH110X_BLACK);
            display.display();
            delay(200);
        }
        return;
    }

    // Classify values
    String airStatus = classifyAirQuality(airValue);
    String lightStatus = classifyLight(lightValue);

    // Debug output
    Serial.print("Temp: ");
    Serial.print(tempF);
    Serial.print(" F  ");
    Serial.print("Hum: ");
    Serial.print(humidity);
    Serial.print(" %  ");
    Serial.print("Air: ");
    Serial.print(airStatus);
    Serial.print("  Light: ");
    Serial.println(lightStatus);

    // Only publish to AWS IoT if WiFi is connected
    // This prevents errors during BLE provisioning
    if (WiFi.status() == WL_CONNECTED)
    {
        // Publish to AWS IoT (compact JSON)
        String payload = "{";
        payload += "\"tempF\":" + String(tempF, 1);
        payload += ",\"hum\":" + String(humidity, 1);
        payload += ",\"air\":" + String(airValue);
        payload += ",\"light\":" + String(lightValue);
        payload += ",\"airStatus\":\"" + String(airStatus) + "\"";
        payload += ",\"lightStatus\":\"" + String(lightStatus) + "\"";
        // Add current milliseconds as 'date'
        payload += ",\"date\":" + String(millis());
        payload += "}";

        bool published = aws_client_publish("sws-data", payload.c_str());
        if (published)
        {
            Serial.println("Published sensor payload to AWS: " + payload);
        }
        else
        {
            Serial.println("Failed to publish sensor payload");
        }
    }
    else
    {
        Serial.println("WiFi not connected - skipping sensor publish");
    }

    // OLED output - Sleek Minimal Design
    display.clearDisplay();

    // ═══ THIN TOP BAR ═══
    display.drawFastHLine(0, 0, 128, SH110X_WHITE);
    display.drawFastHLine(0, 1, 128, SH110X_WHITE);
    display.setTextSize(1);
    display.setTextColor(SH110X_WHITE);
    display.setCursor(30, 4);
    display.print("WEATHER-SYS");

    // ═══ MAIN DATA (BIG & BOLD) ═══
    display.setTextSize(2);
    display.setCursor(2, 16);
    display.print(tempF, 0);
    display.print("*F");

    display.setCursor(72, 16);
    display.print(humidity, 0);
    display.print("%");

    // ═══ SLIM PROGRESS BARS ═══
    display.setTextSize(1);
    // Temp bar
    int tempBar = constrain(map(tempF, 32, 110, 0, 58), 0, 58);
    display.drawRect(2, 34, 60, 4, SH110X_WHITE);
    if (tempBar > 0) display.fillRect(3, 35, tempBar, 2, SH110X_WHITE);

    // Humidity bar
    int humBar = constrain(map(humidity, 0, 100, 0, 58), 0, 58);
    display.drawRect(68, 34, 60, 4, SH110X_WHITE);
    if (humBar > 0) display.fillRect(69, 35, humBar, 2, SH110X_WHITE);

    // ═══ BOTTOM STATUS LINE ═══
    display.drawFastHLine(0, 42, 128, SH110X_WHITE);

    // Air quality indicator
    display.setCursor(4, 46);
    display.print("AIR");
    display.setCursor(2, 54);
    if (airStatus == "Good") {
        display.print("good");
        display.fillCircle(30, 57, 2, SH110X_WHITE);
    } else {
        display.print("bad");
    }

    // Light level
    display.setCursor(42, 46);
    display.print("LIGHT");
    display.setCursor(42, 54);
    if (lightStatus.indexOf("Bright") >= 0) {
        display.print("HI");
        display.drawCircle(68, 57, 2, SH110X_WHITE);
        display.fillCircle(68, 57, 1, SH110X_WHITE);
    } else if (lightStatus.indexOf("Dim") >= 0) {
        display.print("MD");
        display.drawCircle(68, 57, 2, SH110X_WHITE);
    } else {
        display.print("LO");
        display.fillCircle(68, 57, 2, SH110X_WHITE);
    }

    // Status corner dot (alive indicator)
    static bool blink = false;
    blink = !blink;
    if (blink) display.fillCircle(124, 57, 2, SH110X_WHITE);

    display.display();
}

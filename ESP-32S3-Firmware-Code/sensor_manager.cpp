#include "sensor_manager.h"
#include "aws_client.h"
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define OLED_SDA 11 // ESP32-S3 I2C Data
#define OLED_SCL 10 // ESP32-S3 I2C Clock
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, OLED_SDA, OLED_SCL, OLED_RESET);

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

    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3D))
    {
        Serial.println(F("OLED not found - continuing without display"));
        // Don't hang, just continue without display
    }
    else
    {
        display.clearDisplay();
        display.setTextSize(1);
        display.setTextColor(SSD1306_WHITE);
        display.setCursor(10, 20);
        display.println("Weather Station");
        display.setCursor(10, 35);
        display.println("Initializing...");
        display.display();
        delay(1500);
        Serial.println("OLED display initialized!");
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
        display.clearDisplay();
        display.setTextSize(1);
        display.setTextColor(SSD1306_WHITE);
        display.setCursor(10, 25);
        display.println("DHT Error!");
        display.display();
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

    // OLED output - Display current sensor readings
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println(" WEATHER STATION ");
    display.println("--------------------");

    // Temperature
    display.print("Temp : ");
    display.print(tempF, 1);
    display.println(" F");

    // Humidity
    display.print("Humid: ");
    display.print(humidity, 1);
    display.println(" %");

    // Air Quality
    display.print("Air  : ");
    display.println(airStatus);

    // Light Level
    display.print("Light: ");
    display.println(lightStatus);

    display.display();
}

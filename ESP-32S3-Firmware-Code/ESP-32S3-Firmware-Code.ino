#include "wifi_manager.h"
#include "sensor_manager.h"
#include "aws_client.h"


// GPIO pin for forcing BLE provisioning mode
#define PROVISION_BUTTON_PIN 0  // Use BOOT button on most ESP32 boards

// ⚠️ TESTING MODE: Set to 'true' to ALWAYS clear credentials and start BLE
// Set to 'false' for normal operation (auto-connect if credentials exist)
#define FORCE_BLE_MODE false  // ✅ PRODUCTION MODE - Save credentials and auto-connect

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Configure provision button
  pinMode(PROVISION_BUTTON_PIN, INPUT_PULLUP);

  Serial.println("\n\n========================================");
  Serial.println("   ESP32 MEMORY DIAGNOSTIC REPORT");
  Serial.println("========================================");
  
  // Chip information
  Serial.print("Chip Model: ");
  Serial.println(ESP.getChipModel());
  Serial.print("Chip Revision: ");
  Serial.println(ESP.getChipRevision());
  Serial.print("CPU Cores: ");
  Serial.println(ESP.getChipCores());
  Serial.print("CPU Frequency: ");
  Serial.print(ESP.getCpuFreqMHz());
  Serial.println(" MHz");
  
  // Memory information
  Serial.println("\n--- MEMORY STATUS ---");
  Serial.print("Total Heap Size: ");
  Serial.print(ESP.getHeapSize());
  Serial.println(" bytes");
  
  Serial.print("Free Heap: ");
  Serial.print(ESP.getFreeHeap());
  Serial.print(" bytes (");
  Serial.print((ESP.getFreeHeap() * 100) / ESP.getHeapSize());
  Serial.println("%)");
  
  Serial.print("Min Free Heap (lowest ever): ");
  Serial.print(ESP.getMinFreeHeap());
  Serial.println(" bytes");
  
  Serial.print("Max Alloc Heap (largest block): ");
  Serial.print(ESP.getMaxAllocHeap());
  Serial.println(" bytes");
  
  // PSRAM information
  Serial.print("\nPSRAM Size: ");
  if (ESP.getPsramSize() > 0) {
    Serial.print(ESP.getPsramSize());
    Serial.println(" bytes");
    Serial.print("Free PSRAM: ");
    Serial.print(ESP.getFreePsram());
    Serial.println(" bytes");
  } else {
    Serial.println("NOT AVAILABLE ❌");
    Serial.println(">>> This is why AWS IoT fails! <<<");
  }
  
  // Flash information
  Serial.print("\nFlash Chip Size: ");
  Serial.print(ESP.getFlashChipSize());
  Serial.println(" bytes");
  
  Serial.print("Flash Chip Speed: ");
  Serial.print(ESP.getFlashChipSpeed() / 1000000);
  Serial.println(" MHz");
  
  Serial.print("SDK Version: ");
  Serial.println(ESP.getSdkVersion());
  
  Serial.println("========================================\n");

  // Increase WiFiClientSecure buffer if PSRAM available
  if (ESP.getFreePsram() > 0) {
    Serial.println("PSRAM detected - using PSRAM for buffers");
  } else {
    Serial.println("⚠️  No PSRAM - may have TLS memory issues");
    Serial.println("   Solution: Use 'Minimal SPIFFS' partition in Arduino IDE");
  }

  Serial.println(">>> STEP 1: Before WiFi connection");
  Serial.print("    Free Heap: ");
  Serial.println(ESP.getFreeHeap());

  // Check for forced BLE mode (for testing/development)
  if (FORCE_BLE_MODE) {
    Serial.println("\n*** FORCE_BLE_MODE ENABLED ***");
    Serial.println("Clearing all credentials and forcing BLE provisioning mode...");
    wifi_manager_clear_credentials();
    Serial.println("*** BLE mode will start (no auto-connect) ***\n");
  }

  // Check if provision button is pressed (LOW = pressed)
  // Hold button during boot to clear WiFi credentials and enter BLE mode
  if (digitalRead(PROVISION_BUTTON_PIN) == LOW) {
    Serial.println("\n*** PROVISION BUTTON PRESSED ***");
    Serial.println("Entering BLE provisioning mode...");
    wifi_manager_clear_credentials();
    delay(2000);  // Give user time to see message
  }

  wifi_manager_try_autoconnect();
  
  Serial.println("\n>>> STEP 2: After WiFi connection");
  Serial.print("    Free Heap: ");
  Serial.println(ESP.getFreeHeap());
  
  // ⚠️ CRITICAL FIX: Only start BLE if WiFi is NOT connected
  if (!wifi_manager_is_connected()) {
    Serial.println("WiFi not connected - starting BLE for provisioning...");
    wifi_manager_init();  // This starts BLE
  } else {
    Serial.println("WiFi already connected - skipping BLE initialization");
    Serial.print("    Free heap with BLE disabled: ");
    Serial.println(ESP.getFreeHeap());
  }
  
  Serial.println("\n>>> STEP 3: Before sensor init");
  Serial.print("    Free Heap: ");
  Serial.println(ESP.getFreeHeap());
  
  // Don't initialize sensors yet - they allocate display buffer memory
  // sensors_init() will be called after first AWS connection
  // aws_client_init() will be called by wifi_manager when WiFi becomes available
  
  Serial.println("\n>>> STEP 4: Setup complete");
  Serial.print("    Free Heap: ");
  Serial.println(ESP.getFreeHeap());
  Serial.print("    Min Free Heap Ever: ");
  Serial.println(ESP.getMinFreeHeap());
  Serial.println("\n========================================");
  Serial.println("Waiting for AWS IoT connection attempt...");
  Serial.println("========================================\n");
}

void loop() {
  // Check for serial commands
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    if (cmd.equalsIgnoreCase("clear") || cmd.equalsIgnoreCase("reset")) {
      Serial.println("\nSerial command received: Clearing WiFi credentials");
      wifi_manager_clear_credentials();
      Serial.println("Please restart ESP32 to enter BLE provisioning mode");
    }
    else if (cmd.equalsIgnoreCase("help")) {
      Serial.println("\n=== Available Commands ===");
      Serial.println("clear  - Clear stored WiFi credentials");
      Serial.println("reset  - Same as clear");
      Serial.println("help   - Show this help message");
      Serial.println("========================\n");
    }
  }

  // BLE/WiFi manager loop MUST be called frequently for async operations
  // This handles: BLE events, async WiFi scanning, notifications
  wifi_manager_loop();

  // Sensor updates and AWS client on a slower interval
  static unsigned long lastSlowLoop = 0;
  unsigned long now = millis();

  if (now - lastSlowLoop >= 5000) {  // Every 5 seconds
    lastSlowLoop = now;

    // Only run AWS client loop if WiFi is connected
    if (wifi_manager_is_connected()) {
      aws_client_loop();
    }
    sensors_update();
  }

  // Small delay to prevent watchdog issues, but keep loop responsive
  // When BLE is active, we need fast loop iterations
  delay(100);  // 100ms = 10 iterations per second
}

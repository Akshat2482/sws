#include "wifi_manager.h"
#include "sensor_manager.h"
#include "aws_client.h"


void setup() {
  Serial.begin(115200);
  delay(1000);

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
  // only run AWS client loop if WiFi is connected
  if (wifi_manager_is_connected()) {
    aws_client_loop();

  }
  sensors_update();

  // BLE/WiFi manager loop handles scanning and notifications
  wifi_manager_loop();
  delay(5000);
}

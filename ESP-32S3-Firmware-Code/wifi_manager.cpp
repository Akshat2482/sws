#include "wifi_manager.h"
#include <WiFi.h>
#include <Preferences.h>
#include <BLEDevice.h>
#include <BLE2902.h>

Preferences prefs;

// BLE objects
static BLEServer *pServer = nullptr;
static BLECharacteristic *pNotifyChar = nullptr;
static BLECharacteristic *pWriteChar = nullptr;

static bool deviceConnected = false;

// scanRequested controls one-shot scans triggered by request
static volatile bool scanRequested = false;
static bool scanInProgress = false;  // Track if async scan is running
static unsigned long scanStartTime = 0;  // Track when scan started

// BLE UUIDs (keep same as backup or change if needed)
#define SERVICE_UUID "12345678-1234-1234-1234-1234567890ab"
#define CHAR_UUID_NOTIFY "12345678-1234-1234-1234-1234567890ad"
#define CHAR_UUID_WRITE "12345678-1234-1234-1234-1234567890ac"

// Forward declarations
class ServerCallbacks;
class WriteCallbacks;

#include "aws_client.h" // call aws_client_init() after wifi connects

class ServerCallbacks : public BLEServerCallbacks
{
    void onConnect(BLEServer *server) override
    {
        deviceConnected = true;
        Serial.println("=== BLE CLIENT CONNECTED ===");
        Serial.println("Connection established successfully!");
        Serial.print("Free heap after BLE connection: ");
        Serial.println(ESP.getFreeHeap());
    }

    void onDisconnect(BLEServer *server) override
    {
        deviceConnected = false;
        Serial.println("=== BLE CLIENT DISCONNECTED ===");
        Serial.println("Client disconnected, restarting advertising...");
        BLEDevice::startAdvertising(); // restart advertising
        Serial.println("BLE advertising restarted");
    }
};

class WriteCallbacks : public BLECharacteristicCallbacks
{
    void onWrite(BLECharacteristic *ch) override
    {
        Serial.println("=== BLE WRITE RECEIVED ===");
        // BLECharacteristic::getValue() returns an Arduino String in this build
        String val = ch->getValue();
        Serial.print("Raw data length: ");
        Serial.println(val.length());
        
        if (val.length() == 0) {
            Serial.println("Empty data received, ignoring");
            return;
        }
        
        String data = val;
        Serial.print("Processed data: ");
        Serial.println(data);
        // support a SCAN command (client asks for available networks)
        if (data.equalsIgnoreCase("SCAN") || data.equalsIgnoreCase("DISCOVER"))
        {
            Serial.println("SCAN command received!");
            Serial.println("Triggering async WiFi scan (non-blocking)...");
            // Request async scan - wifi_manager_loop will handle it
            wifi_manager_request_scan();
            // DO NOT send response here - let async scan complete and send results
            // This prevents blocking BLE operations
            Serial.println("SCAN request queued, waiting for async scan results...");
            return;
        }

        int sep = data.indexOf('|');
        if (sep == -1)
        {
            if (pNotifyChar)
            {
                pNotifyChar->setValue("ERROR: bad format");
                pNotifyChar->notify();
            }
            return;
        }

        String ssid = data.substring(0, sep);
        String pass = data.substring(sep + 1);
        // Hand off to existing handler
        wifi_manager_handle_write(ssid, pass, pNotifyChar);
    }
};

void wifi_manager_init() {
    Serial.println("=== BLE INITIALIZATION START ===");

    // CRITICAL: Ensure WiFi is completely OFF before starting BLE
    Serial.println("Disabling WiFi to prevent auto-reconnection during BLE provisioning...");
    WiFi.disconnect(true);  // Disconnect and erase stored WiFi config
    WiFi.mode(WIFI_OFF);    // Turn off WiFi radio completely
    delay(500);
    Serial.println("WiFi disabled");

    // Initialize BLE
    Serial.println("Initializing BLE device...");
    BLEDevice::init("ESP32S3");  // Set the BLE name explicitly
    Serial.println("BLE device initialized with name: ESP32S3");

    BLEDevice::setPower(ESP_PWR_LVL_P9);  // Set maximum power for better range
    Serial.println("BLE power set to maximum (P9)");

    pServer = BLEDevice::createServer();
    Serial.println("BLE server created");

    pServer->setCallbacks(new ServerCallbacks());
    Serial.println("BLE server callbacks set");

    Serial.print("Creating BLE service with UUID: ");
    Serial.println(SERVICE_UUID);
    BLEService *pService = pServer->createService(SERVICE_UUID);
    Serial.println("BLE service created");

    // Notify characteristic (TX -> client)
    Serial.print("Creating NOTIFY characteristic with UUID: ");
    Serial.println(CHAR_UUID_NOTIFY);
    pNotifyChar = pService->createCharacteristic(CHAR_UUID_NOTIFY, BLECharacteristic::PROPERTY_NOTIFY);
    pNotifyChar->addDescriptor(new BLE2902());
    Serial.println("NOTIFY characteristic created and descriptor added");

    // Write characteristic (RX <- client)
    Serial.print("Creating WRITE characteristic with UUID: ");
    Serial.println(CHAR_UUID_WRITE);
    pWriteChar = pService->createCharacteristic(CHAR_UUID_WRITE, BLECharacteristic::PROPERTY_WRITE);
    pWriteChar->setCallbacks(new WriteCallbacks());
    Serial.println("WRITE characteristic created and callbacks set");

    Serial.println("Starting BLE service...");
    pService->start();
    Serial.println("BLE service started");

    // Start advertising
    Serial.println("Setting up BLE advertising...");
    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();

    Serial.print("Adding service UUID to advertising: ");
    Serial.println(SERVICE_UUID);
    pAdvertising->addServiceUUID(SERVICE_UUID);

    // Enable scan response to include device name (critical for discovery)
    Serial.println("Configuring scan response with device name");
    pAdvertising->setScanResponse(true);

    // Set minimum preferred connection interval (in units of 1.25ms)
    // Faster intervals = better responsiveness
    pAdvertising->setMinPreferred(0x06);  // 7.5ms

    // Shorter advertising intervals for faster discovery
    // Values are in units of 0.625ms
    pAdvertising->setMinInterval(0x20);  // 20ms (32 * 0.625ms)
    pAdvertising->setMaxInterval(0x40);  // 40ms (64 * 0.625ms)

    Serial.println("Starting BLE advertising...");
    BLEDevice::startAdvertising();
    Serial.println("=== BLE ADVERTISING STARTED (ESP32S3) ===");
    Serial.println("Device should now be visible to browsers!");

    // Verify advertising is working
    delay(1000);
    Serial.println("=== BLE ADVERTISING VERIFICATION ===");
    Serial.print("BLE Device Name: ");
    Serial.println(BLEDevice::getAddress().toString().c_str());
    Serial.print("BLE MAC Address: ");
    Serial.println(BLEDevice::getAddress().toString().c_str());
    Serial.println("BLE advertising should be active now!");

    // Note: Removed scanNearbyBLEDevices() call as it interferes with advertising
    // The ESP32 BLE stack has limitations when trying to both advertise AND scan
    // Scanning stops advertising, making the device invisible to browsers
    Serial.println("=== BLE INITIALIZATION COMPLETE ===");
    Serial.println("ESP32S3 is now discoverable and ready for pairing!");
}


// Function to scan for nearby BLE devices (for testing)
void scanNearbyBLEDevices() {
    Serial.println("=== SCANNING FOR NEARBY BLE DEVICES ===");
    
    BLEScan* pBLEScan = BLEDevice::getScan();
    pBLEScan->setActiveScan(true);
    pBLEScan->setInterval(100);
    pBLEScan->setWindow(99);
    
    Serial.println("Starting BLE scan for 10 seconds...");
    BLEScanResults* foundDevices = pBLEScan->start(10, false);
    
    Serial.print("Found ");
    Serial.print(foundDevices->getCount());  // Use '->' to access getCount()
    Serial.println(" BLE devices:");
    
    for (int i = 0; i < foundDevices->getCount(); i++) {
        BLEAdvertisedDevice device = foundDevices->getDevice(i);  // Use '->' to access getDevice()
        Serial.print("Device ");
        Serial.print(i + 1);
        Serial.print(": ");
        Serial.print(device.getName().c_str());
        Serial.print(" (");
        Serial.print(device.getAddress().toString().c_str());
        Serial.println(")");
    }
    
    Serial.println("=== BLE SCAN COMPLETE ===");
    pBLEScan->clearResults();
}

void wifi_manager_loop()
{
    // scanRequested is the global flag set by wifi_manager_request_scan()
    if (scanRequested && deviceConnected && !scanInProgress)
    {
        scanRequested = false;
        scanInProgress = true;
        scanStartTime = millis();  // Record start time

        Serial.println("=== STARTING ASYNC WiFi SCAN ===");
        Serial.println("Starting non-blocking WiFi scan to keep BLE alive...");
        Serial.print("BLE client connected: ");
        Serial.println(deviceConnected ? "YES" : "NO");
        Serial.print("Notify char available: ");
        Serial.println(pNotifyChar != nullptr ? "YES" : "NO");

        // CRITICAL: Ensure WiFi is in correct mode but NOT auto-connecting
        WiFi.mode(WIFI_STA);  // Enable WiFi in station mode for scanning
        WiFi.disconnect();     // Ensure not connected to anything
        delay(100);

        Serial.println("WiFi mode: STA (scan only, no auto-connect)");

        // Start ASYNC scan (non-blocking) - this returns immediately
        int16_t scanResult = WiFi.scanNetworks(true, false, false, 300);  // async=true
        Serial.print("WiFi.scanNetworks() returned: ");
        Serial.println(scanResult);
        Serial.println("WiFi scan started in background");
    }

    // Check if async scan has completed
    if (scanInProgress)
    {
        int n = WiFi.scanComplete();

        // Add timeout for stuck scans (15 seconds)
        if (millis() - scanStartTime > 15000)
        {
            Serial.println("⚠️  WiFi scan TIMEOUT after 15 seconds!");
            scanInProgress = false;
            WiFi.scanDelete();

            if (deviceConnected && pNotifyChar)
            {
                pNotifyChar->setValue("WIFI_LIST:NONE");
                pNotifyChar->notify();
                Serial.println("Notified client: WIFI_LIST:NONE (timeout)");
            }
            return;
        }

        if (n == WIFI_SCAN_RUNNING)
        {
            // Still scanning, do nothing - BLE continues to work
            static unsigned long lastPrint = 0;
            if (millis() - lastPrint > 1000)
            {
                unsigned long elapsed = (millis() - scanStartTime) / 1000;
                Serial.print("WiFi scan still running... (BLE active) - ");
                Serial.print(elapsed);
                Serial.println(" seconds");
                lastPrint = millis();
            }
        }
        else if (n == WIFI_SCAN_FAILED)
        {
            Serial.println("WiFi scan FAILED");
            scanInProgress = false;

            if (deviceConnected && pNotifyChar)
            {
                pNotifyChar->setValue("WIFI_LIST:NONE");
                pNotifyChar->notify();
                Serial.println("Notified client: WIFI_LIST:NONE (scan failed)");
            }
        }
        else if (n >= 0)
        {
            // Scan completed successfully
            Serial.print("WiFi scan complete! Found ");
            Serial.print(n);
            Serial.println(" networks");

            String list = "";
            for (int i = 0; i < n; ++i)
            {
                String ss = WiFi.SSID(i);
                Serial.print("  ");
                Serial.print(i + 1);
                Serial.print(": ");
                Serial.print(ss);
                Serial.print(" (");
                Serial.print(WiFi.RSSI(i));
                Serial.println(" dBm)");

                if (ss.length() > 0)
                {
                    if (list.length() > 0)
                        list += ",";
                    list += ss;
                }
            }

            if (list.length() == 0)
                list = "NONE";

            String payload = "WIFI_LIST:" + list;

            if (deviceConnected && pNotifyChar)
            {
                pNotifyChar->setValue(payload.c_str());
                pNotifyChar->notify();
                Serial.println("Notified client: " + payload);
            }

            WiFi.scanDelete();
            scanInProgress = false;
            Serial.println("=== WiFi SCAN COMPLETE ===");
        }
    }
    
    // Periodic BLE advertising status check (every 30 seconds)
    static unsigned long lastBLEStatusCheck = 0;
    if (millis() - lastBLEStatusCheck > 30000) {
        lastBLEStatusCheck = millis();
        Serial.println("=== BLE STATUS CHECK ===");
        Serial.print("BLE Advertising Active: ");
        Serial.println(BLEDevice::getAdvertising()->isAdvertising() ? "YES" : "NO");
        Serial.print("Device Connected: ");
        Serial.println(deviceConnected ? "YES" : "NO");
        Serial.print("Free Heap: ");
        Serial.println(ESP.getFreeHeap());
    }
}

void wifi_manager_try_autoconnect()
{
    prefs.begin("wifi", true);
    // Remove hardcoded defaults - if no stored credentials, we want BLE to start
    String storedSSID = prefs.getString("ssid", "");
    String storedPass = prefs.getString("pass", "");
    prefs.end();

    if (storedSSID.length() > 0)
    {
        Serial.println("Stored credentials found: " + storedSSID);
        WiFi.mode(WIFI_STA);
        WiFi.begin(storedSSID.c_str(), storedPass.c_str());

        int tries = 0;
        while (WiFi.status() != WL_CONNECTED && tries < 20)
        {
            delay(500);
            Serial.print(".");
            tries++;
        }

        if (WiFi.status() == WL_CONNECTED)
        {
            Serial.println("\nAuto-connected! IP: " + WiFi.localIP().toString());

            // ⚠️ CRITICAL: Free BLE memory for AWS IoT TLS
            Serial.println("wifi_manager: Shutting down BLE to free memory for AWS IoT...");
            Serial.print("wifi_manager: Free heap before BLE shutdown: ");
            Serial.println(ESP.getFreeHeap());

            BLEDevice::deinit(true);  // Completely deinitialize BLE and free memory
            delay(500);

            Serial.print("wifi_manager: Free heap after BLE shutdown: ");
            Serial.println(ESP.getFreeHeap());
            Serial.println("wifi_manager: BLE disabled - memory freed for AWS IoT");

            // Initialize AWS client now that WiFi is available and BLE is freed
            aws_client_init();
        }
        else
        {
            Serial.println("\n⚠️  Auto-connect FAILED!");
            Serial.println("⚠️  Clearing invalid credentials...");

            // Clear failed credentials so BLE starts on next boot
            prefs.begin("wifi", false);
            prefs.clear();
            prefs.end();

            Serial.println("⚠️  Credentials cleared. Will start BLE provisioning mode.");
            Serial.println("⚠️  Device will now be discoverable for WiFi setup.");
        }
    }
    else
    {
        Serial.println("No stored WiFi credentials - ready for BLE provisioning");
    }
}

void wifi_manager_handle_write(const String &ssid, const String &pass, BLECharacteristic *notifyChar)
{
    // Save credentials
    prefs.begin("wifi", false);
    prefs.putString("ssid", ssid);
    prefs.putString("pass", pass);
    prefs.end();

    // Try connecting to WiFi
    WiFi.mode(WIFI_STA);
    WiFi.disconnect();
    delay(100);
    WiFi.begin(ssid.c_str(), pass.c_str());

    Serial.print("Connecting to WiFi ");
    Serial.println(ssid);

    int tries = 0;
    while (WiFi.status() != WL_CONNECTED && tries < 20)
    {
        delay(500);
        Serial.print(".");
        tries++;
    }

    if (WiFi.status() == WL_CONNECTED)
    {
        String ip = WiFi.localIP().toString();
        Serial.println("\nConnected: " + ip);
        String msg = "CONNECTED:" + ip;
        if (notifyChar)
        {
            notifyChar->setValue(msg.c_str());
            notifyChar->notify();
            delay(1000); // Give time for notification to be sent
        }
        
        // ⚠️ CRITICAL: Free BLE memory for AWS IoT TLS
        Serial.println("wifi_manager: Shutting down BLE to free memory for AWS IoT...");
        Serial.print("wifi_manager: Free heap before BLE shutdown: ");
        Serial.println(ESP.getFreeHeap());

        // Aggressive BLE shutdown sequence
        Serial.println("wifi_manager: Step 1 - Stopping advertising...");
        BLEDevice::getAdvertising()->stop();
        delay(200);

        Serial.println("wifi_manager: Step 2 - Deinitializing BLE...");
        BLEDevice::deinit(true);  // Completely deinitialize BLE and free memory
        delay(1000);  // Increased delay to allow full cleanup

        Serial.print("wifi_manager: Free heap after BLE shutdown: ");
        Serial.println(ESP.getFreeHeap());

        // Force memory compaction
        Serial.println("wifi_manager: Step 3 - Forcing memory cleanup...");
        heap_caps_check_integrity_all(true);
        delay(500);

        Serial.print("wifi_manager: Final free heap: ");
        Serial.println(ESP.getFreeHeap());
        Serial.println("wifi_manager: BLE disabled - memory freed for AWS IoT");

        // Wait a bit more before AWS init to ensure stability
        delay(500);

        // Initialize AWS client now that WiFi is available and BLE is freed
        aws_client_init();
    }
    else
    {
        Serial.println("\nFailed to connect");
        if (notifyChar)
        {
            notifyChar->setValue("FAILED");
            notifyChar->notify();
        }
    }
}

void wifi_manager_request_scan()
{
    scanRequested = true;
}

String wifi_manager_scan_list()
{
    int n = WiFi.scanNetworks();
    String list = "";
    for (int i = 0; i < n; ++i)
    {
        String ss = WiFi.SSID(i);
        if (ss.length() > 0)
        {
            if (list.length() > 0)
                list += ",";
            list += ss;
        }
    }

    if (list.length() == 0)
        list = "NONE";
    WiFi.scanDelete();
    return list;
}

bool wifi_manager_is_connected()
{
    return WiFi.status() == WL_CONNECTED;
}

void wifi_manager_clear_credentials()
{
    Serial.println("=== CLEARING WIFI CREDENTIALS ===");

    // Clear Preferences storage
    prefs.begin("wifi", false);
    prefs.clear();
    prefs.end();
    Serial.println("✓ Preferences cleared");

    // Also clear WiFi library's stored config
    WiFi.disconnect(true);  // true = erase stored WiFi config
    WiFi.mode(WIFI_OFF);
    Serial.println("✓ WiFi config erased");
    Serial.println("✓ WiFi radio disabled");

    delay(500);
    Serial.println("=== CREDENTIALS CLEARED SUCCESSFULLY ===");
}

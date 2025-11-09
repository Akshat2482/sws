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
            Serial.println("SCAN command received, requesting WiFi scan...");
            // request a one-shot scan; wifi_manager_loop will run it
            wifi_manager_request_scan();
            // optionally return current cached list immediately
            if (deviceConnected && pNotifyChar)
            {
                String list = wifi_manager_scan_list();
                String payload = "WIFI_LIST:" + list;
                pNotifyChar->setValue(payload.c_str());
                pNotifyChar->notify();
            }
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

    // Set scan response to true (important for visibility)
    Serial.println("Setting scan response to true");
    pAdvertising->setScanResponse(true);  // Enable scan response

    // Set advertising intervals (min and max)
    pAdvertising->setMinInterval(0x20);  // Set a shorter advertising interval (min)
    pAdvertising->setMaxInterval(0x30);  // Set a slightly larger advertising interval (max)

    // Set the device name in the advertisement
    pAdvertising->setName("ESP32S3");  // Set the device name explicitly

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

    // Test: Scan for nearby BLE devices to verify BLE is working
    Serial.println("Testing BLE functionality by scanning for nearby devices...");
    scanNearbyBLEDevices();
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
    if (scanRequested && deviceConnected)
    {
        scanRequested = false;
        Serial.println("Scanning WiFi...");

        String list = wifi_manager_scan_list();
        String payload = "WIFI_LIST:" + list;

        if (deviceConnected && pNotifyChar)
        {
            pNotifyChar->setValue(payload.c_str());
            pNotifyChar->notify();
            Serial.println("Notified client: " + payload);
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
    String storedSSID = prefs.getString("ssid", "AkshtAhwin2G");
    String storedPass = prefs.getString("pass", "virtualwings");
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
            Serial.println("\nAuto-connect failed");
        }
    }
    else
    {
        Serial.println("No stored WiFi credentials");
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

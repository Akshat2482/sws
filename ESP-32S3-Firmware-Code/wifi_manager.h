#pragma once
#include <Arduino.h>
#include <BLEDevice.h>
#include <Preferences.h>

extern Preferences prefs;
// Initialize wifi manager and BLE server
void wifi_manager_init();
// Call periodically to handle BLE scans/notifications
void wifi_manager_loop();
// Request a WiFi scan; next loop() will perform it once and notify BLE client
void wifi_manager_request_scan();
void scanNearbyBLEDevices();
void wifi_manager_try_autoconnect();
void wifi_manager_handle_write(const String &ssid, const String &pass, BLECharacteristic *notifyChar);
String wifi_manager_scan_list();
bool wifi_manager_is_connected();
void wifi_manager_clear_credentials();

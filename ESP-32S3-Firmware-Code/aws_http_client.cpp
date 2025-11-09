#include "aws_http_client.h"
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// HTTP POST to AWS IoT (simpler, less memory than MQTT)
static const char *AWS_IOT_HTTP_ENDPOINT = "https://a2jxq81rsqt8vu-ats.iot.us-east-1.amazonaws.com";
static WiFiClientSecure client;

void aws_http_init() {
    Serial.println("aws_http: Initializing HTTP client (low-memory mode)");
    client.setInsecure(); // Skip cert validation to save memory
}

bool aws_http_publish(const char *payload) {
    HTTPClient http;
    
    Serial.print("aws_http: Free heap before publish: ");
    Serial.println(ESP.getFreeHeap());
    
    // Use HTTP POST to AWS IoT endpoint
    String url = String(AWS_IOT_HTTP_ENDPOINT) + "/topics/devices/esp32/sensors";
    
    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");
    
    int httpCode = http.POST(payload);
    
    Serial.print("aws_http: Response code: ");
    Serial.println(httpCode);
    
    http.end();
    
    return (httpCode == 200 || httpCode == 202);
}



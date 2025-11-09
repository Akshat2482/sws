#ifndef AWS_HTTP_CLIENT_H
#define AWS_HTTP_CLIENT_H

#include <Arduino.h>

// Lightweight HTTP alternative to MQTT for low-memory ESP32
void aws_http_init();
bool aws_http_publish(const char *payload);

#endif





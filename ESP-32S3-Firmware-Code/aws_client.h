#ifndef AWS_CLIENT_H
#define AWS_CLIENT_H

#include <Arduino.h>

// Initialize AWS client (certs, config)
void aws_client_init();

// Connect to AWS IoT (MQTT). Returns true if connection initiated/successful.
bool aws_client_connect();

// Publish payload to topic.
bool aws_client_publish(const char *topic, const char *payload);

// Call periodically to maintain connection (call from loop())
void aws_client_loop();

#endif // AWS_CLIENT_H

// If not provided elsewhere, default to secure mode (0). Define to 1 to run insecurely.
// ⚠️ SECURITY WARNING: Set to 0 for production! Insecure mode disables TLS certificate validation.
// ⚠️ TEMPORARILY set to 1 for testing - change to 0 after verifying certificates match your AWS IoT thing
#ifndef AWS_INSECURE
#define AWS_INSECURE 0
#endif

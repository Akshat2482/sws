#include "aws_client.h"
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <time.h>

// ⚠️ SECURITY WARNING: Credentials are embedded in this file for development only.
// For production:
// 1. Store certificates in SPIFFS/LittleFS and load at runtime
// 2. Remove credentials from source control
// 3. Consider using a secure element (ATECC608A) for private key storage
// 4. Rotate certificates regularly and use IAM policies to limit permissions

static const char *AWS_IOT_ENDPOINT = "a2jxq81rsqt8vu-ats.iot.us-east-1.amazonaws.com";
static const int AWS_IOT_PORT = 8883;
static const char *MQTT_CLIENT_ID = "iotconsole-b8a3a064-9b47-481f-afc4-f51fdb70deef";

// Certificates (PEM format) - keep as plain arrays so setCACert/setCertificate work reliably
static const char AWS_ROOT_CA[] = R"EOF(
-----BEGIN CERTIFICATE-----
MIIDQTCCAimgAwIBAgITBmyfz5m/jAo54vB4ikPmljZbyjANBgkqhkiG9w0BAQsF
ADA5MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRkwFwYDVQQDExBBbWF6
b24gUm9vdCBDQSAxMB4XDTE1MDUyNjAwMDAwMFoXDTM4MDExNzAwMDAwMFowOTEL
MAkGA1UEBhMCVVMxDzANBgNVBAoTBkFtYXpvbjEZMBcGA1UEAxMQQW1hem9uIFJv
b3QgQ0EgMTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALJ4gHHKeNXj
ca9HgFB0fW7Y14h29Jlo91ghYPl0hAEvrAIthtOgQ3pOsqTQNroBvo3bSMgHFzZM
9O6II8c+6zf1tRn4SWiw3te5djgdYZ6k/oI2peVKVuRF4fn9tBb6dNqcmzU5L/qw
IFAGbHrQgLKm+a/sRxmPUDgH3KKHOVj4utWp+UhnMJbulHheb4mjUcAwhmahRWa6
VOujw5H5SNz/0egwLX0tdHA114gk957EWW67c4cX8jJGKLhD+rcdqsq08p8kDi1L
93FcXmn/6pUCyziKrlA4b9v7LWIbxcceVOF34GfID5yHI9Y/QCB/IIDEgEw+OyQm
jgSubJrIqg0CAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMC
AYYwHQYDVR0OBBYEFIQYzIU07LwMlJQuCFmcx7IQTgoIMA0GCSqGSIb3DQEBCwUA
A4IBAQCY8jdaQZChGsV2USggNiMOruYou6r4lK5IpDB/G/wkjUu0yKGX9rbxenDI
U5PMCCjjmCXPI6T53iHTfIUJrU6adTrCC2qJeHZERxhlbI1Bjjt/msv0tadQ1wUs
N+gDS63pYaACbvXy8MWy7Vu33PqUXHeeE6V/Uq2V8viTO96LXFvKWlJbYK8U90vv
o/ufQJVtMVT8QtPHRh8jrdkPSHCa2XV4cdFyQzR1bldZwgJcJmApzyMZFo6IQ6XU
5MsI+yMRQ+hDKXJioaldXgjUkK642M4UwtBV8ob2xJNDd2ZhwLnoQdeXeGADbkpy
rqXRfboQnoZsG4q5WTP468SQvvG5
-----END CERTIFICATE-----
)EOF";
static const char AWS_CLIENT_CERT[] = R"KEY(
-----BEGIN CERTIFICATE-----
MIIDWTCCAkGgAwIBAgIUfVEBL5EHBvctYnGxkaxqMlZOpngwDQYJKoZIhvcNAQEL
BQAwTTFLMEkGA1UECwxCQW1hem9uIFdlYiBTZXJ2aWNlcyBPPUFtYXpvbi5jb20g
SW5jLiBMPVNlYXR0bGUgU1Q9V2FzaGluZ3RvbiBDPVVTMB4XDTI1MTAyMTIwMzg0
MFoXDTQ5MTIzMTIzNTk1OVowHjEcMBoGA1UEAwwTQVdTIElvVCBDZXJ0aWZpY2F0
ZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAMFqm8BPQXXQZLeYqE98
VKfRM57VLe5MthGUMtSXUAN9G0v428EY1AoY82FjYMAEOCq8hmHOW7MgwcStiUm0
xBapQDNTufnaCVUNvuN0Y50pw6YoiOkhI0xqs3lrnWyZblKlcLWQSdqLFV/caQTh
lQ3xHK914isxBprVtt2TkRh+f0TPM+7IDMqoUiZcTXOO7bvFdKSZZwC6W+93PKK1
lq0oH+ynjkigWx2AQDheGYP5de9By4N8GDuWoUwtuGQf1/Elyy3GPPzjulbyvZsI
qr2wBXwAYw1WLh6KzjvaeP5a0/NAhhTk/d9AkF84Lhq/BULnXNdY7wnqwBuqUbAr
tQcCAwEAAaNgMF4wHwYDVR0jBBgwFoAUuyYJv5UEKKqoNqy8o6wlBUnl+FkwHQYD
VR0OBBYEFE14/HhNYq2HPzYSGPqGEXDvMEqoMAwGA1UdEwEB/wQCMAAwDgYDVR0P
AQH/BAQDAgeAMA0GCSqGSIb3DQEBCwUAA4IBAQBOEaze9aPPZ+9yLr5ypF2Omw7D
D7xDm0J9hLYqizNG32XML1RN4E0aX7X5L3bPz1CxQKmDf0X6Ni6D20W70NRpjSGK
CDcy1tMHuCuBo0yH7keKEP/EoGYN7irvz4Hasz2j+jMJ/D/bKa68v0dBSKVjtbEy
qzemfwzM/LIKfaDe3Q4TVrtqzgbtXXw9hgpQJsJSLBPsChEXedigfFQkIwaPwoUG
QyhgsitXSA/p/oMqk3ToheNmOrX70SPIffHw/w8wfzgHnEvvirKMwy2ye5zcrcOi
VpBpQ7W/shEVP+Nr33S6bsmLf94wvszvsJG7lDxFwdZis1AfF+ewLxuW1hac
-----END CERTIFICATE-----
)KEY";
static const char AWS_PRIVATE_KEY[] = R"KEY(
-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEAwWqbwE9BddBkt5ioT3xUp9EzntUt7ky2EZQy1JdQA30bS/jb
wRjUChjzYWNgwAQ4KryGYc5bsyDBxK2JSbTEFqlAM1O5+doJVQ2+43RjnSnDpiiI
6SEjTGqzeWudbJluUqVwtZBJ2osVX9xpBOGVDfEcr3XiKzEGmtW23ZORGH5/RM8z
7sgMyqhSJlxNc47tu8V0pJlnALpb73c8orWWrSgf7KeOSKBbHYBAOF4Zg/l170HL
g3wYO5ahTC24ZB/X8SXLLcY8/OO6VvK9mwiqvbAFfABjDVYuHorOO9p4/lrT80CG
FOT930CQXzguGr8FQudc11jvCerAG6pRsCu1BwIDAQABAoIBAQCkvfZNtfQOsmKn
EqsBkOfWTNVIC1Hk8If/rxgghYVMg2oVqrEa5tfshdX/dJL62l0w4YUgl5D5oQQK
TrlqA0Ml/iFF1qHIk5NxU5TszbzvJ5yS0WHUGDqloxidajEbSBB06p92tqCBOggJ
r4Xv92hrCJyjQqhSm56BkVkBn+htUA5gjn67ud5u/C7uRK3TEBqfH/oKrG8zAXEh
R4rcKlVRmrtwBFSzE2t7jvVodDu9BbzZc2cEI0pk/kSmm8B3uTL51QzwBvQf9eIK
xMSV0uhGNi4DpMYR7CiNMFCLu37y0pyS/O6NLAT8T/U7e9cWCY5qK3Jmi3P1s0Ho
Jer+cLI5AoGBAOH+oaEubLqwErLE2gwrg3WkX/qdM25/C90K0jw8RulVjqo0C4H0
8QBbz09iyksUE0wPxGAWCdSkgSkxqeGiZnC0dtIMHR88i5vESUleyVK4R4gXa4PZ
eJ1tWEG/5N/i1ylJC7qm/JBX0/dd7AMhHQrLUcpRPOX7AEL3m8Zko34jAoGBANsY
q71h9WFj03djXQZUFWdt2JKtF2u5tPh556QwYmg4kK6P78Xn2N/YT/RPA5dl9qMr
aVSXRk77D+c9Ii6xWnorE878J/Ug0AJIbYRPu0FAKulQQvTdNKql2PX0cLaLSwWm
bMr6uvTAu3LIV7MDR2atV9BArUPqWHOFnz5jqTHNAoGBAL0uF4VCxJf+vphRuyoG
3vQC1qmHIL+1sGuoHFd6Ke43xcZq7Nsr/PbM5BzTWP5CXukEJeI9cJtF3i1quof8
F37vQqwQoew9Fa0eQi8eHq+VPaQJ3uGvkY1PNFtN1L0qOe0AjcYA9Vmre/AN+nyg
IpyfmOcg3Da0yAJHHmqUYlw7AoGACxQ6Sv9TGzOjE9xwbct+sZY6Z2BdWNMxNYdk
kUbpEwAZQNqCc21/6AHWOTJtqhA74pBlaSOlKIVFjpnmypmpS5g2DjduBdU874Ce
GRy3CVunT9kBKcStzxtH11gfAvwUNRrvUWxQW+QLFojO9nxp9eU6FYvPtyl4g470
OIFtotkCgYEAqHrA7ztLHRxrpLT09FxcFvxqJULgF2IkNKUr6vp2GZRotgZQBUhK
IBueadzQ8JwMfR+y79hsEd12kEArNvZqOra1pehbo2N26Czuu6cUu1iWEWa0Fv6O
WgETU5M/x2Rs5F388y+N/HqLZaVqoklQ7Bpm7PIY8b0SM7WfLSpR9lw=
-----END RSA PRIVATE KEY-----
)KEY";

// Reduce TLS buffer sizes for low-memory ESP32
static WiFiClientSecure secureClient;
static PubSubClient mqttClient(secureClient);

// Configure TLS for minimal memory usage
void configureTLSforLowMemory()
{
    // These are internal mbedTLS configs that reduce memory
    // May need to add to platformio.ini or Arduino IDE build flags:
    // -DMBEDTLS_SSL_MAX_CONTENT_LEN=4096
    Serial.println("aws_client: Configuring TLS for low-memory mode");
}

static unsigned long lastReconnectAttempt = 0;

void aws_mqtt_callback(char *topic, byte *payload, unsigned int length)
{
    // simple debug print
    Serial.print("MQTT recv [");
    Serial.print(topic);
    Serial.print("] ");
    for (unsigned int i = 0; i < length; i++)
        Serial.print((char)payload[i]);
    Serial.println();
}

void aws_client_init()
{
    Serial.println("=========================================");
    Serial.println("aws_client: initializing AWS IoT client");
    Serial.print("aws_client: Free heap: ");
    Serial.println(ESP.getFreeHeap());
    Serial.print("aws_client: Chip model: ");
    Serial.println(ESP.getChipModel());
    Serial.print("aws_client: Chip revision: ");
    Serial.println(ESP.getChipRevision());
    Serial.print("aws_client: endpoint: ");
    Serial.println(AWS_IOT_ENDPOINT);
    Serial.print("aws_client: client ID: ");
    Serial.println(MQTT_CLIENT_ID);

    configureTLSforLowMemory();

    // CRITICAL: Set buffer size BEFORE setServer
    // Use 256 bytes to save maximum memory
    mqttClient.setBufferSize(256);
    mqttClient.setKeepAlive(90);
    mqttClient.setSocketTimeout(45);

    mqttClient.setServer(AWS_IOT_ENDPOINT, AWS_IOT_PORT);
    mqttClient.setBufferSize(256);
    mqttClient.setKeepAlive(90);
    mqttClient.setSocketTimeout(45);

    mqttClient.setCallback(aws_mqtt_callback);

    if (AWS_INSECURE)
    {
        secureClient.setInsecure();
        Serial.println("aws_client: ⚠️  INSECURE MODE - TLS certs not validated");
        Serial.println("aws_client: This is OK for testing, but NOT for production!");
    }
    else
    {
        Serial.println("aws_client: SECURE MODE - validating TLS certificates");
        // For production, load certs into secureClient via setCACert / setCertificate / setPrivateKey
        if (sizeof(AWS_ROOT_CA) > 10)
        {
            secureClient.setCACert(AWS_ROOT_CA);
            Serial.println("aws_client: Root CA loaded");
        }
        else
        {
            Serial.println("aws_client: ⚠️  WARNING: Root CA is empty!");
        }

        if (sizeof(AWS_CLIENT_CERT) > 10)
        {
            secureClient.setCertificate(AWS_CLIENT_CERT);
            Serial.println("aws_client: Client certificate loaded");
        }
        else
        {
            Serial.println("aws_client: ⚠️  WARNING: Client certificate is empty!");
        }

        if (sizeof(AWS_PRIVATE_KEY) > 10)
        {
            secureClient.setPrivateKey(AWS_PRIVATE_KEY);
            Serial.println("aws_client: Private key loaded");
        }
        else
        {
            Serial.println("aws_client: ⚠️  WARNING: Private key is empty!");
        }
    }

    // Debug: print lengths to ensure PEMs are present and not truncated
    Serial.println("aws_client: Certificate lengths:");
    Serial.print("  - Root CA: ");
    Serial.print(strlen(AWS_ROOT_CA));
    Serial.println(" bytes");
    Serial.print("  - Client cert: ");
    Serial.print(strlen(AWS_CLIENT_CERT));
    Serial.println(" bytes");
    Serial.print("  - Private key: ");
    Serial.print(strlen(AWS_PRIVATE_KEY));
    Serial.println(" bytes");
    Serial.println("aws_client: initialization complete");
    Serial.println("=========================================");
}

// bool aws_client_connect()
// {
//     if (mqttClient.connected())
//         return true;
//     unsigned long now = millis();
//     if (now - lastReconnectAttempt < 5000)
//         return false; // backoff
//     lastReconnectAttempt = now;

//     Serial.print("aws_client: connecting to ");
//     Serial.println(AWS_IOT_ENDPOINT);

//     // Ensure WiFi is connected before attempting MQTT
//     if (WiFi.status() != WL_CONNECTED)
//     {
//         Serial.println("aws_client: wifi not connected, skipping mqtt connect");
//         return false;
//     }

//     // Quick network diagnostics to help diagnose connection issues
//     Serial.println("aws_client: testing network to endpoint...");

//     // DNS resolution
//     IPAddress resolvedIp;
//     if (WiFi.hostByName(AWS_IOT_ENDPOINT, resolvedIp))
//     {
//         Serial.print("aws_client: resolved endpoint to ");
//         Serial.println(resolvedIp);
//     }
//     else
//     {
//         Serial.println("aws_client: DNS resolution failed");
//         return false;
//     }

//     // Check free memory before TLS
//     Serial.print("aws_client: Free heap before TLS: ");
//     Serial.println(ESP.getFreeHeap());

//     // ensure system time is synced for TLS certificate validation
//     auto ensureTimeSync = [](unsigned long timeoutMs = 5000) -> bool
//     {
//         time_t now = time(nullptr);
//         if (now > 1600000000)
//             return true; // already synced
//         Serial.println("aws_client: syncing time via NTP...");
//         configTime(0, 0, "pool.ntp.org", "time.google.com");
//         unsigned long start = millis();
//         while (millis() - start < timeoutMs)
//         {
//             now = time(nullptr);
//             if (now > 1600000000)
//             {
//                 Serial.print("aws_client: time synced: ");
//                 Serial.println((long)now);
//                 return true;
//             }
//             delay(500);
//         }
//         Serial.println("aws_client: time sync timeout");
//         return false;
//     };

//     bool timeOk = ensureTimeSync(7000);
//     time_t epoch = time(nullptr);
//     Serial.print("aws_client: current epoch: ");
//     Serial.println((long)epoch);
//     Serial.println((long)now);

//     if (!timeOk)
//     {
//         Serial.println("aws_client: warning - time not synced, TLS may fail");
//     }

//     // Add more verbose TLS debugging
//     Serial.print("aws_client: TLS handshake starting (insecure=");
//     Serial.print(AWS_INSECURE);
//     Serial.println(")...");

//     // Set connection timeout (30 seconds for low-memory scenarios)
//     secureClient.setTimeout(30);

//     // Give system a moment to stabilize and free memory
//     delay(500);

//     // Force garbage collection if possible
//     Serial.print("aws_client: Free heap just before connect: ");
//     Serial.println(ESP.getFreeHeap());

//     // Attempt TLS connection with retry logic
//     Serial.println("aws_client: calling secureClient.connect()...");
//     bool tlsConnected = false;

//     // Try connection up to 2 times
//     for (int attempt = 1; attempt <= 2 && !tlsConnected; attempt++) {
//         if (attempt > 1) {
//             Serial.print("aws_client: Retry attempt ");
//             Serial.println(attempt);
//             delay(1000);
//         }
//         tlsConnected = secureClient.connect(AWS_IOT_ENDPOINT, AWS_IOT_PORT);
//         if (!tlsConnected) {
//             Serial.print("aws_client: Attempt ");
//             Serial.print(attempt);
//             Serial.println(" failed");
//         }
//     }

//     if (!tlsConnected)
//     {
//         Serial.println("aws_client: tcp/tls connect failed");
//         Serial.print("aws_client: secureClient.connected()=");
//         Serial.println(secureClient.connected());
//         Serial.print("aws_client: secureClient.available()=");
//         Serial.println(secureClient.available());

//         // Get last SSL error if available
//         int lastError = secureClient.lastError(nullptr, 0);
//         Serial.print("aws_client: last SSL error code: ");
//         Serial.println(lastError);

//         secureClient.stop();

//         // If in secure mode, suggest troubleshooting
//         if (!AWS_INSECURE)
//         {
//             Serial.println("aws_client: TLS failed in secure mode. Possible issues:");
//             Serial.println("  1. Certificates don't match your AWS IoT Thing");
//             Serial.println("  2. Time not properly synced");
//             Serial.println("  3. Root CA, client cert, or private key incorrect");
//             Serial.println("  Temporarily set AWS_INSECURE=1 in aws_client.h to test");
//         }

//         return false;
//     }

//     Serial.println("aws_client: TLS handshake successful!");
//     // connected fine, close probe
//     secureClient.stop();

//     Serial.print("aws_client: MQTT client id: ");
//     Serial.println(MQTT_CLIENT_ID);

//     if (mqttClient.connect(MQTT_CLIENT_ID))
//     {
//         Serial.println("aws_client: connected");
//         // subscribe to any topics you need
//         // mqttClient.subscribe("my/topic");
//         return true;
//     }
//     else
//     {
//         int state = mqttClient.state();
//         Serial.print("aws_client: failed, rc=");
//         Serial.print(state);
//         Serial.print(" (");
//         switch (state)
//         {
//         case -4:
//             Serial.print("MQTT_CONNECTION_TIMEOUT");
//             break;
//         case -3:
//             Serial.print("MQTT_CONNECTION_LOST");
//             break;
//         case -2:
//             Serial.print("MQTT_CONNECT_FAILED");
//             break;
//         case -1:
//             Serial.print("MQTT_DISCONNECTED");
//             break;
//         case 0:
//             Serial.print("MQTT_CONNECTED");
//             break;
//         case 1:
//             Serial.print("MQTT_CONNECT_BAD_PROTOCOL");
//             break;
//         case 2:
//             Serial.print("MQTT_CONNECT_BAD_CLIENT_ID");
//             break;
//         case 3:
//             Serial.print("MQTT_CONNECT_UNAVAILABLE");
//             break;
//         case 4:
//             Serial.print("MQTT_CONNECT_BAD_CREDENTIALS");
//             break;
//         case 5:
//             Serial.print("MQTT_CONNECT_UNAUTHORIZED");
//             break;
//         default:
//             Serial.print("UNKNOWN_STATE");
//             break;
//         }
//         Serial.println(")");
//         return false;
//     }
// }

bool aws_client_connect()
{
    Serial.println("===========================================");
    Serial.println("Connecting to AWS IoT...");

    // Ensure WiFi is connected
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("WiFi not connected, skipping MQTT connect");
        return false;
    }

    Serial.print("Endpoint: ");
    Serial.println(AWS_IOT_ENDPOINT);

    // Debug: print free memory before TLS
    Serial.print("Free heap before TLS: ");
    Serial.println(ESP.getFreeHeap());

    // Ensure system time is synced for TLS validation
    auto ensureTimeSync = [](unsigned long timeoutMs = 5000) -> bool
    {
        time_t now = time(nullptr);
        if (now > 1600000000)
            return true; // Already synced
        Serial.println("Syncing time via NTP...");
        configTime(0, 0, "pool.ntp.org", "time.google.com");
        unsigned long start = millis();
        while (millis() - start < timeoutMs)
        {
            now = time(nullptr);
            if (now > 1600000000)
            {
                Serial.print("Time synced: ");
                Serial.println((long)now);
                return true;
            }
            delay(500);
        }
        Serial.println("Time sync timeout");
        return false;
    };

    if (!ensureTimeSync(7000))
    {
        Serial.println("Warning: Time not synced, TLS may fail");
    }

    // TLS Configurations: Set certificates for AWS IoT connection
    secureClient.setCACert(AWS_ROOT_CA);
    secureClient.setCertificate(AWS_CLIENT_CERT);
    secureClient.setPrivateKey(AWS_PRIVATE_KEY);

    Serial.println("Configured certificates for TLS.");

    // Start TLS connection with retry logic
    bool tlsConnected = false;
    Serial.println("Starting TLS handshake...");
    for (int attempt = 1; attempt <= 2 && !tlsConnected; attempt++)
    {
        if (attempt > 1)
        {
            Serial.print("Retry attempt ");
            Serial.println(attempt);
            delay(1000);
        }
        tlsConnected = secureClient.connect(AWS_IOT_ENDPOINT, AWS_IOT_PORT);
        if (!tlsConnected)
        {
            Serial.print("Attempt ");
            Serial.print(attempt);
            Serial.println(" failed");
        }
    }

    if (!tlsConnected)
    {
        Serial.println("TLS connection failed.");
        Serial.print("secureClient.connected() = ");
        Serial.println(secureClient.connected());
        return false;
    }

    Serial.println("TLS handshake successful!");

    mqttClient.setServer(AWS_IOT_ENDPOINT, AWS_IOT_PORT);
    mqttClient.setCallback(aws_mqtt_callback);

    // Attempt to connect to MQTT
    if (mqttClient.connect(MQTT_CLIENT_ID))
    {
        Serial.println("Connected to AWS IoT.");
        return true;
    }
    else
    {
        int state = mqttClient.state();
        Serial.print("Failed to connect to MQTT: ");
        Serial.println(state);
        return false;
    }
}

void aws_client_loop()
{
    if (!mqttClient.connected())
    {
        aws_client_connect();
    }
    mqttClient.loop();
}

bool aws_client_publish(const char *topic, const char *payload)
{
    if (!mqttClient.connected())
    {
        if (!aws_client_connect())
            return false;
    }
    bool ok = mqttClient.publish(topic, payload);
    if (!ok)
        Serial.println("aws_client: publish failed");
    return ok;
}

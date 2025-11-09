#pragma once
#include <Arduino.h>

void sensors_init();
// Periodic update helper called from main loop. Handles interval and
// triggers publish when needed.
void sensors_update(); // Ensure this function is declared for periodic updates

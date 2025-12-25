/**
 * Voice Assistant for Smart Weather Station
 * Uses Web Speech API for listening + ElevenLabs for realistic voice responses
 */

// ========================================
// Configuration
// ========================================
const ELEVENLABS_API_KEY = "sk_2b4ebd46cf613a10bbc39d014f11e3ce9e4acbfd07172de6"; // ElevenLabs API key
const ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice (clear female voice)

// Other voice options:
// "EXAVITQu4vr4xnSDxMaL" - Bella (soft female)
// "ErXwobaYiN019PkySvjV" - Antoni (male)
// "pNInz6obpgDQGcFmaJgB" - Adam (deep male)

// ========================================
// Voice Recognition Setup (Web Speech API)
// ========================================
let recognition;
let isListening = false;
let isWaitingForCommand = false;
let isProcessing = false;

function initVoiceRecognition() {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert('Voice recognition not supported in this browser. Please use Chrome or Edge.');
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening for wake word
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        console.log('🎤 Voice recognition started. Listening for wake word...');
        isListening = true;
        updateOrbState('listening');
    };

    recognition.onresult = (event) => {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript.toLowerCase();
        console.log('Heard:', command);

        if (!isWaitingForCommand && !isProcessing) {
            // Check for wake word
            if (command.includes('weather station') || command.includes('whether station')) {
                console.log('🎤 Wake word detected!');
                isWaitingForCommand = true;
                updateOrbState('active');
                showVoiceMessage('Yes, sir? I\'m listening...', 'info');

                // Play a subtle beep sound (optional)
                playWakeSound();
            }
        } else if (isWaitingForCommand && !isProcessing) {
            // Process the actual command
            isWaitingForCommand = false;
            isProcessing = true;
            updateOrbState('processing');
            processVoiceCommand(command);
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);

        if (event.error === 'no-speech') {
            // Silently restart - don't show error for no speech
            if (isListening) {
                setTimeout(() => {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.log('Recognition already running');
                    }
                }, 100);
            }
        } else {
            isListening = false;
            updateOrbState('idle');
        }
    };

    recognition.onend = () => {
        console.log('🎤 Voice recognition ended');

        // Auto-restart to keep listening for wake word
        if (isListening && !isProcessing) {
            setTimeout(() => {
                try {
                    recognition.start();
                } catch (e) {
                    console.log('Recognition already running');
                }
            }, 100);
        }
    };

    // Start listening immediately
    setTimeout(() => {
        startListening();
    }, 1000);
}

function playWakeSound() {
    // Create a subtle beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// ========================================
// Voice Command Processing
// ========================================
function processVoiceCommand(command) {
    console.log('Processing command:', command);

    showVoiceMessage(`You said: "${command}"`);

    // Get response text based on command
    const responseText = getResponseForCommand(command.toLowerCase());

    // Show text response
    showVoiceMessage(responseText, 'response');

    // Speak response using ElevenLabs
    speakWithElevenLabs(responseText);
}

function resetToListening() {
    isProcessing = false;
    isWaitingForCommand = false;
    updateOrbState('listening');
    hideVoiceMessage();
}

function getResponseForCommand(command) {
    // Check if we have sensor data
    if (!currentSensorData || !currentSensorData.tempF) {
        return "I don't have any sensor data yet, sir. Please wait for the weather station to connect, sir.";
    }

    // Temperature queries
    if (command.includes('temperature') || command.includes('temp') ||
        command.includes('hot') || command.includes('cold')) {
        const temp = currentSensorData.tempF;
        let comment = '';

        if (temp < 60) {
            comment = "It's quite cold, sir.";
        } else if (temp > 80) {
            comment = "It's quite warm, sir.";
        } else {
            comment = "That's a comfortable temperature, sir.";
        }

        return `The current temperature is ${temp.toFixed(1)} degrees Fahrenheit, sir. ${comment}`;
    }

    // Humidity queries
    if (command.includes('humidity') || command.includes('humid')) {
        const humidity = currentSensorData.hum;
        let comment = '';

        if (humidity < 30) {
            comment = "That's quite dry, sir.";
        } else if (humidity > 60) {
            comment = "That's quite humid, sir.";
        } else {
            comment = "That's comfortable, sir.";
        }

        return `The current humidity is ${humidity.toFixed(1)} percent, sir. ${comment}`;
    }

    // Air quality queries
    if (command.includes('air') || command.includes('quality')) {
        const airStatus = currentSensorData.airStatus || 'Unknown';
        let recommendation = '';

        if (airStatus === 'Poor') {
            recommendation = "You may want to open a window or turn on air purification, sir.";
        } else if (airStatus === 'Good') {
            recommendation = "The air quality is safe and healthy, sir.";
        }

        return `The air quality is ${airStatus.toLowerCase()}, sir. ${recommendation}`;
    }

    // Light level queries
    if (command.includes('light') || command.includes('bright') || command.includes('dark')) {
        const lightStatus = currentSensorData.lightStatus || 'Unknown';
        return `The light level is ${lightStatus.toLowerCase()}, sir.`;
    }

    // AI Analysis queries
    if (command.includes('analyze') || command.includes('analysis') ||
        command.includes('ai') || command.includes('think') ||
        command.includes('overview') || command.includes('assessment')) {

        // Trigger AI overview refresh
        const aiOverviewDiv = document.getElementById('ai-overview');

        if (!aiOverviewDiv) {
            return "AI analysis is not available at the moment, sir.";
        }

        const currentText = aiOverviewDiv.textContent.trim();

        // Check if we need to refresh AI overview
        if (!currentText ||
            currentText.includes('Click the button') ||
            currentText.includes('Analyzing') ||
            currentText.length < 50) {

            // Trigger refresh
            if (typeof refreshAIOverview === 'function') {
                refreshAIOverview();
                return "Let me analyze the environment for you, sir. This will take a moment.";
            }
        }

        // Read existing AI analysis
        return "Here's my analysis, sir. " + currentText;
    }

    // Full report
    if (command.includes('report') || command.includes('everything') ||
        command.includes('status') || command.includes('all')) {
        const temp = currentSensorData.tempF.toFixed(1);
        const humidity = currentSensorData.hum.toFixed(1);
        const airStatus = currentSensorData.airStatus || 'Unknown';
        const lightStatus = currentSensorData.lightStatus || 'Unknown';

        return `Here's your complete weather station status, sir. ` +
               `Temperature is ${temp} degrees Fahrenheit. ` +
               `Humidity is ${humidity} percent. ` +
               `Air quality is ${airStatus.toLowerCase()}. ` +
               `And the light level is ${lightStatus.toLowerCase()}, sir.`;
    }

    // Help
    if (command.includes('help') || command.includes('what can you')) {
        return "Of course, sir. You can ask me about temperature, humidity, air quality, or light level. " +
               "Say 'analyze' for AI analysis, or 'give me a full report' to hear everything, sir.";
    }

    // Default
    return "I'm sorry sir, I'm not sure what you're asking. Try asking about temperature, humidity, " +
           "air quality, or light level, sir.";
}

// ========================================
// ElevenLabs Text-to-Speech
// ========================================
async function speakWithElevenLabs(text) {
    if (ELEVENLABS_API_KEY === "YOUR_ELEVENLABS_API_KEY_HERE") {
        console.error('ElevenLabs API key not configured');
        alert('Please add your ElevenLabs API key to voice-assistant.js');
        return;
    }

    showVoiceMessage('🔊 Generating voice response...', 'status');

    try {
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': ELEVENLABS_API_KEY
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_turbo_v2_5',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        use_speaker_boost: true
                    }
                })
            }
        );

        if (response.ok) {
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            const audio = new Audio(audioUrl);
            audio.play();

            showVoiceMessage('🔊 Speaking...', 'status');

            audio.onended = () => {
                hideVoiceMessage();
                resetToListening();
            };
        } else {
            console.error('ElevenLabs API error:', response.status);
            const errorText = await response.text();
            console.error('Error details:', errorText);
            showVoiceMessage('Error: Could not generate voice. Check API key.', 'error');
        }
    } catch (error) {
        console.error('Error calling ElevenLabs:', error);
        showVoiceMessage('Error generating voice response', 'error');
    }
}

// ========================================
// UI Functions
// ========================================
function startListening() {
    if (!recognition) {
        initVoiceRecognition();
        return;
    }

    if (isListening) {
        return;
    }

    try {
        recognition.start();
    } catch (error) {
        console.error('Error starting recognition:', error);
    }
}

function updateOrbState(state) {
    const orb = document.getElementById('voiceOrb');
    const statusText = document.getElementById('orbStatus');

    if (!orb) return;

    // Remove all state classes
    orb.classList.remove('listening', 'active', 'processing', 'speaking');

    // Add current state
    orb.classList.add(state);

    // Update status text
    if (statusText) {
        switch(state) {
            case 'listening':
                statusText.textContent = 'Say "Weather Station" to activate, sir';
                break;
            case 'active':
                statusText.textContent = 'Listening for your command, sir...';
                break;
            case 'processing':
                statusText.textContent = 'Processing your request, sir...';
                break;
            case 'speaking':
                statusText.textContent = 'Speaking, sir...';
                break;
            default:
                statusText.textContent = 'Ready to assist, sir';
        }
    }
}

function showVoiceMessage(message, type = 'info') {
    const messageDiv = document.getElementById('voiceMessage');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';

        // Style based on type
        if (type === 'error') {
            messageDiv.style.color = '#ff6b6b';
        } else if (type === 'response') {
            messageDiv.style.color = '#00ffff';
        } else {
            messageDiv.style.color = '#ffffff';
        }
    }
}

function hideVoiceMessage() {
    setTimeout(() => {
        const messageDiv = document.getElementById('voiceMessage');
        if (messageDiv) {
            messageDiv.style.display = 'none';
        }
    }, 3000);
}

// ========================================
// Initialize on page load
// ========================================
window.addEventListener('DOMContentLoaded', () => {
    console.log('Voice Assistant loaded');
    initVoiceRecognition();
});

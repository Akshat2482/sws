/**
 * Simple Voice Assistant for Smart Weather Station
 * Click button → Speak → Get AI voice response
 */

// ElevenLabs Configuration
const ELEVENLABS_API_KEY = "sk_2b4ebd46cf613a10bbc39d014f11e3ce9e4acbfd07172de6";
const ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice

let recognition;
let isListening = false;

// Initialize speech recognition
function initVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert('Voice recognition not supported. Please use Chrome or Edge.');
        return false;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        console.log('🎤 Listening...');
        isListening = true;
        updateButton(true);
        showMessage('🎤 Listening... Speak now!', 'info');
    };

    recognition.onresult = (event) => {
        const command = event.results[0][0].transcript;
        console.log('Heard:', command);
        processCommand(command);
    };

    recognition.onerror = (event) => {
        console.error('Error:', event.error);
        isListening = false;
        updateButton(false);

        if (event.error === 'no-speech') {
            showMessage("I didn't hear anything. Try again!", 'error');
        }
    };

    recognition.onend = () => {
        console.log('🎤 Stopped listening');
        isListening = false;
        updateButton(false);
    };

    return true;
}

// Start voice command (called when button is clicked)
function startVoiceCommand() {
    if (!recognition) {
        if (!initVoiceRecognition()) return;
    }

    if (isListening) {
        recognition.stop();
        return;
    }

    try {
        recognition.start();
    } catch (error) {
        console.error('Error starting recognition:', error);
    }
}

// Process the voice command
function processCommand(command) {
    showMessage(`You said: "${command}"`, 'info');

    const response = getResponse(command.toLowerCase());

    // Only show message and speak if response exists (not null)
    if (response !== null) {
        showMessage(response, 'response');
        // Speak with ElevenLabs
        speakResponse(response);
    }
}

// Get response based on command
function getResponse(command) {
    if (!currentSensorData || !currentSensorData.tempF) {
        return "I don't have sensor data yet sir. Please wait for the Smart weather station to connect sir.";
    }

    // Temperature
    if (command.includes('temperature') || command.includes('temp') || command.includes('hot') || command.includes('cold')) {
        const temp = currentSensorData.tempF;
        const comment = temp < 60 ? "It's quite cold, sir." : temp > 80 ? "It's quite warm, sir." : "That's a comfortable temperature, sir.";
        return `The current temperature is ${temp.toFixed(1)} degrees Fahrenheit, sir. ${comment}`;
    }

    // Humidity
    if (command.includes('humidity') || command.includes('humid')) {
        const hum = currentSensorData.hum;
        const comment = hum < 30 ? "That's quite dry, sir." : hum > 60 ? "That's quite humid, sir." : "That's a comfortable level, sir.";
        return `The current humidity is ${hum.toFixed(1)} percent, sir. ${comment}`;
    }

    // Air quality
    if (command.includes('air') || command.includes('quality')) {
        const status = currentSensorData.airStatus || 'Unknown';
        const rec = status === 'Poor' ? "You may want to open a window, sir." : "The air quality is safe, sir.";
        return `The air quality is ${status.toLowerCase()}, sir. ${rec}`;
    }

    // Light
    if (command.includes('light') || command.includes('bright') || command.includes('dark')) {
        const status = currentSensorData.lightStatus || 'Unknown';
        return `The light level is ${status.toLowerCase()}, sir.`;
    }

    // AI Overview / Analysis
    if (command.includes('think') || command.includes('analysis') || command.includes('ai overview') ||
        command.includes('your thoughts') || command.includes('what about') || command.includes('analyze')) {

        // Get AI overview text
        const aiOverviewDiv = document.getElementById('ai-overview');

        if (!aiOverviewDiv) {
            return "I'm sorry sir, the AI overview feature is not available.";
        }

        const currentText = aiOverviewDiv.textContent.trim();

        // Check if AI overview needs to be refreshed
        if (!currentText ||
            currentText.includes('Click the button') ||
            currentText.includes('Analyzing') ||
            currentText.includes('waiting for data') ||
            currentText.length < 50) {

            // Trigger AI overview refresh
            showMessage('Getting AI analysis...', 'status');

            // Call the refresh function
            if (typeof refreshAIOverview === 'function') {
                refreshAIOverview();

                // Wait for AI to generate, then read it
                setTimeout(() => {
                    const updatedText = aiOverviewDiv.textContent.trim();
                    if (updatedText && updatedText.length > 50) {
                        speakResponse("Here's my analysis, sir. " + updatedText);
                    }
                }, 5000); // Wait 5 seconds for AI to generate

                return null; // Don't speak yet
            }
        }

        // Read existing AI overview
        return "Here's my analysis, sir. " + currentText;
    }

    // Full report
    if (command.includes('report') || command.includes('everything') || command.includes('status') || command.includes('all')) {
        const temp = currentSensorData.tempF.toFixed(1);
        const hum = currentSensorData.hum.toFixed(1);
        const air = currentSensorData.airStatus || 'Unknown';
        const light = currentSensorData.lightStatus || 'Unknown';

        return `Here's your complete weather station status, sir. ` +
            `Temperature is ${temp} degrees Fahrenheit. ` +
            `Humidity is ${hum} percent. ` +
            `Air quality is ${air.toLowerCase()}. ` +
            `And light level is ${light.toLowerCase()}.`;
    }

    // Help
    if (command.includes('help')) {
        return "Of course, sir. You can ask me about temperature, humidity, air quality, light level, or ask for my analysis. You can also say 'give me a full report', sir.";
    }

    // Default
    return "I'm sorry sir, I'm not sure what you're asking. Try asking about temperature, humidity, air quality, or light level, sir.";
}

// Speak response using ElevenLabs
async function speakResponse(text) {
    if (ELEVENLABS_API_KEY === "YOUR_API_KEY_HERE") {
        console.error('ElevenLabs API key not configured');
        return;
    }

    showMessage('🔊 Generating voice...', 'status');

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

            showMessage('🔊 Speaking...', 'status');
            audio.play();

            audio.onended = () => {
                setTimeout(() => hideMessage(), 2000);
            };
        } else {
            console.error('ElevenLabs error:', response.status);
            showMessage('Error generating voice', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error generating voice', 'error');
    }
}

// UI Functions
function updateButton(listening) {
    const button = document.getElementById('voiceButton');
    if (button) {
        if (listening) {
            button.textContent = '🎤 Listening...';
            button.style.background = 'linear-gradient(135deg, #3700ffc9, #ff6b6b)';
        } else {
            button.textContent = '🎤 Ask Me Anything';
            button.style.background = 'linear-gradient(135deg, var(--border-color), #00aaff)';
        }
    }
}

function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('voiceMessage');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';

        if (type === 'error') {
            messageDiv.style.color = '#ff6b6b';
        } else if (type === 'response') {
            messageDiv.style.color = '#00ffff';
        } else {
            messageDiv.style.color = '#ffffff';
        }
    }
}

function hideMessage() {
    const messageDiv = document.getElementById('voiceMessage');
    if (messageDiv) {
        messageDiv.style.display = 'none';
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    console.log('Voice Assistant loaded');
    initVoiceRecognition();
});

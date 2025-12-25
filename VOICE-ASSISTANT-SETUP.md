# Voice Assistant Setup Guide
## Using Web Speech API + ElevenLabs

Your dashboard will have a button that listens to your voice and responds with realistic AI speech!

---

## What You'll Be Able to Do:

Click the button and say:
- "What's the temperature?"
- "How's the air quality?"
- "Give me a full report"
- "What's the humidity?"

The AI will respond with a realistic voice!

---

## Step 1: Get ElevenLabs API Key (5 minutes)

1. Go to: https://elevenlabs.io
2. Click **"Sign Up"** (free account)
3. After signing in, click your profile icon (top right)
4. Click **"Profile"**
5. Copy your **API Key**
6. **SAVE THIS KEY** - you'll need it in Step 3!

**Free tier:**
- 10,000 characters per month (perfect for your project!)
- Access to all voices
- No credit card required

---

## Step 2: Add Voice Assistant to Your Dashboard

Open `index.html` and add these changes:

### A. Add the voice assistant script (before closing `</head>` tag)

Find this line in your HTML:
```html
</head>
```

**RIGHT BEFORE** that line, add:
```html
<!-- Voice Assistant Script -->
<script src="voice-assistant.js"></script>
```

### B. Add voice button CSS (in the `<style>` section)

Find the `</style>` tag and add this **BEFORE** it:

```css
/* Voice Assistant Button */
.voice-assistant-container {
    max-width: 1400px;
    margin: 20px auto;
    text-align: center;
}

.voice-button {
    padding: 20px 40px;
    font-size: 1.3rem;
    font-weight: bold;
    background: linear-gradient(135deg, var(--border-color), #00aaff);
    color: white;
    border: 2px solid var(--border-color);
    border-radius: 50px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 8px 32px rgba(0, 255, 255, 0.3);
}

.voice-button:hover {
    transform: translateY(-5px) scale(1.05);
    box-shadow: 0 12px 48px rgba(0, 255, 255, 0.5);
}

.voice-button:active {
    transform: translateY(-2px) scale(1.02);
}

.listening-indicator {
    display: none;
    margin-top: 15px;
    font-size: 1.1rem;
    color: var(--border-color);
    animation: pulse 1.5s infinite;
}

.voice-message {
    display: none;
    margin-top: 15px;
    padding: 15px;
    background: rgba(0, 20, 40, 0.8);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    color: white;
    font-size: 1.1rem;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.6;
        transform: scale(0.95);
    }
}
```

### C. Add voice button HTML

Find this section in your HTML:
```html
<div class="ai-time-container">
```

**RIGHT AFTER** the closing `</div>` of that container, add:

```html
<!-- Voice Assistant -->
<div class="voice-assistant-container">
    <button id="voiceButton" class="voice-button" onclick="startListening()">
        🎤 Ask Me Anything
    </button>
    <div id="listeningIndicator" class="listening-indicator">
        🎤 Listening... Speak now!
    </div>
    <div id="voiceMessage" class="voice-message"></div>
</div>
```

---

## Step 3: Add Your ElevenLabs API Key

1. Open `voice-assistant.js`
2. Find this line at the top:
```javascript
const ELEVENLABS_API_KEY = "YOUR_ELEVENLABS_API_KEY_HERE";
```
3. Replace `YOUR_ELEVENLABS_API_KEY_HERE` with your actual API key:
```javascript
const ELEVENLABS_API_KEY = "sk_abc123your_actual_key_here";
```
4. Save the file

---

## Step 4: Test It!

1. Open your dashboard: `index.html` in Chrome or Edge
2. Make sure your ESP32 is connected and sending data
3. Click the **🎤 Ask Me Anything** button
4. When it says "Listening...", say: **"What's the temperature?"**
5. The AI voice will respond!

---

## Voice Commands You Can Use:

### Temperature:
- "What's the temperature?"
- "How hot is it?"
- "Tell me the temperature"

### Humidity:
- "What's the humidity?"
- "How humid is it?"

### Air Quality:
- "How's the air quality?"
- "Is the air quality good?"
- "What about the air?"

### Light Level:
- "What's the light level?"
- "Is it bright or dark?"

### Full Report:
- "Give me a full report"
- "Tell me everything"
- "What's the status?"

### Help:
- "Help"
- "What can you do?"

---

## Choosing Different Voices

In `voice-assistant.js`, change this line to use different voices:

```javascript
const ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel (female, clear)
```

**Available voices:**
- `"21m00Tcm4TlvDq8ikWAM"` - **Rachel** (clear female) - DEFAULT
- `"EXAVITQu4vr4xnSDxMaL"` - **Bella** (soft female)
- `"ErXwobaYiN019PkySvjV"` - **Antoni** (male, professional)
- `"pNInz6obpgDQGcFmaJgB"` - **Adam** (deep male)

Find more voices at: https://elevenlabs.io/voice-library

---

## Troubleshooting

### "Voice recognition not supported"
**Solution:** Use Chrome or Edge browser (Safari doesn't support Web Speech API well)

### "Please add your ElevenLabs API key"
**Solution:** Make sure you added your API key in `voice-assistant.js` (Step 3)

### Button does nothing
**Solution:**
- Check browser console for errors (F12)
- Make sure `voice-assistant.js` is in the same folder as `index.html`
- Make sure the script tag is added correctly

### "I don't have any sensor data yet"
**Solution:**
- Make sure your ESP32 is connected to AWS IoT
- Check that `currentSensorData` has values in browser console
- Wait 5-10 seconds after page loads

### ElevenLabs API error
**Solution:**
- Check your API key is correct
- Make sure you haven't exceeded free tier (10,000 chars/month)
- Check browser console for specific error message

---

## Demo Tips for Science Fair

### Setup:
1. Have dashboard open and working
2. ESP32 connected and showing live data
3. Practiced voice commands

### Demo Flow:
1. Show judges the live dashboard
2. Click voice button
3. Say: **"Give me a full report"**
4. AI responds with realistic voice!
5. Try 2-3 more commands to show it's real
6. Explain the tech stack

### What to Say:
> "I built a voice assistant using Web Speech API for voice recognition and ElevenLabs AI for realistic text-to-speech. When I speak, the browser captures my voice, processes the command in JavaScript, fetches live sensor data from AWS IoT, and responds with natural-sounding AI voice. This makes the weather station accessible hands-free."

### Why Judges Will Be Impressed:
✅ Uses modern AI technology
✅ Browser-based (no app needed)
✅ Realistic voice synthesis
✅ Real-time sensor data
✅ Shows advanced JavaScript skills
✅ Practical accessibility feature

---

## Cost

- **ElevenLabs Free Tier:** 10,000 characters/month
- **Web Speech API:** FREE (built into browser)
- **Total:** $0 for the project!

**10,000 characters = ~200 voice responses** (more than enough for demos!)

---

## Next Steps / Advanced Features

### Add More Commands:
- Compare to yesterday's data
- Set voice alerts
- Weather forecasting

### Improve Responses:
- Add personality to responses
- Use different voices for different types of info
- Add sound effects

### Mobile Support:
- Test on phone browsers
- Add tap-to-speak for mobile
- Create PWA (Progressive Web App)

---

## Summary

Files you need:
- ✅ `voice-assistant.js` - Voice assistant logic (created)
- ✅ `index.html` - Your dashboard (needs updates above)
- ✅ ElevenLabs API key (get from elevenlabs.io)

**Time to implement:** 15-20 minutes
**Wow factor:** 10/10! 🎤

---

**Ready to try it?** Follow the steps above and let me know if you need help!

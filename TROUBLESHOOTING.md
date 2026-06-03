# Troubleshooting Guide

## Audio Issues

### Can't hear the AI's voice (only see text)

**Problem**: The AI responds with text transcripts but you don't hear the voice.

**Solution**: This is usually caused by browser autoplay policies. The latest version automatically handles this, but if you still have issues:

1. **Check browser console** (F12 → Console tab) for:
   - `"Received audio data: XXX bytes"` - confirms audio is arriving
   - `"Playing audio chunk: XXX bytes"` - confirms playback is attempted
   - Any `AudioContext` errors

2. **Ensure microphone permission** is granted when you click "Start Conversation"

3. **Try clicking in the browser** window after connecting (some browsers require user interaction)

4. **Check browser audio settings**:
   - Chrome: `chrome://settings/content/sound`
   - Make sure the site isn't muted
   - Check system volume

### Debug mode

Open browser DevTools (F12) and look for these messages:
- ✅ `"Voice agent ready!"` - connection successful
- ✅ `"Received audio data: XXX bytes"` - AI voice is being received
- ✅ `"Playing audio chunk: XXX bytes"` - audio playback started
- ❌ `"AudioContext not initialized"` - connection issue
- ❌ `"reply.audio received but no data field"` - API issue

## API Key Security

Your API key is **safe** and **never uploaded to GitHub** because:
- The `.env` file is in `.gitignore`
- Only `.env.example` (template) is committed
- Anyone cloning the repo needs to add their own API key

**To verify**: Check your repo on GitHub - you should see `.env.example` but NOT `.env`.

## Slow Response Time

If the AI takes too long to respond:
- Current settings: `max_silence: 600ms` (wait time after you stop talking)
- Shorter values = faster but might cut you off
- Longer values = more patient but slower

Edit [src/lib/voiceAgent.ts:86-90](src/lib/voiceAgent.ts#L86-L90) to adjust.

## Connection Issues

**"Failed to get token"**
- Check that your `.env` file exists and has `ASSEMBLYAI_API_KEY=your_key_here`
- Restart the dev server: `npm run dev`

**"Connection error"**
- Check your internet connection
- Verify your API key is valid at [assemblyai.com/dashboard](https://www.assemblyai.com/dashboard)

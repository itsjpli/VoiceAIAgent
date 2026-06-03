# Script Doctor 🩺 - AI Script Coach for Content Creators

A Gen Z-styled voice AI agent built with AssemblyAI's Voice Agent API to help content creators level up their scripts and ideas in real-time.

## Features

- 🎤 **Real-time Voice Interaction** - Talk naturally with Script Doctor using your browser microphone
- 🎬 **Script Analysis** - Get instant feedback on hooks, pacing, retention, story flow, and CTAs
- ✨ **Gen Z Design** - Vibrant pink (#EE38CE) and lime (#E3F452) color scheme
- ✏️ **Edit Messages** - Fix incorrectly captured messages in noisy environments
- 🔒 **Secure** - Server-side token minting keeps your API key safe

## What Script Doctor Analyzes

- **Hook Analysis** - Rate the first 3-5 seconds of your script
- **Pacing Check** - Identify slow spots and rhythm issues
- **Retention Tips** - Pattern interrupts and b-roll suggestions
- **Story Flow** - Narrative arc optimization
- **Thumbnail Ideas** - Eye-catching thumbnail concepts
- **Call-to-Action** - Optimize your CTAs for better engagement

## Tech Stack

- **SvelteKit** with TypeScript
- **AssemblyAI Voice Agent API** - Managed full-duplex speech-to-speech
- **AudioWorklet API** - Browser audio capture at 24kHz
- **WebSocket** - Real-time bidirectional communication

## Getting Started

### Prerequisites

- Node.js 18+ 
- An AssemblyAI API key (get one at [assemblyai.com/dashboard/api-keys](https://www.assemblyai.com/dashboard/api-keys))

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd voice-agent-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Add your AssemblyAI API key to `.env`:
```
ASSEMBLYAI_API_KEY=your_api_key_here
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:5173](http://localhost:5173) in your browser

## Usage

1. Click "Start Voice Agent" to connect
2. Allow microphone access when prompted
3. Start talking about your script or content ideas
4. Script Doctor will analyze and provide feedback in real-time
5. Edit any incorrectly captured messages by hovering and clicking the edit button

## Project Structure

```
voice-agent-app/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── VoiceAgent.svelte    # Main UI component
│   │   └── voiceAgent.ts             # WebSocket manager
│   ├── routes/
│   │   ├── api/
│   │   │   └── voice-token/
│   │   │       └── +server.ts        # Token minting endpoint
│   │   └── +page.svelte              # Main page
│   └── app.html
├── static/
│   └── audio-processor.js            # AudioWorklet for mic capture
├── .env                               # API key (not committed)
├── .env.example                       # Template for API key
└── svelte.config.js
```

## How It Works

1. **Token Minting**: Server generates a temporary token from your API key
2. **WebSocket Connection**: Client connects to AssemblyAI Voice Agent API with the token
3. **Audio Capture**: AudioWorklet captures microphone audio as PCM16 at 24kHz
4. **Real-time Processing**: AssemblyAI handles STT + LLM + TTS in one managed pipeline
5. **Voice Playback**: Agent responses are played back through your speakers

## Built With

- [AssemblyAI Voice Agent API](https://www.assemblyai.com/docs/voice-agents/voice-agent-api/overview)
- [SvelteKit](https://kit.svelte.dev/)
- [TypeScript](https://www.typescriptlang.org/)

## License

MIT

## Acknowledgments

- AssemblyAI for the amazing Voice Agent API
- The content creator community for inspiration

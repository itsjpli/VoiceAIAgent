# Setup Instructions

## Step 1: Add Your API Key

Edit the `.env` file in this directory and add your AssemblyAI API key:

```bash
ASSEMBLYAI_API_KEY=your_actual_api_key_here
```

You can get your API key from: https://www.assemblyai.com/dashboard/api-keys

## Step 2: Run the Development Server

```bash
npm run dev
```

## Step 3: Open Your Browser

Navigate to: http://localhost:5173

## Step 4: Test the Voice Agent

1. Click the "Start Conversation" button
2. Grant microphone permission when prompted
3. Wait for "Connected - Speak now!" status
4. Start talking to your AI assistant!

## Tips

- Use headphones to prevent echo/feedback
- Speak clearly and wait for the AI to finish before interrupting
- The transcript will show both your speech and the AI's responses in real-time

## Troubleshooting

If you see "Failed to mint token":
- Make sure you've added your API key to `.env`
- Restart the dev server after adding the API key (Ctrl+C, then `npm run dev` again)

If microphone doesn't work:
- Check browser console for errors
- Ensure you granted microphone permission
- Try a different browser (Chrome/Firefox/Edge recommended)

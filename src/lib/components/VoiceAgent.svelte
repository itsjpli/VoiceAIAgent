<script lang="ts">
	import { onDestroy } from 'svelte';
	import { VoiceAgent } from '$lib/voiceAgent';

	// Props using Svelte 5 runes
	let {
		systemPrompt = `You are Script Doctor - a Gen Z creative AI that helps content creators level up their scripts. You're energetic, insightful, and FAST.

Your specialties:
🎬 Hook Analysis - Rate the first 3-5 seconds and suggest improvements to grab attention
📊 Pacing Check - Identify slow spots that might lose viewers
🔥 Retention Tips - Point out where to add pattern interrupts, b-roll suggestions, or energy shifts
💡 Story Flow - Make sure the narrative arc keeps people watching
✨ Thumbnail Ideas - Brainstorm eye-catching thumbnail concepts that match the script
🎯 Call-to-Action - Optimize CTAs for max engagement

IMPORTANT: Keep responses SHORT and snappy - 1-3 sentences max unless they ask for details. Be quick, energetic, and conversational. Use emojis. No corporate speak - talk like a friend who's really good at this stuff.`,
		greeting = 'Yo! Script Doctor here 🩺 Drop your script or idea and let\'s make it slap! What are we working on?',
		voice = 'tyler'
	}: {
		systemPrompt?: string;
		greeting?: string;
		voice?: string;
	} = $props();

	// State using Svelte 5 $state rune
	let isConnected = $state(false);
	let isReady = $state(false);
	let isListening = $state(false);
	let error = $state<string | null>(null);
	let transcripts = $state<Array<{ speaker: 'user' | 'agent'; text: string; isFinal: boolean; id: string }>>([]);
	let voiceAgent: VoiceAgent | null = null;
	let audioContext: AudioContext | null = null;
	let audioQueue: ArrayBuffer[] = [];
	let isPlaying = false;
	let transcriptContainer: HTMLDivElement;
	let editingId = $state<string | null>(null);
	let editText = $state('');

	/**
	 * Connect to Voice Agent
	 */
	async function connect() {
		try {
			error = null;
			isConnected = true;

			// Fetch token from backend
			const response = await fetch('/api/voice-token');
			if (!response.ok) {
				throw new Error('Failed to get token');
			}
			const { token } = await response.json();

			// Create audio context for playback
			audioContext = new AudioContext({ sampleRate: 24000 });

			// Resume audio context (required by browser autoplay policy)
			if (audioContext.state === 'suspended') {
				await audioContext.resume();
			}

			// Create voice agent
			voiceAgent = new VoiceAgent({
				systemPrompt,
				greeting,
				voice,
				onReady: () => {
					isReady = true;
					console.log('Voice agent ready!');
				},
				onTranscript: (text, isFinal, speaker) => {
					// Update or add transcript
					if (isFinal) {
						const id = `${Date.now()}-${Math.random()}`;
						transcripts = [...transcripts, { speaker, text, isFinal, id }];
						scrollToBottom();
					} else {
						// Update last partial or add new
						const lastIndex = transcripts.length - 1;
						if (lastIndex >= 0 && transcripts[lastIndex].speaker === speaker && !transcripts[lastIndex].isFinal) {
							transcripts[lastIndex].text = text;
							transcripts = [...transcripts];
						} else {
							const id = `${Date.now()}-${Math.random()}`;
							transcripts = [...transcripts, { speaker, text, isFinal, id }];
						}
						scrollToBottom();
					}
				},
				onAudio: (audioData) => {
					playAudio(audioData);
				},
				onListeningChange: (listening) => {
					isListening = listening;
				},
				onError: (err) => {
					error = err;
					isConnected = false;
					isReady = false;
				},
				onClose: () => {
					isConnected = false;
					isReady = false;
				}
			});

			await voiceAgent.connect(token);
		} catch (err) {
			console.error('Connection error:', err);
			error = err instanceof Error ? err.message : 'Failed to connect';
			isConnected = false;
			isReady = false;
		}
	}

	/**
	 * Pause Voice Agent (keeps chat history)
	 */
	function pauseConversation() {
		if (voiceAgent) {
			voiceAgent.disconnect();
			voiceAgent = null;
		}
		if (audioContext) {
			audioContext.close();
			audioContext = null;
		}
		audioQueue = [];
		isPlaying = false;
		isConnected = false;
		isReady = false;
		// Keep transcripts intact!
	}

	/**
	 * End and clear everything
	 */
	function endAndClear() {
		pauseConversation();
		transcripts = [];
	}

	/**
	 * Play audio from agent
	 */
	async function playAudio(audioData: ArrayBuffer) {
		if (!audioContext) {
			console.warn('AudioContext not initialized');
			return;
		}

		// Resume audio context if suspended (browser autoplay policy)
		if (audioContext.state === 'suspended') {
			await audioContext.resume();
		}

		try {
			// Convert PCM16 to AudioBuffer
			const int16Array = new Int16Array(audioData);
			const float32Array = new Float32Array(int16Array.length);

			// Convert Int16 to Float32 (-1 to 1 range)
			for (let i = 0; i < int16Array.length; i++) {
				float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7fff);
			}

			// Create audio buffer
			const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
			audioBuffer.getChannelData(0).set(float32Array);

			// Create buffer source and play
			const source = audioContext.createBufferSource();
			source.buffer = audioBuffer;
			source.connect(audioContext.destination);
			source.start();

			console.log(`Playing audio chunk: ${audioData.byteLength} bytes`);
		} catch (err) {
			console.error('Audio playback error:', err);
		}
	}

	/**
	 * Clear transcript history
	 */
	function clearTranscripts() {
		transcripts = [];
	}

	/**
	 * Start editing a transcript
	 */
	function startEdit(id: string, currentText: string) {
		editingId = id;
		editText = currentText;
	}

	/**
	 * Save edited transcript
	 */
	function saveEdit(id: string) {
		transcripts = transcripts.map(t =>
			t.id === id ? { ...t, text: editText } : t
		);
		editingId = null;
		editText = '';
	}

	/**
	 * Cancel editing
	 */
	function cancelEdit() {
		editingId = null;
		editText = '';
	}

	/**
	 * Delete a transcript
	 */
	function deleteTranscript(id: string) {
		transcripts = transcripts.filter(t => t.id !== id);
	}

	/**
	 * Scroll transcript container to bottom
	 */
	function scrollToBottom() {
		setTimeout(() => {
			if (transcriptContainer) {
				transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
			}
		}, 100);
	}

	onDestroy(() => {
		pauseConversation();
	});
</script>

<div class="voice-agent-container">
	<div class="header">
		<h2>🩺 Script Doctor</h2>
		<p class="subtitle">Your AI script coach • Real talk, real results</p>
	</div>

	<!-- Listening indicator at top -->
	{#if isListening}
		<div class="listening-indicator">
			<div class="pulse-dot"></div>
			<span>AI is listening...</span>
		</div>
	{/if}

	<!-- Chat container at top -->
	<div class="transcript-container" bind:this={transcriptContainer}>
		{#if transcripts.length === 0}
			<div class="empty-state">
				<p>💬 No conversation yet. Click "Start Conversation" to begin!</p>
			</div>
		{:else}
			<div class="transcripts">
				{#each transcripts as transcript}
					<div class="transcript-item {transcript.speaker}" class:partial={!transcript.isFinal}>
						<div class="transcript-header">
							<div class="speaker-label">
								{transcript.speaker === 'user' ? '👤 You' : '🤖 AI'}
							</div>
							{#if transcript.speaker === 'user' && transcript.isFinal && editingId !== transcript.id}
								<div class="transcript-actions">
									<button onclick={() => startEdit(transcript.id, transcript.text)} class="action-btn" title="Edit">
										✏️
									</button>
									<button onclick={() => deleteTranscript(transcript.id)} class="action-btn" title="Delete">
										🗑️
									</button>
								</div>
							{/if}
						</div>

						{#if editingId === transcript.id}
							<div class="edit-container">
								<textarea
									bind:value={editText}
									class="edit-textarea"
									rows="3"
								></textarea>
								<div class="edit-actions">
									<button onclick={() => saveEdit(transcript.id)} class="btn-save">
										💾 Save
									</button>
									<button onclick={cancelEdit} class="btn-cancel">
										✖️ Cancel
									</button>
								</div>
							</div>
						{:else}
							<div class="transcript-text">
								{transcript.text}
								{#if !transcript.isFinal}
									<span class="typing-indicator">...</span>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Status and controls at bottom -->
	<div class="bottom-section">
		<div class="status">
			{#if error}
				<div class="status-error">❌ {error}</div>
			{:else if isReady}
				<div class="status-ready">✅ Connected • Mic is live</div>
			{:else if isConnected}
				<div class="status-connecting">🔄 Connecting...</div>
			{:else if transcripts.length > 0}
				<div class="status-paused">⏸️ Paused • Chat history saved</div>
			{:else}
				<div class="status-idle">Ready to start</div>
			{/if}
		</div>

		<div class="controls">
			{#if !isConnected}
				<button onclick={connect} class="btn btn-primary btn-large">
					{transcripts.length > 0 ? '🎤 Resume' : '🎤 Start Conversation'}
				</button>
			{:else}
				<button onclick={pauseConversation} class="btn btn-warning">
					⏸️ Pause
				</button>
			{/if}

			{#if transcripts.length > 0}
				<button onclick={endAndClear} class="btn btn-secondary">
					🗑️ New Chat
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.voice-agent-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 2.5rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
		display: flex;
		flex-direction: column;
		height: calc(100vh - 5rem);
	}

	.header {
		text-align: center;
		margin-bottom: 1.5rem;
		flex-shrink: 0;
	}

	.header h2 {
		margin: 0;
		font-size: 2.5rem;
		font-weight: 800;
		background: linear-gradient(135deg, #EE38CE 0%, #E3F452 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		letter-spacing: -1px;
	}

	.subtitle {
		margin: 0.75rem 0 0 0;
		color: #6b7280;
		font-size: 1rem;
		font-weight: 500;
	}

	.listening-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
		border-radius: 16px;
		margin-bottom: 1rem;
		font-weight: 700;
		color: #be185d;
		flex-shrink: 0;
		border: 2px solid #EE38CE;
	}

	.pulse-dot {
		width: 14px;
		height: 14px;
		background: #EE38CE;
		border-radius: 50%;
		animation: pulse-scale 1.5s ease-in-out infinite;
		box-shadow: 0 0 12px rgba(238, 56, 206, 0.6);
	}

	@keyframes pulse-scale {
		0%, 100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.3);
			opacity: 0.7;
		}
	}

	.bottom-section {
		flex-shrink: 0;
		margin-top: 1.5rem;
	}

	.controls {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.btn {
		padding: 0.875rem 2rem;
		font-size: 1rem;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		font-weight: 600;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}

	.btn-large {
		padding: 1.125rem 3rem;
		font-size: 1.125rem;
	}

	.btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
	}

	.btn:active {
		transform: translateY(0);
	}

	.btn-primary {
		background: linear-gradient(135deg, #EE38CE 0%, #d946a6 100%);
		color: white;
		border: 2px solid transparent;
	}

	.btn-primary:hover {
		background: linear-gradient(135deg, #d946a6 0%, #EE38CE 100%);
		border-color: #E3F452;
	}

	.btn-warning {
		background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
		color: white;
	}

	.btn-warning:hover {
		background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
	}

	.btn-secondary {
		background: #f3f4f6;
		color: #4b5563;
		border: 1px solid #e5e7eb;
	}

	.btn-secondary:hover {
		background: #e5e7eb;
	}

	.status {
		text-align: center;
		margin-bottom: 1rem;
		font-weight: 600;
		font-size: 0.95rem;
	}

	.status-ready {
		color: #84cc16;
		font-weight: 700;
	}

	.status-connecting {
		color: #EE38CE;
	}

	.status-error {
		color: #dc2626;
	}

	.status-idle {
		color: #9ca3af;
	}

	.status-paused {
		color: #f59e0b;
		font-weight: 700;
	}

	.transcript-container {
		background: #ffffff;
		border-radius: 16px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 10px 40px rgba(0, 0, 0, 0.03);
		padding: 2rem;
		overflow-y: auto;
		border: 1px solid #f3f4f6;
		flex: 1;
		min-height: 0;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #9ca3af;
		font-size: 1.05rem;
		font-weight: 400;
	}

	.transcripts {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.transcript-item {
		padding: 1.25rem;
		border-radius: 12px;
		transition: opacity 0.3s ease;
	}

	.transcript-item.user {
		background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
		border-left: 4px solid #EE38CE;
		margin-right: 3rem;
		box-shadow: 0 2px 8px rgba(238, 56, 206, 0.1);
	}

	.transcript-item.agent {
		background: linear-gradient(135deg, #f7fee7 0%, #ecfccb 100%);
		border-left: 4px solid #84cc16;
		margin-left: 3rem;
		box-shadow: 0 2px 8px rgba(132, 204, 22, 0.1);
	}

	.transcript-item.partial {
		opacity: 0.65;
	}

	.transcript-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.6rem;
	}

	.speaker-label {
		font-weight: 700;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.8px;
	}

	.transcript-actions {
		display: flex;
		gap: 0.5rem;
		opacity: 0;
		transition: opacity 0.2s;
	}

	.transcript-item:hover .transcript-actions {
		opacity: 1;
	}

	.action-btn {
		background: transparent;
		border: none;
		cursor: pointer;
		font-size: 1rem;
		padding: 0.25rem;
		opacity: 0.7;
		transition: all 0.2s;
	}

	.action-btn:hover {
		opacity: 1;
		transform: scale(1.2);
	}

	.edit-container {
		margin-top: 0.5rem;
	}

	.edit-textarea {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #EE38CE;
		border-radius: 8px;
		font-family: inherit;
		font-size: 1rem;
		resize: vertical;
		min-height: 80px;
	}

	.edit-textarea:focus {
		outline: none;
		border-color: #d946a6;
		box-shadow: 0 0 0 3px rgba(238, 56, 206, 0.1);
	}

	.edit-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.btn-save, .btn-cancel {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.btn-save {
		background: linear-gradient(135deg, #EE38CE 0%, #d946a6 100%);
		color: white;
	}

	.btn-save:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(238, 56, 206, 0.3);
	}

	.btn-cancel {
		background: #f3f4f6;
		color: #4b5563;
	}

	.btn-cancel:hover {
		background: #e5e7eb;
	}

	.transcript-item.user .speaker-label {
		color: #be185d;
	}

	.transcript-item.agent .speaker-label {
		color: #65a30d;
	}

	.transcript-text {
		color: #1f2937;
		line-height: 1.65;
		font-size: 1rem;
		font-weight: 400;
	}

	.typing-indicator {
		color: #9ca3af;
	}

	/* Scrollbar styling */
	.transcript-container::-webkit-scrollbar {
		width: 6px;
	}

	.transcript-container::-webkit-scrollbar-track {
		background: transparent;
	}

	.transcript-container::-webkit-scrollbar-thumb {
		background: #d1d5db;
		border-radius: 3px;
	}

	.transcript-container::-webkit-scrollbar-thumb:hover {
		background: #9ca3af;
	}
</style>

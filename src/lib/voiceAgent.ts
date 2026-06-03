/**
 * Voice Agent WebSocket Manager
 * Handles connection to AssemblyAI Voice Agent API
 */

const VOICE_AGENT_URL = 'wss://agents.assemblyai.com/v1/ws';
const SAMPLE_RATE = 24000; // 24kHz required for Voice Agent API

export interface VoiceAgentConfig {
	systemPrompt?: string;
	greeting?: string;
	voice?: string;
	onTranscript?: (text: string, isFinal: boolean, speaker: 'user' | 'agent') => void;
	onAudio?: (audioData: ArrayBuffer) => void;
	onError?: (error: string) => void;
	onReady?: () => void;
	onClose?: () => void;
	onListeningChange?: (isListening: boolean) => void;
}

export class VoiceAgent {
	private ws: WebSocket | null = null;
	private audioContext: AudioContext | null = null;
	private audioWorklet: AudioWorkletNode | null = null;
	private mediaStream: MediaStream | null = null;
	private config: VoiceAgentConfig;
	private sessionId: string | null = null;
	private isReady = false;

	constructor(config: VoiceAgentConfig = {}) {
		this.config = {
			systemPrompt: config.systemPrompt || 'You are a helpful AI assistant for content creators. Help them brainstorm ideas, provide feedback, and support their creative process.',
			greeting: config.greeting || 'Hey there! Ready to create something amazing together?',
			voice: config.voice || 'ivy',
			...config
		};
	}

	/**
	 * Connect to Voice Agent API
	 */
	async connect(token: string): Promise<void> {
		try {
			// Connect WebSocket with token
			this.ws = new WebSocket(`${VOICE_AGENT_URL}?token=${token}`);

			this.ws.onopen = () => {
				console.log('WebSocket connected');
				this.sendSessionUpdate();
			};

			this.ws.onmessage = (event) => {
				this.handleMessage(JSON.parse(event.data));
			};

			this.ws.onerror = (error) => {
				console.error('WebSocket error:', error);
				this.config.onError?.('Connection error');
			};

			this.ws.onclose = (event) => {
				console.log('WebSocket closed:', event.code, event.reason);
				this.cleanup();
				this.config.onClose?.();
			};
		} catch (error) {
			console.error('Connection failed:', error);
			this.config.onError?.('Failed to connect');
			throw error;
		}
	}

	/**
	 * Send session configuration
	 */
	private sendSessionUpdate(): void {
		if (!this.ws) return;

		const sessionConfig = {
			type: 'session.update',
			session: {
				system_prompt: this.config.systemPrompt,
				greeting: this.config.greeting,
				input: {
					format: { encoding: 'audio/pcm' },
					turn_detection: {
						vad_threshold: 0.4,
						min_silence: 100,
						max_silence: 600,
						interrupt_response: true
					}
				},
				output: {
					voice: this.config.voice,
					format: { encoding: 'audio/pcm' }
				}
			}
		};

		this.ws.send(JSON.stringify(sessionConfig));
	}

	/**
	 * Handle incoming WebSocket messages
	 */
	private handleMessage(message: any): void {
		switch (message.type) {
			case 'session.ready':
				console.log('Session ready:', message.session_id);
				this.sessionId = message.session_id;
				this.isReady = true;
				this.config.onReady?.();
				this.startAudioCapture();
				break;

			case 'input.speech.started':
				console.log('User started speaking');
				this.config.onListeningChange?.(true);
				break;

			case 'input.speech.stopped':
				console.log('User stopped speaking');
				this.config.onListeningChange?.(false);
				break;

			case 'transcript.user.delta':
				// Partial user transcript
				this.config.onTranscript?.(message.text, false, 'user');
				break;

			case 'transcript.user':
				// Final user transcript
				this.config.onTranscript?.(message.text, true, 'user');
				break;

			case 'reply.started':
				console.log('Agent started replying');
				break;

			case 'reply.audio':
				// Agent audio - note: it's in the 'data' field, not 'audio'
				if (message.data) {
					const audioData = this.base64ToArrayBuffer(message.data);
					this.config.onAudio?.(audioData);
				}
				break;

			case 'transcript.agent':
				// Agent transcript
				this.config.onTranscript?.(message.text, true, 'agent');
				break;

			case 'reply.done':
				console.log('Agent finished reply');
				if (message.status === 'interrupted') {
					// User interrupted - may need to flush audio buffer
					console.log('Reply was interrupted by user');
				}
				break;

			case 'error':
				console.error('Voice Agent error:', message);
				this.config.onError?.(message.message || 'Unknown error');
				break;

			default:
				console.log('Unhandled message type:', message.type);
		}
	}

	/**
	 * Start capturing microphone audio
	 */
	private async startAudioCapture(): Promise<void> {
		try {
			// Request microphone access
			this.mediaStream = await navigator.mediaDevices.getUserMedia({
				audio: {
					channelCount: 1,
					sampleRate: SAMPLE_RATE,
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true
				}
			});

			// Create audio context at 24kHz
			this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });

			// Load audio worklet
			await this.audioContext.audioWorklet.addModule('/audio-processor.js');

			// Create audio worklet node
			this.audioWorklet = new AudioWorkletNode(this.audioContext, 'audio-capture-processor');

			// Handle audio data from worklet
			this.audioWorklet.port.onmessage = (event) => {
				if (event.data.type === 'audio' && this.isReady) {
					this.sendAudio(event.data.data);
				}
			};

			// Connect microphone -> worklet
			const source = this.audioContext.createMediaStreamSource(this.mediaStream);
			source.connect(this.audioWorklet);
			this.audioWorklet.connect(this.audioContext.destination);

			console.log('Audio capture started');
		} catch (error) {
			console.error('Failed to start audio capture:', error);
			this.config.onError?.('Microphone access denied');
		}
	}

	/**
	 * Send audio data to Voice Agent API
	 */
	private sendAudio(audioData: ArrayBuffer): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isReady) {
			return;
		}

		const base64Audio = this.arrayBufferToBase64(audioData);
		const message = {
			type: 'input.audio',
			audio: base64Audio
		};

		this.ws.send(JSON.stringify(message));
	}

	/**
	 * Disconnect and cleanup
	 */
	disconnect(): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			// Send terminate message for graceful shutdown
			this.ws.send(JSON.stringify({ type: 'session.terminate' }));
		}
		this.cleanup();
	}

	/**
	 * Cleanup resources
	 */
	private cleanup(): void {
		this.isReady = false;

		if (this.audioWorklet) {
			this.audioWorklet.disconnect();
			this.audioWorklet = null;
		}

		if (this.audioContext) {
			this.audioContext.close();
			this.audioContext = null;
		}

		if (this.mediaStream) {
			this.mediaStream.getTracks().forEach((track) => track.stop());
			this.mediaStream = null;
		}

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	/**
	 * Utility: Convert ArrayBuffer to base64
	 */
	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.length; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}

	/**
	 * Utility: Convert base64 to ArrayBuffer
	 */
	private base64ToArrayBuffer(base64: string): ArrayBuffer {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes.buffer;
	}
}

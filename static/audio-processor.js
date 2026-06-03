/**
 * AudioWorklet processor for capturing browser microphone audio
 * Converts Float32 samples to PCM16 (Int16) at 24kHz for AssemblyAI Voice Agent API
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
	constructor() {
		super();
		this.bufferSize = 2400; // ~100ms at 24kHz (24000 * 0.1)
		this.buffer = new Float32Array(this.bufferSize);
		this.bufferIndex = 0;
	}

	/**
	 * Convert Float32 audio samples to Int16 PCM
	 */
	float32ToInt16(float32Array) {
		const int16Array = new Int16Array(float32Array.length);
		for (let i = 0; i < float32Array.length; i++) {
			// Clamp to [-1, 1] range and convert to 16-bit integer
			const clamped = Math.max(-1, Math.min(1, float32Array[i]));
			int16Array[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
		}
		return int16Array;
	}

	process(inputs, outputs, parameters) {
		const input = inputs[0];

		// If no input, continue processing
		if (!input || !input[0]) {
			return true;
		}

		const samples = input[0]; // Mono channel

		// Accumulate samples into buffer
		for (let i = 0; i < samples.length; i++) {
			this.buffer[this.bufferIndex++] = samples[i];

			// When buffer is full, convert and send
			if (this.bufferIndex >= this.bufferSize) {
				const chunk = new Float32Array(this.buffer);
				const pcm16 = this.float32ToInt16(chunk);

				// Send to main thread
				this.port.postMessage({
					type: 'audio',
					data: pcm16.buffer
				}, [pcm16.buffer]);

				// Reset buffer
				this.bufferIndex = 0;
				this.buffer = new Float32Array(this.bufferSize);
			}
		}

		return true; // Keep processor alive
	}
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);

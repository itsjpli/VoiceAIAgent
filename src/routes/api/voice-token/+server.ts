import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ASSEMBLYAI_API_KEY } from '$env/static/private';

export const GET: RequestHandler = async () => {
	const apiKey = ASSEMBLYAI_API_KEY;

	if (!apiKey) {
		return json({ error: 'API key not configured' }, { status: 500 });
	}

	try {
		// Mint a temporary token for browser use
		// expires_in_seconds: how long the token can be redeemed (1-600)
		// max_session_duration_seconds: caps the session length (60-10800, defaults to 3 hours)
		const response = await fetch(
			'https://agents.assemblyai.com/v1/token?expires_in_seconds=300&max_session_duration_seconds=3600',
			{
				headers: {
					Authorization: `Bearer ${apiKey}`
				}
			}
		);

		if (!response.ok) {
			const error = await response.text();
			console.error('Token minting failed:', error);
			return json({ error: 'Failed to mint token' }, { status: response.status });
		}

		const data = await response.json();
		return json({ token: data.token });
	} catch (error) {
		console.error('Token minting error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

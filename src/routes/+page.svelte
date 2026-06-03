<script lang="ts">
	import VoiceAgent from '$lib/components/VoiceAgent.svelte';
</script>

<svelte:head>
	<title>Script Doctor - AI Script Coach</title>
</svelte:head>

<main>
	<VoiceAgent />
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background: linear-gradient(135deg, #fdf4ff 0%, #fef9c3 50%, #f0fdf4 100%);
		min-height: 100vh;
	}

	main {
		padding: 2.5rem 1rem;
	}
</style>

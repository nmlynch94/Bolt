<script lang="ts">
	import DisclaimerModal from '$lib/Components/DisclaimerModal.svelte';
	import Launch from '$lib/Components/Launch.svelte';
	import LogView from '$lib/Components/LogView.svelte';
	import MainLayout from '$lib/Components/MainLayout.svelte';
	import TopBar from '$lib/Components/TopBar.svelte';
	import { BoltService } from '$lib/Services/BoltService';
	import { bolt } from '$lib/State/Bolt';
	import { logger } from '$lib/Util/Logger';

	const logs = logger.logs;
</script>

<svelte:window
	on:beforeunload={() => {
		BoltService.saveConfig();
		if (bolt.hasBoltPlugins) BoltService.savePluginConfig(true);
	}}
/>

<MainLayout>
	<DisclaimerModal />
	<TopBar></TopBar>
	<div class="mt-16 grid h-full grid-flow-col grid-cols-3">
		<div></div>
		<Launch></Launch>
		<div></div>
	</div>
	<LogView logs={$logs} />
</MainLayout>

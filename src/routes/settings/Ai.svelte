<script>
  import SettingsAgent from '../../components/settings/SettingsAgent.svelte';
  import { envLocks } from '../../stores/settings.js';
</script>

<SettingsAgent envLocks={$envLocks} />

<script>
  import { _ } from 'svelte-i18n';
  import Dialog from './Dialog.svelte';
  import { confirmRequest } from '../../stores/confirmDialog.js';

  let open = false;
  let current = null;

  $: if ($confirmRequest) {
    current = $confirmRequest;
    open = true;
  }

  function finish(result) {
    const req = current;
    open = false;
    current = null;
    confirmRequest.set(null);
    req?.resolve?.(result);
  }
</script>

{#if current}
  <Dialog
    bind:open
    title={current.titleKey ? $_(current.titleKey) : current.title}
    message={current.message}
    confirmText={current.confirmText}
    cancelText={current.cancelText}
    dangerous={current.dangerous}
    on:confirm={() => finish(true)}
    on:cancel={() => finish(false)}
  />
{/if}

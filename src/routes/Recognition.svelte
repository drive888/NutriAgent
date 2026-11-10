<script>
  import { _, locale } from 'svelte-i18n';
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { apiUrl, getAuthToken, isNative, resolveAssetUrl } from '../lib/platform.js';
  import { editorState, clearFoodEditorState } from '../stores/editorState.js';
  import { push } from 'svelte-spa-router';
  import ImageCropper from '../components/ui/ImageCropper.svelte';
  import Tabs from '../components/ui/Tabs.svelte';
  import { bannerStyle } from '../stores/settings.js';
  import { normalizeLabel, portionNutrition } from '../lib/recognition-contract.js';
  import { recognitionPrefill, recognitionImage } from '../lib/recognition-editor.js';
  export let embedded = false;
  export let initialImage = '';
  export let initialName = '';
  export let initialAmount = 100;
  export let initialUnit = 'g';
  const dispatch = createEventDispatcher();
  let fileInput;
  $: recognitionTabs = [{ label: $_('ui.m457d40f21907'), value: 'meal' }, { label: $_('ui.mc3d692275822'), value: 'label' }];
  let preparing = false, preparationController, destroyed = false, reviewName = '';
  let kind = 'meal', image = '', busy = false, result = null, error = '', selected = 0;
  let amount = 100, unit = 'g', basis = 'per100g', servingAmount = 30, servingUnit = 'g';
  let values = {}, preview = null, controller, cropping = false;
  const nutrients = ['calories', 'proteins', 'fat', 'carbohydrates', 'sodium'];
  onMount(async () => {
    if (!initialImage) return;
    preparing = true;
    preparationController = new AbortController();
    try {
      image = await recognitionImage(resolveAssetUrl(initialImage), { signal: preparationController.signal });
      if (destroyed) return;
      amount = Number(initialAmount) > 0 ? Number(initialAmount) : 100;
      unit = ['g', 'ml'].includes(initialUnit) ? initialUnit : 'g';
      await run();
    } catch (e) { if (!destroyed) error = $_('photo_recognition.photo_unavailable'); }
    finally { preparing = false; }
  });
  onDestroy(() => { destroyed = true; controller?.abort(); preparationController?.abort(); });
  function reset() { result = null; error = ''; preview = null; }
  async function rotate() {
    const img = new Image(); img.src = image; await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalHeight; canvas.height = img.naturalWidth;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0); ctx.rotate(Math.PI / 2); ctx.drawImage(img, 0, 0);
    image = canvas.toDataURL('image/jpeg', .92); reset();
  }
  async function choose(event) {
    reset(); image = '';
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 6 * 1024 * 1024) { error = $_('ui.ma12e6ceed5b7'); return; }
    try {
      image = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
    } catch { error = $_('ui.m5299691f889c'); }
  }
  async function run() {
    if (busy) return;
    reset(); busy = true; controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35000);
    try {
      const headers = { 'Accept-Language': $locale || 'en', 'Content-Type': 'application/json' };
      const csrf = localStorage.getItem('nt:csrf');
      if (csrf) headers['X-CSRF-Token'] = csrf;
      if (isNative && getAuthToken()) headers.Authorization = `Bearer ${getAuthToken()}`;
      const response = await fetch(apiUrl(`/api/recognition/${kind}`), { method: 'POST', headers, credentials: 'include', signal: controller.signal, body: JSON.stringify({ image }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      if (destroyed) return;
      result = data; selected = 0; reviewName = initialName || data.candidates?.[0]?.name || ''; 
      if (kind === 'label') { values = { ...data.nutrition }; basis = data.basis; servingAmount = data.serving?.amount || 30; servingUnit = data.serving?.unit || 'g'; unit = basis === 'per100ml' ? 'ml' : basis === 'perServing' ? servingUnit : 'g'; }
    } catch (e) { error = e.name === 'AbortError' ? $_('ui.m6251703007fd') : e.message; }
    finally { clearTimeout(timer); busy = false; }
  }
  function confirm() {
    error = ''; preview = null;
    try {
      if (kind === 'meal') {
        if (!(amount > 0) || !result.candidates[selected]) throw new Error($_('ui.m37fe6ef4eb35'));
        if (!reviewName.trim()) throw new Error($_('ui.m37fe6ef4eb35'));
        preview = { ...result.candidates[selected], name: reviewName.trim(), amount, unit, notice: $_('ui.m669c8ca201d6') };
      } else {
        const draft = normalizeLabel({ basis, serving: { amount: servingAmount, unit: servingUnit }, nutrients: Object.fromEntries(nutrients.map(k => [k, values[k] === '' || values[k] == null ? null : { value: values[k], unit: k === 'sodium' ? 'mg' : k === 'calories' ? 'kcal' : 'g' }])) });
        preview = { ...draft, portion: { amount, unit }, calculated: portionNutrition(draft, amount, unit) };
      }
    } catch (e) { error = e.message; }
  }
  function openEditor() {
    confirm();
    if (!preview) return;
    const prefill = recognitionPrefill({ kind, preview, name: result.name, image,
      notes: kind === 'label' ? $_('ui.m0bfe6bf97c5f', {values: {basis}}) : $_('ui.m69a7a11cce25') });
    if (embedded) { dispatch('review', prefill); return; }
    clearFoodEditorState();
    editorState.foodPrefill = prefill;
    push('/foods/edit');
  }
</script>

<div class="recognition-page" class:page-shell={!embedded} class:embedded>
  {#if !embedded}
    <header class="page-header recognition-header"
      class:banner-gradient={$bannerStyle === 'gradient'} class:banner-animated={$bannerStyle === 'animated'}>
      <button class="btn-icon" on:click={() => push('/foods')} aria-label={$_('common.back')} title={$_('common.back')}>
        <span class="material-symbols-rounded" aria-hidden="true">arrow_back</span>
      </button>
      <h1>{$_('photo_recognition.shortcut')}</h1>
    </header>
  {/if}

  <main class="recognition-content">
    <p class="draft-notice"><span class="material-symbols-rounded" aria-hidden="true">info</span>{$_('photo_recognition.draft_notice')}</p>
    <div class="recognition-grid">
      <section class="card photo-card" aria-label={$_('ui.md84eebada93e')}>
        <div class="card-heading"><span class="material-symbols-rounded" aria-hidden="true">photo_camera</span><h2>{$_('ui.md84eebada93e')}</h2></div>
        {#if preparing && !image}
          <div class="photo-empty" role="status"><span class="material-symbols-rounded" aria-hidden="true">hourglass_top</span><p>{$_('photo_recognition.preparing')}</p></div>
        {:else if image}
          <div class="photo-preview"><img class="preview" src={image} alt={$_('ui.m2fa02c701b1c')} /></div>
          <div class="photo-tools">
            <button class="btn btn-secondary" disabled={busy} on:click={rotate}><span class="material-symbols-rounded" aria-hidden="true">rotate_right</span>{$_('ui.mbe08c187f217')}</button>
            <button class="btn btn-secondary" disabled={busy} on:click={() => cropping = true}><span class="material-symbols-rounded" aria-hidden="true">crop</span>{$_('ui.mf22f63959193')}</button>
          </div>
        {:else if !embedded}
          <button class="photo-empty photo-picker" on:click={() => fileInput?.click()} disabled={busy}>
            <span class="material-symbols-rounded" aria-hidden="true">add_photo_alternate</span>
            <strong>{$_('photo_recognition.empty_title')}</strong>
            <span>{$_('photo_recognition.empty_hint')}</span>
          </button>
        {/if}
        {#if !embedded}
          <button class="btn btn-secondary choose-photo" on:click={() => fileInput?.click()} disabled={busy}>
            <span class="material-symbols-rounded" aria-hidden="true">photo_library</span>{$_(image ? 'photo_recognition.replace_photo' : 'photo_recognition.choose_photo')}
          </button>
          <p class="photo-hint">{$_('photo_recognition.photo_hint')}</p>
          <input hidden bind:this={fileInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label={$_('photo_recognition.choose_photo')} on:change={choose} disabled={busy} />
        {/if}
      </section>

      <div class="workflow-column">
        <section class="card workflow-card">
          <div class="card-heading"><span class="material-symbols-rounded" aria-hidden="true">document_scanner</span><h2>{$_('ui.m2b2eda4874aa')}</h2></div>
          <fieldset class="mode-switch" disabled={busy || preparing}>
            <legend class="sr-only">{$_('ui.m2b2eda4874aa')}</legend>
            <Tabs tabs={recognitionTabs} active={kind === 'meal' ? 0 : 1} on:change={e => { kind = e.detail.value; reset(); }} />
          </fieldset>
          <p class="mode-hint">{$_(kind === 'meal' ? 'photo_recognition.meal_hint' : 'photo_recognition.label_hint')}</p>
          <button class="btn btn-primary primary-action" on:click={run} disabled={!image || busy || preparing}>
            <span class="material-symbols-rounded" aria-hidden="true">{busy ? 'hourglass_top' : 'document_scanner'}</span>{busy ? $_('ui.mda936f5280a5') : $_('ui.m51d04e76a316')}
          </button>
        </section>

        {#if error}<p class="feedback" role="alert"><span class="material-symbols-rounded" aria-hidden="true">error_outline</span>{error}</p>{/if}
        {#if result}
          <section class="card workflow-card">
            <div class="card-heading"><span class="material-symbols-rounded" aria-hidden="true">fact_check</span><h2>{$_('ui.me9637f141096')}</h2></div>
            <p class="result-meta">{$_(result.mode === 'mock' ? 'recognition_page.mock' : 'recognition_page.service')} · {result.elapsedMs} {$_('ui.mf785c3ce1d58')}</p>
            {#if result.mode === 'mock'}<p class="feedback" role="alert">{$_('ui.md983bd2be8fc')}</p>{/if}
            <div class="review-form">
              {#if kind === 'meal'}
                {#if !result.candidates.length}<p class="mode-hint">{$_('ui.m82ac5e6023cd')}</p>{:else}
                  <label class="form-group"><span class="form-label">{$_('ui.mb2452d1eba32')}</span><span class="select-wrap"><select class="select" bind:value={selected} on:change={() => { reviewName = result.candidates[selected].name; preview = null; }}>{#each result.candidates as c, i}<option value={i}>{c.name}</option>{/each}</select></span></label>
                  <label class="form-group"><span class="form-label">{$_('ui.m731917c34804')}</span><input class="input" bind:value={reviewName} /></label>
                {/if}
              {:else}
                <label class="form-group"><span class="form-label">{$_('ui.ma7b4431c5855')}</span><span class="select-wrap"><select class="select" bind:value={basis}><option value="per100g">{$_('ui.m96950f42745f')}</option><option value="per100ml">{$_('ui.m7bf13e4e9424')}</option><option value="perServing">{$_('ui.m4f4d23fd2ce2')}</option></select></span></label>
                {#if basis === 'perServing'}
                  <div class="field-pair">
                    <label class="form-group"><span class="form-label">{$_('ui.m2c14c3dd9524')}</span><input class="input" type="number" min="0.001" step="any" bind:value={servingAmount} /></label>
                    <label class="form-group"><span class="form-label">{$_('ui.m14906dff8b5d')}</span><span class="select-wrap"><select class="select" bind:value={servingUnit}><option>g</option><option>ml</option></select></span></label>
                  </div>
                {/if}
                {#each nutrients as key}
                  <label class="form-group"><span class="form-label">{$_(({calories: 'ui.m42b7dd56746d', proteins: 'ui.m92a31f1de3df', fat: 'ui.mddcdda5ac2be', carbohydrates: 'ui.m3c333a5e3785', sodium: 'ui.mcbd06db64d87'})[key])} ({key === 'calories' ? 'kcal' : key === 'sodium' ? $_('ui.me9949d904d43') : 'g'})</span><input class="input" type="number" min="0" step="any" bind:value={values[key]} />{#if values[key] == null || values[key] === ''}<span class="field-hint">{$_('ui.m50dff9b46040')}</span>{/if}</label>
                {/each}
              {/if}
              <div class="field-pair">
                <label class="form-group"><span class="form-label">{$_('ui.m5432d8f0d4f3')}</span><input class="input" type="number" min="0.001" step="any" bind:value={amount} /></label>
                <label class="form-group"><span class="form-label">{$_('ui.m15e0ad5e53d0')}</span><span class="select-wrap"><select class="select" bind:value={unit}><option>g</option><option>ml</option></select></span></label>
              </div>
              <button class="btn btn-secondary primary-action" on:click={confirm} disabled={kind === 'meal' && !result.candidates.length}>{$_('ui.m92ffde388be0')}</button>
            </div>
          </section>
          {#if preview}
            <section class="card workflow-card confirmed-card">
              <div class="card-heading"><span class="material-symbols-rounded" aria-hidden="true">task_alt</span><h2>{$_('ui.m294c8d80910b')}</h2></div>
              <dl class="review-details">
                {#if kind === 'meal'}
                  <dt>{$_('recognition_page.food_name')}</dt><dd>{preview.name}</dd>
                  <dt>{$_('recognition_page.portion')}</dt><dd>{amount} {unit}</dd>
                {:else}
                  <dt>{$_('recognition_page.portion')}</dt><dd>{amount} {unit}</dd>
                  {#each nutrients as key}
                    <dt>{$_(({calories: 'ui.m42b7dd56746d', proteins: 'ui.m92a31f1de3df', fat: 'ui.mddcdda5ac2be', carbohydrates: 'ui.m3c333a5e3785', sodium: 'ui.mcbd06db64d87'})[key])}</dt>
                    <dd>{preview.calculated[key] == null ? $_('recognition_page.unknown') : preview.calculated[key]} {preview.calculated[key] == null ? '' : key === 'sodium' ? 'mg' : key === 'calories' ? 'kcal' : 'g'}</dd>
                  {/each}
                {/if}
              </dl>
              {#if kind === 'meal'}<p class="mode-hint">{preview.notice}</p>{/if}
              <button class="btn btn-primary primary-action" on:click={openEditor}>{$_(embedded ? 'photo_recognition.apply' : 'ui.m2655387a8bf4')}</button>
            </section>
          {/if}
        {/if}
      </div>
    </div>
  </main>
</div>
{#if cropping}<ImageCropper src={image} outputSize={1200} on:cancel={() => cropping = false} on:confirm={e => { image = e.detail.dataUrl; cropping = false; reset(); }} />{/if}

<style>
  .recognition-header { justify-content: flex-start; gap: var(--space-3); }
  .recognition-content { width: 100%; max-width: 1120px; margin: 0 auto; padding: var(--space-6) var(--page-px) var(--space-8); }
  .draft-notice { display: flex; align-items: flex-start; gap: var(--space-2); color: var(--text-2); font-size: 13px; margin-bottom: var(--space-5); }
  .draft-notice > .material-symbols-rounded { font-size: 20px; color: var(--accent); flex-shrink: 0; }
  .recognition-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: var(--space-5); align-items: start; }
  .workflow-column { display: flex; flex-direction: column; gap: var(--space-5); min-width: 0; }
  .photo-card, .workflow-card { padding: var(--space-5); min-width: 0; }
  .card:hover { transform: none; box-shadow: none; }
  .card-heading { display: flex; gap: var(--space-2); align-items: center; margin-bottom: var(--space-4); }
  .card-heading > .material-symbols-rounded { color: var(--accent); font-size: 22px; flex-shrink: 0; }
  .card-heading h2 { font-size: 16px; font-weight: 700; line-height: 1.4; }
  .photo-empty { width: 100%; min-height: 280px; padding: var(--space-6); display: flex; flex-direction: column; justify-content: center; align-items: center; gap: var(--space-3); border: 2px dashed var(--border-strong); border-radius: var(--radius-md); background: var(--surface-2); color: var(--text-2); text-align: center; }
  .photo-empty > .material-symbols-rounded { font-size: 48px; color: var(--accent); }
  .photo-empty strong { color: var(--text-1); font-size: 16px; }
  .photo-empty > span:last-child { max-width: 280px; font-size: 13px; line-height: 1.6; }
  .photo-picker:hover { border-color: var(--accent); background: var(--accent-dim); }
  .photo-preview { display: flex; align-items: center; justify-content: center; min-height: 240px; background: var(--surface-2); border-radius: var(--radius-md); overflow: hidden; }
  .preview { display: block; width: 100%; max-height: 420px; object-fit: contain; }
  .photo-tools { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-3); }
  .photo-tools .btn { flex: 1; height: auto; min-height: 44px; padding: var(--space-2); white-space: normal; font-size: 13px; }
  .choose-photo { width: 100%; margin-top: var(--space-4); }
  .photo-hint { margin-top: var(--space-2); text-align: center; color: var(--text-2); font-size: 12px; }
  .mode-switch { border: 0; padding: 0; min-width: 0; }
  .mode-switch:disabled { opacity: .6; }
  .mode-hint { margin: var(--space-3) 0 var(--space-4); color: var(--text-2); font-size: 13px; line-height: 1.6; }
  .primary-action { width: 100%; height: auto; min-height: 44px; padding: var(--space-3); white-space: normal; }
  .result-meta { color: var(--text-3); font-size: 12px; margin-bottom: var(--space-4); }
  .review-form { display: flex; flex-direction: column; gap: var(--space-4); }
  .form-group { min-width: 0; }
  .field-pair { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--space-3); }
  .field-hint { color: var(--text-3); font-size: 12px; }
  .feedback { display: flex; gap: var(--space-2); padding: var(--space-4); border: 1px solid var(--border-strong); border-radius: var(--radius-md); color: var(--text-1); background: var(--surface-2); font-size: 13px; overflow-wrap: anywhere; }
  .feedback > .material-symbols-rounded { flex-shrink: 0; color: var(--danger); }
  .confirmed-card { border-color: var(--accent); }
  .review-details { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--space-2) var(--space-4); margin-bottom: var(--space-4); font-size: 13px; }
  .review-details dt { color: var(--text-2); }
  .review-details dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
  .embedded .recognition-content { padding: 0 0 var(--space-4); }
  .embedded .recognition-grid { grid-template-columns: minmax(0, 1fr); }
  .embedded .preview { max-height: 260px; }
  @media (max-width: 767px) {
    .recognition-content { padding-top: var(--space-4); }
    .recognition-grid { grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
    .workflow-column { gap: var(--space-4); }
    .photo-empty { min-height: 220px; }
    .photo-card, .workflow-card { padding: var(--space-4); }
    .preview { max-height: 320px; }
  }
</style>

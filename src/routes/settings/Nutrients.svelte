<script>
  import { _ } from 'svelte-i18n';
  import Toggle from '../../components/settings/Toggle.svelte';
  import Sheet from '../../components/ui/Sheet.svelte';
  import { DB } from '../../lib/db.js';
  import { NUTRIMENTS } from '../../lib/nutrition.js';
  import {
    visibleNutriments, nutrimentsOrder, customNutriments,
  } from '../../stores/settings.js';

  // ── Custom nutrients ─────────────────────────────────────────────────────
  let showNutrientSheet = false;
  let newNutrient = { id: '', label: '', unit: 'g' };

  function addCustomNutrient() {
    if (!newNutrient.label.trim()) return;
    const id = 'custom_' + newNutrient.label.toLowerCase().replace(/\s+/g,'_');
    const existing = DB.getSetting('customNutriments', []);
    if (!existing.find(n => n.id === id)) {
      customNutriments.set([...existing, { ...newNutrient, id }]);
    }
    newNutrient = { id:'', label:'', unit:'g' };
    showNutrientSheet = false;
  }
  function removeCustomNutrient(id) {
    const existing = DB.getSetting('customNutriments', []);
    customNutriments.set(existing.filter(n => n.id !== id));
  }

  // ── Nutrient ordering ───────────────────────────────────────────────────
  $: orderedNutriments = (() => {
    const order = $nutrimentsOrder || [];
    if (!order.length) return NUTRIMENTS;
    const map = new Map(NUTRIMENTS.map(n => [n.id, n]));
    const sorted = order.map(id => map.get(id)).filter(Boolean);
    const rest   = NUTRIMENTS.filter(n => !order.includes(n.id));
    return [...sorted, ...rest];
  })();

  // Drag-to-reorder for nutrients
  let nutDragFrom = null, nutDragOver = null, nutDragDelta = 0, nutRowHeights = [];
  function onNutDragDown(e, i) {
    const list = e.currentTarget.closest('.drag-list');
    const rows = [...list.querySelectorAll('.drag-row')];
    nutRowHeights = rows.map(r => r.getBoundingClientRect().height);
    nutDragFrom = i; nutDragOver = i; nutDragDelta = 0;
    list.setPointerCapture(e.pointerId);
    list._dragStartY = e.clientY;
  }
  function onNutDragMove(e) {
    if (nutDragFrom === null) return;
    nutDragDelta = e.clientY - e.currentTarget._dragStartY;
    const rows = [...e.currentTarget.querySelectorAll('.drag-row')];
    const y = e.clientY;
    let best = nutDragOver;
    for (let idx = 0; idx < rows.length; idx++) {
      if (idx === nutDragFrom) continue;
      const r = rows[idx].getBoundingClientRect();
      if (y >= r.top && y <= r.bottom) { best = idx; break; }
    }
    nutDragOver = best;
  }
  function onNutDragUp() {
    if (nutDragFrom !== null && nutDragOver !== null && nutDragFrom !== nutDragOver) {
      const order = ($nutrimentsOrder && $nutrimentsOrder.length)
        ? [...$nutrimentsOrder] : orderedNutriments.map(n => n.id);
      const [removed] = order.splice(nutDragFrom, 1);
      order.splice(nutDragOver, 0, removed);
      nutrimentsOrder.set(order);
    }
    nutDragFrom = null; nutDragOver = null; nutDragDelta = 0; nutRowHeights = [];
  }

  // ── Nutrient visibility ─────────────────────────────────────────────────
  function toggleNutrientVisible(id) {
    let vis = DB.getSetting('visibleNutriments', null);
    if (!vis) vis = NUTRIMENTS.filter(n => n.default).map(n => n.id);
    if (vis.includes(id)) {
      visibleNutriments.set(vis.filter(v => v !== id));
    } else {
      visibleNutriments.set([...vis, id]);
    }
  }
  function isNutrientVisible(id) {
    const vis = $visibleNutriments;
    if (!vis) return NUTRIMENTS.find(n => n.id === id)?.default ?? false;
    return vis.includes(id);
  }

  function dragShift(i, from, over, heights) {
    if (from === null || over === null || i === from || from === over) return 0;
    const h = heights[from] || 52;
    if (from < over && i > from && i <= over) return -h;
    if (from > over && i >= over && i < from) return h;
    return 0;
  }
</script>

<div class="section-body">

  <!-- Group: Visible Nutrients -->
  <p class="settings-group-heading">{$_('ui.m19ba2d2a1817')}</p>
  <p class="settings-group-sub">{$_('ui.mb4bf7fbce9ac')}</p>
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="card settings-card drag-list"
    on:pointermove={onNutDragMove}
    on:pointerup={onNutDragUp}
    on:pointercancel={onNutDragUp}>
    {#each orderedNutriments as n, i}
      {#if i > 0}<div class="setting-divider"></div>{/if}
      <div class="setting-row drag-row"
        class:dragging={nutDragFrom === i}
        class:drag-target={nutDragFrom !== null && nutDragFrom !== i && nutDragOver === i}
        style={nutDragFrom !== null
          ? nutDragFrom === i
            ? `transform:scale(1.04) translateY(${nutDragDelta}px);transition:box-shadow 200ms ease,opacity 200ms ease`
            : `transform:translateY(${dragShift(i,nutDragFrom,nutDragOver,nutRowHeights)}px)`
          : ''}>
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span class="drag-handle material-symbols-rounded" on:pointerdown={e => onNutDragDown(e, i)}>drag_indicator</span>
        <span class="setting-label">{n.labelKey ? $_(n.labelKey) : n.label} <span class="text-3 text-sm">({n.unit})</span></span>
        <Toggle checked={isNutrientVisible(n.id)} on:change={() => toggleNutrientVisible(n.id)} />
      </div>
    {/each}
  </div>

  <!-- Group: Custom Nutrients -->
  <p class="settings-group-heading">{$_('settings_stats.custom_nutrients')}</p>
  <p class="settings-group-sub">{$_('ui.m15851cbca63e')}</p>
  <div class="card settings-card">
    {#each ($customNutriments || []) as cn, i}
      {#if i > 0}<div class="setting-divider"></div>{/if}
      <div class="setting-row">
        <span class="setting-label">{cn.labelKey ? $_(cn.labelKey) : cn.label} ({cn.unit})</span>
        <button class="btn-icon" style="width:32px;height:32px;color:var(--danger)"
          on:click={() => removeCustomNutrient(cn.id)} title={$_('ui.m2d05391183f8')}>
          <span class="material-symbols-rounded" style="font-size:18px">delete</span>
        </button>
      </div>
    {/each}
    {#if ($customNutriments || []).length === 0}
      <div class="setting-row"><span class="text-3 text-sm">{$_('settings_stats.no_custom_nutrients')}</span></div>
      <div class="setting-divider"></div>
    {/if}
    <div style="padding:8px 16px 14px">
      <button class="btn btn-secondary" style="height:36px;font-size:13px"
        on:click={() => showNutrientSheet = true}>
        <span class="material-symbols-rounded" style="font-size:18px">add</span>
        {$_('ui.m5de4a51bc2c0')}
      </button>
    </div>
  </div>
</div>

<!-- Custom nutrient sheet -->
<Sheet bind:open={showNutrientSheet} title={$_('ui.mf16cd544154c')}>
  <div style="display:flex;flex-direction:column;gap:16px;padding-top:8px">
    <div class="form-group">
      <label class="form-label" for="cn-label">{$_('settings_custom_nutrient.name')}</label>
      <input id="cn-label" class="input" placeholder={$_('ui.mc69126d564ba')} bind:value={newNutrient.label} />
    </div>
    <div class="form-group">
      <label class="form-label" for="cn-unit">{$_('ui.m4e545960f1bf')}</label>
      <div class="select-wrap">
        <select id="cn-unit" class="select" bind:value={newNutrient.unit}>
          <option value="g">g</option>
          <option value="mg">{$_('ui.me9949d904d43')}</option>
          <option value="mcg">{$_('ui.mc1b046d0ec1c')}</option>
          <option value="IU">IU</option>
          <option value="kcal">kcal</option>
          <option value="kJ">{$_('ui.m39e575dcf28e')}</option>
          <option value="%">%</option>
        </select>
      </div>
    </div>
    <button class="btn btn-primary w-full" on:click={addCustomNutrient}>{$_('settings_custom_nutrient.add')}</button>
  </div>
</Sheet>

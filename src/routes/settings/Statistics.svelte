<script>
  import { _ } from 'svelte-i18n';
  import Toggle from '../../components/settings/Toggle.svelte';
  import { DB } from '../../lib/db.js';
  import { NUTRIMENTS } from '../../lib/nutrition.js';
  import { scheduleSave } from '../../stores/settings.js';
  import {
    statsMetricOrder, statsHiddenMetrics, wellnessMetrics,
    waterShowInStats, fitbitFamilyEnabled, garminEnabled, withingsEnabled,
    hiddenBodyStats,
  } from '../../stores/settings.js';

  function set(key, value) { DB.setSetting(key, value); scheduleSave(key, value); }

  let statsChartType = DB.getSetting('statsChartType', 'bar');
  let statsYZero     = DB.getSetting('statsYZero',     true);
  let statsIncludeTodayLocal = DB.getSetting('statsIncludeToday', false);
  let statsShowEmptyDaysLocal = DB.getSetting('statsShowEmptyDays', true);
  let statsAvgLine   = DB.getSetting('statsAvgLine',   true);
  let statsGoalLine  = DB.getSetting('statsGoalLine',  true);
  let statsTrendLine = DB.getSetting('statsTrendLine', true);

  $: set('statsChartType', statsChartType);
  $: set('statsYZero',     statsYZero);
  $: set('statsAvgLine',   statsAvgLine);
  $: set('statsGoalLine',  statsGoalLine);
  $: set('statsTrendLine', statsTrendLine);

  // Mirror the metric-list derivation from Statistics.svelte so this panel
  // reflects exactly what the Statistics page can render. Duplicated on
  // purpose — the wellness gating depends on connected sources, and pulling
  // the list from Statistics.svelte would require it to be mounted.
  function _wlVisibleForStats(apiField) {
    return $wellnessMetrics == null || $wellnessMetrics.includes(apiField);
  }
  $: _statsAvailableMetrics = (() => {
    const nut = NUTRIMENTS.filter(n => n.default).map(n => ({
      key: n.id, label: n.label, labelKey: n.labelKey, group: 'nutrient',
    }));
    const bodyAll = [
      { key:'weight', label:'Weight', labelKey: 'ui.m81d27ef6d503' }, { key:'neck', label:'Neck', labelKey: 'ui.m6b27a97151bb' }, { key:'waist', label:'Waist', labelKey: 'ui.m8470df662662' },
      { key:'hips', label:'Hips', labelKey: 'ui.mb004098c1134' }, { key:'chest', label:'Chest', labelKey: 'ui.m378d83808237' }, { key:'thighs', label:'Thighs', labelKey: 'ui.mcc3653998568' },
      { key:'biceps', label:'Biceps', labelKey: 'ui.m49f08df6459e' }, { key:'calves', label:'Calves', labelKey: 'ui.mb94a4523f488' },
      { key:'body_fat', label:'Body Fat %', labelKey: 'ui.m9c0e4652a292' }, { key:'body_water', label:'Body Water %', labelKey: 'ui.m6f5bd2d9d24b' },
    ].filter(b => !($hiddenBodyStats||[]).includes(b.key)).map(b => ({ ...b, group: 'body' }));
    const water = ($waterShowInStats ?? DB.getSetting('waterShowInStats', true))
      ? [{ key: 'water', label: 'Water', labelKey: 'ui.m7ca7dea90680', group: 'water' }]
      : [];
    const hasWellness = $fitbitFamilyEnabled || $garminEnabled;
    const wellness = [
      ...(hasWellness ? [
        ...(_wlVisibleForStats('steps')             ? [{ key:'wl_steps',  label:'Steps', labelKey: 'ui.m1de3df70ddf4' }] : []),
        ...(_wlVisibleForStats('active_minutes')    ? [{ key:'wl_active', label:'Active Minutes', labelKey: 'ui.m871b8584530e' }] : []),
        ...(_wlVisibleForStats('sleep_duration_min')? [{ key:'wl_sleep',  label:'Sleep', labelKey: 'ui.md466bcf52eb6' }] : []),
        ...(_wlVisibleForStats('resting_hr')        ? [{ key:'wl_rhr',    label:'Resting HR', labelKey: 'ui.m4ed409fa03f5' }] : []),
        ...(_wlVisibleForStats('hrv_daily_rmssd')   ? [{ key:'wl_hrv',    label:'HRV', labelKey: 'ui.maf6c7c3df3fc' }] : []),
        ...(_wlVisibleForStats('spo2_avg')          ? [{ key:'wl_spo2',   label:'SpO2', labelKey: 'ui.mfb0a260fbed1' }] : []),
      ] : []),
      ...(($withingsEnabled || $fitbitFamilyEnabled) && _wlVisibleForStats('muscle_mass_kg')
        ? [{ key:'wl_muscle', label:'Muscle Mass', labelKey: 'ui.mde6012251ab0' }] : []),
    ].map(w => ({ ...w, group: 'wellness' }));
    return [...nut, ...bodyAll, ...water, ...wellness];
  })();
  $: orderedStatsMetrics = (() => {
    const order = $statsMetricOrder || [];
    if (!order.length) return _statsAvailableMetrics;
    const byKey = new Map(_statsAvailableMetrics.map(m => [m.key, m]));
    const sorted = order.map(k => byKey.get(k)).filter(Boolean);
    const rest = _statsAvailableMetrics.filter(m => !order.includes(m.key));
    return [...sorted, ...rest];
  })();
  function isStatsMetricVisible(key) {
    return !($statsHiddenMetrics || []).includes(key);
  }
  function toggleStatsMetricVisible(key) {
    const hidden = DB.getSetting('statsHiddenMetrics', []);
    if (hidden.includes(key)) {
      statsHiddenMetrics.set(hidden.filter(h => h !== key));
    } else {
      statsHiddenMetrics.set([...hidden, key]);
    }
  }
  let smDragFrom = null, smDragOver = null, smDragDelta = 0, smRowHeights = [];
  function onSMDragDown(e, i) {
    const list = e.currentTarget.closest('.drag-list');
    const rows = [...list.querySelectorAll('.drag-row')];
    smRowHeights = rows.map(r => r.getBoundingClientRect().height);
    smDragFrom = i; smDragOver = i; smDragDelta = 0;
    list.setPointerCapture(e.pointerId);
    list._dragStartY = e.clientY;
  }
  function onSMDragMove(e) {
    if (smDragFrom === null) return;
    smDragDelta = e.clientY - e.currentTarget._dragStartY;
    const rows = [...e.currentTarget.querySelectorAll('.drag-row')];
    const y = e.clientY;
    let best = smDragOver;
    for (let idx = 0; idx < rows.length; idx++) {
      if (idx === smDragFrom) continue;
      const r = rows[idx].getBoundingClientRect();
      if (y >= r.top && y <= r.bottom) { best = idx; break; }
    }
    smDragOver = best;
  }
  function onSMDragUp() {
    if (smDragFrom !== null && smDragOver !== null && smDragFrom !== smDragOver) {
      const order = ($statsMetricOrder && $statsMetricOrder.length)
        ? [...$statsMetricOrder] : orderedStatsMetrics.map(m => m.key);
      const [removed] = order.splice(smDragFrom, 1);
      order.splice(smDragOver, 0, removed);
      statsMetricOrder.set(order);
    }
    smDragFrom = null; smDragOver = null; smDragDelta = 0; smRowHeights = [];
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

  <!-- Group: Chart Options -->
  <p class="settings-group-heading">{$_('ui.mda3af4936b50')}</p>
  <p class="settings-group-sub">{$_('ui.m3ee8f99ec0af')}</p>
  <div class="card settings-card">
    <div class="setting-row">
      <span class="setting-label">{$_('settings_stats.default_chart')}</span>
      <div class="select-wrap" style="width:110px">
        <select class="select sel-sm" bind:value={statsChartType}>
          <option value="bar">{$_('ui.m95d64cacce0f')}</option>
          <option value="line">{$_('ui.md7852cd0d245')}</option>
        </select>
      </div>
    </div>
    <div class="setting-divider"></div>
    <div class="setting-row">
      <div><span class="setting-label">{$_('ui.m25721d10c6fd')}</span><div class="setting-desc">{$_('ui.m41d25ef80493')}</div></div>
      <Toggle checked={statsYZero} on:change={e => { statsYZero = e.detail; set('statsYZero', e.detail); }} />
    </div>
    <div class="setting-divider"></div>
    <div class="setting-row"><span class="setting-label">{$_('settings_stats.show_average_line')}</span><Toggle checked={statsAvgLine} on:change={e => { statsAvgLine = e.detail; set('statsAvgLine', e.detail); }} /></div>
    <div class="setting-divider"></div>
    <div class="setting-row"><span class="setting-label">{$_('settings_stats.show_goal_line')}</span><Toggle checked={statsGoalLine} on:change={e => { statsGoalLine = e.detail; set('statsGoalLine', e.detail); }} /></div>
    <div class="setting-divider"></div>
    <div class="setting-row"><span class="setting-label">{$_('settings_stats.show_trend_line')}</span><Toggle checked={statsTrendLine} on:change={e => { statsTrendLine = e.detail; set('statsTrendLine', e.detail); }} /></div>
    <div class="setting-divider"></div>
    <div class="setting-row">
      <div>
        <span class="setting-label">{$_('settings_stats.include_today')}</span>
        <div class="setting-desc">{$_('ui.md3f6de33d4db')}</div>
      </div>
      <Toggle checked={statsIncludeTodayLocal} on:change={e => { statsIncludeTodayLocal = e.detail; set('statsIncludeToday', e.detail); }} />
    </div>
    <div class="setting-divider"></div>
    <div class="setting-row">
      <div>
        <span class="setting-label">{$_('settings_stats.show_empty_days')}</span>
        <div class="setting-desc">{$_('ui.m599e97e0eba6')}</div>
      </div>
      <Toggle checked={statsShowEmptyDaysLocal} on:change={e => { statsShowEmptyDaysLocal = e.detail; set('statsShowEmptyDays', e.detail); }} />
    </div>
  </div>

  <!-- Group: Categories -->
  <p class="settings-group-heading">{$_('settings.statistics.categories') || 'Categories'}</p>
  <p class="settings-group-sub">{$_('settings.statistics.categories_help') || 'Drag to reorder the metric chips on the Statistics page. Toggle off any category you never look at.'}</p>
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="card settings-card drag-list"
    on:pointermove={onSMDragMove}
    on:pointerup={onSMDragUp}
    on:pointercancel={onSMDragUp}>
    {#each orderedStatsMetrics as m, i (m.key)}
      {#if i > 0}<div class="setting-divider"></div>{/if}
      <div class="setting-row drag-row"
        class:dragging={smDragFrom === i}
        class:drag-target={smDragFrom !== null && smDragFrom !== i && smDragOver === i}
        style={smDragFrom !== null
          ? smDragFrom === i
            ? `transform:scale(1.04) translateY(${smDragDelta}px);transition:box-shadow 200ms ease,opacity 200ms ease`
            : `transform:translateY(${dragShift(i,smDragFrom,smDragOver,smRowHeights)}px)`
          : ''}>
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span class="drag-handle material-symbols-rounded" on:pointerdown={e => onSMDragDown(e, i)}>drag_indicator</span>
        <span class="setting-label">{m.labelKey ? $_(m.labelKey) : m.label}</span>
        <Toggle checked={isStatsMetricVisible(m.key)} on:change={() => toggleStatsMetricVisible(m.key)} />
      </div>
    {/each}
    {#if orderedStatsMetrics.length === 0}
      <div class="setting-row"><span class="text-3 text-sm">{$_('ui.mbc77a5201264')}</span></div>
    {/if}
  </div>
</div>

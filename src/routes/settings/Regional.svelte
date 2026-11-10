<script>
  import { _ } from 'svelte-i18n';
  import { DB } from '../../lib/db.js';
  import { AVAILABLE_LOCALES } from '../../i18n/index.js';
  import { scheduleSave } from '../../stores/settings.js';
  import {
    language, dateFormat, timeFormat, energyUnit,
  } from '../../stores/settings.js';

  const ENERGY_OPTS = [
    { value: 'kcal', labelKey: 'settings.regional.calories' },
    { value: 'kJ',   labelKey: 'settings.regional.kilojoules' },
  ];

  // Save-on-change helper — matches parent's `set()` helper.
  function set(key, value) { DB.setSetting(key, value); scheduleSave(key, value); }

  let weightUnit  = DB.getSetting('weightUnit',  'lb');
  let heightUnit  = DB.getSetting('heightUnit',  'ft');
  let lengthUnit  = DB.getSetting('lengthUnit',  'in');
  let distUnitVal = DB.getSetting('distUnit',    'km');
  let tempUnitVal = DB.getSetting('tempUnit',    'F');

  $: set('weightUnit',  weightUnit);
  $: set('heightUnit',  heightUnit);
  $: set('lengthUnit',  lengthUnit);
  $: set('distUnit',    distUnitVal);
  $: set('tempUnit',    tempUnitVal);
</script>

<div class="section-body">

  <!-- Group: Language & Formats -->
  <p class="settings-group-heading">{$_('settings.regional.language_formats')}</p>
  <p class="settings-group-sub">{$_('settings.regional.language_formats_desc')}</p>
  <div class="card settings-card">
    <div class="setting-row">
      <span class="setting-label">{$_('settings.regional.language')}</span>
      <div class="select-wrap" style="width:150px">
        <select class="select sel-sm" bind:value={$language}>
          {#each AVAILABLE_LOCALES as l}<option value={l.code}>{l.labelKey ? $_(l.labelKey) : l.label}</option>{/each}
        </select>
      </div>
    </div>
    <div class="setting-divider"></div>
    <div class="setting-row">
      <span class="setting-label">{$_('settings.regional.date_format')}</span>
      <div class="select-wrap" style="width:160px">
        <select class="select sel-sm" value={$dateFormat} on:change={e => dateFormat.set(e.target.value)}>
          <option value="ISO">{$_('ui.m6c48580bf8e9')}</option>
          <option value="US">MM/DD/YYYY</option>
          <option value="EU">DD/MM/YYYY</option>
          <option value="natural">{$_('ui.ma96113e69831')}</option>
        </select>
      </div>
    </div>
    <div class="setting-divider"></div>
    <div class="setting-row">
      <span class="setting-label">{$_('settings.regional.time_format')}</span>
      <div class="select-wrap" style="width:160px">
        <select class="select sel-sm" value={$timeFormat} on:change={e => timeFormat.set(e.target.value)}>
          <option value="12h">{$_('settings.regional.time_12h')}</option>
          <option value="24h">{$_('settings.regional.time_24h')}</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Group: Units — metric / imperial preferences across the app -->
  <p class="settings-group-heading">{$_('settings.regional.units')}</p>
  <p class="settings-group-sub">{$_('settings.regional.units_desc')}</p>
  <div class="card settings-card">
    <div class="setting-row">
      <span class="setting-label">{$_('settings.regional.energy')}</span>
      <div class="select-wrap" style="width:160px">
        <select class="select sel-sm" value={$energyUnit} on:change={e => energyUnit.set(e.target.value)}>
          {#each ENERGY_OPTS as o}<option value={o.value}>{$_(o.labelKey)}</option>{/each}
        </select>
      </div>
    </div>
    <div class="setting-divider"></div>
    <div class="setting-row">
      <span class="setting-label">{$_('settings.regional.weight')}</span>
      <div class="select-wrap" style="width:100px">
        <select class="select sel-sm" bind:value={weightUnit}>
          <option value="kg">{$_('ui.m131ed734290d')}</option>
          <option value="lb">{$_('ui.m568cff4e709d')}</option>
          <option value="st">{$_('ui.m56af4bde70a4')}</option>
        </select>
      </div>
    </div>
    <div class="setting-divider"></div>
    <div class="setting-row">
      <span class="setting-label">{$_('settings.regional.height')}</span>
      <div class="select-wrap" style="width:100px">
        <select class="select sel-sm" bind:value={heightUnit}>
          <option value="cm">{$_('ui.mb5039c325d71')}</option>
          <option value="ft">{$_('ui.m2b61475ad51e')}</option>
        </select>
      </div>
    </div>
    <div class="setting-divider"></div>
    <div class="setting-row">
      <span class="setting-label">{$_('settings.regional.circumference')}</span>
      <div class="select-wrap" style="width:100px">
        <select class="select sel-sm" bind:value={lengthUnit}>
          <option value="in">{$_('ui.m582967534d0f')}</option>
          <option value="cm">{$_('ui.mb5039c325d71')}</option>
        </select>
      </div>
    </div>
    <div class="setting-divider"></div>
    <div class="setting-row">
      <span class="setting-label">{$_('settings.regional.distance')}</span>
      <div class="select-wrap" style="width:100px">
        <select class="select sel-sm" bind:value={distUnitVal}>
          <option value="km">{$_('ui.m1f34503f65b4')}</option>
          <option value="mi">{$_('ui.meee1c1ade652')}</option>
        </select>
      </div>
    </div>
    <div class="setting-divider"></div>
    <div class="setting-row">
      <span class="setting-label">{$_('settings.regional.temperature')}</span>
      <div class="select-wrap" style="width:100px">
        <select class="select sel-sm" bind:value={tempUnitVal}>
          <option value="F">°F</option>
          <option value="C">°C</option>
        </select>
      </div>
    </div>
  </div>

</div>

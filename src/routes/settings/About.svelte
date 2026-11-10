<script>
  import { _ } from 'svelte-i18n';
  import { APP_VERSION } from '../../lib/version.js';
  import { isNative, iconUrl } from '../../lib/platform.js';
</script>

<div class="section-body">
  <div class="card settings-card">
    <div class="about-hero">
      <img src={iconUrl('/icons/logo.png')} alt={$_('ui.m2014cdd9e657')} class="about-icon" />
      <div>
        <div class="about-name">{$_('ui.m2014cdd9e657')}</div>
        <div class="about-version text-3 text-sm">
          {APP_VERSION}
          <span class="platform-tag">{isNative ? $_('ui.m6d612a86bee4') : 'PWA'}</span>
        </div>
      </div>
    </div>
    <div class="setting-divider"></div>
    <div class="about-desc">
      {$_('ui.m5b587494e7a0')}
    </div>
    <div class="setting-divider"></div>
    <div class="about-row">
      <span class="material-symbols-rounded about-feat-icon">database</span>
      <span>{$_('ui.md257f12fc6a7')}</span>
    </div>
    <div class="setting-divider"></div>
    <div class="about-row">
      <span class="material-symbols-rounded about-feat-icon">phone_android</span>
      <span>{$_('ui.m2ba85acea934')}</span>
    </div>
    <div class="setting-divider"></div>
    <div class="about-row">
      <span class="material-symbols-rounded about-feat-icon">lock</span>
      <span>{$_('ui.me5a0412bf425')}</span>
    </div>
    <div class="setting-divider"></div>
    <div class="about-row">
      <span class="material-symbols-rounded about-feat-icon">restaurant_menu</span>
      <span>{$_('settings_about.food_data_from')} <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener" class="about-link">{$_('ui.me5b3be5216f9')}</a> {$_('settings_about.food_data_license')}</span>
    </div>
    <div class="setting-divider"></div>
    <div class="about-row">
      <span class="material-symbols-rounded about-feat-icon">code</span>
      <span>{$_('settings_about.server_from')} <a href="https://github.com/traceapps/nutritrace" target="_blank" rel="noopener" class="about-link">{$_('settings_about.server_open_source')}</a> {$_('settings_about.server_license')}</span>
    </div>
    <div class="setting-divider"></div>
    <div class="about-row">
      <span class="material-symbols-rounded about-feat-icon">apps</span>
      <span>{$_('settings_about.family_line_prefix')}<a href="https://traceapps.github.io/docs/" target="_blank" rel="noopener" class="about-link">{$_('ui.m4e122e39a5c2')}</a>{$_('settings_about.family_line_suffix')}</span>
    </div>
    <div class="setting-divider"></div>
    <!-- Weblate credit line (Libre plan attribution). Passive callout —
         users who care about translations can follow through to help;
         everyone else just reads it as a credit. -->
    <div class="about-row">
      <span class="material-symbols-rounded about-feat-icon">translate</span>
      <span>{$_('settings_about.translations_from')} <a href="https://hosted.weblate.org/engage/nutritrace/" target="_blank" rel="noopener" class="about-link">{$_('ui.m46a6fb369db4')}</a></span>
    </div>
    <div class="setting-divider"></div>
    <div class="about-desc" style="font-size:11px;color:var(--text-3);line-height:1.5">
      <strong>{$_('ui.m42d4a5b96466')}</strong> {$_('ui.mc3b86cb99ede')}
    </div>
  </div>
</div>

<style>
  .about-hero {
    display: flex; align-items: center; gap: 12px;
    padding: 8px 0;
  }
  .about-icon {
    width: 48px; height: 48px;
    border-radius: 10px;
  }
  .about-name { font-weight: 700; font-size: 16px; color: var(--text-1); }
  .about-version { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
  .platform-tag {
    display: inline-flex; align-items: center;
    padding: 2px 8px; border-radius: 999px;
    background: var(--surface-2); color: var(--text-2);
    font-size: 11px; font-weight: 600;
  }
  .about-desc {
    font-size: 13px; color: var(--text-2);
    padding: 8px 0; line-height: 1.5;
  }
  .about-row {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 0;
    font-size: 13px; color: var(--text-1);
  }
  .about-feat-icon {
    color: var(--accent); font-size: 20px; flex-shrink: 0;
  }
  .about-link { color: var(--accent); text-decoration: none; }
  .about-link:hover { text-decoration: underline; }
</style>

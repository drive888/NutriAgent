import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { writable } from 'svelte/store';

/** Global confirm-dialog store.
 *
 *  Usage from any component:
 *    import { confirmDialog } from '../../stores/confirmDialog.js';
 *    if (!await confirmDialog({ title: 'Delete?', message: '...', dangerous: true })) return;
 *
 *  A single <ConfirmDialogMount /> instance (mounted in App.svelte) renders
 *  the Dialog and resolves the awaiting promise on user action.
 */

export const confirmRequest = writable(null);

export function confirmDialog({
  title = get(_)('ui.mf0762c4f3bfc'),
  titleKey,
  message = '',
  confirmText = 'OK',
  cancelText = get(_)('common.cancel'),
  dangerous = false,
} = {}) {
  return new Promise(resolve => {
    confirmRequest.set({ title, titleKey, message, confirmText, cancelText, dangerous, resolve });
  });
}

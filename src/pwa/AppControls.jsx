import { useSyncExternalStore, useState } from 'react';
import { useOfflineInventory } from './InventoryOfflineProvider';
import './pwa.css';

const subscribers = new Set();
const display = window.matchMedia('(display-mode: standalone)');
const isStandalone = () => display.matches || navigator.standalone === true;
const apple = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let state = { prompt: null, installed: isStandalone(), update: null, applying: false };
let edited = false;

function publish(changes) {
  state = { ...state, ...changes };
  for (const subscriber of subscribers) subscriber();
}

function subscribe(subscriber) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}
const read = () => state;

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  publish({ prompt: event });
});
window.addEventListener('appinstalled', () => publish({ installed: true, prompt: null }));
display.addEventListener?.('change', () => publish({ installed: isStandalone() }));
// Some screens use controlled inputs outside a <form>. Count edits
// conservatively so the update cannot silently discard an open draft.
document.addEventListener('input', () => { edited = true; }, true);
document.addEventListener('change', () => { edited = true; }, true);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (state.applying) window.location.reload();
  });
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(registration => {
    const detect = () => {
      if (registration.waiting && navigator.serviceWorker.controller && !state.applying) {
        publish({ update: registration.waiting });
      }
    };
    const watch = () => registration.installing?.addEventListener('statechange', detect);
    registration.addEventListener('updatefound', watch);
    watch();
    detect();
    const check = () => {
      if (navigator.onLine && document.visibilityState === 'visible') void registration.update().catch(() => {});
    };
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', check);
    setInterval(check, 60_000);
  }).catch(() => { /* The site remains usable if the browser blocks installation. */ });
}

export function AppUpdateNotice() {
  const { update, applying } = useSyncExternalStore(subscribe, read);
  const [error, setError] = useState('');
  if (!update) return null;
  const apply = () => {
    if ((edited || document.querySelector('input:focus, textarea:focus, [role="dialog"]')) &&
        !window.confirm('Reload to update the app? Save any unfinished edits first. Parts queued on this device will be kept.')) return;
    const controller = navigator.serviceWorker.controller;
    publish({ applying: true });
    setError('');
    update.postMessage({ type: 'ACTIVATE_UPDATE' });
    setTimeout(() => {
      if (navigator.serviceWorker.controller !== controller) return;
      publish({ applying: false });
      setError('Update is taking longer than expected. Try again.');
    }, 12000);
  };
  return <aside className="cg-pwa-controls cg-pwa-update" aria-label="App update">
    <div role="status">{error || 'Update available'}</div>
    <button type="button" className="settings-primary-button" disabled={applying} onClick={apply}>
      {applying ? 'Updating…' : 'Update App'}
    </button>
  </aside>;
}

export function InstallAppControls() {
  const { prompt, installed } = useSyncExternalStore(subscribe, read);
  const [instructions, setInstructions] = useState(false);
  const install = async () => {
    if (!prompt) { setInstructions(true); return; }
    publish({ prompt: null });
    try { await prompt.prompt(); } catch { setInstructions(true); }
  };
  return <section className="cg-pwa-controls" aria-label="App installation">
    {installed
      ? <span role="status">App installed</span>
      : <button type="button" className="settings-primary-button" onClick={install}>Install App</button>}
    {!installed && instructions && <p role="status">{apple
      ? 'In Safari, tap Share, then Add to Home Screen. If shown, enable Open as Web App, then tap Add.'
      : 'Open your browser menu and choose Install app or Add to Home screen when available.'}</p>}
  </section>;
}

const fix = {
  permission: 'Ask your workshop owner to restore stock access, then review the part in Inventory.',
  conflict: 'Check Inventory for the existing part before entering it again.',
  validation: 'Correct the part details in Add New Part, then remove this failed entry.',
};

export function InventorySyncControls() {
  const { offline, records, lastSync, syncing, sync, remove, storageError } = useOfflineInventory();
  const pending = records.filter(row => row.state === 'pending').length;
  if (!offline && !records.length && !lastSync && !storageError) return null;
  return <section className="cg-pwa-controls" aria-label="Offline Inventory and sync">
    {offline && <strong>Offline</strong>}
    <span role="status">{pending} Pending sync</span>
    <button type="button" className="settings-primary-button" disabled={offline || syncing || !pending}
      onClick={() => void sync({ manual: true })}>{syncing ? 'Syncing…' : 'Sync now'}</button>
    {storageError && <p role="alert">{storageError}</p>}
    {lastSync && <p role="status">Last sync <time dateTime={lastSync.at}>{new Date(lastSync.at).toLocaleString()}</time> · {lastSync.message}</p>}
    {records.length > 0 && <ul className="cg-pwa-queue">
      {records.map(row => <li key={row.id}>
        <strong>{row.payload.partName}</strong>
        <span>{row.payload.onHand} {row.payload.unit} opening quantity · {row.state === 'rejected' ? 'Needs attention' : 'Pending sync'}</span>
        {row.state === 'rejected' && <>
          <p>{row.message} {fix[row.kind]}</p>
          <button type="button" className="settings-primary-button" onClick={() => {
            if (window.confirm('Remove this failed entry from this device?')) void remove(row.id);
          }}>Remove failed entry</button>
        </>}
      </li>)}
    </ul>}
  </section>;
}

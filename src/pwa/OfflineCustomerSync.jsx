import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useOffline } from './connectivity';
import {
  offlineCustomerScope, isOfflineCustomerEnabled, setOfflineCustomerEnabled,
  verifyOfflineCustomerSupport, listOfflineCustomers, removeOfflineCustomer,
  subscribeOfflineCustomers, syncOfflineCustomers,
} from './offlineCustomers';
import './pwa.css';

// The installed app can sync only while a signed-in page is running.
// Browsers do not guarantee Background Sync or service-worker credentials.
export function OfflineCustomerAutoSync() {
  const { user, isAuthenticated } = useAuth();
  const offline = useOffline();
  useEffect(() => {
    if (!isAuthenticated || !user || offline) return undefined;
    const run = () => {
      if (document.visibilityState === 'visible') {
        void syncOfflineCustomers(user).catch(() => {});
      }
    };
    run();
    const unsub = subscribeOfflineCustomers(run);
    window.addEventListener('online', run);
    window.addEventListener('focus', run);
    window.addEventListener('cubixgear:backend-recovered', run);
    document.addEventListener('visibilitychange', run);
    const timer = window.setInterval(run, 30000);
    return () => {
      unsub();
      clearInterval(timer);
      window.removeEventListener('online', run);
      window.removeEventListener('focus', run);
      window.removeEventListener('cubixgear:backend-recovered', run);
      document.removeEventListener('visibilitychange', run);
    };
  }, [isAuthenticated, offline, user]);
  return null;
}

export function OfflineCustomerSettings() {
  const { user } = useAuth();
  const offline = useOffline();
  const scope = offlineCustomerScope(user);
  const [enabled, setEnabled] = useState(() => isOfflineCustomerEnabled(user));
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    setEnabled(isOfflineCustomerEnabled(user));
    listOfflineCustomers(user).then(setRows).catch(e => setError(e.message));
  }, [user]);

  useEffect(() => {
    reload();
    return subscribeOfflineCustomers(reload);
  }, [reload]);

  const toggle = async event => {
    const checked = event.target.checked;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (checked) {
        if (offline) throw new Error('Connect to the Django backend to verify offline sync support first.');
        await verifyOfflineCustomerSupport();
      }
      setOfflineCustomerEnabled(user, checked);
      setEnabled(checked);
      setMessage(checked
        ? 'Offline customer drafts enabled for this account and branch on this device.'
        : 'New offline drafts disabled. Existing saved drafts remain available for sync.');
    } catch (e) {
      setEnabled(isOfflineCustomerEnabled(user));
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await syncOfflineCustomers(user);
      await reload();
      setMessage(result.synced ? result.synced + ' customer(s) confirmed by Django.' :
        'No customer was confirmed. Review pending and rejected entries below.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async row => {
    if (!window.confirm('Remove this device-local draft? Unsynced data will be lost.')) return;
    try {
      await removeOfflineCustomer(user, row.requestKey);
      await reload();
      setMessage('Device-local draft removed.');
    } catch (e) { setError(e.message); }
  };

  const pending = rows.filter(row => row.state === 'pending').length;
  const rejected = rows.filter(row => row.state === 'rejected').length;

  return <section className="cg-pwa-settings" aria-label="PWA and offline sync settings">
    <header>
      <h2>PWA & Offline Sync</h2>
      <p>Install the office app, save supported drafts to IndexedDB when offline, and send them to Django once the connection returns.</p>
    </header>
    <div className="cg-pwa-settings-summary">
      <div><small>Connection</small><strong>{offline ? 'Offline / backend unavailable' : 'Online'}</strong></div>
      <div><small>Customer drafts pending</small><strong>{pending}</strong></div>
      <div><small>Need attention</small><strong>{rejected}</strong></div>
    </div>
    <label className="cg-pwa-settings-check">
      <input type="checkbox" checked={enabled} onChange={toggle} disabled={!scope || busy} />
      <span><strong>Enable offline Customer creation</strong>
        <small>Verify Django support while online. Save new customers on this trusted device until they sync.</small></span>
    </label>
    <p className="cg-pwa-settings-warning">
      Customer contact details are stored unencrypted in this browser's IndexedDB.
      Use only a trusted, disk-encrypted office device. Browser-data deletion or a device failure can permanently erase unsynced drafts.
      Do not use this feature on shared/public computers.
    </p>
    {!scope && <p role="alert">Sign in online, select an authorized branch and refresh your session to manage offline drafts.</p>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
    <div className="cg-pwa-settings-toolbar">
      <button className="settings-primary-button" type="button"
        disabled={!scope || offline || busy || pending === 0} onClick={sync}>
        {busy ? 'Working…' : 'Sync Customer Drafts Now'}
      </button>
      <span>{pending ? 'Pending entries are local only, not saved in Django.' : 'No customer entries waiting to sync.'}</span>
    </div>
    {rows.length > 0 && <ul className="cg-pwa-settings-list">
      {rows.map(row => <li key={row.requestKey}>
        <div>
          <strong>{row.payload.name}</strong>
          <small>{row.payload.phone} · {new Date(row.createdAt).toLocaleString()}</small>
          <span>{row.state === 'synced' ? 'Synced to Django' :
            row.state === 'rejected' ? 'Needs correction (not synced)' : 'Pending (on this device only)'}</span>
          {row.message && <small role="alert">{row.message}</small>}
        </div>
        <div className="cg-pwa-settings-row-actions">
          {row.state === 'synced' && row.serverId &&
            <Link to={'/customers/' + row.serverId}>Open customer</Link>}
          {row.state !== 'pending' &&
            <button type="button" onClick={() => void remove(row)}>Remove local entry</button>}
        </div>
      </li>)}
    </ul>}
    <p className="cg-pwa-settings-notes">
      Currently supported offline writes: Inventory opening-stock drafts and newly created Customers.
      Jobs, Vehicles, Attendance, Billing, GSTR, Finance, Staff and Payroll remain read-only snapshots offline.
      Reopen the installed app after reconnecting to trigger sync; background sync is not guaranteed.
      Server permissions, feature access and validation are checked again during upload.
    </p>
  </section>;
}

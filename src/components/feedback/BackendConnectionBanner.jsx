import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { checkBackendConnection } from '../../api/backendConnection';

const POLL_INTERVAL_MS = 60000;
const HEALTH_TIMEOUT_MS = 8000;

// Non-blocking status: a failed network check must not destroy a session.
export function BackendConnectionBanner() {
  const [status, setStatus] = useState('checking');
  const requestRef = useRef(null);

  const checkConnection = useCallback(async () => {
    requestRef.current?.abort();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      requestRef.current = null;
      setStatus('offline');
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setStatus((current) => current === 'offline' || current === 'retrying' ? 'retrying' : 'checking');
    const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

    try {
      await checkBackendConnection(controller.signal);
      if (requestRef.current === controller) setStatus('online');
    } catch {
      if (requestRef.current === controller) setStatus('offline');
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) requestRef.current = null;
    }
  }, []);

  useEffect(() => {
    checkConnection();
    const onOnline = () => checkConnection();
    const onOffline = () => {
      requestRef.current?.abort();
      requestRef.current = null;
      setStatus('offline');
    };
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') checkConnection();
    }, POLL_INTERVAL_MS);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [checkConnection]);

  if (status === 'online' || status === 'checking') return null;

  const retrying = status === 'retrying';
  return (
    <aside className="backend-connection-banner" role="status" aria-live="polite">
      <WifiOff size={19} aria-hidden="true" className="backend-connection-symbol" />
      <div className="backend-connection-copy">
        <strong>{retrying ? 'Reconnecting to CubeGears…' : 'Backend connection unavailable'}</strong>
        <span>Changes cannot be saved until the Django API is available.</span>
      </div>
      <button type="button" onClick={() => checkConnection()} disabled={retrying}>
        <RefreshCw size={16} aria-hidden="true" />
        {retrying ? 'Checking' : 'Retry'}
      </button>
    </aside>
  );
}

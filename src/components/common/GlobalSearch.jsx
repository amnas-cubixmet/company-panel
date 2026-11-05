import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search, X, Users, Car, ClipboardList, FileText, Package, UserCheck,
  CreditCard, Truck, AlertCircle, Loader2
} from 'lucide-react';
import { searchWorkspace } from '../../services/globalSearch.service';
import { getPermissionForPath } from '../../utils/permissions';
import { useFeatureAccess } from '../../context/FeatureAccessContext';
import '../../styles/global-search.css';

const GROUP_ICONS = {
  Customers: Users,
  Vehicles: Car,
  'Job Cards': ClipboardList,
  Complaints: AlertCircle,
  Staff: UserCheck,
  Suppliers: Truck,
  Inventory: Package,
  Invoices: FileText,
  Payments: CreditCard,
};

export const GlobalSearch = ({ isMobileView = false, onMobileClose = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = useFeatureAccess();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(-1);
  const [retry, setRetry] = useState(0);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const lastFocus = useRef(null);
  const mountedRef = useRef(false);

  const visible = useMemo(() => results.filter((item) => {
    const path = item?.route;
    if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return false;
    const permission = getPermissionForPath(path.split(/[?#]/)[0]);
    return Boolean(permission && can(permission));
  }), [results, can]);

  const groups = useMemo(() => {
    const out = [];
    for (const item of visible) {
      const group = item.group || 'Other';
      let target = out.find((row) => row.name === group);
      if (!target) {
        target = { name: group, items: [] };
        out.push(target);
      }
      target.items.push(item);
    }
    return out;
  }, [visible]);

  const openDialog = () => {
    lastFocus.current = document.activeElement;
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setQuery('');
    setResults([]);
    setError('');
    setActive(-1);
    onMobileClose?.();
    requestAnimationFrame(() => lastFocus.current?.isConnected && lastFocus.current.focus());
  };

  useEffect(() => {
    // Only the mounted desktop widget handles Ctrl/⌘+K; mobile search mounts on demand.
    const shortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openDialog();
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);

  // Restore background state and focus when search closes/unmounts.
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();
    const keys = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key !== 'Tab') return;
      const buttons = dialogRef.current?.querySelectorAll(
        'button:not(:disabled),input:not(:disabled),a[href]'
      );
      const focusable = [...(buttons || [])];
      if (!focusable.length) return;
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keys);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keys);
    };
  }, [open]);

  // Never display a stale response after typing quickly, closing, or navigating.
  useEffect(() => {
    if (!open) return undefined;
    const value = query.trim();
    setActive(-1);
    setError('');
    setResults([]);
    if (value.length < 2) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    const timeout = window.setTimeout(async () => {
      try {
        const rows = await searchWorkspace(value, { signal: controller.signal });
        if (!controller.signal.aborted) setResults(rows);
      } catch (cause) {
        if (controller.signal.aborted || cause?.code === 'ERR_CANCELED') return;
        setError(cause?.message || 'Search is unavailable. Try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, query, retry]);

  const pathKey = location.key;
  useEffect(() => {
    // Navigation from elsewhere also closes the dialog and restores scrolling.
    if (mountedRef.current) setOpen(false);
    mountedRef.current = true;
  }, [pathKey]);

  const select = (item) => {
    const path = item?.route;
    if (!visible.includes(item) || !path) return;
    closeDialog();
    navigate(path);
  };

  const inputKeys = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, visible.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(-1, index - 1));
    } else if (event.key === 'Enter' && visible.length) {
      event.preventDefault();
      select(visible[Math.max(active, 0)]);
    }
  };

  let rowIndex = -1;
  return (
    <div className={`global-search ${isMobileView ? 'is-mobile' : ''}`}>
      <button type="button" className="global-search-launch" onClick={openDialog}
        aria-haspopup="dialog" aria-expanded={open} aria-label="Open workspace search">
        <Search size={17} aria-hidden="true" />
        <span>Search customers, vehicles, jobs…</span>
        <kbd>⌘ K</kbd>
      </button>
      {open && createPortal(
        <div className="global-search-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}>
          <section ref={dialogRef} role="dialog" aria-modal="true"
            aria-label="Search the CubeGears workspace" className="global-search-dialog">
            <header className="global-search-dialog-header">
              <Search size={20} aria-hidden="true" />
              <input ref={inputRef} type="search" value={query} maxLength={100}
                aria-label="Search customers, vehicles, jobs, invoices and other records"
                aria-controls="global-workspace-search-results"
                aria-autocomplete="list" aria-activedescendant={active >= 0 ? `workspace-search-result-${active}` : undefined}
                placeholder="Search by name, phone, registration or reference"
                autoComplete="off" onChange={(event) => setQuery(event.target.value)}
                onKeyDown={inputKeys} />
              {query && <button type="button" aria-label="Clear search" onClick={() => {
                setQuery(''); setResults([]); setActive(-1); inputRef.current?.focus();
              }}><X size={18} /></button>}
              <button type="button" className="global-search-close" aria-label="Close search"
                onClick={closeDialog}><X size={20} /></button>
            </header>
            <div className="global-search-results" id="global-workspace-search-results"
              role="listbox" aria-label="Workspace search results">
              {loading && <p role="status" className="global-search-feedback">
                <Loader2 size={18} className="global-search-spin" /> Searching workspace…
              </p>}
              {!loading && error && <div role="alert" className="global-search-feedback">
                <AlertCircle size={18}/><span>{error}</span>
                <button type="button" onClick={() => setRetry((v) => v + 1)}>Retry</button>
              </div>}
              {!loading && !error && query.trim().length < 2 &&
                <p className="global-search-feedback">Enter at least 2 characters to search real workshop records.</p>}
              {!loading && !error && query.trim().length >= 2 && !visible.length &&
                <p role="status" className="global-search-feedback">No matching records found.</p>}
              {!loading && !error && groups.map((group) => {
                const Icon = GROUP_ICONS[group.name] || Search;
                return <div key={group.name} role="group" aria-label={group.name} className="global-search-group">
                  <h3 className="global-search-group-title">{group.name} ({group.items.length})</h3>
                  {group.items.map((item) => {
                    rowIndex += 1;
                    const index = rowIndex;
                    return <button key={item.id} id={`workspace-search-result-${index}`}
                      role="option" aria-selected={active === index}
                      type="button" className={`global-search-result-row ${active === index ? 'is-selected' : ''}`}
                      onMouseMove={() => setActive(index)} onClick={() => select(item)}>
                      <Icon size={19} aria-hidden="true" />
                      <span className="global-search-result-copy">
                        <strong>{item.title}</strong><small>{item.subtitle}</small>
                      </span>
                      {item.status && <span className="global-search-result-status">{item.status}</span>}
                    </button>;
                  })}
                </div>;
              })}
            </div>
            <footer className="global-search-dialog-footer">
              <span>↑ ↓ Navigate · Enter Open · Esc Close</span>
              <span>Results are limited to your workshop permissions</span>
            </footer>
          </section>
        </div>, document.body
      )}
    </div>
  );
};

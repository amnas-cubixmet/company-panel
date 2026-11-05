import { useEffect, useId, useMemo, useRef, useState } from 'react';
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

// Exactly one mounted search input for desktop and mobile. No modal or portal.
export const GlobalSearch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = useFeatureAccess();
  const instanceId = useId();
  const resultsId = instanceId + '-results';
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [retryCount, setRetryCount] = useState(0);

  // Django enforces tenancy and RBAC, and the header checks route permissions.
  const permitted = useMemo(() => results.filter((item) => {
    const path = item?.route;
    if (typeof path !== 'string' || !path.startsWith('/') ||
        path.startsWith('//') || path.includes('\\')) return false;
    const permission = getPermissionForPath(path.split(/[?#]/)[0]);
    return Boolean(permission && can(permission));
  }), [results, can]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const item of permitted) {
      const name = item.group || 'Other';
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(item);
    }
    return [...map].map(([name, items]) => ({ name, items }));
  }, [permitted]);
  const options = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const trimmed = query.trim();

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setError('');
    setLoading(false);
    setActiveIndex(-1);
    setExpanded(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const onShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setExpanded(true);
      }
    };
    document.addEventListener('keydown', onShortcut);
    return () => document.removeEventListener('keydown', onShortcut);
  }, []);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setExpanded(false);
    };
    const onFocusIn = (event) => {
      if (!rootRef.current?.contains(event.target)) setExpanded(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, []);

  // Navigating from any page, including back/forward, closes and clears search.
  useEffect(() => {
    setExpanded(false);
    setQuery('');
    setResults([]);
    setActiveIndex(-1);
    setError('');
  }, [location.pathname, location.search]);

  useEffect(() => {
    setActiveIndex(-1);
    setError('');
    setResults([]);
    if (!expanded || trimmed.length < 2) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    const timeout = window.setTimeout(async () => {
      try {
        const found = await searchWorkspace(trimmed, { signal: controller.signal });
        if (!controller.signal.aborted) setResults(found);
      } catch (cause) {
        if (!controller.signal.aborted && cause?.code !== 'ERR_CANCELED') {
          setError(cause?.message || 'Unable to search right now. Please retry.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 260);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [expanded, trimmed, retryCount]);

  useEffect(() => {
    if (activeIndex < 0) return;
    const option = resultsRef.current?.querySelector('[data-search-index="' + activeIndex + '"]');
    option?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const select = (item) => {
    if (!options.includes(item)) return;
    const path = item.route;
    setExpanded(false);
    setQuery('');
    setResults([]);
    setActiveIndex(-1);
    navigate(path);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      if (expanded) {
        event.preventDefault();
        setExpanded(false);
        setActiveIndex(-1);
      }
    } else if (event.key === 'ArrowDown' && expanded) {
      event.preventDefault();
      setActiveIndex((previous) => Math.min(previous + 1, options.length - 1));
    } else if (event.key === 'ArrowUp' && expanded) {
      event.preventDefault();
      setActiveIndex((previous) => Math.max(previous - 1, -1));
    } else if (event.key === 'Enter' && expanded && options.length) {
      event.preventDefault();
      select(options[Math.max(activeIndex, 0)]);
    }
  };

  let optionIndex = -1;
  return (
    <div ref={rootRef} className="global-search">
      <div className="global-search-field">
        <Search className="global-search-leading-icon" size={17} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Search customers, vehicles, jobs, complaints, staff, suppliers, inventory, invoices and payments"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={resultsId}
          aria-activedescendant={expanded && activeIndex >= 0 ? instanceId + '-option-' + activeIndex : undefined}
          placeholder="Search customers, vehicles, jobs…"
          autoComplete="off"
          maxLength={100}
          value={query}
          onFocus={() => setExpanded(true)}
          onClick={() => setExpanded(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setExpanded(true);
          }}
          onKeyDown={onKeyDown}
        />
        {query ? (
          <button className="global-search-clear" type="button" aria-label="Clear search" onClick={clearSearch}>
            <X size={16} aria-hidden="true" />
          </button>
        ) : (
          <kbd aria-hidden="true" className="global-search-shortcut">⌘ K</kbd>
        )}
      </div>
      {expanded && (
        <div ref={resultsRef} className="global-search-results" id={resultsId} role="listbox" aria-label="Workspace search results">
          {loading && <div className="global-search-feedback" role="status">
            <Loader2 className="global-search-spin" size={18} aria-hidden="true" />
            Searching workspace…
          </div>}
          {!loading && error && <div className="global-search-feedback is-error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{error}</span>
            <button type="button" onClick={() => setRetryCount((value) => value + 1)}>Retry</button>
          </div>}
          {!loading && !error && trimmed.length < 2 && (
            <div className="global-search-feedback">Type at least 2 characters to search your workshop.</div>
          )}
          {!loading && !error && trimmed.length >= 2 && !options.length && (
            <div className="global-search-feedback" role="status">No matching records found.</div>
          )}
          {!loading && !error && groups.map((group) => {
            const Icon = GROUP_ICONS[group.name] || Search;
            return <div className="global-search-group" role="group" aria-label={group.name} key={group.name}>
              <div className="global-search-group-title">{group.name} ({group.items.length})</div>
              {group.items.map((item) => {
                optionIndex += 1;
                const index = optionIndex;
                return (
                  <button
                    key={item.id}
                    id={instanceId + '-option-' + index}
                    data-search-index={index}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === index}
                    className={'global-search-result-row' + (activeIndex === index ? ' is-selected' : '')}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => select(item)}
                  >
                    <span className="global-search-result-icon"><Icon size={18} aria-hidden="true" /></span>
                    <span className="global-search-result-copy">
                      <strong>{item.title}</strong>
                      {item.subtitle && <small>{item.subtitle}</small>}
                    </span>
                    {item.status && <span className="global-search-result-status">{item.status}</span>}
                  </button>
                );
              })}
            </div>;
          })}
          <div className="global-search-footnote" aria-hidden="true">↑ ↓ Navigate · Enter Open · Esc Close</div>
        </div>
      )}
    </div>
  );
};

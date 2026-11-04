import { useRef, useState } from 'react';
import { Check, MapPin, Search } from 'lucide-react';

// Replace via VITE_PLACE_SEARCH_API_URL with a managed/self-hosted Photon service
// for commercial or high-volume use. The public Photon demo has no uptime SLA.
// Submit-only lookup (never search-as-you-type); no GPS data is sent to Photon.
const PLACE_API = import.meta.env.VITE_PLACE_SEARCH_API_URL || 'https://photon.komoot.io/api/';
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();

const parseResults = (features) => (Array.isArray(features) ? features : [])
  .filter((item) => item?.geometry?.type === 'Point')
  .map((item) => {
    const [longitude, latitude] = item.geometry.coordinates || [];
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
    const p = item.properties || {};
    const name = [p.name, p.street, p.city || p.town || p.village || p.locality, p.state, p.country]
      .filter(Boolean)
      .filter((part, index, parts) => parts.indexOf(part) === index)
      .join(', ');
    return name ? { name, latitude, longitude, key: `${p.osm_type || ''}:${p.osm_id || ''}:${latitude}:${longitude}` } : null;
  }).filter(Boolean).slice(0, 5);

export function WorkshopPlaceSearch({ selectedName, latitude, longitude, onSelect, disabled }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef(null);
  const lastSearchRef = useRef(0);

  const search = async (event) => {
    event.preventDefault();
    if (searching || disabled) return;
    const term = query.trim();
    if (term.length < 3) {
      setError('Enter at least 3 characters of the workshop place or address.');
      return;
    }
    if (Date.now() - lastSearchRef.current < 1100) {
      setError('Please leave a moment between place searches.');
      return;
    }

    setError('');
    setResults([]);
    const cached = cache.get(term.toLowerCase());
    if (cached && Date.now() - cached.time < CACHE_MS) {
      setResults(cached.results);
      return;
    }

    lastSearchRef.current = Date.now();
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setSearching(true);
    try {
      const url = new URL(PLACE_API, window.location.origin);
      if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        throw new Error('Configure a secure place-search service.');
      }
      url.searchParams.set('q', term.slice(0, 160));
      url.searchParams.set('limit', '5');
      url.searchParams.set('lang', 'en');
      const response = await fetch(url.toString(), { signal: controller.signal, credentials: 'omit' });
      if (!response.ok) throw new Error('Place search is temporarily unavailable. Try again or use GPS.');
      const data = await response.json();
      if (controller.signal.aborted) return;
      const matches = parseResults(data.features);
      cache.set(term.toLowerCase(), { time: Date.now(), results: matches });
      if (cache.size > 20) cache.delete(cache.keys().next().value);
      setResults(matches);
      if (!matches.length) setError('No matching place found. Try a nearby town and district or use current location.');
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause?.message || 'Place search failed. Use current location instead.');
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  };

  const updateQuery = (value) => {
    requestRef.current?.abort();
    setSearching(false);
    setResults([]);
    setError('');
    setQuery(value);
  };

  const selected = Number.isFinite(latitude) && Number.isFinite(longitude);
  const mapUrl = selected
    ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`
    : '';

  return (
    <div className="attendance-place-search">
      <form className="attendance-place-form" onSubmit={search} role="search">
        <label className="attendance-rule-field">
          <span>Workshop Location / Place</span>
          <small>Search by place, shop, landmark, road or village name.</small>
          <input
            type="search"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="e.g. Mampad, Nilambur, Kerala"
            aria-label="Search workshop place"
            maxLength={160}
            autoComplete="off"
            disabled={disabled}
          />
        </label>
        <button type="submit" className="attendance-rules-save" disabled={searching || disabled}>
          <Search size={16} aria-hidden="true" />
          {searching ? 'Searching…' : 'Search Place'}
        </button>
      </form>
      {error && <p className="attendance-location-feedback is-error" role="alert">{error}</p>}
      {results.length > 0 && (
        <div className="attendance-place-results" aria-label="Matching locations">
          {results.map((place) => (
            <button
              type="button"
              key={place.key}
              onClick={() => {
                onSelect(place);
                setQuery(place.name);
                setResults([]);
                setError('');
              }}
            >
              <MapPin size={17} aria-hidden="true" />
              <span>{place.name}</span>
              <Check size={17} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      {selected && (
        <p className="attendance-place-selected">
          <MapPin size={16} aria-hidden="true" />
          <span><strong>Selected location:</strong> {selectedName || 'GPS coordinates'} </span>
          <a href={mapUrl} target="_blank" rel="noopener noreferrer">View on Map</a>
        </p>
      )}
      <small className="attendance-place-attribution">
        Place search: <a href="https://photon.komoot.io/" target="_blank" rel="noopener noreferrer">Photon</a>
        {' · '}Data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>.
        Verify the pin is at the workshop before enabling a small radius.
      </small>
    </div>
  );
}

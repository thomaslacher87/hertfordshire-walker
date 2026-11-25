import { useEffect, useRef, useState } from 'react';
import { searchPlaces } from './domain/browse';
import type { Place, Point } from './domain/nearby';

export type Origin = Point & { label: string };

export function NearbyControls({
  origin,
  onOrigin,
  radius,
  onRadius,
}: {
  origin: Origin | null;
  onOrigin: (origin: Origin | null) => void;
  radius: number;
  onRadius: (radius: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Place[] | null>(null);
  const [locationStatus, setLocationStatus] = useState('');
  const [locating, setLocating] = useState(false);
  const request = useRef(0);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = window.setTimeout(() => setMatches(searchPlaces(query)), 200);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(
    () => () => {
      request.current += 1;
    },
    [],
  );

  function choose(place: Origin | null) {
    request.current += 1;
    setLocating(false);
    setLocationStatus('');
    setQuery('');
    setMatches(null);
    onOrigin(place);
  }

  function locate() {
    if (!navigator.geolocation) {
      setLocationStatus(
        'Device location is unavailable. Try searching for a walk start.',
      );
      return;
    }
    const pending = ++request.current;
    setLocating(true);
    setLocationStatus('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (request.current === pending)
          choose({
            latitude: coords.latitude,
            longitude: coords.longitude,
            label: 'Your location',
          });
      },
      () => {
        if (request.current !== pending) return;
        setLocating(false);
        setLocationStatus(
          'Could not get your location. Try searching for a walk start.',
        );
      },
      { timeout: 8000, maximumAge: 300_000 },
    );
  }

  return (
    <details className="nearby-panel" open={origin !== null || undefined}>
      <summary>Find nearby walks{origin && ` · ${origin.label}`}</summary>
      <p className="muted">
        Search named walk starts in the catalogue or use your device location.
      </p>
      <div className="nearby-controls">
        <label>
          Find a place
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setMatches(null);
              setQuery(event.currentTarget.value);
            }}
            placeholder="Try North Mymms"
          />
        </label>
        <label>
          Radius
          <select
            value={radius}
            onChange={(event) => onRadius(Number(event.currentTarget.value))}
          >
            {[2, 5, 10, 20].map((miles) => (
              <option key={miles} value={miles}>
                {miles} mi
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="button button-secondary"
          disabled={locating}
          onClick={locate}
        >
          Use my location
        </button>
        {origin && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => choose(null)}
          >
            Clear nearby
          </button>
        )}
      </div>
      {locationStatus && (
        <p role="status" className="muted">
          {locationStatus}
        </p>
      )}
      {matches &&
        (matches.length ? (
          <ul aria-label="Matching places" className="place-results">
            {matches.map((place) => (
              <li key={place.id}>
                <button type="button" onClick={() => choose(place)}>
                  {place.label} (Walk {place.id})
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p role="status">
            No matching walk starts. Try a nearby town or browse the full list.
          </p>
        ))}
      {origin && (
        <p role="status" className="muted">
          Showing starts within {radius} mi of {origin.label}. Distances are
          measured in a straight line.
        </p>
      )}
    </details>
  );
}

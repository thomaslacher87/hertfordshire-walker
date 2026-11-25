import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  Link,
  Route,
  Routes,
  useHref,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  browse,
  bySlug,
  featureGroups,
  images,
  label,
  sortOptions,
} from './domain/browse';
import type { WalkImage } from './domain/catalogue';
import { hasCoordinates } from './domain/nearby';
import { MapBoundary } from './MapBoundary';
import { NearbyControls, type Origin } from './NearbyControls';

const WalkMap = lazy(() => import('./WalkMap'));

function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className="site-frame">
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Hertfordshire Walker home">
          <span className="brand-mark" aria-hidden="true">
            HW
          </span>
          <strong>Hertfordshire Walker</strong>
        </Link>
      </header>
      {children}
    </div>
  );
}

function Catalogue({
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
  const [params, setParams] = useSearchParams();
  const result = useMemo(
    () => browse(params, origin ? { origin, radiusMiles: radius } : undefined),
    [params, origin, radius],
  );
  const mapView = params.get('view') === 'map';
  const pins = useMemo(
    () => result.matches.filter(hasCoordinates),
    [result.matches],
  );
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const previousPage = useRef(result.page);
  useEffect(() => {
    if (previousPage.current !== result.page) resultsHeading.current?.focus();
    previousPage.current = result.page;
  }, [result.page]);
  const query = params.get('q') ?? '';
  const availableSorts = origin
    ? [['nearest', 'Nearest first'] as const, ...sortOptions]
    : sortOptions;
  const sort =
    availableSorts.find(([key]) => key === params.get('sort'))?.[0] ??
    (origin ? 'nearest' : 'number');
  const refinementCount =
    result.selectedFeatures.length +
    result.selections.filter(({ selected }) => selected).length +
    result.bounds.filter(({ value }) => value !== null).length;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams(mapView ? { view: 'map' } : {});
    for (const [key, value] of new FormData(event.currentTarget)) {
      const input = String(value).trim();
      if (
        input &&
        !(key === 'sort' && input === (origin ? 'nearest' : 'number'))
      )
        next.append(key, input);
    }
    setParams(next);
  }

  function resetPage() {
    if (!params.has('page')) return;
    const next = new URLSearchParams(params);
    next.delete('page');
    setParams(next);
  }

  function viewLink(showMap: boolean) {
    const next = new URLSearchParams(params);
    if (showMap) next.set('view', 'map');
    else next.delete('view');
    return { pathname: '/', search: next.toString() };
  }

  function pageLink(page: number) {
    const next = new URLSearchParams(params);
    if (page === 1) next.delete('page');
    else next.set('page', String(page));
    return { pathname: '/', search: next.toString() };
  }

  return (
    <main id="main" tabIndex={-1} className="catalogue">
      <div className="catalogue-intro">
        <p className="eyebrow">The walk catalogue</p>
        <h1>Find a Hertfordshire walk</h1>
        <p>
          Explore the countryside by distance, terrain, and what’s along the
          way.
        </p>
      </div>
      <form
        key={JSON.stringify(
          [...params].filter(([key]) => key !== 'page' && key !== 'view'),
        )}
        className="filters"
        onSubmit={submit}
      >
        <div className="quick-filters">
          <label>
            Search walks
            <input
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Try Ashridge, a station, or a walk number"
            />
          </label>
          <label>
            Sort by
            <select
              key={origin ? 'nearby' : 'catalogue'}
              name="sort"
              defaultValue={sort}
            >
              {availableSorts.map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button className="button button-primary" type="submit">
            Apply filters
          </button>
        </div>
        <details open={refinementCount > 0 || undefined}>
          <summary>
            More filters{refinementCount > 0 && ` (${refinementCount} applied)`}
          </summary>
          <p className="muted">
            Selected features must all match. Unrecorded details are excluded
            when you filter for them.
          </p>
          <div className="filter-grid">
            {result.selections.map(
              ({ key, title, options, selected, field }) => (
                <label key={key}>
                  {title}
                  <select name={key} defaultValue={selected ?? ''}>
                    <option value="">Any</option>
                    {options.map((value) => (
                      <option key={value} value={value}>
                        {field === 'source_name' || field === 'area'
                          ? value
                          : label(value)}
                      </option>
                    ))}
                  </select>
                </label>
              ),
            )}
            {result.bounds.map(({ key, title, value }) => (
              <label key={key}>
                {title}
                <input
                  name={key}
                  type="number"
                  min="0"
                  step="any"
                  defaultValue={value ?? ''}
                />
              </label>
            ))}
          </div>
          <div className="filter-grid features">
            {featureGroups.map(({ label: group, fields }) => (
              <fieldset key={group}>
                <legend>{group}</legend>
                {fields.map((field) => (
                  <label key={field}>
                    <input
                      name="feature"
                      value={field}
                      type="checkbox"
                      defaultChecked={result.selectedFeatures.includes(field)}
                    />
                    {label(field)}
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          <button className="button button-primary" type="submit">
            Apply all filters
          </button>
        </details>
      </form>
      <NearbyControls
        origin={origin}
        radius={radius}
        onOrigin={(place) => {
          onOrigin(place);
          resetPage();
        }}
        onRadius={(miles) => {
          onRadius(miles);
          resetPage();
        }}
      />
      <nav className="view-switch" aria-label="Catalogue view">
        <Link
          className={`button button-${mapView ? 'secondary' : 'primary'}`}
          to={viewLink(false)}
          aria-current={!mapView ? 'page' : undefined}
        >
          List
        </Link>
        <Link
          className={`button button-${mapView ? 'primary' : 'secondary'}`}
          to={viewLink(true)}
          aria-current={mapView ? 'page' : undefined}
        >
          Map
        </Link>
      </nav>
      {mapView && (
        <section className="map-panel" aria-labelledby="map-heading">
          <div className="results-heading">
            <h2 id="map-heading">Walk starts on the map</h2>
            <a className="text-link" href="#results-title">
              Jump to results list
            </a>
          </div>
          {pins.length === 0 ? (
            <p>No matching walks have map coordinates.</p>
          ) : (
            <>
              <p className="muted">
                {pins.length} {pins.length === 1 ? 'start' : 'starts'} on the
                map.
                {pins.length < result.total &&
                  ' Walks without coordinates are in the list below.'}
              </p>
              <MapBoundary>
                <Suspense fallback={<p role="status">Loading the map…</p>}>
                  <WalkMap pins={pins} catalogueSearch={params.toString()} />
                </Suspense>
              </MapBoundary>
            </>
          )}
        </section>
      )}
      <section aria-labelledby="results-title" className="results">
        <div className="results-heading">
          <h2
            id="results-title"
            tabIndex={-1}
            ref={resultsHeading}
            aria-live="polite"
          >
            {result.total} {result.total === 1 ? 'walk' : 'walks'}
          </h2>
          {[...params.keys()].some((key) => key !== 'view') && (
            <Link to={mapView ? '/?view=map' : '/'} className="text-link">
              Clear filters
            </Link>
          )}
        </div>
        {result.total === 0 && (
          <p>
            {origin
              ? 'Try a wider radius, a different start, or fewer filters.'
              : 'Try a different search or remove some filters.'}
          </p>
        )}
        {result.total > 0 && (
          <ul className="walk-grid">
            {result.results.map((walk) => (
              <li className="walk-card" key={walk.slug}>
                <p className="walk-meta">
                  {walk.source_name} · Walk {walk.source_walk_id}
                </p>
                <h3>
                  <Link
                    to={`/walk/${walk.slug}`}
                    state={{ catalogueSearch: params.toString() }}
                  >
                    {walk.title}
                  </Link>
                </h3>
                <p className="walk-facts">
                  {walk.distance_miles} mi
                  {walk.route_type !== 'unknown' &&
                    ` · ${label(walk.route_type)}`}{' '}
                  · {walk.start_location}
                </p>
                {result.distances.has(walk.slug) && (
                  <p className="walk-meta">
                    {result.distances.get(walk.slug)?.toFixed(1)} mi from{' '}
                    {origin?.label}
                  </p>
                )}
                <p className="walk-summary">{walk.summary}</p>
              </li>
            ))}
          </ul>
        )}
        {result.totalPages > 1 && (
          <nav className="pagination" aria-label="Catalogue pages">
            {result.page > 1 && (
              <Link to={pageLink(result.page - 1)}>Previous page</Link>
            )}
            <span>
              Page {result.page} of {result.totalPages}
            </span>
            {result.page < result.totalPages && (
              <Link to={pageLink(result.page + 1)}>Next page</Link>
            )}
          </nav>
        )}
      </section>
    </main>
  );
}

function WalkPhoto({ photo }: { photo: WalkImage }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <p className="image-fallback">Photo unavailable</p>;
  return (
    <figure>
      <img
        src={photo.image_url}
        alt={photo.alt_text}
        loading="lazy"
        onError={() => setFailed(true)}
      />
      <figcaption>
        {photo.credit} · {photo.licence_note}
      </figcaption>
    </figure>
  );
}

function WalkActions({ slug }: { slug: string }) {
  const [message, setMessage] = useState('');
  const [showLink, setShowLink] = useState(false);
  const path = useHref(`/walk/${slug}`);
  const url = new URL(path, window.location.href).href;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage('Walk link copied.');
    } catch {
      setShowLink(true);
      setMessage('Copy the walk link below.');
    }
  }

  return (
    <div className="walk-actions">
      <div className="detail-actions">
        <button
          className="button button-secondary"
          type="button"
          onClick={copyLink}
        >
          Copy walk link
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => window.print()}
        >
          Print walk
        </button>
      </div>
      <span role="status">{message}</span>
      {showLink && (
        <label className="share-link">
          Walk link
          <input
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
      )}
    </div>
  );
}

function WalkDetail() {
  const { slug } = useParams();
  const { state } = useLocation();
  const walk = bySlug.get(slug ?? '');
  const back =
    typeof state?.catalogueSearch === 'string' ? state.catalogueSearch : '';
  if (!walk) return <NotFound />;

  const facts = [
    ['Distance', `${walk.distance_miles} miles`],
    ['Starting area', walk.start_location],
    ['Area', walk.area],
    [
      'Route type',
      walk.route_type === 'unknown' ? null : label(walk.route_type),
    ],
    ['Difficulty', walk.difficulty && label(walk.difficulty)],
    [
      'Publisher’s duration',
      walk.source_duration_minutes !== null
        ? `${walk.source_duration_minutes} min`
        : null,
    ],
    [
      'Parking',
      walk.parking_type === 'unknown' ? null : label(walk.parking_type),
    ],
    [
      'Nearest station',
      walk.station_name !== null && walk.station_distance_miles !== null
        ? `${walk.station_name} (${walk.station_distance_miles} mi)`
        : null,
    ],
  ];
  const photos = images
    .filter((photo) => photo.walk_slug === walk.slug)
    .sort((a, b) => a.position - b.position);
  const directions =
    walk.latitude !== null && walk.longitude !== null
      ? `https://www.google.com/maps/dir/?${new URLSearchParams({ api: '1', destination: `${walk.latitude},${walk.longitude}` })}`
      : null;

  return (
    <main id="main" tabIndex={-1} className="walk-detail">
      <Link
        className="text-link back-link"
        to={{ pathname: '/', search: back }}
      >
        Back to walks
      </Link>
      <p className="eyebrow">
        {walk.source_name} · Walk {walk.source_walk_id}
      </p>
      <h1>{walk.title}</h1>
      {walk.status === 'archived' && (
        <p className="notice">
          This walk is archived. Its route information may be out of date.
        </p>
      )}
      <p className="detail-summary">{walk.summary}</p>
      <div className="detail-actions">
        <a className="button button-primary" href={walk.source_url}>
          Open original route
        </a>
        {directions && (
          <a className="button button-secondary" href={directions}>
            Directions to start
          </a>
        )}
      </div>
      <p className="print-source">Original route: {walk.source_url}</p>
      <section aria-labelledby="plan-walk">
        <h2 id="plan-walk">Plan your walk</h2>
        <dl className="fact-grid">
          {facts.map(([name, value]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{value ?? 'Not recorded'}</dd>
            </div>
          ))}
        </dl>
        {walk.parking_note && <p>{walk.parking_note}</p>}
        {walk.slug === '7' && (
          <p className="notice">
            The catalogue and legacy notes give different distances for this
            walk. Check the original route for the distance of your chosen
            option.
          </p>
        )}
        {walk.status === 'published' && !walk.last_verified_date && (
          <p className="muted">
            Check the original route for current access, parking and route
            details.
          </p>
        )}
        {!directions && (
          <p>
            Start coordinates are unavailable. Check the original route for
            directions.
          </p>
        )}
      </section>
      <section aria-labelledby="features-heading">
        <h2 id="features-heading">Route features</h2>
        <dl className="feature-list">
          {featureGroups.map(({ label: group, fields }) => (
            <div key={group}>
              <dt>{group}</dt>
              <dd>
                {fields
                  .filter((field) => walk[field])
                  .map(label)
                  .join(', ') || 'Not recorded'}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-labelledby="photos-heading">
        <h2 id="photos-heading">Photos</h2>
        {photos.length ? (
          <div className="photo-grid">
            {photos.map((photo) => (
              <WalkPhoto photo={photo} key={photo.position} />
            ))}
          </div>
        ) : (
          <p className="image-fallback">
            Photos may be available on the{' '}
            <a href={walk.source_url}>original route page</a>.
          </p>
        )}
      </section>
      <p className="muted">
        Route information from {walk.content_credit}
        {walk.licence_note && ` · ${walk.licence_note}`}
        {walk.last_verified_date && ` · Verified ${walk.last_verified_date}`}
      </p>
      <WalkActions key={walk.slug} slug={walk.slug} />
    </main>
  );
}

function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="walk-detail">
      <h1>Page not found</h1>
      <p>
        <Link to="/" className="text-link">
          Browse the walk catalogue
        </Link>
      </p>
    </main>
  );
}

export function AppRoutes() {
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [radius, setRadius] = useState(5);
  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={
            <Catalogue
              origin={origin}
              onOrigin={setOrigin}
              radius={radius}
              onRadius={setRadius}
            />
          }
        />
        <Route path="/walk/:slug" element={<WalkDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

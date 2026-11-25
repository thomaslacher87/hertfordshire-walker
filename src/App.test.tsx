import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from './App';
import { browse, searchPlaces, walks } from './domain/browse';
import { hasCoordinates } from './domain/nearby';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function LocationProbe() {
  const { search } = useLocation();
  return <output data-testid="query">{search}</output>;
}

function renderAt(path: string) {
  vi.stubGlobal('scrollTo', vi.fn());
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('catalogue browsing', () => {
  it('keeps the trailing slash on catalogue links under the Pages base', () => {
    vi.stubGlobal('scrollTo', vi.fn());
    render(
      <MemoryRouter
        basename="/hertfordshire-walker/"
        initialEntries={['/hertfordshire-walker/']}
      >
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Next page' })).toHaveAttribute(
      'href',
      '/hertfordshire-walker/?page=2',
    );
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search walks' }), {
      target: { value: 'Marathon Loop' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(screen.getByRole('link', { name: 'Marathon Loop' })).toHaveAttribute(
      'href',
      '/hertfordshire-walker/walk/115',
    );
  });

  it('makes every migrated walk reachable once through pagination', () => {
    const pages = browse(new URLSearchParams()).totalPages;
    const slugs = Array.from({ length: pages }, (_, index) =>
      browse(new URLSearchParams({ page: String(index + 1) })).results.map(
        ({ slug }) => slug,
      ),
    ).flat();
    expect(slugs.filter((slug) => /^[0-9]+$/.test(slug))).toHaveLength(290);
    expect(slugs).toHaveLength(walks.length);
    expect(new Set(slugs)).toEqual(new Set(walks.map(({ slug }) => slug)));
  });

  it('restores combined filters and sort from a URL', () => {
    const params = new URLSearchParams(
      'route=circular&max_miles=4&feature=woodland&feature=pub&sort=shortest',
    );
    const { results } = browse(params);
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every(
        (walk) =>
          walk.route_type === 'circular' &&
          walk.distance_miles <= 4 &&
          walk.woodland &&
          walk.pub,
      ),
    ).toBe(true);
    expect(results.map((walk) => walk.distance_miles)).toEqual(
      results.map((walk) => walk.distance_miles).sort((a, b) => a - b),
    );
    renderAt('/?' + params);
    expect(screen.getByLabelText('Route type')).toHaveValue('circular');
    expect(screen.getByLabelText('Woodland')).toBeChecked();
    expect(screen.getByLabelText('Pub')).toBeChecked();
  });

  it('replaces the page parameter when submitting a search', () => {
    renderAt('/?page=2');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search walks' }), {
      target: { value: 'Marathon Loop' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(screen.getByTestId('query')).toHaveTextContent(
      /^\?q=Marathon\+Loop$/,
    );
    expect(screen.getByRole('link', { name: 'Marathon Loop' })).toHaveAttribute(
      'href',
      '/walk/115',
    );
  });

  it('opens a legacy deep link with route actions and gallery fallback', async () => {
    renderAt('/walk/115');
    expect(
      screen.getByRole('heading', { name: 'Marathon Loop' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Open original route' }),
    ).toHaveAttribute('href', expect.stringContaining('walk-115'));
    expect(
      screen.queryByRole('link', { name: 'Directions to start' }),
    ).toBeNull();
    expect(
      within(screen.getByRole('region', { name: 'Photos' })).getByRole('link'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Print walk' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Copy walk link' }));
    expect(
      await screen.findByRole('textbox', { name: 'Walk link' }),
    ).toHaveValue(new URL('/walk/115', window.location.origin).href);
  });

  it('preserves the catalogue query when returning from a walk', () => {
    renderAt('/?q=marathon+loop');
    fireEvent.click(screen.getByRole('link', { name: 'Marathon Loop' }));
    fireEvent.click(screen.getByRole('link', { name: 'Back to walks' }));
    expect(screen.getByRole('searchbox', { name: 'Search walks' })).toHaveValue(
      'marathon loop',
    );
  });

  it('offers a route back from a missing walk', () => {
    renderAt('/walk/does-not-exist');
    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Browse the walk catalogue' }),
    ).toHaveAttribute('href', '/');
  });

  it('renders every legacy detail route without console errors', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      for (const walk of walks) {
        const view = renderAt(`/walk/${walk.slug}`);
        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
          walk.title,
        );
        view.unmount();
      }
      expect(errors).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
    }
  }, 15_000);
});

describe('map and nearby search', () => {
  it('uses the full filtered set for the map, irrespective of the list page', () => {
    const query = 'feature=woodland&feature=pub&max_miles=4';
    const first = browse(new URLSearchParams(query));
    const second = browse(new URLSearchParams(query + '&page=2&view=map'));
    expect(second.matches).toEqual(first.matches);
    expect(second.results).not.toEqual(first.results);
    expect(second.matches.filter(hasCoordinates).length).toBeGreaterThan(12);
  });

  it('debounces local place lookup and combines nearby distance with catalogue filters', async () => {
    expect(searchPlaces(' NORTH   MYMMS ')).toBe(searchPlaces('north mymms'));
    renderAt('/?feature=pub');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Find a place' }), {
      target: { value: 'North Mymms' },
    });
    expect(screen.queryByRole('list', { name: 'Matching places' })).toBeNull();
    fireEvent.click(
      await screen.findByRole('button', { name: 'North Mymms (Walk 1)' }),
    );
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue(
      'nearest',
    );
    expect(screen.getByText('0.0 mi from North Mymms')).toBeVisible();
    expect(screen.getByTestId('query')).toHaveTextContent('?feature=pub');
    fireEvent.click(screen.getByRole('button', { name: 'Clear nearby' }));
    expect(screen.queryByText('0.0 mi from North Mymms')).toBeNull();
  });

  it('keeps the list accessible when geolocation is denied', () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((_success, fail) => fail({ code: 1 })),
      },
    });
    try {
      renderAt('/');
      fireEvent.click(screen.getByText('Find nearby walks', { exact: true }));
      fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
      expect(screen.getByText(/Could not get your location/)).toBeVisible();
      expect(
        screen.getByRole('heading', { name: `${walks.length} walks` }),
      ).toBeVisible();
    } finally {
      if (original) Object.defineProperty(navigator, 'geolocation', original);
      else Reflect.deleteProperty(navigator, 'geolocation');
    }
  });

  it('uses device coordinates for nearby search without putting them in the URL', () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success) =>
          success({ coords: { latitude: 51.724143, longitude: -0.203483 } }),
        ),
      },
    });
    try {
      renderAt('/?feature=pub');
      fireEvent.click(screen.getByText('Find nearby walks', { exact: true }));
      fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
      expect(screen.getByText('0.0 mi from Your location')).toBeVisible();
      expect(screen.getByTestId('query').textContent).toBe('?feature=pub');
    } finally {
      if (original) Object.defineProperty(navigator, 'geolocation', original);
      else Reflect.deleteProperty(navigator, 'geolocation');
    }
  });

  it('keeps markers and results available when tile images fail', async () => {
    const width = vi
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockReturnValue(800);
    const height = vi
      .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
      .mockReturnValue(500);
    try {
      renderAt('/?view=map&q=north+mymms+loop');
      const map = await screen.findByRole('region', {
        name: 'Map of walk starts',
      });
      const tiles = await waitFor(() => {
        const pending = map.querySelectorAll('.leaflet-tile');
        expect(pending.length).toBeGreaterThan(0);
        return pending;
      });
      for (const tile of tiles) fireEvent.error(tile);
      expect(
        await screen.findByText(/map tiles are unavailable/),
      ).toBeVisible();
      expect(
        map.querySelector('.walk-map-pin, .marker-cluster'),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'North Mymms Loop' }),
      ).toBeVisible();
    } finally {
      width.mockRestore();
      height.mockRestore();
    }
  });
});

describe('curated publisher samples', () => {
  it.each([
    [
      'Fancy Free Walks',
      'fancy-free--kimpton',
      'Ayot St. Lawrence and Kimpton',
    ],
    ['Saturday Walkers Club', 'swc--168', 'Broxbourne Circular'],
    [
      'Chiltern Society',
      'chiltern-society--tring-winter-walk',
      'Tring winter walk',
    ],
  ])(
    'lists and opens the %s sample with its original source',
    (publisher, slug, title) => {
      renderAt('/?' + new URLSearchParams({ source: publisher }));
      expect(screen.getByRole('heading', { name: '1 walk' })).toBeVisible();
      const link = screen.getByRole('link', { name: title });
      expect(link).toHaveAttribute('href', '/walk/' + slug);
      fireEvent.click(link);
      expect(
        screen.getByRole('heading', { name: title, level: 1 }),
      ).toBeVisible();
      const walk = walks.find((record) => record.slug === slug);
      expect(
        screen.getByRole('link', { name: 'Open original route' }),
      ).toHaveAttribute('href', walk?.source_url);
      expect(
        screen.queryByRole('link', { name: 'Directions to start' }),
      ).toBeNull();
      expect(screen.queryByRole('img')).toBeNull();
    },
  );
});

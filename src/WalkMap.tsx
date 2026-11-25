import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useEffect, useRef, useState } from 'react';
import { useHref, useNavigate } from 'react-router-dom';
import type { Point } from './domain/nearby';

type Pin = Point & { slug: string; title: string; distance_miles: number };
type MapLayers = {
  map: L.Map;
  clusters: L.MarkerClusterGroup;
  fitKey?: string;
};
type TileStatus = 'loading' | 'ready' | 'unavailable' | 'partial';
const tileUrl =
  import.meta.env.VITE_MAP_TILE_URL ||
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const attribution =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const pinIcon = L.divIcon({
  className: 'walk-map-pin',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -9],
});

export default function WalkMap({
  pins,
  catalogueSearch,
}: {
  pins: Pin[];
  catalogueSearch: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  const layers = useRef<MapLayers | null>(null);
  const navigate = useNavigate();
  const walkBase = useHref('/walk');
  const [tileStatus, setTileStatus] = useState<TileStatus>('loading');

  useEffect(() => {
    if (!element.current) return;
    const map = L.map(element.current, { scrollWheelZoom: false, maxZoom: 19 });
    const clusters = L.markerClusterGroup({
      showCoverageOnHover: false,
      animate: false,
    });
    map.addLayer(clusters);
    layers.current = { map, clusters };
    const tiles = L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 19,
      updateWhenIdle: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
    });
    let loaded = 0;
    let failed = 0;
    let timeout = 0;
    tiles.on('loading', () => {
      loaded = 0;
      failed = 0;
      window.clearTimeout(timeout);
      timeout = window.setTimeout(
        () => setTileStatus(loaded ? 'partial' : 'unavailable'),
        8000,
      );
    });
    tiles.on('tileload', () => {
      loaded += 1;
    });
    tiles.on('tileerror', () => {
      failed += 1;
    });
    tiles.on('load', () => {
      window.clearTimeout(timeout);
      setTileStatus(
        failed === 0 ? 'ready' : loaded ? 'partial' : 'unavailable',
      );
    });
    // Wait until the marker bounds set the starting viewport, then load its tiles.
    const frame = window.requestAnimationFrame(() => tiles.addTo(map));
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      layers.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const current = layers.current;
    if (!current || pins.length === 0) return;
    const markers = pins.map((pin) => {
      const marker = L.marker([pin.latitude, pin.longitude], {
        icon: pinIcon,
        title: pin.title,
        alt: pin.title,
      });
      const popup = document.createElement('div');
      const link = document.createElement('a');
      link.href = `${walkBase}/${pin.slug}`;
      link.textContent = pin.title;
      link.addEventListener('click', (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
          return;
        event.preventDefault();
        void navigate(`/walk/${pin.slug}`, { state: { catalogueSearch } });
      });
      popup.append(link, ` · ${pin.distance_miles} mi`);
      return marker.bindPopup(popup);
    });
    current.clusters.clearLayers();
    current.clusters.addLayers(markers);
    const fitKey = pins
      .map((pin) => pin.slug)
      .sort()
      .join(',');
    if (current.fitKey !== fitKey) {
      current.map.fitBounds(current.clusters.getBounds(), {
        padding: [28, 28],
        maxZoom: 13,
        animate: false,
      });
      current.fitKey = fitKey;
    }
  }, [pins, catalogueSearch, navigate, walkBase]);

  return (
    <>
      <div
        ref={element}
        className="walk-map"
        role="region"
        aria-label="Map of walk starts"
      />
      {tileStatus !== 'ready' && (
        <p className="map-status" role="status">
          {tileStatus === 'loading'
            ? 'Loading the basemap…'
            : 'Some or all map tiles are unavailable. Walk starts and the results list are still available.'}
        </p>
      )}
    </>
  );
}

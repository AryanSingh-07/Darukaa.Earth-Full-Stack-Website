import { useEffect, useRef } from "react";
import mapboxgl, { type Map as MapboxMap } from "mapbox-gl";
import type { Site } from "../types";

const rasterStyle: mapboxgl.Style = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

interface Props {
  sites: Site[];
  selectedProject: string;
  onSelectSite: (id: string) => void;
}

export default function PortfolioMap({
  sites,
  selectedProject,
  onSelectSite,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const selectRef = useRef(onSelectSite);
  selectRef.current = onSelectSite;
  const visibleSites =
    selectedProject === "all"
      ? sites
      : sites.filter((site) => site.project_id === selectedProject);

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: container.current,
      style: rasterStyle,
      center: [78.8, 21.6],
      zoom: 4.2,
      attributionControl: false,
    });
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-left",
    );
    map.on("load", () => {
      map.addSource("sites", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "site-fill",
        type: "fill",
        source: "sites",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.38,
        },
      });
      map.addLayer({
        id: "site-outline",
        type: "line",
        source: "sites",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 2.4,
        },
      });
      map.on("click", "site-fill", (event) => {
        const id = event.features?.[0]?.properties?.id as string | undefined;
        if (id) selectRef.current(id);
      });
      map.on(
        "mouseenter",
        "site-fill",
        () => (map.getCanvas().style.cursor = "pointer"),
      );
      map.on(
        "mouseleave",
        "site-fill",
        () => (map.getCanvas().style.cursor = ""),
      );
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: visibleSites.map((site) => ({
        type: "Feature",
        geometry: site.geometry,
        properties: {
          id: site.id,
          name: site.name,
          color: site.project_color,
        },
      })),
    };
    const update = () => {
      const source = map.getSource("sites") as
        mapboxgl.GeoJSONSource | undefined;
      source?.setData(data);
      if (visibleSites.length) {
        const bounds = new mapboxgl.LngLatBounds();
        visibleSites.forEach((site) =>
          site.geometry.coordinates[0].forEach(([lng, lat]) =>
            bounds.extend([lng, lat]),
          ),
        );
        map.fitBounds(bounds, { padding: 70, maxZoom: 8, duration: 800 });
      }
    };
    if (map.isStyleLoaded()) update();
    else map.once("load", update);
  }, [visibleSites]);

  return (
    <div className="map-wrap">
      <div ref={container} className="map-canvas" />
      <div className="map-legend">
        <span>
          <i /> Project site
        </span>
        <small>Click a boundary to inspect</small>
      </div>
    </div>
  );
}

import { FormEvent, useEffect, useRef, useState } from "react";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import area from "@turf/area";
import mapboxgl, { type Map as MapboxMap } from "mapbox-gl";
import { MapPin, MousePointer2, X } from "lucide-react";
import type { Project } from "../types";

const drawStyle: mapboxgl.Style = {
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
  projects: Project[];
  initialProjectId?: string;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

export default function SiteModal({
  projects,
  initialProjectId,
  onClose,
  onSubmit,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [geometry, setGeometry] = useState<GeoJSON.Polygon | null>(null);
  const [areaHectares, setAreaHectares] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!mapContainer.current) return;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: drawStyle,
      center: [78.8, 21.5],
      zoom: 4.1,
    });
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      defaultMode: "draw_polygon",
    });
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-left",
    );
    map.addControl(draw, "top-right");
    const updatePolygon = () => {
      const collection = draw.getAll();
      const feature = collection.features[0];
      if (feature?.geometry.type === "Polygon") {
        setGeometry(feature.geometry);
        setAreaHectares(Math.round((area(feature) / 10_000) * 10) / 10);
      } else {
        setGeometry(null);
        setAreaHectares(0);
      }
    };
    map.on("draw.create", updatePolygon);
    map.on("draw.update", updatePolygon);
    map.on("draw.delete", updatePolygon);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!geometry) {
      setError("Draw a site boundary on the map before saving.");
      return;
    }
    const data = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    try {
      await onSubmit({
        project_id: data.get("project_id"),
        name: data.get("name"),
        description: data.get("description"),
        geometry,
        area_hectares: areaHectares,
      });
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save site.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop modal-backdrop--map" role="presentation">
      <section
        className="modal-card modal-card--map"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-title"
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Geospatial boundary</span>
            <h2 id="site-title">Add a monitoring site</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="site-modal-layout">
          <form onSubmit={submit} className="site-form">
            <label>
              Project
              <select
                name="project_id"
                defaultValue={initialProjectId || projects[0]?.id}
                required
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Site name
              <input
                name="name"
                placeholder="e.g. Northern Ridge Plot"
                minLength={3}
                required
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                rows={3}
                placeholder="Habitat type and monitoring notes"
                required
              />
            </label>
            <div className="draw-status">
              {geometry ? <MapPin size={18} /> : <MousePointer2 size={18} />}
              <div>
                <strong>
                  {geometry ? "Boundary captured" : "Draw a polygon"}
                </strong>
                <span>
                  {geometry
                    ? `Calculated area: ${areaHectares.toLocaleString()} ha`
                    : "Click points around the site, then close the shape."}
                </span>
              </div>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions">
              <button
                type="button"
                className="button button--ghost"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="button button--primary"
                disabled={loading || !projects.length}
              >
                {loading ? "Saving..." : "Save site"}
              </button>
            </div>
          </form>
          <div className="draw-map-wrap">
            <div ref={mapContainer} className="draw-map" />
            <div className="map-instruction">
              Use the polygon tool to define the site boundary
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

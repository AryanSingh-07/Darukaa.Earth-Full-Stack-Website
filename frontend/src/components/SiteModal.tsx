import { FormEvent, useEffect, useRef, useState } from "react";
import area from "@turf/area";
import mapboxgl, { type GeoJSONSource, type Map as MapboxMap } from "mapbox-gl";
import {
  Check,
  MapPin,
  MousePointer2,
  RotateCcw,
  Undo2,
  X,
} from "lucide-react";
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

type Coordinate = [number, number];

function draftGeoJson(points: Coordinate[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = points.map((coordinates, index) => ({
    type: "Feature",
    properties: { index },
    geometry: { type: "Point", coordinates },
  }));

  if (points.length >= 2) {
    features.unshift({
      type: "Feature",
      properties: {},
      geometry:
        points.length >= 3
          ? { type: "Polygon", coordinates: [[...points, points[0]]] }
          : { type: "LineString", coordinates: points },
    });
  }

  return { type: "FeatureCollection", features };
}

export default function SiteModal({
  projects,
  initialProjectId,
  onClose,
  onSubmit,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const pointsRef = useRef<Coordinate[]>([]);
  const finishedRef = useRef(false);
  const [geometry, setGeometry] = useState<GeoJSON.Polygon | null>(null);
  const [pointCount, setPointCount] = useState(0);
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
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-left",
    );

    map.on("load", () => {
      map.addSource("site-boundary-draft", {
        type: "geojson",
        data: draftGeoJson([]),
      });
      map.addLayer({
        id: "site-boundary-fill",
        type: "fill",
        source: "site-boundary-draft",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": "#2f855a", "fill-opacity": 0.22 },
      });
      map.addLayer({
        id: "site-boundary-line",
        type: "line",
        source: "site-boundary-draft",
        filter: [
          "in",
          ["geometry-type"],
          ["literal", ["LineString", "Polygon"]],
        ],
        paint: {
          "line-color": "#145b3f",
          "line-width": 3,
          "line-dasharray": [1.5, 1],
        },
      });
      map.addLayer({
        id: "site-boundary-points",
        type: "circle",
        source: "site-boundary-draft",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 6,
          "circle-color": "#b9ea68",
          "circle-stroke-color": "#145b3f",
          "circle-stroke-width": 2,
        },
      });
    });

    map.on("click", (event) => {
      if (finishedRef.current) return;
      pointsRef.current = [
        ...pointsRef.current,
        [event.lngLat.lng, event.lngLat.lat],
      ];
      setPointCount(pointsRef.current.length);
      setError("");
      const source = map.getSource("site-boundary-draft") as
        GeoJSONSource | undefined;
      source?.setData(draftGeoJson(pointsRef.current));
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const updateDraft = (points: Coordinate[]) => {
    pointsRef.current = points;
    finishedRef.current = false;
    setPointCount(points.length);
    setGeometry(null);
    setAreaHectares(0);
    const source = mapRef.current?.getSource("site-boundary-draft") as
      GeoJSONSource | undefined;
    source?.setData(draftGeoJson(points));
  };

  const finishBoundary = () => {
    if (pointsRef.current.length < 3) {
      setError("Add at least three boundary points before finishing.");
      return;
    }
    const polygon: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [[...pointsRef.current, pointsRef.current[0]]],
    };
    const squareMetres = area({
      type: "Feature",
      properties: {},
      geometry: polygon,
    });
    if (squareMetres === 0) {
      setError("Spread the points apart to create a visible boundary area.");
      return;
    }
    finishedRef.current = true;
    setGeometry(polygon);
    setAreaHectares(Math.round((squareMetres / 10_000) * 10) / 10);
    setError("");
  };

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
                  {geometry ? "Boundary captured" : "Mark the boundary"}
                </strong>
                <span>
                  {geometry
                    ? `Calculated area: ${areaHectares.toLocaleString()} ha`
                    : `${pointCount} point${pointCount === 1 ? "" : "s"} added · minimum 3`}
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
            <div className="draw-tools" aria-label="Boundary tools">
              <button
                type="button"
                onClick={() => updateDraft(pointsRef.current.slice(0, -1))}
                disabled={!pointCount || Boolean(geometry)}
              >
                <Undo2 size={15} /> Undo
              </button>
              <button
                type="button"
                onClick={() => updateDraft([])}
                disabled={!pointCount}
              >
                <RotateCcw size={15} /> Reset
              </button>
              <button
                type="button"
                className="draw-tools__finish"
                onClick={finishBoundary}
                disabled={pointCount < 3 || Boolean(geometry)}
              >
                <Check size={15} /> Finish boundary
              </button>
            </div>
            <div className="map-instruction">
              {geometry
                ? "Boundary ready to save"
                : "Click the map to add points, then finish the boundary"}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

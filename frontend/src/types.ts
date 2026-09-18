export type Focus = "carbon" | "biodiversity" | "integrated";
export type Status = "planning" | "active" | "monitoring" | "completed";

export interface User {
  id: string;
  email: string;
  full_name: string;
}

export interface Measurement {
  recorded_at: string;
  carbon_tonnes: number;
  biodiversity_score: number;
  ndvi: number;
  trees_planted: number;
}

export interface Site {
  id: string;
  project_id: string;
  project_name: string;
  project_color: string;
  name: string;
  description: string;
  area_hectares: number;
  geometry: GeoJSON.Polygon;
  latest_carbon_tonnes: number;
  latest_biodiversity_score: number;
  latest_ndvi: number;
  measurement_count: number;
}

export interface SiteAnalytics extends Site {
  measurements: Measurement[];
  carbon_change_percent: number;
  biodiversity_change_percent: number;
  total_trees_planted: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  focus: Focus;
  status: Status;
  color: string;
  location_label: string;
  target_carbon_tonnes: number;
  start_date: string;
  end_date: string | null;
  site_count: number;
  total_area_hectares: number;
  carbon_tonnes: number;
  biodiversity_score: number;
}

export interface DashboardData {
  projects: Project[];
  sites: Site[];
  summary: {
    project_count: number;
    site_count: number;
    total_area_hectares: number;
    carbon_tonnes: number;
    average_biodiversity_score: number;
  };
}

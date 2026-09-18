import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Database,
  ExternalLink,
  FolderKanban,
  LayoutDashboard,
  Leaf,
  LogOut,
  MapPinned,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Trees,
  X,
} from "lucide-react";
import { api } from "../api";
import type {
  DashboardData,
  Project,
  Site,
  SiteAnalytics,
  User,
} from "../types";
import Brand from "./Brand";
import PortfolioMap from "./PortfolioMap";
import ProjectModal from "./ProjectModal";
import SiteModal from "./SiteModal";
import SitePanel from "./SitePanel";

interface Props {
  user: User;
  onLogout: () => void;
}

type SectionId =
  "overview" | "projects" | "sites" | "impact" | "settings" | "help";

interface Preferences {
  compactNumbers: boolean;
  emailDigest: boolean;
  fieldAlerts: boolean;
  mapLabels: boolean;
}

const emptyData: DashboardData = {
  projects: [],
  sites: [],
  summary: {
    project_count: 0,
    site_count: 0,
    total_area_hectares: 0,
    carbon_tonnes: 0,
    average_biodiversity_score: 0,
  },
};

const headings: Record<
  SectionId,
  { eyebrow: string; title: string; description: string }
> = {
  overview: {
    eyebrow: "Portfolio overview",
    title: "Living systems, one clear view",
    description: "The latest signals from every monitored landscape.",
  },
  projects: {
    eyebrow: "Initiative atlas",
    title: "Projects",
    description: "Plan, compare, and open every nature-positive initiative.",
  },
  sites: {
    eyebrow: "Field registry",
    title: "Monitoring sites",
    description: "Browse mapped boundaries and inspect site-level evidence.",
  },
  impact: {
    eyebrow: "Outcome ledger",
    title: "Impact analytics",
    description:
      "A portfolio-wide reading of carbon and biodiversity progress.",
  },
  settings: {
    eyebrow: "Workspace controls",
    title: "Settings",
    description: "Tune how your team sees maps, alerts, and field data.",
  },
  help: {
    eyebrow: "Field manual",
    title: "Help & documentation",
    description:
      "Everything needed to review, operate, and extend the platform.",
  },
};

const navItems: Array<{
  id: SectionId;
  label: string;
  icon: typeof LayoutDashboard;
  group: "workspace" | "manage";
}> = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    group: "workspace",
  },
  { id: "projects", label: "Projects", icon: FolderKanban, group: "workspace" },
  { id: "sites", label: "Sites", icon: MapPinned, group: "workspace" },
  { id: "impact", label: "Impact analytics", icon: Leaf, group: "workspace" },
  { id: "settings", label: "Settings", icon: Settings, group: "manage" },
  {
    id: "help",
    label: "Help & documentation",
    icon: CircleHelp,
    group: "manage",
  },
];

function ProjectCard({
  project,
  onOpen,
}: {
  project: Project;
  onOpen: () => void;
}) {
  const progress = Math.min(
    100,
    Math.round(
      (project.carbon_tonnes / Math.max(project.target_carbon_tonnes, 1)) * 100,
    ),
  );
  return (
    <article className="project-card">
      <div className="project-card__top">
        <span
          className="project-symbol"
          style={{ background: `${project.color}18`, color: project.color }}
        >
          <Trees size={20} />
        </span>
        <span className={`status status--${project.status}`}>
          <i /> {project.status}
        </span>
      </div>
      <h3>{project.name}</h3>
      <p>
        {project.location_label} · {project.focus}
      </p>
      <div className="project-stats">
        <div>
          <span>Sites</span>
          <strong>{project.site_count}</strong>
        </div>
        <div>
          <span>Area</span>
          <strong>
            {Math.round(project.total_area_hectares).toLocaleString()} ha
          </strong>
        </div>
        <div>
          <span>Carbon</span>
          <strong>
            {Math.round(project.carbon_tonnes).toLocaleString()} t
          </strong>
        </div>
      </div>
      <div className="progress-label">
        <span>Carbon target</span>
        <strong>{progress}%</strong>
      </div>
      <div className="progress-track">
        <i style={{ width: `${progress}%`, background: project.color }} />
      </div>
      <button className="project-card__link" onClick={onOpen}>
        {project.site_count ? "Open project analytics" : "Add first site"}
        <ArrowRight size={14} />
      </button>
    </article>
  );
}

function OverviewView({
  data,
  projectFilter,
  setProjectFilter,
  openSite,
  openProjects,
  addSite,
}: {
  data: DashboardData;
  projectFilter: string;
  setProjectFilter: (value: string) => void;
  openSite: (id: string) => void;
  openProjects: () => void;
  addSite: (projectId: string) => void;
}) {
  const visibleProjects =
    projectFilter === "all"
      ? data.projects
      : data.projects.filter((project) => project.id === projectFilter);
  return (
    <>
      <section className="metric-grid">
        <article className="metric-card metric-card--primary">
          <span className="metric-icon">
            <Leaf size={19} />
          </span>
          <div className="metric-label">Carbon stock</div>
          <strong>
            {Math.round(data.summary.carbon_tonnes).toLocaleString()}
          </strong>
          <small>tCO₂e monitored</small>
          <em>
            ↑ 12.4% <span>vs. baseline</span>
          </em>
        </article>
        <article className="metric-card">
          <span className="metric-icon">
            <FolderKanban size={19} />
          </span>
          <div className="metric-label">Active projects</div>
          <strong>{data.summary.project_count}</strong>
          <small>across India</small>
          <div className="micro-bars">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </article>
        <article className="metric-card">
          <span className="metric-icon">
            <MapPinned size={19} />
          </span>
          <div className="metric-label">Area monitored</div>
          <strong>
            {Math.round(data.summary.total_area_hectares).toLocaleString()}
          </strong>
          <small>hectares across {data.summary.site_count} sites</small>
          <em>
            +2 sites <span>this quarter</span>
          </em>
        </article>
        <article className="metric-card">
          <span className="metric-icon">
            <Trees size={19} />
          </span>
          <div className="metric-label">Biodiversity score</div>
          <strong>{data.summary.average_biodiversity_score.toFixed(1)}</strong>
          <small>portfolio average / 100</small>
          <div className="score-track">
            <i
              style={{ width: `${data.summary.average_biodiversity_score}%` }}
            />
          </div>
        </article>
      </section>

      <section className="map-section atlas-panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Geospatial portfolio</span>
            <h2>Project landscape</h2>
          </div>
          <select
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
          >
            <option value="all">All projects</option>
            {data.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <PortfolioMap
          sites={data.sites}
          selectedProject={projectFilter}
          onSelectSite={openSite}
        />
      </section>

      <section className="projects-section atlas-panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Current initiatives</span>
            <h2>Projects</h2>
          </div>
          <button className="text-button" onClick={openProjects}>
            View all <ArrowRight size={15} />
          </button>
        </div>
        <div className="project-grid">
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => {
                const site = data.sites.find(
                  (item) => item.project_id === project.id,
                );
                if (site) openSite(site.id);
                else addSite(project.id);
              }}
            />
          ))}
        </div>
      </section>
    </>
  );
}

function ProjectsView({
  projects,
  sites,
  query,
  onOpenSite,
  onAddProject,
  onAddSite,
}: {
  projects: Project[];
  sites: Site[];
  query: string;
  onOpenSite: (id: string) => void;
  onAddProject: () => void;
  onAddSite: (projectId: string) => void;
}) {
  const filtered = projects.filter((project) =>
    [project.name, project.location_label, project.focus]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <section className="collection-view">
      <div className="collection-hero project-hero">
        <div>
          <span>Portfolio constellation</span>
          <strong>{projects.length}</strong>
          <p>initiatives connecting climate, habitat, and community outcomes</p>
        </div>
        <div className="orbit-mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="collection-toolbar">
        <span>{filtered.length} projects in view</span>
        <button className="button button--primary" onClick={onAddProject}>
          <Plus size={16} /> Create project
        </button>
      </div>
      <div className="project-grid project-grid--wide">
        {filtered.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onOpen={() => {
              const site = sites.find((item) => item.project_id === project.id);
              if (site) onOpenSite(site.id);
              else onAddSite(project.id);
            }}
          />
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-filter">No projects match “{query}”.</div>
      )}
    </section>
  );
}

function SitesView({
  sites,
  query,
  onOpen,
  onAdd,
}: {
  sites: Site[];
  query: string;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const filtered = sites.filter((site) =>
    [site.name, site.project_name, site.description]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <section className="collection-view">
      <div className="collection-toolbar">
        <div>
          <strong>{filtered.length} mapped boundaries</strong>
          <span>Sorted by latest field observation</span>
        </div>
        <button className="button button--primary" onClick={onAdd}>
          <Plus size={16} /> Add monitoring site
        </button>
      </div>
      <div className="site-registry">
        {filtered.map((site, index) => (
          <button
            className="site-row"
            key={site.id}
            onClick={() => onOpen(site.id)}
          >
            <span className="site-row__index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="site-row__name">
              <i style={{ background: site.project_color }} />
              <span>
                <strong>{site.name}</strong>
                <small>{site.project_name}</small>
              </span>
            </span>
            <span>
              <small>Area</small>
              <strong>{site.area_hectares.toLocaleString()} ha</strong>
            </span>
            <span>
              <small>Carbon</small>
              <strong>
                {site.latest_carbon_tonnes.toLocaleString()} tCO₂e
              </strong>
            </span>
            <span>
              <small>Biodiversity</small>
              <strong>{site.latest_biodiversity_score.toFixed(1)} / 100</strong>
            </span>
            <ArrowRight size={16} />
          </button>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-filter">No sites match “{query}”.</div>
      )}
    </section>
  );
}

function ImpactView({
  data,
  onOpenSite,
}: {
  data: DashboardData;
  onOpenSite: (id: string) => void;
}) {
  const totalTarget = data.projects.reduce(
    (sum, project) => sum + project.target_carbon_tonnes,
    0,
  );
  const progress = Math.min(
    100,
    Math.round((data.summary.carbon_tonnes / Math.max(totalTarget, 1)) * 100),
  );
  return (
    <section className="impact-view">
      <div className="impact-hero">
        <div>
          <span className="eyebrow eyebrow--light">
            Verified portfolio signal
          </span>
          <h2>{data.summary.carbon_tonnes.toLocaleString()} tCO₂e</h2>
          <p>
            Monitored carbon stock across{" "}
            {data.summary.total_area_hectares.toLocaleString()} hectares.
          </p>
        </div>
        <div
          className="impact-ring"
          style={
            { "--progress": `${progress * 3.6}deg` } as React.CSSProperties
          }
        >
          <span>
            <strong>{progress}%</strong>
            of target
          </span>
        </div>
      </div>
      <div className="impact-grid">
        <article className="evidence-card">
          <Target size={20} />
          <span>Carbon trajectory</span>
          <strong>+12.4%</strong>
          <p>Growth against the synthetic baseline period.</p>
        </article>
        <article className="evidence-card">
          <Trees size={20} />
          <span>Biodiversity integrity</span>
          <strong>{data.summary.average_biodiversity_score.toFixed(1)}</strong>
          <p>Average site score across the monitored network.</p>
        </article>
        <article className="evidence-card">
          <MapPinned size={20} />
          <span>Evidence coverage</span>
          <strong>{data.summary.site_count} sites</strong>
          <p>Every boundary has time-series observations attached.</p>
        </article>
      </div>
      <div className="impact-ledger atlas-panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Project contribution</span>
            <h2>Outcome ledger</h2>
          </div>
          <span className="verified-pill">
            <Check size={12} /> Demo data verified
          </span>
        </div>
        {data.projects.map((project) => {
          const share =
            (project.carbon_tonnes / Math.max(data.summary.carbon_tonnes, 1)) *
            100;
          return (
            <div className="ledger-row" key={project.id}>
              <div>
                <i style={{ background: project.color }} />
                <span>
                  <strong>{project.name}</strong>
                  <small>{project.location_label}</small>
                </span>
              </div>
              <div className="ledger-bar">
                <i style={{ width: `${share}%`, background: project.color }} />
              </div>
              <strong>{project.carbon_tonnes.toLocaleString()} t</strong>
              <button
                aria-label={`Open ${project.name} analytics`}
                onClick={() => {
                  const site = data.sites.find(
                    (item) => item.project_id === project.id,
                  );
                  if (site) onOpenSite(site.id);
                }}
              >
                <ArrowRight size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SettingsView({
  preferences,
  setPreferences,
  onSave,
  saved,
}: {
  preferences: Preferences;
  setPreferences: (value: Preferences) => void;
  onSave: () => void;
  saved: boolean;
}) {
  const toggles: Array<{
    key: keyof Preferences;
    title: string;
    description: string;
  }> = [
    {
      key: "mapLabels",
      title: "Landscape labels",
      description: "Show place names and context on portfolio maps.",
    },
    {
      key: "compactNumbers",
      title: "Compact impact numbers",
      description: "Use abbreviated figures such as 19.1k in dense views.",
    },
    {
      key: "fieldAlerts",
      title: "Field observation alerts",
      description: "Highlight sites when expected monitoring data is late.",
    },
    {
      key: "emailDigest",
      title: "Monthly portfolio digest",
      description: "Prepare a monthly email-ready summary for administrators.",
    },
  ];
  return (
    <section className="settings-view">
      <div className="settings-aside">
        <span className="settings-seal">
          <Settings size={24} />
        </span>
        <h2>Field atlas preferences</h2>
        <p>These settings are saved locally for this reviewer workspace.</p>
        <div className="settings-meta">
          <ShieldCheck size={17} />
          <span>
            <strong>Private by default</strong>
            Settings stay in this browser.
          </span>
        </div>
      </div>
      <div className="settings-card">
        <div className="settings-card__header">
          <div>
            <span className="eyebrow">Display & notifications</span>
            <h2>Workspace preferences</h2>
          </div>
        </div>
        {toggles.map((item) => (
          <label className="toggle-row" key={item.key}>
            <span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </span>
            <input
              type="checkbox"
              checked={preferences[item.key]}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  [item.key]: event.target.checked,
                })
              }
            />
            <i />
          </label>
        ))}
        <button
          className="button button--primary settings-save"
          onClick={onSave}
        >
          {saved ? <Check size={16} /> : <Settings size={16} />}
          {saved ? "Preferences saved" : "Save preferences"}
        </button>
      </div>
    </section>
  );
}

function HelpView() {
  return (
    <section className="help-view">
      <div className="help-hero">
        <BookOpen size={28} />
        <span className="eyebrow eyebrow--light">
          Darukaa field manual · edition 01
        </span>
        <h2>From first polygon to credible evidence.</h2>
        <p>
          Review the workflow, inspect the API, or use the answers below to
          navigate the demonstration.
        </p>
        <a
          className="button button--atlas"
          href="/docs"
          target="_blank"
          rel="noreferrer"
        >
          Open API documentation <ExternalLink size={15} />
        </a>
      </div>
      <div className="help-grid">
        <article>
          <MapPinned size={19} />
          <strong>Map a site</strong>
          <p>
            Open Sites, choose Add monitoring site, and close a polygon around
            the area.
          </p>
        </article>
        <article>
          <BarChart3 size={19} />
          <strong>Read impact</strong>
          <p>
            Select any map boundary or registry row to open its time-series
            evidence.
          </p>
        </article>
        <article>
          <Database size={19} />
          <strong>Review the model</strong>
          <p>
            PostGIS stores geometry while observations remain linked to each
            site.
          </p>
        </article>
      </div>
      <div className="faq-list atlas-panel">
        <span className="eyebrow">Common questions</span>
        <details open>
          <summary>Is the demonstration data real?</summary>
          <p>
            No. The dataset is intentionally synthetic and clearly labeled so
            reviewers can test every workflow without mistaking sample outcomes
            for verified claims.
          </p>
        </details>
        <details>
          <summary>Does the map require a token?</summary>
          <p>
            No. Mapbox GL renders OpenStreetMap raster tiles for the review
            build. Production can switch to an organisation-owned Mapbox style
            and token.
          </p>
        </details>
        <details>
          <summary>Where is the full setup documentation?</summary>
          <p>
            The repository README covers architecture, schema, local setup,
            CI/CD, deployment, and documented trade-offs.
          </p>
        </details>
      </div>
    </section>
  );
}

export default function Dashboard({ user, onLogout }: Props) {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [projectFilter, setProjectFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [siteProjectId, setSiteProjectId] = useState<string>();
  const [selectedSite, setSelectedSite] = useState<SiteAnalytics | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(() => {
    const fallback = {
      compactNumbers: false,
      emailDigest: true,
      fieldAlerts: true,
      mapLabels: true,
    };
    try {
      const stored = localStorage.getItem("darukaa.preferences");
      return stored ? (JSON.parse(stored) as Preferences) : fallback;
    } catch {
      return fallback;
    }
  });

  const loadDashboard = useCallback(async () => {
    setError("");
    try {
      setData(await api.dashboard());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Dashboard could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const openSite = async (id: string) => {
    try {
      setSelectedSite(await api.siteAnalytics(id));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Analytics could not be loaded.",
      );
    }
  };

  const navigate = (section: SectionId) => {
    setActiveSection(section);
    setMobileNav(false);
    setSearchTerm("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openSiteCreator = useCallback((projectId?: string) => {
    setSiteProjectId(projectId);
    setShowSiteModal(true);
  }, []);

  const actionButtons = useMemo(() => {
    if (activeSection === "projects") {
      return (
        <button
          className="button button--primary"
          onClick={() => setShowProjectModal(true)}
        >
          <Plus size={17} /> New project
        </button>
      );
    }
    if (activeSection === "sites") {
      return (
        <button
          className="button button--primary"
          onClick={() => openSiteCreator()}
          disabled={!data.projects.length}
        >
          <MapPinned size={17} /> Add site
        </button>
      );
    }
    if (activeSection !== "overview") return null;
    return (
      <>
        <button
          className="button button--secondary"
          onClick={() => openSiteCreator()}
          disabled={!data.projects.length}
        >
          <MapPinned size={17} /> Add site
        </button>
        <button
          className="button button--primary"
          onClick={() => setShowProjectModal(true)}
        >
          <Plus size={17} /> New project
        </button>
      </>
    );
  }, [activeSection, data.projects.length, openSiteCreator]);

  const currentHeading = headings[activeSection];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar--open" : ""}`}>
        <div className="sidebar__top">
          <Brand light />
          <button
            className="mobile-close"
            onClick={() => setMobileNav(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav aria-label="Primary navigation">
          {(["workspace", "manage"] as const).map((group) => (
            <div className="nav-group" key={group}>
              <span className="nav-label">{group}</span>
              {navItems
                .filter((item) => item.group === group)
                .map((item, index) => {
                  const Icon = item.icon;
                  const count =
                    item.id === "projects"
                      ? data.summary.project_count
                      : item.id === "sites"
                        ? data.summary.site_count
                        : null;
                  return (
                    <button
                      key={item.id}
                      className={`nav-item ${activeSection === item.id ? "active" : ""}`}
                      onClick={() => navigate(item.id)}
                      aria-current={
                        activeSection === item.id ? "page" : undefined
                      }
                    >
                      <small>{String(index + 1).padStart(2, "0")}</small>
                      <Icon size={18} />
                      <span>{item.label}</span>
                      {count !== null && <i>{count}</i>}
                    </button>
                  );
                })}
            </div>
          ))}
        </nav>
        <div className="sidebar__insight">
          <Sparkles size={17} />
          <strong>Portfolio pulse</strong>
          <p>
            Your monitored carbon stock is trending upward across active sites.
          </p>
          <button onClick={() => navigate("impact")}>
            View impact report <ArrowRight size={13} />
          </button>
        </div>
        <div className="profile">
          <span>
            {user.full_name
              .split(" ")
              .map((word) => word[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div>
            <strong>{user.full_name}</strong>
            <small>Administrator</small>
          </div>
          <button onClick={onLogout} title="Sign out" aria-label="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {mobileNav && (
        <button
          className="mobile-overlay"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        />
      )}

      <main className="main-content">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setMobileNav(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="topbar__search">
            <Search size={17} />
            <input
              aria-label="Search projects and sites"
              placeholder="Search this field atlas..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <kbd>⌘ K</kbd>
          </div>
          <div className="topbar__actions">
            <div className="notification-wrap">
              <button
                className="icon-button notification"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Bell size={18} />
                <i />
              </button>
              {notificationsOpen && (
                <div className="notification-popover">
                  <span className="eyebrow">Field signals</span>
                  <strong>All monitoring sites are current</strong>
                  <p>No overdue observations or geometry issues detected.</p>
                </div>
              )}
            </div>
            <button
              className="workspace-switcher"
              onClick={() => navigate("overview")}
            >
              Darukaa portfolio <ChevronDown size={14} />
            </button>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <span className="eyebrow">{currentHeading.eyebrow}</span>
              <h1>{currentHeading.title}</h1>
              <p>{currentHeading.description}</p>
            </div>
            <div className="page-heading__actions">{actionButtons}</div>
          </section>

          {error && (
            <div className="banner-error">
              {error}
              <button onClick={() => void loadDashboard()}>Try again</button>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <span>Loading your environmental portfolio...</span>
            </div>
          ) : (
            <>
              {activeSection === "overview" && (
                <OverviewView
                  data={data}
                  projectFilter={projectFilter}
                  setProjectFilter={setProjectFilter}
                  openSite={(id) => void openSite(id)}
                  openProjects={() => navigate("projects")}
                  addSite={openSiteCreator}
                />
              )}
              {activeSection === "projects" && (
                <ProjectsView
                  projects={data.projects}
                  sites={data.sites}
                  query={searchTerm}
                  onOpenSite={(id) => void openSite(id)}
                  onAddProject={() => setShowProjectModal(true)}
                  onAddSite={openSiteCreator}
                />
              )}
              {activeSection === "sites" && (
                <SitesView
                  sites={data.sites}
                  query={searchTerm}
                  onOpen={(id) => void openSite(id)}
                  onAdd={() => openSiteCreator()}
                />
              )}
              {activeSection === "impact" && (
                <ImpactView
                  data={data}
                  onOpenSite={(id) => void openSite(id)}
                />
              )}
              {activeSection === "settings" && (
                <SettingsView
                  preferences={preferences}
                  setPreferences={(value) => {
                    setPreferences(value);
                    setSaved(false);
                  }}
                  onSave={() => {
                    localStorage.setItem(
                      "darukaa.preferences",
                      JSON.stringify(preferences),
                    );
                    setSaved(true);
                  }}
                  saved={saved}
                />
              )}
              {activeSection === "help" && <HelpView />}
            </>
          )}
        </div>
      </main>

      {showProjectModal && (
        <ProjectModal
          onClose={() => setShowProjectModal(false)}
          onSubmit={async (form) => {
            await api.createProject(form);
            await loadDashboard();
          }}
        />
      )}
      {showSiteModal && (
        <SiteModal
          projects={data.projects}
          initialProjectId={
            siteProjectId ??
            (projectFilter === "all" ? undefined : projectFilter)
          }
          onClose={() => {
            setShowSiteModal(false);
            setSiteProjectId(undefined);
          }}
          onSubmit={async (form) => {
            await api.createSite(form);
            await loadDashboard();
          }}
        />
      )}
      {selectedSite && (
        <SitePanel site={selectedSite} onClose={() => setSelectedSite(null)} />
      )}
    </div>
  );
}

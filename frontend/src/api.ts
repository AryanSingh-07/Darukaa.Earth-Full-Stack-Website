import type {
  DashboardData,
  Project,
  Site,
  SiteAnalytics,
  User,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL || "/api";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...options.headers,
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(
        body?.detail || "Something went wrong. Please try again.",
      );
    return body as T;
  }

  async login(email: string, password: string) {
    return this.request<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(full_name: string, email: string, password: string) {
    return this.request<{ access_token: string; user: User }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ full_name, email, password }),
      },
    );
  }

  dashboard() {
    return this.request<DashboardData>("/dashboard");
  }

  createProject(data: Record<string, unknown>) {
    return this.request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  createSite(data: Record<string, unknown>) {
    return this.request<Site>("/sites", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  siteAnalytics(id: string) {
    return this.request<SiteAnalytics>(`/sites/${id}/analytics`);
  }
}

export const api = new ApiClient();

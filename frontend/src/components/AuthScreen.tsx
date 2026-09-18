import { FormEvent, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Globe2,
  Leaf,
  LockKeyhole,
  Map,
} from "lucide-react";
import { api } from "../api";
import type { User } from "../types";
import Brand from "./Brand";

interface Props {
  onAuthenticated: (token: string, user: User) => void;
}

export default function AuthScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result =
        mode === "login"
          ? await api.login(email, password)
          : await api.register(fullName, email, password);
      onAuthenticated(result.access_token, result.user);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to continue.",
      );
    } finally {
      setLoading(false);
    }
  };

  const exploreDemo = async () => {
    setEmail("admin@darukaa.earth");
    setPassword("Demo123!");
    setLoading(true);
    setError("");
    try {
      const result = await api.login("admin@darukaa.earth", "Demo123!");
      onAuthenticated(result.access_token, result.user);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Demo is temporarily unavailable.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <div className="auth-story__glow" />
        <Brand light />
        <div className="auth-story__content">
          <span className="eyebrow eyebrow--light">
            <span className="pulse-dot" /> Environmental intelligence platform
          </span>
          <h1>
            Nature intelligence,
            <br />
            <span>grounded in place.</span>
          </h1>
          <p>
            Bring every restoration project, landscape boundary, and impact
            signal into one decision-ready workspace.
          </p>
          <div className="feature-grid">
            <article>
              <Map size={20} />
              <div>
                <strong>Map every site</strong>
                <span>Draw and monitor project boundaries</span>
              </div>
            </article>
            <article>
              <BarChart3 size={20} />
              <div>
                <strong>Measure progress</strong>
                <span>Carbon and biodiversity over time</span>
              </div>
            </article>
          </div>
        </div>
        <div className="auth-story__footer">
          <span>Built for credible climate action</span>
          <div className="avatar-stack" aria-hidden="true">
            <i>AR</i>
            <i>NK</i>
            <i>SG</i>
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="mobile-brand">
            <Brand />
          </div>
          <div className="auth-icon">
            <Globe2 size={23} />
          </div>
          <span className="eyebrow">Secure project workspace</span>
          <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="subtle">
            {mode === "login"
              ? "Sign in to continue to your environmental portfolio."
              : "Start mapping and measuring your nature projects."}
          </p>

          <form onSubmit={submit}>
            {mode === "register" && (
              <label>
                Full name
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your full name"
                  minLength={2}
                  required
                />
              </label>
            )}
            <label>
              Work email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@organisation.com"
                required
              />
            </label>
            <label>
              Password
              <span className="input-with-icon">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
                <LockKeyhole size={16} />
              </span>
            </label>
            {error && <div className="form-error">{error}</div>}
            <button
              className="button button--primary button--wide"
              disabled={loading}
            >
              {loading
                ? "Preparing workspace..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          {mode === "login" && (
            <>
              <div className="divider">
                <span>or</span>
              </div>
              <button
                type="button"
                className="button button--secondary button--wide"
                onClick={exploreDemo}
                disabled={loading}
              >
                <Leaf size={17} /> Explore demo workspace
              </button>
            </>
          )}

          <p className="auth-switch">
            {mode === "login" ? "New to Darukaa?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

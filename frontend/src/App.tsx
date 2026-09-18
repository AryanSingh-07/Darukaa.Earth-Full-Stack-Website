import { lazy, Suspense, useState } from "react";
import { api } from "./api";
import AuthScreen from "./components/AuthScreen";
import type { User } from "./types";

const Dashboard = lazy(() => import("./components/Dashboard"));

export default function App() {
  const [session, setSession] = useState<{ token: string; user: User } | null>(
    null,
  );

  const handleAuthenticated = (token: string, user: User) => {
    api.setToken(token);
    setSession({ token, user });
  };

  const handleLogout = () => {
    api.setToken(null);
    setSession(null);
  };

  return session ? (
    <Suspense
      fallback={
        <div className="loading-state loading-state--screen">
          <div className="spinner" />
          <span>Opening your portfolio...</span>
        </div>
      }
    >
      <Dashboard user={session.user} onLogout={handleLogout} />
    </Suspense>
  ) : (
    <AuthScreen onAuthenticated={handleAuthenticated} />
  );
}

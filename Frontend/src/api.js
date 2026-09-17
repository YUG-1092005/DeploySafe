const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
async function request(path, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };
  const token = localStorage.getItem("deploysafe_token");
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`${API_URL}${path}`, { ...options, headers });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) {
    localStorage.removeItem("deploysafe_token");
    localStorage.removeItem("deploysafe_user");
    window.dispatchEvent(new Event("auth-expired"));
  }
  if (!r.ok) throw Error(d.message || `Request failed (${r.status})`);
  return d;
}
export const api = {
  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (name, email, password) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  dashboard: () => request("/dashboard"),
  projects: () => request("/projects"),
  project: (id) => request(`/projects/${id}`),
  createProject: (p) =>
    request("/projects", { method: "POST", body: JSON.stringify(p) }),
  releases: () => request("/releases"),
  release: (id) => request(`/releases/${id}`),
  pipeline: (id) => request(`/pipelines/${id}`),
  risk: (id) => request(`/risk/${id}`),
  deployments: () => request("/deployments"),
  evaluate: (id) => request(`/releases/${id}/evaluate`, { method: "POST" }),
  deploy: (id) => request(`/releases/${id}/deploy`, { method: "POST" }),
  jenkinsStatus: () => request("/jenkins/status"),
  jenkinsRuns: (limit = 20) => request(`/jenkins/runs?limit=${limit}`),
  jenkinsGate: (id) => request(`/jenkins/releases/${id}/gate`),
};
export const loggedIn = () => !!localStorage.getItem("deploysafe_token");
export const saveSession = (x) => {
  localStorage.setItem("deploysafe_token", x.token);
  localStorage.setItem("deploysafe_user", JSON.stringify(x.user));
};
export const signOut = () => {
  localStorage.removeItem("deploysafe_token");
  localStorage.removeItem("deploysafe_user");
};

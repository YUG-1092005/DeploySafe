import React, { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Box,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Code2,
  Database,
  GitBranch,
  History,
  LayoutDashboard,
  Menu,
  Moon,
  PackageCheck,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  TestTube2,
  X,
  XCircle,
  LogOut,
  LockKeyhole,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api, loggedIn, saveSession, signOut } from "./api";

export default function App() {
  const [auth, setAuth] = useState(loggedIn()),
    [dark, setDark] = useState(
      localStorage.getItem("deploysafe_theme") !== "light",
    );
  useEffect(() => {
    const f = () => setAuth(false);
    addEventListener("auth-expired", f);
    return () => removeEventListener("auth-expired", f);
  }, []);
  const theme = (v) => {
    setDark(v);
    localStorage.setItem("deploysafe_theme", v ? "dark" : "light");
  };
  if (!auth)
    return (
      <div className={dark ? "app dark" : "app"}>
        <Login
          onLogin={(x) => {
            saveSession(x);
            setAuth(true);
          }}
        />
      </div>
    );
  return (
    <div className={dark ? "app dark" : "app"}>
      <Shell
        dark={dark}
        setDark={theme}
        logout={() => {
          signOut();
          setAuth(false);
        }}
      />
    </div>
  );
}

function Login({ onLogin }) {
  const [reg, setReg] = useState(false),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      onLogin(
        reg
          ? await api.register(name, email, password)
          : await api.login(email, password),
      );
    } catch (x) {
      setError(x.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-panel">
        <Brand />
        <div className="auth-copy">
          <span className="eyebrow">SOFTWARE RELEASE INTELLIGENCE</span>
          <h1>{reg ? "Create your workspace" : "Welcome back"}</h1>
          <p>
            {reg
              ? "Connect repositories and evaluate releases before deployment."
              : "Sign in to monitor live release, pipeline and deployment data."}
          </p>
        </div>
        <form onSubmit={submit}>
          {reg && (
            <label>
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
              placeholder="Minimum 6 characters"
            />
          </label>
          {error && (
            <div className="form-error">
              <AlertTriangle size={17} />
              {error}
            </div>
          )}
          <button className="primary full" disabled={loading}>
            {loading ? "Please wait…" : reg ? "Create account" : "Sign in"}
          </button>
        </form>
        <button
          className="switch-auth"
          onClick={() => {
            setReg(!reg);
            setError("");
          }}
        >
          {reg
            ? "Already have an account? Sign in"
            : "New to DeploySafe? Create an account"}
        </button>
        <div className="auth-note">
          <LockKeyhole size={15} /> Authenticated API access · no frontend demo
          records
        </div>
      </div>
    </div>
  );
}
function Brand() {
  return (
    <div className="brand auth-brand">
      <div className="brand-mark">
        <ShieldCheck size={24} />
      </div>
      <div>
        <strong>
          Deploy<span>Safe</span>
        </strong>
        <small>Release intelligence</small>
      </div>
    </div>
  );
}

function Shell({ dark, setDark, logout }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Sidebar open={open} close={() => setOpen(false)} logout={logout} />
      <div className="main-shell">
        <Header menu={() => setOpen(true)} dark={dark} setDark={setDark} />
        <main className="page">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<Project />} />
            <Route path="/releases" element={<Releases />} />
            <Route path="/releases/:id" element={<Release />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/jenkins" element={<JenkinsPage />} />
            <Route path="/risk" element={<Risk />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </>
  );
}
function readSelectedProject() {
  try {
    return JSON.parse(
      localStorage.getItem("deploysafe_selected_project") || "null",
    );
  } catch {
    return null;
  }
}

function setSelectedProject(project) {
  if (!project) return;
  const value = {
    id: project.id,
    name: project.name,
    repo: project.repo,
    branch: project.branch,
  };
  localStorage.setItem(
    "deploysafe_selected_project",
    JSON.stringify(value),
  );
  window.dispatchEvent(new Event("deploysafe-project-changed"));
}

function useSelectedProject() {
  const [project, setProject] = useState(readSelectedProject());

  useEffect(() => {
    const sync = () => setProject(readSelectedProject());
    window.addEventListener("deploysafe-project-changed", sync);
    return () =>
      window.removeEventListener("deploysafe-project-changed", sync);
  }, []);

  return project;
}

function projectMatches(row, project) {
  if (!row || !project) return false;

  const rowId =
    row.project_id ??
    row.projectId ??
    row.project?.id ??
    row.project?.project_id;

  if (rowId != null) {
    return String(rowId) === String(project.id);
  }

  const rowName =
    row.project_name ??
    row.projectName ??
    row.project?.name;

  return (
    rowName != null &&
    String(rowName).trim().toLowerCase() ===
      String(project.name || "").trim().toLowerCase()
  );
}

function Sidebar({ open, close, logout }) {
  const loc = useLocation(),
    nav = useNavigate(),
    user = JSON.parse(localStorage.getItem("deploysafe_user") || "{}");

  const items = [
    ["/", "Dashboard", LayoutDashboard],
    ["/projects", "Projects", Box],
    ["/releases", "Releases", PackageCheck],
    ["/pipeline", "Pipeline", GitBranch],
    ["/jenkins", "Jenkins CI/CD", Rocket],
    ["/risk", "Risk Analysis", ShieldCheck],
    ["/history", "Deployment History", History],
  ];

  const projectsState = useApi(api.projects);
  const selected = useSelectedProject();
  const projects = projectsState.data || [];

  useEffect(() => {
    if (!projects.length) return;

    const saved = readSelectedProject();
    const found = saved
      ? projects.find((p) => String(p.id) === String(saved.id))
      : null;

    if (found) {
      if (
        saved.name !== found.name ||
        saved.repo !== found.repo ||
        saved.branch !== found.branch
      ) {
        setSelectedProject(found);
      }
    } else {
      setSelectedProject(projects[0]);
    }
  }, [projectsState.data]);

  return (
    <>
      <div
        className={`mobile-overlay ${open ? "show" : ""}`}
        onClick={close}
      />

      <aside className={`sidebar ${open ? "mobile-show" : ""}`}>
        <Brand />

        <div className="workspace">
          <div className="avatar">
            {(user.name || "U")[0].toUpperCase()}
          </div>
          <div>
            <b>{user.name || "Workspace"}</b>
            <small>{user.email || "Authenticated"}</small>
          </div>
          <ChevronDown size={16} />
        </div>

        <div className="selected-project-box">
          <div className="selected-project-label">SELECTED PROJECT</div>

          {projectsState.loading ? (
            <div className="selected-project-loading">
              Loading projects…
            </div>
          ) : projectsState.error ? (
            <div className="selected-project-loading">
              Projects unavailable
            </div>
          ) : projects.length ? (
            <select
              value={selected?.id || projects[0]?.id || ""}
              onChange={(e) => {
                const project = projects.find(
                  (p) => String(p.id) === String(e.target.value),
                );
                if (project) setSelectedProject(project);
              }}
              aria-label="Selected project"
            >
              {projects.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="selected-project-loading">No projects</div>
          )}
        </div>

        <nav>
          <div className="nav-label">WORKSPACE</div>

          {items.map(([p, l, I]) => (
            <button
              key={p}
              className={`nav-item ${
                loc.pathname === p ||
                (p !== "/" && loc.pathname.startsWith(p))
                  ? "active"
                  : ""
              }`}
              onClick={() => {
                nav(p);
                close();
              }}
            >
              <I size={19} />
              {l}
            </button>
          ))}

          <div className="nav-label second">SYSTEM</div>

          <button
            className={`nav-item ${
              loc.pathname === "/settings" ? "active" : ""
            }`}
            onClick={() => {
              nav("/settings");
              close();
            }}
          >
            <Settings size={19} />
            Settings
          </button>

          <button
            className="nav-item"
            onClick={() => window.open("#", "_self")}
          >
            <CircleHelp size={19} />
            Documentation
          </button>
        </nav>

        <div className="sidebar-bottom">
          <JenkinsSidebarStatus />

          <button className="logout-btn" onClick={logout}>
            <LogOut size={16} /> Sign out
          </button>

          <div className="sidebar-version">
            DeploySafe · Phase 3
          </div>
        </div>

        <button className="icon-btn mobile-close" onClick={close}>
          <X size={20} />
        </button>
      </aside>
    </>
  );
}

function Header({ menu, dark, setDark }) {
  const loc = useLocation(),
    titles = {
      "/": ["Overview", "Live release intelligence from your backend."],
      "/projects": ["Projects", "Manage repositories connected to DeploySafe."],
      "/releases": [
        "Releases",
        "Review release candidates and deployment decisions.",
      ],
      "/pipeline": ["Pipeline", "Inspect CI/CD execution data."],
      "/risk": ["Risk Analysis", "Understand the signals behind release risk."],
      "/history": [
        "Deployment History",
        "Track recorded deployment decisions.",
      ],
      "/settings": ["Settings", "Configure your workspace."],
    };
  const t = titles[loc.pathname] || ["DeploySafe", "Release intelligence"];
  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={menu}>
        <Menu size={22} />
      </button>
      <div>
        <h1>{t[0]}</h1>
        <p>{t[1]}</p>
      </div>
      <div className="header-actions">
        <div className="search">
          <Search size={18} />
          <input placeholder="Search…" />
        </div>
        <button className="icon-btn" onClick={() => setDark(!dark)}>
          {dark ? <Moon size={19} /> : <Sparkles size={19} />}
        </button>
      </div>
    </header>
  );
}
function useApi(fn, deps = []) {
  const [s, setS] = useState({ loading: true, data: null, error: "" });
  const load = async () => {
    setS({ loading: true, data: null, error: "" });
    try {
      const x = await fn();
      setS({ loading: false, data: x.data ?? x, error: "" });
    } catch (e) {
      setS({ loading: false, data: null, error: e.message });
    }
  };
  useEffect(() => {
    load();
  }, deps);
  return { ...s, reload: load };
}
function Loading() {
  return (
    <div className="state-card">
      <RefreshCw className="spin" size={28} />
      <h3>Loading live data</h3>
      <p>Fetching the latest information from the DeploySafe API.</p>
    </div>
  );
}
function ErrorState({ message, reload }) {
  return (
    <div className="state-card error-state">
      <AlertTriangle size={28} />
      <h3>Could not load data</h3>
      <p>{message}</p>
      <button className="secondary" onClick={reload}>
        <RefreshCw size={17} /> Retry
      </button>
    </div>
  );
}
function Empty({
  icon: Icon = Database,
  title = "No data yet",
  text = "Connect a project or run a pipeline to start collecting data.",
  action,
  actionText,
}) {
  return (
    <div className="state-card">
      <div className="empty-icon">
        <Icon size={27} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="primary" onClick={action}>
          <Plus size={17} />
          {actionText}
        </button>
      )}
    </div>
  );
}
function HeaderPage({ title, subtitle, button, onClick }) {
  return (
    <div className="page-heading">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {button && (
        <button className="primary" onClick={onClick}>
          <Plus size={17} />
          {button}
        </button>
      )}
    </div>
  );
}
function Metric({ title, value, icon: I }) {
  return (
    <div className="card metric">
      <div className="metric-top">
        <span>{title}</span>
        <div className="metric-icon">
          <I size={19} />
        </div>
      </div>
      <div className="metric-value">{value}</div>
    </div>
  );
}
function RiskPill({ value = 0 }) {
  let v = Number(value);
  return (
    <span
      className={`risk-pill ${v < 30 ? "low" : v < 60 ? "medium" : "high"}`}
    >
      <i />
      {v}
    </span>
  );
}
function Status({ status }) {
  let s = String(status || "Unknown");
  return (
    <span
      className={`status ${s === "Blocked" || s === "FAILED" ? "blocked" : s === "Warning" || s === "RUNNING" ? "warning" : "ready"}`}
    >
      {s === "Blocked" || s === "FAILED" ? (
        <XCircle size={14} />
      ) : s === "Warning" || s === "RUNNING" ? (
        <AlertTriangle size={14} />
      ) : (
        <CheckCircle2 size={14} />
      )}{" "}
      {s}
    </span>
  );
}
function RiskRing({ value, size = 120 }) {
  let r = 42,
    c = 2 * Math.PI * r,
    d = c * (1 - Number(value) / 100);
  return (
    <div className="risk-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100">
        <circle className="ring-bg" cx="50" cy="50" r={r} />
        <circle
          className="ring-value"
          cx="50"
          cy="50"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={d}
        />
      </svg>
      <div>
        <b>{value}</b>
        <small>/100</small>
      </div>
    </div>
  );
}

function Dashboard() {
  const s = useApi(api.dashboard);
  if (s.loading) return <Loading />;
  if (s.error) return <ErrorState message={s.error} reload={s.reload} />;
  const d = s.data || {},
    sum = d.summary || {},
    rows = d.recentReleases || [],
    projects = d.projects || [];
  if (!projects.length && !rows.length)
    return (
      <>
        <HeaderPage
          title="Dashboard"
          subtitle="Your live release intelligence workspace."
        />
        <Empty
          icon={Rocket}
          title="Your dashboard is ready"
          text="No projects or releases are connected. Add a project to begin."
          action={() => (location.href = "/projects")}
          actionText="Add project"
        />
      </>
    );
  const chart = rows
    .slice()
    .reverse()
    .map((x) => ({ name: x.release_key, risk: Number(x.risk || 0) }));
  return (
    <>
      <HeaderPage
        title="Release overview"
        subtitle="Live data from PostgreSQL through the DeploySafe API."
      />
      <div className="metrics-grid">
        <Metric
          title="Total releases"
          value={sum.total ?? 0}
          icon={PackageCheck}
        />
        <Metric
          title="Average risk"
          value={sum.avg_risk ?? 0}
          icon={ShieldCheck}
        />
        <Metric
          title="Healthy releases"
          value={sum.healthy ?? 0}
          icon={CheckCircle2}
        />
        <Metric
          title="Blocked releases"
          value={sum.blocked ?? 0}
          icon={XCircle}
        />
      </div>
      <div className="dashboard-grid">
        <div className="card">
          <CardHeader
            title="Release risk trend"
            subtitle="Latest releases returned by the API"
          />
          {chart.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chart}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  opacity={0.08}
                />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="risk"
                  stroke="var(--accent)"
                  fill="var(--accent-fill)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Empty
              title="No trend data"
              text="Evaluate releases to populate risk history."
            />
          )}
        </div>
        <div className="card">
          <CardHeader title="Latest release" />
          {rows[0] ? (
            <Link className="latest-release" to={`/releases/${rows[0].id}`}>
              <div className="release-hero">
                <div>
                  <Status status={rows[0].status} />
                  <h3>{rows[0].version}</h3>
                  <p>
                    {rows[0].project_name || "Project"} ·{" "}
                    {rows[0].commit_hash || "—"}
                  </p>
                </div>
                <RiskRing value={Number(rows[0].risk || 0)} size={110} />
              </div>
              <CheckRow
                label="Coverage"
                value={`${Number(rows[0].coverage || 0)}%`}
              />
              <CheckRow
                label="Tests"
                value={`${rows[0].tests_total ? Math.round((rows[0].tests_passed / rows[0].tests_total) * 100) : 0}%`}
              />
            </Link>
          ) : (
            <Empty
              title="No releases"
              text="Release data will appear after your first pipeline."
            />
          )}
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="card">
          <CardHeader
            title="Recent releases"
            action="View all"
            href="/releases"
          />
          {rows.length ? (
            <ReleaseTable rows={rows} />
          ) : (
            <Empty
              title="No releases"
              text="No release records are available yet."
            />
          )}
        </div>
        <div className="card">
          <CardHeader title="Projects" />
          {projects.length ? (
            projects.map((p) => (
              <Link
                className="mini-row"
                to={`/projects/${p.id}`}
                key={p.id}
                onClick={() => setSelectedProject(p)}
              >
                <div className="repo-icon">
                  <Database size={19} />
                </div>
                <div>
                  <b>{p.name}</b>
                  <span>{p.repo}</span>
                </div>
                <RiskPill value={p.risk} />
              </Link>
            ))
          ) : (
            <Empty title="No projects" text="Add your first repository." />
          )}
        </div>
      </div>
    </>
  );
}
function CardHeader({ title, subtitle, action, href }) {
  return (
    <div className="card-header">
      <div>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && (
        <Link className="text-btn" to={href}>
          {action} →
        </Link>
      )}
    </div>
  );
}
function CheckRow({ label, value }) {
  return (
    <div className="check-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
function ReleaseTable({ rows }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Release</th>
            <th>Project</th>
            <th>Status</th>
            <th>Risk</th>
            <th>Tests</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => (location.href = `/releases/${r.id}`)}
            >
              <td>
                <b>{r.version}</b>
                <small>{r.release_key}</small>
              </td>
              <td>{r.project_name || "—"}</td>
              <td>
                <Status status={r.status} />
              </td>
              <td>
                <RiskPill value={r.risk} />
              </td>
              <td>
                {r.tests_total
                  ? Math.round((r.tests_passed / r.tests_total) * 100)
                  : 0}
                %
              </td>
              <td className="muted">
                {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Projects() {
  const s = useApi(api.projects),
    [show, setShow] = useState(false);
  if (s.loading) return <Loading />;
  if (s.error) return <ErrorState message={s.error} reload={s.reload} />;
  let rows = s.data || [];
  return (
    <>
      <HeaderPage
        title="Projects"
        subtitle="Repositories connected to your workspace."
        button="Add project"
        onClick={() => setShow(true)}
      />
      {rows.length ? (
        <div className="project-grid">
          {rows.map((p) => (
            <Link
              className="card project-card"
              to={`/projects/${p.id}`}
              key={p.id}
              onClick={() => setSelectedProject(p)}
            >
              <div className="project-title">
                <div className="repo-icon">
                  <Database size={21} />
                </div>
                <div>
                  <h3>{p.name}</h3>
                  <p>{p.repo}</p>
                </div>
              </div>
              <div className="project-meta">
                <span>
                  <GitBranch size={15} />
                  {p.branch}
                </span>
                <Status status={p.status} />
              </div>
              <div className="project-stats">
                <div>
                  <small>Last release</small>
                  <b>{p.last_release || "—"}</b>
                </div>
                <div>
                  <small>Risk</small>
                  <RiskPill value={p.risk} />
                </div>
                <div>
                  <small>Uptime</small>
                  <b>{p.uptime ? `${p.uptime}%` : "—"}</b>
                </div>
              </div>
              <div className="project-footer">
                {p.builds || 0} pipeline runs <span>Open →</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Empty
          icon={Server}
          title="No projects connected"
          text="Add a Git repository to begin collecting release data."
          action={() => setShow(true)}
          actionText="Add project"
        />
      )}
      {show && <ProjectModal close={() => setShow(false)} reload={s.reload} />}
    </>
  );
}
function ProjectModal({ close, reload }) {
  const [n, setN] = useState(""),
    [r, setR] = useState(""),
    [b, setB] = useState("main"),
    [e, setE] = useState(""),
    [loading, setLoading] = useState(false);
  async function submit(x) {
    x.preventDefault();
    setLoading(true);
    try {
      await api.createProject({ name: n, repo: r, branch: b });
      close();
      reload();
    } catch (x) {
      setE(x.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <div>
            <h3>Add project</h3>
            <p>Create a repository record for DeploySafe.</p>
          </div>
          <button className="icon-btn" onClick={close}>
            <X size={19} />
          </button>
        </div>
        <form onSubmit={submit}>
          <label>
            Project name
            <input value={n} onChange={(x) => setN(x.target.value)} required />
          </label>
          <label>
            Repository
            <input
              value={r}
              onChange={(x) => setR(x.target.value)}
              required
              placeholder="github-user/repository"
            />
          </label>
          <label>
            Branch
            <input value={b} onChange={(x) => setB(x.target.value)} required />
          </label>
          {e && <div className="form-error">{e}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={close}>
              Cancel
            </button>
            <button className="primary">
              {loading ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Project() {
  const { id } = useParams(),
    s = useApi(() => api.project(id), [id]);

  useEffect(() => {
    if (s.data) setSelectedProject(s.data);
  }, [s.data]);

  if (s.loading) return <Loading />;
  if (s.error) return <ErrorState message={s.error} reload={s.reload} />;
  let p = s.data || {},
    rows = p.releases || [];
  return (
    <>
      <HeaderPage title={p.name} subtitle={`${p.repo} · ${p.branch}`} />
      <div className="detail-grid">
        <div className="card">
          <CardHeader title="Project health" />
          <div className="health-overview">
            <div>
              <RiskRing value={Number(p.risk || 0)} size={145} />
              <small>Current risk</small>
            </div>
            <div className="signal-grid">
              <Signal label="Uptime" value={p.uptime ? `${p.uptime}%` : "—"} />
              <Signal label="Pipeline runs" value={p.builds || 0} />
              <Signal label="Last release" value={p.last_release || "—"} />
              <Signal label="Status" value={p.status || "—"} />
            </div>
          </div>
        </div>
        <div className="card">
          <CardHeader title="Repository" />
          <Info label="Repository" value={p.repo || "—"} />
          <Info label="Branch" value={p.branch || "—"} />
          <Info label="Project ID" value={p.id} />
        </div>
      </div>
      <div className="card">
        <CardHeader title="Releases" />
        {rows.length ? (
          <ReleaseTable rows={rows} />
        ) : (
          <Empty
            title="No releases yet"
            text="This project has no release records."
          />
        )}
      </div>
    </>
  );
}
function Signal({ label, value }) {
  return (
    <div className="signal">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
function Info({ label, value }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function Releases() {
  const s = useApi(api.releases),
    [f, setF] = useState("");
  if (s.loading) return <Loading />;
  if (s.error) return <ErrorState message={s.error} reload={s.reload} />;
  let all = s.data || [],
    rows = f ? all.filter((x) => x.status === f) : all;
  return (
    <>
      <HeaderPage
        title="Releases"
        subtitle="Release candidates evaluated by DeploySafe."
      />
      <div className="tabs">
        {["", "Ready", "Blocked", "Deployed"].map((x) => (
          <button
            className={f === x ? "selected" : ""}
            onClick={() => setF(x)}
            key={x}
          >
            {x || "All"}
            {x === "" && <b>{all.length}</b>}
          </button>
        ))}
      </div>
      <div className="card">
        {rows.length ? (
          <ReleaseTable rows={rows} />
        ) : (
          <Empty
            icon={PackageCheck}
            title="No releases found"
            text="Release records will appear after pipeline results are received."
          />
        )}
      </div>
    </>
  );
}

function Release() {
  const { id } = useParams(),
    s = useApi(() => api.release(id), [id]),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState("");
  if (s.loading) return <Loading />;
  if (s.error) return <ErrorState message={s.error} reload={s.reload} />;
  let r = s.data || {};
  async function act(type) {
    setBusy(true);
    setMsg("");
    try {
      let x = type === "deploy" ? await api.deploy(id) : await api.evaluate(id);
      setMsg(x.message || `${x.data?.decision || "Evaluation"} complete`);
      await s.reload();
    } catch (x) {
      setMsg(x.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <HeaderPage
        title={`${r.version || "Release"} · ${r.project_name || ""}`}
        subtitle={`${r.release_key || ""} · ${r.branch || "—"} · ${r.commit_hash || "—"}`}
      />
      {msg && <div className="notice">{msg}</div>}
      <div className="release-detail-top">
        <div className="card">
          <div className="decision-head">
            <div>
              <Status status={r.status} />
              <h3>
                {r.status === "Blocked"
                  ? "Deployment blocked"
                  : r.status === "Deployed"
                    ? "Successfully deployed"
                    : "Ready for deployment"}
              </h3>
              <p>
                Decision based on the metrics currently stored by the backend.
              </p>
            </div>
            <RiskRing value={Number(r.risk || 0)} size={135} />
          </div>
          <Info label="Risk score" value={`${Number(r.risk || 0)} / 100`} />
          <Info
            label="Critical vulnerabilities"
            value={r.critical_vulnerabilities || 0}
          />
          <div className="action-row">
            <button
              className="secondary"
              onClick={() => act("evaluate")}
              disabled={busy}
            >
              <RefreshCw size={16} /> Evaluate
            </button>
            {r.status === "Ready" && (
              <button
                className="primary"
                onClick={() => act("deploy")}
                disabled={busy}
              >
                <Rocket size={16} /> Deploy
              </button>
            )}
          </div>
        </div>
        <div className="card">
          <CardHeader title="Metadata" />
          <Info label="Release ID" value={r.release_key || r.id} />
          <Info label="Version" value={r.version || "—"} />
          <Info
            label="Created"
            value={r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
          />
        </div>
      </div>
      <div className="card">
        <CardHeader title="Release gates" subtitle="Backend metrics" />
        <div className="gate-grid">
          <Gate
            icon={TestTube2}
            name="Unit tests"
            value={`${r.tests_total ? Math.round((r.tests_passed / r.tests_total) * 100) : 0}%`}
            detail={`${r.tests_passed || 0} / ${r.tests_total || 0} passed`}
            pass={r.tests_total > 0 && r.tests_passed === r.tests_total}
          />
          <Gate
            icon={BarChart3}
            name="Coverage"
            value={`${Number(r.coverage || 0)}%`}
            detail="Statement coverage"
            pass={Number(r.coverage || 0) >= 80}
          />
          <Gate
            icon={Code2}
            name="SonarQube"
            value={r.sonar_rating || "—"}
            detail="Quality rating"
            pass={["A", "B"].includes(r.sonar_rating)}
          />
          <Gate
            icon={ShieldCheck}
            name="Security"
            value={`${r.security_warnings || 0}`}
            detail={`${r.critical_vulnerabilities || 0} critical`}
            pass={
              !Number(r.security_warnings || 0) &&
              !Number(r.critical_vulnerabilities || 0)
            }
          />
          <Gate
            icon={Activity}
            name="Performance"
            value={`${r.p95_response_ms || 0}ms`}
            detail="p95 response"
            pass={Number(r.p95_response_ms || 0) < 1000}
          />
        </div>
      </div>
    </>
  );
}
function Gate({ icon: I, name, value, detail, pass }) {
  return (
    <div className="gate">
      <div className="gate-icon">
        <I size={19} />
      </div>
      <div className="gate-body">
        <span>{name}</span>
        <b>{value}</b>
        <small>{detail}</small>
      </div>
      <span className={pass ? "gate-ok" : "gate-fail"}>{pass ? "✓" : "×"}</span>
    </div>
  );
}

function JenkinsSidebarStatus() {
  const s = useApi(api.jenkinsStatus);
  if (s.loading)
    return (
      <div className="jenkins-status">
        <span className="pending-dot" /> Jenkins <b>CHECKING…</b>
      </div>
    );
  if (s.error)
    return (
      <div className="jenkins-status">
        <span className="pending-dot" /> Jenkins <b>UNKNOWN</b>
      </div>
    );
  const configured = Boolean(s.data?.configured);
  return (
    <div className="jenkins-status">
      <span className={configured ? "connected-dot" : "pending-dot"} /> Jenkins{" "}
      <b>{configured ? "CONFIGURED" : "NOT CONFIGURED"}</b>
    </div>
  );
}

function JenkinsPage() {
  const status = useApi(api.jenkinsStatus);
  const runs = useApi(() => api.jenkinsRuns(30));
  return (
    <>
      <HeaderPage
        title="Jenkins CI/CD"
        subtitle="Live Jenkins pipeline results and DeploySafe release gates."
      />
      <div className="jenkins-hero">
        <div className="card jenkins-connection">
          <div className="jenkins-connection-icon">
            <Rocket size={24} />
          </div>
          <div>
            <span className="eyebrow">INTEGRATION</span>
            <h3>
              {status.data?.configured
                ? "Jenkins is configured"
                : "Jenkins is not configured"}
            </h3>
            <p>
              {status.data?.configured
                ? `DeploySafe is receiving pipeline results${status.data.baseUrl ? ` from ${status.data.baseUrl}` : ""}.`
                : "Set JENKINS_BASE_URL and JENKINS_WEBHOOK_TOKEN in the backend environment before expecting Jenkins data."}
            </p>
          </div>
          <Status status={status.data?.configured ? "Ready" : "Warning"} />
        </div>
        <div className="card">
          <span className="eyebrow">LATEST RUN</span>
          {status.loading ? (
            <p>Checking…</p>
          ) : status.error ? (
            <p>{status.error}</p>
          ) : status.data?.lastRun ? (
            <>
              <div className="big-code">#{status.data.lastRun.run_number}</div>
              <p>
                {status.data.lastRun.project_name || "Project"} ·{" "}
                {status.data.lastRun.branch || "—"}
              </p>
              <RiskPill value={status.data.lastRun.gate_risk ?? 0} />
            </>
          ) : (
            <Empty
              title="No Jenkins runs yet"
              text="Run the Jenkinsfile and send its result to DeploySafe."
            />
          )}
        </div>
      </div>
      <div className="card">
        <CardHeader
          title="Pipeline runs"
          subtitle="Only runs actually received by the DeploySafe API are shown."
        />
        {runs.loading ? (
          <Loading />
        ) : runs.error ? (
          <ErrorState message={runs.error} reload={runs.reload} />
        ) : runs.data?.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Project</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Gate</th>
                  <th>Risk</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {runs.data.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <b>#{x.run_number}</b>
                    </td>
                    <td>{x.project_name || "—"}</td>
                    <td className="code-cell">{x.branch || "—"}</td>
                    <td>
                      <Status status={x.status} />
                    </td>
                    <td>
                      <Status
                        status={
                          x.gate_decision === "READY"
                            ? "Ready"
                            : x.gate_decision === "BLOCKED"
                              ? "Blocked"
                              : "Unknown"
                        }
                      />
                    </td>
                    <td>
                      <RiskPill value={x.gate_risk ?? 0} />
                    </td>
                    <td>
                      {x.created_at
                        ? new Date(x.created_at).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={GitBranch}
            title="No pipeline runs received"
            text="Your Jenkins pipeline will appear here after the DeploySafe webhook is called."
          />
        )}
      </div>
    </>
  );
}

function Pipeline() {
  const selected = useSelectedProject();

  const runs = useApi(
    () =>
      selected
        ? api.jenkinsRuns(30)
        : Promise.resolve({ data: [] }),
    [selected?.id],
  );

  const all = runs.data || [];
  const rows = all
    .filter((x) => projectMatches(x, selected))
    .sort(
      (a, b) =>
        new Date(b.created_at || 0) -
        new Date(a.created_at || 0),
    );

  const latest = rows[0];

  const detail = useApi(
    () =>
      latest?.id
        ? api.pipeline(latest.id)
        : Promise.resolve({ data: null }),
    [latest?.id],
  );

  if (!selected) {
    return (
      <Empty
        icon={Box}
        title="Select a project"
        text="Choose a project from the sidebar to view its pipeline."
      />
    );
  }

  return (
    <>
      <HeaderPage
        title="CI/CD Pipeline"
        subtitle={`Pipeline execution data for ${selected.name}.`}
      />

      {runs.loading ? (
        <Loading />
      ) : runs.error ? (
        <ErrorState message={runs.error} reload={runs.reload} />
      ) : !rows.length ? (
        <Empty
          icon={GitBranch}
          title="No pipeline runs for this project"
          text={`No Jenkins pipeline result has been received for ${selected.name} yet.`}
        />
      ) : detail.loading ? (
        <Loading />
      ) : detail.error ? (
        <ErrorState message={detail.error} reload={detail.reload} />
      ) : (
        <PipelineData
          d={detail.data}
          project={selected}
          latestRun={latest}
        />
      )}
    </>
  );
}

function stageState(stage) {
  const raw = String(
    stage?.status ??
      stage?.result ??
      stage?.state ??
      stage?.outcome ??
      "",
  ).toUpperCase();

  if (
    ["SUCCESS", "PASSED", "PASS", "READY", "COMPLETED"].includes(
      raw,
    )
  ) {
    return "passed";
  }

  if (
    ["FAILED", "FAILURE", "FAILED_TESTS", "BLOCKED", "ERROR"].includes(
      raw,
    )
  ) {
    return "failed";
  }

  if (
    ["RUNNING", "IN_PROGRESS", "BUILDING", "PENDING"].includes(
      raw,
    )
  ) {
    return "running";
  }

  return "unknown";
}

function StageIcon({ state }) {
  if (state === "passed") return <CheckCircle2 size={18} />;
  if (state === "failed") return <XCircle size={18} />;
  if (state === "running") {
    return <RefreshCw size={18} className="spin" />;
  }
  return <Clock3 size={18} />;
}

function PipelineData({ d, project, latestRun }) {
  if (!d)
    return (
      <Empty
        title="No pipeline data"
        text="Run a pipeline and send its result to the Jenkins webhook."
      />
    );

  const stages = Array.isArray(d.stages) ? d.stages : [];

  return (
    <>
      <div className="pipeline-summary">
        <div className="card">
          <span className="eyebrow">PIPELINE STATUS</span>
          <h3 className="summary-title">
            {d.status || latestRun?.status || "UNKNOWN"}
          </h3>
          <p>
            Run #{d.run_number || latestRun?.run_number || "—"} ·{" "}
            {project?.name || d.project_name || "Project"} ·{" "}
            {d.duration_seconds || latestRun?.duration_seconds || 0}s
          </p>
        </div>

        <div className="card">
          <span className="eyebrow">COMMIT</span>
          <div className="big-code">
            {d.commit_hash || latestRun?.commit_hash || "—"}
          </div>
          <small>{d.branch || latestRun?.branch || "—"}</small>
        </div>
      </div>

      <div className="card">
        <CardHeader
          title="Execution stages"
          subtitle="Stage status reported by the pipeline."
        />

        {stages.length ? (
          <div className="pipeline-list">
            {stages.map((x, i) => {
              const state = stageState(x);

              return (
                <div className="pipeline-stage" key={i}>
                  <div className={`stage-node ${state}`}>
                    <StageIcon state={state} />
                  </div>

                  {i < stages.length - 1 && (
                    <div className={`stage-line ${state}`} />
                  )}

                  <div className="stage-copy">
                    <b>{x.name || `Stage ${i + 1}`}</b>
                    <p>
                      {x.detail || x.message || x.status || "No details supplied."}
                    </p>
                  </div>

                  <time>{x.time || x.duration || "—"}</time>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            title="No stages reported"
            text="This pipeline has no stage details yet."
          />
        )}
      </div>
    </>
  );
}

function Risk() {
  const selected = useSelectedProject();

  const releases = useApi(
    () =>
      selected
        ? api.releases()
        : Promise.resolve({ data: [] }),
    [selected?.id],
  );

  const all = releases.data || [];
  const rows = all
    .filter((x) => projectMatches(x, selected))
    .sort(
      (a, b) =>
        new Date(b.created_at || 0) -
        new Date(a.created_at || 0),
    );

  const latest = rows[0];

  const risk = useApi(
    () =>
      latest?.release_key
        ? api.risk(String(latest.release_key))
        : Promise.resolve({ data: null }),
    [latest?.release_key],
  );

  if (!selected) {
    return (
      <Empty
        icon={Box}
        title="Select a project"
        text="Choose a project from the sidebar to view its risk analysis."
      />
    );
  }

  return (
    <>
      <HeaderPage
        title="Risk Analysis"
        subtitle={`Release risk calculated for ${selected.name}.`}
      />

      {releases.loading ? (
        <Loading />
      ) : releases.error ? (
        <ErrorState message={releases.error} reload={releases.reload} />
      ) : !rows.length ? (
        <Empty
          icon={ShieldCheck}
          title="No releases for this project"
          text={`No release metrics are available for ${selected.name} yet.`}
        />
      ) : risk.loading ? (
        <Loading />
      ) : risk.error ? (
        <ErrorState message={risk.error} reload={risk.reload} />
      ) : (
        <>
          <div className="selected-release-banner">
            <div>
              <span className="eyebrow">ANALYZING RELEASE</span>
              <b>
                {latest.version ||
                  latest.release_key ||
                  `Release #${latest.id}`}
              </b>
              <small>
                {latest.release_key || "Latest release"} ·{" "}
                {selected.name}
              </small>
            </div>
            <Status status={latest.status} />
          </div>

          <RiskData d={risk.data} />
        </>
      )}
    </>
  );
}

function RiskData({ d }) {
  let comps = Object.entries(d.components || {});
  return (
    <>
      <div className="risk-overview-grid">
        <div className="card big-risk">
          <div>
            <span className="eyebrow">RELEASE DECISION</span>
            <h3>
              {d.decision === "READY"
                ? "Ready for deployment"
                : "Deployment blocked"}
            </h3>
            <p>Risk score calculated by the DeploySafe release gate.</p>
          </div>
          <RiskRing value={Number(d.score || 0)} size={170} />
        </div>
        <div className="card">
          <CardHeader title="Risk components" />
          {comps.length ? (
            comps.map(([k, v]) => (
              <div className="component-row" key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))
          ) : (
            <Empty title="No components" text="No component data returned." />
          )}
        </div>
      </div>
      <div className="card">
        <CardHeader title="Triggered reasons" />
        {d.reasons?.length ? (
          <ul className="reason-list">
            {d.reasons.map((x, i) => (
              <li key={i}>
                <AlertTriangle size={16} />
                {x}
              </li>
            ))}
          </ul>
        ) : (
          <div className="success-message">
            <CheckCircle2 size={18} /> No risk factors triggered.
          </div>
        )}
      </div>
    </>
  );
}

function HistoryPage() {
  const s = useApi(api.deployments);
  if (s.loading) return <Loading />;
  if (s.error) return <ErrorState message={s.error} reload={s.reload} />;
  let rows = s.data || [];
  return (
    <>
      <HeaderPage
        title="Deployment History"
        subtitle="Deployment decisions recorded by the backend."
      />
      <div className="history-stats">
        <Metric title="Total events" value={rows.length} icon={History} />
        <Metric
          title="Successful"
          value={rows.filter((x) => x.status === "SUCCESS").length}
          icon={CheckCircle2}
        />
        <Metric
          title="Blocked"
          value={rows.filter((x) => x.status === "BLOCKED").length}
          icon={XCircle}
        />
      </div>
      <div className="card">
        {rows.length ? (
          <div className="timeline">
            {rows.map((x) => (
              <div className="timeline-item" key={x.id}>
                <div
                  className={`timeline-dot ${String(x.status).toLowerCase()}`}
                >
                  {x.status === "BLOCKED" ? (
                    <XCircle size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                </div>
                <div className="timeline-main">
                  <b>
                    {x.version || x.release_key || "Release"} ·{" "}
                    {x.project_name || "Project"}
                  </b>
                  <p>{x.reason || "No reason recorded."}</p>
                </div>
                <div className="timeline-side">
                  <RiskPill value={x.risk} />
                  <small>
                    {x.created_at
                      ? new Date(x.created_at).toLocaleString()
                      : "—"}
                  </small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            icon={History}
            title="No deployment events"
            text="History will appear after a deployment decision is recorded."
          />
        )}
      </div>
    </>
  );
}

function SettingsPage() {
  let u = JSON.parse(localStorage.getItem("deploysafe_user") || "{}");
  return (
    <>
      <HeaderPage
        title="Settings"
        subtitle="Account and API session settings."
      />
      <div className="settings-grid">
        <div className="card settings-nav">
          <button className="selected">
            <Settings size={18} /> General
          </button>
          <button>
            <GitBranch size={18} /> Integrations
          </button>
          <button>
            <ShieldCheck size={18} /> Risk rules
          </button>
        </div>
        <div className="card settings-content">
          <h3>General</h3>
          <p>Frontend preferences and current API session.</p>
          <Info label="Name" value={u.name || "—"} />
          <Info label="Email" value={u.email || "—"} />
          <Info
            label="API"
            value={import.meta.env.VITE_API_URL || "http://localhost:5000/api"}
          />
          <Info label="Release gate" value="Backend risk engine active" />
        </div>
      </div>
    </>
  );
}

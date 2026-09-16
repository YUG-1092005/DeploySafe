import pg from 'pg'
import bcrypt from 'bcryptjs'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
})

export async function query(text, params) {
  return pool.query(text, params)
}

export async function initDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Create a .env file from .env.example.')
  }

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(180) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      repo VARCHAR(255) NOT NULL,
      branch VARCHAR(120) DEFAULT 'main',
      status VARCHAR(30) DEFAULT 'Healthy',
      last_release VARCHAR(50),
      risk INTEGER DEFAULT 0,
      builds INTEGER DEFAULT 0,
      uptime NUMERIC(6,2) DEFAULT 99.90,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS releases (
      id SERIAL PRIMARY KEY,
      release_key VARCHAR(50) UNIQUE NOT NULL,
      version VARCHAR(80) NOT NULL,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      branch VARCHAR(120) DEFAULT 'main',
      status VARCHAR(30) DEFAULT 'Ready',
      risk INTEGER DEFAULT 0,
      commit_hash VARCHAR(80),
      tests_passed INTEGER DEFAULT 0,
      tests_total INTEGER DEFAULT 0,
      coverage NUMERIC(5,2) DEFAULT 0,
      sonar_rating VARCHAR(5) DEFAULT 'A',
      security_warnings INTEGER DEFAULT 0,
      critical_vulnerabilities INTEGER DEFAULT 0,
      p95_response_ms INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      deployed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id SERIAL PRIMARY KEY,
      run_number INTEGER NOT NULL,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      release_id INTEGER REFERENCES releases(id) ON DELETE SET NULL,
      status VARCHAR(30) DEFAULT 'RUNNING',
      duration_seconds INTEGER DEFAULT 0,
      commit_hash VARCHAR(80),
      branch VARCHAR(120),
      stages JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pipeline_stages (
      id SERIAL PRIMARY KEY,
      pipeline_run_id INTEGER NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
      name VARCHAR(120) NOT NULL,
      status VARCHAR(30) NOT NULL,
      detail TEXT,
      duration_seconds INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS release_metrics (
      id SERIAL PRIMARY KEY,
      release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
      pipeline_run_id INTEGER REFERENCES pipeline_runs(id) ON DELETE SET NULL,
      build_status VARCHAR(30),
      tests_passed INTEGER,
      tests_total INTEGER,
      coverage NUMERIC(5,2),
      sonar_rating VARCHAR(5),
      security_warnings INTEGER,
      critical_vulnerabilities INTEGER,
      p95_response_ms INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS deployment_gates (
      id SERIAL PRIMARY KEY,
      release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
      pipeline_run_id INTEGER REFERENCES pipeline_runs(id) ON DELETE SET NULL,
      decision VARCHAR(30) NOT NULL,
      risk INTEGER NOT NULL,
      reasons JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS deployments (
      id SERIAL PRIMARY KEY,
      release_id INTEGER REFERENCES releases(id) ON DELETE SET NULL,
      environment VARCHAR(40) DEFAULT 'production',
      status VARCHAR(30) NOT NULL,
      risk INTEGER DEFAULT 0,
      reason TEXT,
      deployed_by VARCHAR(180),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_pipeline_runs_project_created
      ON pipeline_runs(project_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_pipeline_runs_release_created
      ON pipeline_runs(release_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_release_metrics_release_created
      ON release_metrics(release_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_deployment_gates_release_created
      ON deployment_gates(release_id, created_at DESC);
  `)

  // Phase 3 deliberately does not seed projects, releases, pipelines, or deployments.
  // Existing Phase 2 data is preserved; this migration only creates missing tables/indexes.
  const { rows } = await query('SELECT id FROM users LIMIT 1')
  if (!rows.length && process.env.CREATE_DEFAULT_USER === 'true') {
    const hash = await bcrypt.hash(process.env.DEFAULT_USER_PASSWORD || 'password123', 10)
    await query(
      'INSERT INTO users (name,email,password_hash) VALUES ($1,$2,$3)',
      [
        process.env.DEFAULT_USER_NAME || 'DeploySafe User',
        process.env.DEFAULT_USER_EMAIL || 'admin@deploysafe.local',
        hash
      ]
    )
  }

  console.log('Database ready. Phase 3 schema is applied without demo project/release data.')
}

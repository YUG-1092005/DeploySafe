import { Router } from 'express'
import { query } from '../db.js'
import { calculateRisk } from '../utils/risk.js'
import { auth } from '../middleware/auth.js'

const router = Router()

function safeJson(value, fallback) {
  if (value === undefined || value === null) return fallback
  return value
}

function webhookAuthorized(req) {
  const expected = process.env.JENKINS_WEBHOOK_TOKEN
  if (!expected) return false
  const supplied = req.get('x-deploysafe-token') || req.get('authorization')?.replace(/^Bearer\s+/i, '')
  return supplied === expected
}

async function findProject({ projectId, projectName, repo }) {
  if (projectId) {
    const { rows } = await query('SELECT * FROM projects WHERE id=$1', [projectId])
    return rows[0]
  }
  if (projectName) {
    const { rows } = await query(
      'SELECT * FROM projects WHERE LOWER(name)=LOWER($1) OR LOWER(repo)=LOWER($1) LIMIT 1',
      [projectName]
    )
    return rows[0]
  }
  if (repo) {
    const { rows } = await query('SELECT * FROM projects WHERE LOWER(repo)=LOWER($1) LIMIT 1', [repo])
    return rows[0]
  }
  return null
}

async function findOrCreateRelease({ releaseId, releaseKey, project, version, branch, commitHash }) {
  if (releaseId) {
    const { rows } = await query('SELECT * FROM releases WHERE id=$1', [releaseId])
    if (rows[0]) return rows[0]
  }

  if (releaseKey) {
    const { rows } = await query('SELECT * FROM releases WHERE release_key=$1', [releaseKey])
    if (rows[0]) return rows[0]
  }

  if (!project) throw new Error('A valid projectId, project name, or repo is required')
  if (!version) throw new Error('version is required when Jenkins creates a release')

  const key = releaseKey || `REL-${Date.now()}`
  const { rows } = await query(`
    INSERT INTO releases
      (release_key,version,project_id,branch,status,commit_hash)
    VALUES ($1,$2,$3,$4,'Pending',$5)
    RETURNING *
  `, [key, version, project.id, branch || project.branch || 'main', commitHash || null])

  return rows[0]
}

router.get('/status', auth, async (_req, res, next) => {
  try {
    const configured = Boolean(process.env.JENKINS_BASE_URL && process.env.JENKINS_WEBHOOK_TOKEN)
    const { rows } = await query(`
      SELECT pr.*, p.name AS project_name, r.release_key, r.version
      FROM pipeline_runs pr
      LEFT JOIN projects p ON p.id=pr.project_id
      LEFT JOIN releases r ON r.id=pr.release_id
      ORDER BY pr.created_at DESC
      LIMIT 1
    `)

    res.json({
      success: true,
      data: {
        configured,
        baseUrl: process.env.JENKINS_BASE_URL || null,
        jobName: process.env.JENKINS_JOB_NAME || null,
        lastRun: rows[0] || null
      }
    })
  } catch (e) {
    next(e)
  }
})

router.get('/runs', auth, async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100)
    const { rows } = await query(`
      SELECT
        pr.*,
        p.name AS project_name,
        r.release_key,
        r.version,
        dg.decision AS gate_decision,
        dg.risk AS gate_risk
      FROM pipeline_runs pr
      LEFT JOIN projects p ON p.id=pr.project_id
      LEFT JOIN releases r ON r.id=pr.release_id
      LEFT JOIN LATERAL (
        SELECT decision, risk
        FROM deployment_gates
        WHERE pipeline_run_id=pr.id
        ORDER BY created_at DESC
        LIMIT 1
      ) dg ON true
      ORDER BY pr.created_at DESC
      LIMIT $1
    `, [limit])

    res.json({ success: true, data: rows })
  } catch (e) {
    next(e)
  }
})

router.post('/webhook', async (req, res, next) => {
  try {
    if (!webhookAuthorized(req)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or missing Jenkins webhook token'
      })
    }

    const body = req.body || {}
    const project = await findProject({
      projectId: body.projectId,
      projectName: body.project,
      repo: body.repo
    })

    const release = await findOrCreateRelease({
      releaseId: body.releaseId,
      releaseKey: body.releaseKey,
      project,
      version: body.version,
      branch: body.branch,
      commitHash: body.commitHash || body.commit
    })

    const metrics = body.metrics || body
    const buildStatus = String(
      body.buildStatus || body.status || 'UNKNOWN'
    ).toUpperCase()

    const risk = calculateRisk({
      buildStatus,
      testsPassed: metrics.testsPassed,
      testsTotal: metrics.testsTotal,
      coverage: metrics.coverage,
      sonarRating: metrics.sonarRating,
      securityWarnings: metrics.securityWarnings,
      criticalVulnerabilities: metrics.criticalVulnerabilities,
      p95ResponseMs: metrics.p95ResponseMs
    })

    const releaseStatus = risk.decision === 'READY' ? 'Ready' : 'Blocked'
    const stages = Array.isArray(body.stages) ? body.stages : []

    const client = await import('pg').then(({ default: pg }) => {
      const { Pool } = pg
      return new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false
      })
    })

    const dbClient = await client.connect()
    try {
      await dbClient.query('BEGIN')

      const pipelineResult = await dbClient.query(`
        INSERT INTO pipeline_runs
          (run_number,project_id,release_id,status,duration_seconds,commit_hash,branch,stages)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
        RETURNING *
      `, [
        Number(body.buildNumber || 0),
        release.project_id,
        release.id,
        buildStatus,
        Number(body.durationSeconds || 0),
        body.commitHash || body.commit || null,
        body.branch || release.branch || 'main',
        JSON.stringify(stages)
      ])

      const pipeline = pipelineResult.rows[0]

      if (stages.length) {
        for (const stage of stages) {
          await dbClient.query(`
            INSERT INTO pipeline_stages
              (pipeline_run_id,name,status,detail,duration_seconds)
            VALUES ($1,$2,$3,$4,$5)
          `, [
            pipeline.id,
            String(stage.name || 'Unnamed stage'),
            String(stage.status || 'UNKNOWN'),
            stage.detail || null,
            Number(stage.durationSeconds || 0)
          ])
        }
      }

      await dbClient.query(`
        UPDATE releases SET
          status=$1,
          risk=$2,
          commit_hash=COALESCE(NULLIF($3,''),commit_hash),
          branch=$4,
          tests_passed=$5,
          tests_total=$6,
          coverage=$7,
          sonar_rating=$8,
          security_warnings=$9,
          critical_vulnerabilities=$10,
          p95_response_ms=$11
        WHERE id=$12
      `, [
        releaseStatus,
        risk.risk,
        body.commitHash || body.commit || '',
        body.branch || release.branch || 'main',
        Number(metrics.testsPassed || 0),
        Number(metrics.testsTotal || 0),
        Number(metrics.coverage || 0),
        String(metrics.sonarRating || 'UNKNOWN'),
        Number(metrics.securityWarnings || 0),
        Number(metrics.criticalVulnerabilities || 0),
        Number(metrics.p95ResponseMs || 0),
        release.id
      ])

      await dbClient.query(`
        INSERT INTO release_metrics
          (release_id,pipeline_run_id,build_status,tests_passed,tests_total,coverage,
           sonar_rating,security_warnings,critical_vulnerabilities,p95_response_ms)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `, [
        release.id,
        pipeline.id,
        buildStatus,
        Number(metrics.testsPassed || 0),
        Number(metrics.testsTotal || 0),
        Number(metrics.coverage || 0),
        String(metrics.sonarRating || 'UNKNOWN'),
        Number(metrics.securityWarnings || 0),
        Number(metrics.criticalVulnerabilities || 0),
        Number(metrics.p95ResponseMs || 0)
      ])

      await dbClient.query(`
        INSERT INTO deployment_gates
          (release_id,pipeline_run_id,decision,risk,reasons)
        VALUES ($1,$2,$3,$4,$5::jsonb)
      `, [
        release.id,
        pipeline.id,
        risk.decision,
        risk.risk,
        JSON.stringify(risk.reasons)
      ])

      if (project) {
        await dbClient.query(`
          UPDATE projects
          SET builds=COALESCE(builds,0)+1,
              last_release=$1,
              risk=$2,
              status=$3
          WHERE id=$4
        `, [
          release.version,
          risk.risk,
          risk.decision === 'READY' ? 'Healthy' : 'Warning',
          project.id
        ])
      }

      await dbClient.query('COMMIT')

      res.status(200).json({
        success: true,
        data: {
          pipeline,
          releaseId: release.id,
          releaseKey: release.release_key,
          decision: risk.decision,
          riskScore: risk.risk,
          reasons: risk.reasons
        }
      })
    } catch (e) {
      await dbClient.query('ROLLBACK')
      throw e
    } finally {
      dbClient.release()
      await client.end()
    }
  } catch (e) {
    next(e)
  }
})

router.get('/releases/:id/gate', auth, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        dg.*,
        r.release_key,
        r.version,
        r.project_id,
        p.name AS project_name
      FROM deployment_gates dg
      JOIN releases r ON r.id=dg.release_id
      JOIN projects p ON p.id=r.project_id
      WHERE dg.release_id=$1 OR r.release_key=$1
      ORDER BY dg.created_at DESC
      LIMIT 1
    `, [req.params.id])

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'No deployment gate has been recorded for this release'
      })
    }

    res.json({
      success: true,
      data: {
        ...rows[0],
        reasons: safeJson(rows[0].reasons, [])
      }
    })
  } catch (e) {
    next(e)
  }
})

export default router

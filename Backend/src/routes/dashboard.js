import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const projects = await query('SELECT * FROM projects ORDER BY id')
    const releases = await query(`
      SELECT r.*, p.name AS project_name
      FROM releases r JOIN projects p ON p.id=r.project_id
      ORDER BY r.created_at DESC LIMIT 5
    `)
    const counts = await query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status='Blocked')::int AS blocked,
        COUNT(*) FILTER (WHERE status IN ('Ready','Deployed'))::int AS healthy,
        COALESCE(ROUND(AVG(risk)),0)::int AS avg_risk
      FROM releases
    `)
    res.json({success:true,data:{
      projects:projects.rows,
      recentReleases:releases.rows,
      summary:counts.rows[0]
    }})
  } catch(e){ next(e) }
})

export default router
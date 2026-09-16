import { Router } from 'express'
import { query } from '../db.js'
import { calculateRisk } from '../utils/risk.js'

const router = Router()

const select = `
SELECT r.*, p.name AS project_name, p.repo
FROM releases r JOIN projects p ON p.id=r.project_id
`

router.get('/', async (req,res,next)=>{
  try {
    const {project,status} = req.query
    const params=[]
    const where=[]
    if(project){params.push(project);where.push(`r.project_id=$${params.length}`)}
    if(status){params.push(status);where.push(`r.status=$${params.length}`)}
    const sql = `${select} ${where.length ? 'WHERE '+where.join(' AND ') : ''} ORDER BY r.created_at DESC`
    const {rows}=await query(sql,params)
    res.json({success:true,data:rows})
  } catch(e){next(e)}
})

router.get('/:id', async(req,res,next)=>{
  try {
    const {rows}=await query(`${select} WHERE r.id=$1 OR r.release_key=$1`,[req.params.id])
    if(!rows.length) return res.status(404).json({success:false,message:'Release not found'})
    const pipelines=await query('SELECT * FROM pipeline_runs WHERE release_id=$1 ORDER BY created_at DESC',[rows[0].id])
    const deployments=await query('SELECT * FROM deployments WHERE release_id=$1 ORDER BY created_at DESC',[rows[0].id])
    res.json({success:true,data:{...rows[0],pipelines:pipelines.rows,deployments:deployments.rows}})
  } catch(e){next(e)}
})

router.post('/:id/evaluate', async(req,res,next)=>{
  try {
    const {rows}=await query('SELECT * FROM releases WHERE id=$1 OR release_key=$1',[req.params.id])
    if(!rows.length) return res.status(404).json({success:false,message:'Release not found'})
    const r=rows[0]
    const result=calculateRisk({
      testsPassed:r.tests_passed,testsTotal:r.tests_total,coverage:r.coverage,
      sonarRating:r.sonar_rating,securityWarnings:r.security_warnings,
      criticalVulnerabilities:r.critical_vulnerabilities,p95ResponseMs:r.p95_response_ms
    })
    await query('UPDATE releases SET risk=$1,status=$2 WHERE id=$3',[result.risk,result.decision === 'READY' ? 'Ready':'Blocked',r.id])
    res.json({success:true,data:{releaseId:r.id,...result}})
  }catch(e){next(e)}
})

router.post('/:id/deploy', async(req,res,next)=>{
  try {
    const {rows}=await query('SELECT * FROM releases WHERE id=$1 OR release_key=$1',[req.params.id])
    if(!rows.length) return res.status(404).json({success:false,message:'Release not found'})
    const r=rows[0]
    const result=calculateRisk({
      testsPassed:r.tests_passed,testsTotal:r.tests_total,coverage:r.coverage,
      sonarRating:r.sonar_rating,securityWarnings:r.security_warnings,
      criticalVulnerabilities:r.critical_vulnerabilities,p95ResponseMs:r.p95_response_ms
    })
    if(result.decision !== 'READY'){
      await query(
        'INSERT INTO deployments(release_id,status,risk,reason,deployed_by) VALUES($1,$2,$3,$4,$5)',
        [r.id,'BLOCKED',result.risk,result.reasons.join('; ') || 'Release gate blocked deployment','system']
      )
      return res.status(409).json({success:false,message:'Deployment blocked by release gate',data:result})
    }
    await query("UPDATE releases SET status='Deployed',deployed_at=NOW(),risk=$1 WHERE id=$2",[result.risk,r.id])
    const dep=await query(
      'INSERT INTO deployments(release_id,status,risk,reason,deployed_by) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [r.id,'SUCCESS',result.risk,'All release gates passed','system']
    )
    res.json({success:true,message:'Deployment approved and recorded',data:{...result,deployment:dep.rows[0]}})
  }catch(e){next(e)}
})

export default router
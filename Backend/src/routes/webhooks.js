import { Router } from 'express'
import { query } from '../db.js'
import { calculateRisk } from '../utils/risk.js'

const router = Router()

router.post('/jenkins', async(req,res,next)=>{
  try{
    const {releaseId,pipelineId,status='SUCCESS',buildNumber=0,durationSeconds=0,commit='',branch='main',metrics={}}=req.body
    if(!releaseId) return res.status(400).json({success:false,message:'releaseId is required'})

    const risk = calculateRisk(metrics)
    const releaseStatus = risk.decision === 'READY' ? 'Ready' : 'Blocked'

    await query(`
      UPDATE releases SET
      status=$1,risk=$2,commit_hash=COALESCE(NULLIF($3,''),commit_hash),
      branch=$4,tests_passed=$5,tests_total=$6,coverage=$7,sonar_rating=$8,
      security_warnings=$9,critical_vulnerabilities=$10,p95_response_ms=$11
      WHERE id=$12
    `,[
      releaseStatus,risk.risk,commit,branch,
      Number(metrics.testsPassed||0),Number(metrics.testsTotal||0),Number(metrics.coverage||0),
      metrics.sonarRating||'A',Number(metrics.securityWarnings||0),
      Number(metrics.criticalVulnerabilities||0),Number(metrics.p95ResponseMs||0),releaseId
    ])

    const stages = metrics.stages || []
    let pipeline
    if(pipelineId){
      const result=await query(`
        UPDATE pipeline_runs SET run_number=$1,status=$2,duration_seconds=$3,commit_hash=$4,branch=$5,stages=$6::jsonb
        WHERE id=$7 RETURNING *
      `,[buildNumber,status,durationSeconds,commit,branch,JSON.stringify(stages),pipelineId])
      pipeline=result.rows[0]
    }else{
      const release=await query('SELECT project_id FROM releases WHERE id=$1',[releaseId])
      const result=await query(`
        INSERT INTO pipeline_runs(run_number,project_id,release_id,status,duration_seconds,commit_hash,branch,stages)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb) RETURNING *
      `,[buildNumber,release.rows[0]?.project_id,releaseId,status,durationSeconds,commit,branch,JSON.stringify(stages)])
      pipeline=result.rows[0]
    }

    res.json({success:true,data:{
      pipeline,
      release:{id:releaseId,status:releaseStatus,risk:risk.risk},
      decision:risk.decision,
      reasons:risk.reasons
    }})
  }catch(e){next(e)}
})

export default router
import { Router } from 'express'
import { query } from '../db.js'
const router = Router()

router.get('/', async(_req,res,next)=>{
  try{
    const {rows}=await query(`
      SELECT d.*, r.release_key, r.version, p.name AS project_name
      FROM deployments d
      LEFT JOIN releases r ON r.id=d.release_id
      LEFT JOIN projects p ON p.id=r.project_id
      ORDER BY d.created_at DESC
    `)
    res.json({success:true,data:rows})
  }catch(e){next(e)}
})
export default router
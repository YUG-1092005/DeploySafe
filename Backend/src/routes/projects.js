import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

router.get('/', async (_req,res,next)=>{
  try {
    const {rows} = await query('SELECT * FROM projects ORDER BY id')
    res.json({success:true,data:rows})
  } catch(e){next(e)}
})

router.get('/:id', async (req,res,next)=>{
  try {
    const {rows} = await query('SELECT * FROM projects WHERE id=$1',[req.params.id])
    if(!rows.length) return res.status(404).json({success:false,message:'Project not found'})
    const releases = await query('SELECT * FROM releases WHERE project_id=$1 ORDER BY created_at DESC',[req.params.id])
    res.json({success:true,data:{...rows[0],releases:releases.rows}})
  } catch(e){next(e)}
})

router.post('/', async (req,res,next)=>{
  try {
    const {name,repo,branch='main'} = req.body
    if(!name || !repo) return res.status(400).json({success:false,message:'name and repo are required'})
    const {rows} = await query(
      'INSERT INTO projects(name,repo,branch) VALUES($1,$2,$3) RETURNING *',[name,repo,branch]
    )
    res.status(201).json({success:true,data:rows[0]})
  } catch(e){next(e)}
})

export default router
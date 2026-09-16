import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'
import { signToken } from '../middleware/auth.js'

const router = Router()

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({ success:false, message:'Name, valid email and password of 6+ characters are required' })
    }
    const exists = await query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()])
    if (exists.rows.length) return res.status(409).json({success:false,message:'Email already registered'})
    const hash = await bcrypt.hash(password, 10)
    const { rows } = await query(
      'INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email',
      [name, email.toLowerCase(), hash]
    )
    res.status(201).json({ success:true, user:rows[0], token:signToken(rows[0]) })
  } catch (e) { next(e) }
})

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    const { rows } = await query('SELECT * FROM users WHERE email=$1', [email?.toLowerCase()])
    if (!rows.length || !(await bcrypt.compare(password || '', rows[0].password_hash))) {
      return res.status(401).json({success:false,message:'Invalid email or password'})
    }
    const user = {id:rows[0].id,name:rows[0].name,email:rows[0].email}
    res.json({success:true,user,token:signToken(user)})
  } catch (e) { next(e) }
})

export default router
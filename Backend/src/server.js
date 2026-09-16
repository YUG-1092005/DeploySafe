import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { initDatabase } from './db.js'
import authRoutes from './routes/auth.js'
import dashboardRoutes from './routes/dashboard.js'
import projectRoutes from './routes/projects.js'
import releaseRoutes from './routes/releases.js'
import pipelineRoutes from './routes/pipelines.js'
import riskRoutes from './routes/risk.js'
import deploymentRoutes from './routes/deployments.js'
import webhookRoutes from './routes/webhooks.js'
import jenkinsRoutes from './routes/jenkins.js'
import { auth } from './middleware/auth.js'

const app = express()
const PORT = process.env.PORT || 5000

app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',').map(x => x.trim()) || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev'))

app.get('/', (_req, res) => {
  res.json({
    name: 'DeploySafe API',
    version: '2.0.0',
    status: 'online',
    phase: 3
  })
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'deploysafe-api', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/dashboard', auth, dashboardRoutes)
app.use('/api/projects', auth, projectRoutes)
app.use('/api/releases', auth, releaseRoutes)
app.use('/api/pipelines', auth, pipelineRoutes)
app.use('/api/risk', auth, riskRoutes)
app.use('/api/deployments', auth, deploymentRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api/jenkins', jenkinsRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  })
})

await initDatabase()

app.listen(PORT, () => {
  console.log(`\nDeploySafe API running on http://localhost:${PORT}`)
  console.log(`Health: http://localhost:${PORT}/api/health\n`)
})
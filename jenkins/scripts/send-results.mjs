import fs from 'fs'

const apiUrl = (process.env.DEPLOYSAFE_API_URL || '').replace(/\/$/, '')
const token = process.env.DEPLOYSAFE_API_TOKEN

if (!apiUrl) throw new Error('DEPLOYSAFE_API_URL is required')
if (!token) throw new Error('DEPLOYSAFE_API_TOKEN is required')

const metricsPath = process.env.METRICS_FILE || 'deploysafe-metrics.json'
const metrics = fs.existsSync(metricsPath)
  ? JSON.parse(fs.readFileSync(metricsPath, 'utf8'))
  : {}

const stagesPath = process.env.STAGES_FILE || 'deploysafe-stages.json'
const stages = fs.existsSync(stagesPath)
  ? JSON.parse(fs.readFileSync(stagesPath, 'utf8'))
  : []

const payload = {
  projectId: process.env.DEPLOYSAFE_PROJECT_ID ? Number(process.env.DEPLOYSAFE_PROJECT_ID) : undefined,
  project: process.env.DEPLOYSAFE_PROJECT,
  repo: process.env.DEPLOYSAFE_REPO,
  releaseId: process.env.DEPLOYSAFE_RELEASE_ID ? Number(process.env.DEPLOYSAFE_RELEASE_ID) : undefined,
  releaseKey: process.env.DEPLOYSAFE_RELEASE_KEY,
  version: process.env.DEPLOYSAFE_VERSION || process.env.BUILD_TAG || `build-${process.env.BUILD_NUMBER}`,
  branch: process.env.BRANCH_NAME || process.env.GIT_BRANCH || 'main',
  commitHash: process.env.GIT_COMMIT,
  buildNumber: Number(process.env.BUILD_NUMBER || 0),
  buildStatus: process.env.BUILD_STATUS || 'UNKNOWN',
  durationSeconds: Number(process.env.BUILD_DURATION_SECONDS || 0),
  metrics,
  stages
}

const response = await fetch(`${apiUrl}/jenkins/webhook`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-DeploySafe-Token': token
  },
  body: JSON.stringify(payload)
})

const data = await response.json().catch(() => ({}))
if (!response.ok) {
  throw new Error(data.message || `DeploySafe webhook failed (${response.status})`)
}

fs.writeFileSync('deploysafe-gate.json', JSON.stringify(data.data, null, 2))
console.log(JSON.stringify(data.data, null, 2))

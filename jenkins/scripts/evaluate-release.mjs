import fs from 'fs'

const apiUrl = (process.env.DEPLOYSAFE_API_URL || '').replace(/\/$/, '')
const token = process.env.DEPLOYSAFE_API_TOKEN
const gateFile = process.env.GATE_FILE || 'deploysafe-gate.json'

if (!apiUrl) throw new Error('DEPLOYSAFE_API_URL is required')
if (!token) throw new Error('DEPLOYSAFE_API_TOKEN is required')
if (!fs.existsSync(gateFile)) throw new Error(`${gateFile} not found`)

const gate = JSON.parse(fs.readFileSync(gateFile, 'utf8'))

console.log(`DeploySafe decision: ${gate.decision} | risk: ${gate.riskScore}`)

if (gate.decision !== 'READY') {
  console.error('DeploySafe blocked this deployment.')
  if (Array.isArray(gate.reasons) && gate.reasons.length) {
    console.error(gate.reasons.map(x => `- ${x}`).join('\n'))
  }
  process.exit(2)
}

console.log('DeploySafe release gate passed.')

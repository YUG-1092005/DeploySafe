import fs from 'fs'

function readJson(file) {
  if (!file || !fs.existsSync(file)) return null

  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function num(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

// -------------------------
// Unit test results
// -------------------------

const testReport = readJson(
  process.env.JEST_RESULTS_FILE || 'deploysafe-test-results.json'
)

let testsPassed = 0
let testsTotal = 0

if (testReport) {
  testsPassed = num(testReport.numPassedTests)
  testsTotal = num(testReport.numTotalTests)

  // Fallback for another report shape
  if (testsTotal === 0 && Array.isArray(testReport.testResults)) {
    for (const suite of testReport.testResults) {
      for (const test of suite.assertionResults || []) {
        testsTotal++

        if (test.status === 'passed') {
          testsPassed++
        }
      }
    }
  }
}

// -------------------------
// Coverage
// -------------------------

let coverage = 0

const coverageSummary = readJson(
  process.env.COVERAGE_FILE ||
  'frontend/coverage/coverage-summary.json'
)

if (coverageSummary?.total?.lines?.pct !== undefined) {
  coverage = num(coverageSummary.total.lines.pct)
} else {
  const coverageFinal = readJson(
    'frontend/coverage/coverage-final.json'
  )

  if (coverageFinal) {
    let total = 0
    let covered = 0

    for (const file of Object.values(coverageFinal)) {
      const lines = file?.l || {}

      for (const value of Object.values(lines)) {
        total++

        if (Number(value) > 0) {
          covered++
        }
      }
    }

    if (total > 0) {
      coverage = Number(((covered / total) * 100).toFixed(2))
    }
  }
}

// -------------------------
// Security
// -------------------------

let securityWarnings = 0
let criticalVulnerabilities = 0

for (const file of [
  'deploysafe-frontend-audit.json',
  'deploysafe-backend-audit.json'
]) {
  const audit = readJson(file)

  const vulnerabilities =
    audit?.metadata?.vulnerabilities

  if (!vulnerabilities) continue

  criticalVulnerabilities += num(
    vulnerabilities.critical
  )

  securityWarnings +=
    num(vulnerabilities.high) +
    num(vulnerabilities.moderate) +
    num(vulnerabilities.low)
}

// -------------------------
// Final metrics
// -------------------------

const result = {
  testsPassed,
  testsTotal,
  coverage,

  sonarRating:
    process.env.SONAR_RATING || 'UNKNOWN',

  securityWarnings,
  criticalVulnerabilities,

  p95ResponseMs:
    num(process.env.P95_RESPONSE_MS),

  buildStatus:
    process.env.BUILD_STATUS || 'UNKNOWN'
}

fs.writeFileSync(
  'deploysafe-metrics.json',
  JSON.stringify(result, null, 2)
)

console.log(JSON.stringify(result))
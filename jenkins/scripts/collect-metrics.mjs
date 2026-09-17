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
  // Jest-style report
  if (
    testReport.numPassedTests !== undefined ||
    testReport.numTotalTests !== undefined
  ) {
    testsPassed = num(testReport.numPassedTests)
    testsTotal = num(testReport.numTotalTests)
  }

  // Vitest JSON report
  if (
    testsTotal === 0 &&
    Array.isArray(testReport.testResults)
  ) {
    for (const suite of testReport.testResults) {
      for (const test of suite.assertionResults || []) {
        testsTotal++

        if (test.status === 'passed') {
          testsPassed++
        }
      }
    }
  }

  // Another possible Vitest report structure
  if (
    testsTotal === 0 &&
    Array.isArray(testReport.testResults)
  ) {
    for (const suite of testReport.testResults) {
      if (suite.numPassingTests !== undefined) {
        testsPassed += num(suite.numPassingTests)
      }

      if (suite.numFailingTests !== undefined) {
        testsTotal +=
          num(suite.numPassingTests) +
          num(suite.numFailingTests)
      }
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
// Coverage
// -------------------------

const coverageReport = readJson(
  process.env.COVERAGE_SUMMARY_FILE || 'Frontend/coverage/coverage-summary.json'
)

let coverage = 0

if (coverageReport?.total?.lines?.pct !== undefined) {
  coverage = num(coverageReport.total.lines.pct)
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
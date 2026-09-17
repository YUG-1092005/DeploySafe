import fs from 'fs'

function number(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function readJson(paths) {
  for (const path of paths) {
    if (!path || !fs.existsSync(path)) continue

    try {
      return {
        path,
        data: JSON.parse(fs.readFileSync(path, 'utf8'))
      }
    } catch {
      // Try the next possible file.
    }
  }

  return null
}

function calculateCoverageFromFinalReport(report) {
  if (!report || typeof report !== 'object') return 0

  let totalLines = 0
  let coveredLines = 0

  for (const file of Object.values(report)) {
    if (!file || !file.l) continue

    for (const value of Object.values(file.l)) {
      totalLines += 1

      if (Number(value) > 0) {
        coveredLines += 1
      }
    }
  }

  if (totalLines === 0) return 0

  return Number(((coveredLines / totalLines) * 100).toFixed(2))
}

/*
 * Vitest's JSON reporter produces fields such as:
 *   numPassedTests
 *   numTotalTests
 *   numFailedTests
 *
 * We also support Jest-style reports.
 */
const testReport = readJson([
  process.env.JEST_RESULTS_FILE,
  'deploysafe-test-results.json'
])

let testsPassed = number(process.env.TESTS_PASSED)
let testsTotal = number(process.env.TESTS_TOTAL)

if (testReport?.data) {
  const report = testReport.data

  testsPassed = number(
    report.numPassedTests ??
    report.numPassed ??
    testsPassed
  )

  testsTotal = number(
    report.numTotalTests ??
    report.numTotal ??
    (
      number(report.numPassedTests) +
      number(report.numFailedTests) +
      number(report.numPendingTests) +
      number(report.numTodoTests)
    ),
    testsTotal
  )
}

/*
 * Prefer coverage-summary.json.
 * If it does not exist, calculate line coverage from coverage-final.json.
 */
const coverageSummary = readJson([
  process.env.COVERAGE_FILE,
  'frontend/coverage/coverage-summary.json',
  'coverage/coverage-summary.json'
])

const coverageFinal = readJson([
  'frontend/coverage/coverage-final.json',
  'coverage/coverage-final.json'
])

let coveragePct = number(process.env.COVERAGE)

if (
  coverageSummary?.data?.total?.lines?.pct !== undefined
) {
  coveragePct = number(
    coverageSummary.data.total.lines.pct,
    coveragePct
  )
} else if (coverageFinal?.data) {
  coveragePct = calculateCoverageFromFinalReport(coverageFinal.data)
}

/*
 * npm audit JSON can be produced separately for frontend/backend.
 */
let criticalVulnerabilities = number(process.env.CRITICAL_VULNERABILITIES)
let securityWarnings = number(process.env.SECURITY_WARNINGS)

const auditFiles = [
  process.env.SECURITY_RESULTS_FILE,
  'deploysafe-frontend-audit.json',
  'deploysafe-backend-audit.json',
  'deploysafe-audit.json'
].filter(Boolean)

for (const file of auditFiles) {
  if (!fs.existsSync(file)) continue

  try {
    const audit = JSON.parse(fs.readFileSync(file, 'utf8'))
    const vulnerabilities = audit.metadata?.vulnerabilities

    if (!vulnerabilities) continue

    criticalVulnerabilities += number(vulnerabilities.critical)

    securityWarnings +=
      number(vulnerabilities.high) +
      number(vulnerabilities.moderate) +
      number(vulnerabilities.low)
  } catch {
    // Ignore malformed audit files.
  }
}

const result = {
  testsPassed,
  testsTotal,
  coverage: coveragePct,
  sonarRating: process.env.SONAR_RATING || 'UNKNOWN',
  securityWarnings,
  criticalVulnerabilities,
  p95ResponseMs: number(process.env.P95_RESPONSE_MS),
  buildStatus: process.env.BUILD_STATUS || 'UNKNOWN'
}

fs.writeFileSync(
  process.env.OUTPUT_FILE || 'deploysafe-metrics.json',
  JSON.stringify(result, null, 2)
)

console.log(JSON.stringify(result))
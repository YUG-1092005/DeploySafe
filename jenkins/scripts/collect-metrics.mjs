import fs from 'fs'

function number(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function readJson(path) {
  if (!path || !fs.existsSync(path)) return null
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

const jest = readJson(process.env.JEST_RESULTS_FILE || 'deploysafe-test-results.json')
const coverage = readJson(process.env.COVERAGE_FILE || 'coverage/coverage-summary.json')
const security = readJson(process.env.SECURITY_RESULTS_FILE || 'deploysafe-audit.json')

let testsPassed = number(process.env.TESTS_PASSED)
let testsTotal = number(process.env.TESTS_TOTAL)

if (jest) {
  testsPassed = number(jest.numPassedTests ?? jest.success ?? testsPassed)
  testsTotal = number(
    jest.numTotalTests ??
    (number(jest.numPassedTests) + number(jest.numFailedTests) + number(jest.numPendingTests)),
    testsTotal
  )
}

let coveragePct = number(process.env.COVERAGE)
if (coverage?.total?.lines?.pct !== undefined) {
  coveragePct = number(coverage.total.lines.pct)
}

let criticalVulnerabilities = number(process.env.CRITICAL_VULNERABILITIES)
let securityWarnings = number(process.env.SECURITY_WARNINGS)

if (security?.metadata?.vulnerabilities) {
  criticalVulnerabilities = number(
    security.metadata.vulnerabilities.critical,
    criticalVulnerabilities
  )
  securityWarnings = number(
    security.metadata.vulnerabilities.high +
    security.metadata.vulnerabilities.moderate +
    security.metadata.vulnerabilities.low,
    securityWarnings
  )
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

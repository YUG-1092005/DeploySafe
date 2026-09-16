export function calculateRisk(metrics = {}) {
  let risk = 0
  const reasons = []

  const buildStatus = String(metrics.buildStatus ?? 'UNKNOWN').toUpperCase()
  const testsPassed = Number(metrics.testsPassed ?? 0)
  const testsTotal = Number(metrics.testsTotal ?? 0)
  const coverage = Number(metrics.coverage ?? 0)
  const critical = Number(metrics.criticalVulnerabilities ?? 0)
  const securityWarnings = Number(metrics.securityWarnings ?? 0)
  const p95 = Number(metrics.p95ResponseMs ?? 0)
  const sonar = String(metrics.sonarRating ?? 'UNKNOWN').toUpperCase()

  if (buildStatus === 'FAILURE' || buildStatus === 'FAILED') {
    risk += 40
    reasons.push('Jenkins build failed')
  } else if (!['SUCCESS', 'PASSED'].includes(buildStatus)) {
    risk += 25
    reasons.push('Build result is unavailable')
  }

  if (testsTotal > 0 && testsPassed < testsTotal) {
    risk += 35
    reasons.push(`Unit tests did not fully pass (${testsPassed}/${testsTotal})`)
  } else if (testsTotal <= 0) {
    risk += 20
    reasons.push('Unit test results were not reported')
  }

  if (coverage < 80) {
    risk += 15
    reasons.push(`Coverage is below 80% (${coverage}%)`)
  }

  if (critical > 0) {
    risk += 40
    reasons.push(`${critical} critical security issue(s) found`)
  }

  if (securityWarnings > 0) {
    risk += Math.min(10, securityWarnings * 3)
    reasons.push(`${securityWarnings} security warning(s) found`)
  }

  if (['C', 'D', 'E', 'F'].includes(sonar)) {
    risk += 15
    reasons.push(`SonarQube quality rating is ${sonar}`)
  } else if (sonar === 'B') {
    risk += 5
    reasons.push('SonarQube quality rating is B')
  } else if (sonar === 'UNKNOWN' || sonar === '') {
    risk += 10
    reasons.push('Code quality result was not reported')
  }

  if (p95 <= 0) {
    risk += 10
    reasons.push('Performance result was not reported')
  } else if (p95 > 1000) {
    risk += 20
    reasons.push(`p95 response time is ${p95}ms`)
  } else if (p95 > 500) {
    risk += 8
    reasons.push(`p95 response time is ${p95}ms`)
  }

  risk = Math.min(100, risk)
  const decision = risk < 50 && critical === 0 ? 'READY' : 'BLOCKED'

  return { risk, decision, reasons }
}

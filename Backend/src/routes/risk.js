import { Router } from "express";
import { query } from "../db.js";
import { calculateRisk } from "../utils/risk.js";
const router = Router();

router.get("/:releaseId", async (req, res, next) => {
  try {
    // const { rows } = await query(
    //   "SELECT * FROM releases WHERE id::text = $1 OR release_key = $1",
    //   [req.params.releaseId],
    // );
    const { rows } = await query(
      `
  SELECT
    r.*,
    pr.status AS build_status
  FROM releases r
  LEFT JOIN LATERAL (
    SELECT status
    FROM pipeline_runs
    WHERE release_id = r.id
    ORDER BY created_at DESC
    LIMIT 1
  ) pr ON true
  WHERE r.id::text = $1 OR r.release_key = $1
  `,
      [req.params.releaseId],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Release not found" });
    const r = rows[0];
    const result = calculateRisk({
      testsPassed: r.tests_passed,
      testsTotal: r.tests_total,
      coverage: r.coverage,
      sonarRating: r.sonar_rating,
      securityWarnings: r.security_warnings,
      criticalVulnerabilities: r.critical_vulnerabilities,
      p95ResponseMs: r.p95_response_ms,
      buildStatus: r.build_status,
    });
    res.json({
      success: true,
      data: {
        score: result.risk,
        decision: result.decision,
        reasons: result.reasons,
        components: {
          tests: r.tests_total
            ? Math.round((1 - r.tests_passed / r.tests_total) * 100)
            : 0,
          coverage: r.coverage < 80 ? 15 : 0,
          security: r.critical_vulnerabilities
            ? 40
            : Math.min(10, r.security_warnings * 3),
          quality: ["C", "D", "E"].includes(r.sonar_rating)
            ? 15
            : r.sonar_rating === "B"
              ? 5
              : 0,
          performance:
            r.p95_response_ms > 1000 ? 20 : r.p95_response_ms > 500 ? 8 : 0,
        },
      },
    });
  } catch (e) {
    next(e);
  }
});
export default router;

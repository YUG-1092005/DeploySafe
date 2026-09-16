import { Router } from "express";
import { query } from "../db.js";
const router = Router();

router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await query(
      `
      SELECT pr.*, p.name AS project_name, r.release_key, r.version
      FROM pipeline_runs pr
      LEFT JOIN projects p ON p.id=pr.project_id
      LEFT JOIN releases r ON r.id=pr.release_id
      WHERE pr.id=$1 OR pr.run_number=$1
      ORDER BY pr.created_at DESC LIMIT 1
    `,
      [req.params.id],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Pipeline not found" });
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    next(e);
  }
});

export default router;

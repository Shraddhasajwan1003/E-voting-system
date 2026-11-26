import { pool } from '../config/db.js';

export async function logAudit({
  actor_user_id,
  actor_role,
  action,
  target_type,
  target_id,
  details_json
}: {
  actor_user_id?: number | null;
  actor_role: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  details_json?: any;
}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, actor_role, action, target_type, target_id, details_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        actor_user_id || null,
        actor_role,
        action,
        target_type,
        target_id || null,
        details_json ? JSON.stringify(details_json) : null
      ]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

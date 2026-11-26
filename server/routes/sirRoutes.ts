import express from 'express';
import { pool } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

const router = express.Router();

// 1. Public Electoral Roll Search
router.get('/search', async (req: any, res: any) => {
  const { epic_number, name, state, city, constituency } = req.query;

  try {
    let query = `
      SELECT 
        v.epic_number, 
        u.name, 
        u.city, 
        u.state, 
        v.constituency, 
        v.polling_station, 
        v.part_number, 
        v.serial_number, 
        v.sir_status,
        v.has_voted,
        u.is_senior_citizen,
        v.priority_pass_code
      FROM voters v
      JOIN users u ON v.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (epic_number) {
      query += ' AND UPPER(v.epic_number) = UPPER(?)';
      params.push(String(epic_number).trim());
    } else {
      if (name) {
        query += ' AND LOWER(u.name) LIKE LOWER(?)';
        params.push(`%${String(name).trim()}%`);
      }
      if (state) {
        query += ' AND LOWER(u.state) = LOWER(?)';
        params.push(String(state).trim());
      }
      if (city) {
        query += ' AND LOWER(u.city) = LOWER(?)';
        params.push(String(city).trim());
      }
      if (constituency) {
        query += ' AND LOWER(v.constituency) = LOWER(?)';
        params.push(String(constituency).trim());
      }
    }

    query += ' LIMIT 50';

    const [results]: any = await pool.query(query, params);

    // Mask sensitive details for public roll search
    const maskedResults = results.map((row: any) => ({
      epic_number: row.epic_number,
      name: row.name,
      city: row.city,
      state: row.state,
      constituency: row.constituency,
      polling_station: row.polling_station,
      part_number: row.part_number,
      serial_number: row.serial_number,
      sir_status: row.sir_status || 'VERIFIED',
      is_senior_citizen: Boolean(row.is_senior_citizen),
      has_priority_pass: Boolean(row.priority_pass_code)
    }));

    res.json(maskedResults);
  } catch (error: any) {
    console.error('SIR Search error:', error);
    res.status(500).json({ error: 'Failed to search electoral roll' });
  }
});

// 2. Downloadable Electoral Roll by Constituency
router.get('/roll', async (req: any, res: any) => {
  const { constituency, part_number, format } = req.query;

  if (!constituency) {
    return res.status(400).json({ error: 'Constituency parameter is required' });
  }

  try {
    let query = `
      SELECT 
        v.serial_number,
        v.epic_number,
        u.name,
        u.gender,
        u.is_senior_citizen,
        v.part_number,
        v.constituency,
        v.polling_station,
        v.sir_status
      FROM voters v
      JOIN users u ON v.user_id = u.id
      WHERE LOWER(v.constituency) = LOWER(?)
    `;
    const params: any[] = [String(constituency).trim()];

    if (part_number) {
      query += ' AND v.part_number = ?';
      params.push(part_number);
    }

    query += ' ORDER BY v.serial_number ASC LIMIT 500';

    const [voters]: any = await pool.query(query, params);

    if (format === 'csv') {
      let csv = 'Serial No,EPIC Number,Name,Gender,Senior Citizen,Part Number,Constituency,Polling Station,SIR Status\n';
      for (const row of voters) {
        csv += `"${row.serial_number}","${row.epic_number}","${row.name}","${row.gender || 'N/A'}","${row.is_senior_citizen ? 'Yes' : 'No'}","${row.part_number}","${row.constituency}","${row.polling_station}","${row.sir_status}"\n`;
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="Electoral_Roll_${constituency}.csv"`);
      return res.send(csv);
    }

    res.json(voters);
  } catch (error: any) {
    console.error('Electoral Roll error:', error);
    res.status(500).json({ error: 'Failed to fetch electoral roll' });
  }
});

// 3. Track SIR Revision Status
router.get('/status/:trackingOrEpic', async (req: any, res: any) => {
  const param = req.params.trackingOrEpic.trim();

  try {
    const [requests]: any = await pool.query(
      `SELECT r.*, b.name as blo_name, b.phone as blo_phone 
       FROM revision_requests r
       LEFT JOIN blo_officers b ON r.assigned_blo_id = b.id
       WHERE UPPER(r.tracking_id) = UPPER(?) OR UPPER(r.epic_number) = UPPER(?)
       ORDER BY r.created_at DESC`,
      [param, param]
    );

    if (requests.length === 0) {
      return res.status(404).json({ error: 'No revision request found matching this tracking ID or EPIC number' });
    }

    res.json(requests[0]);
  } catch (error: any) {
    console.error('SIR Status error:', error);
    res.status(500).json({ error: 'Failed to fetch SIR status' });
  }
});

// 4. Submit Revision Request (Form 7 or Form 8)
router.post('/requests', authenticateToken, async (req: any, res: any) => {
  const { form_type, request_subtype, new_data, supporting_doc_note } = req.body;

  if (!form_type || !request_subtype || !new_data) {
    return res.status(400).json({ error: 'Form type, subtype, and new data are required' });
  }

  try {
    // Fetch user voter details
    const [voterRows]: any = await pool.query(
      'SELECT v.*, u.name, u.address, u.city, u.state FROM voters v JOIN users u ON v.user_id = u.id WHERE v.user_id = ? LIMIT 1',
      [req.user.id]
    );
    const voter = voterRows[0];

    const tracking_id = `SIR2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Find constituency BLO
    let bloId = null;
    if (voter?.constituency) {
      const [bloRows]: any = await pool.query(
        'SELECT id FROM blo_officers WHERE constituency = ? AND is_active = 1 LIMIT 1',
        [voter.constituency]
      );
      if (bloRows.length > 0) {
        bloId = bloRows[0].id;
      }
    }

    const old_data = voter
      ? {
          name: voter.name,
          address: voter.address,
          city: voter.city,
          state: voter.state,
          constituency: voter.constituency,
          polling_station: voter.polling_station
        }
      : {};

    await pool.query(
      `INSERT INTO revision_requests (tracking_id, user_id, epic_number, form_type, request_subtype, old_data_json, new_data_json, supporting_doc_note, status, assigned_blo_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?)`,
      [
        tracking_id,
        req.user.id,
        voter?.epic_number || null,
        form_type,
        request_subtype,
        JSON.stringify(old_data),
        JSON.stringify(new_data),
        supporting_doc_note || null,
        bloId
      ]
    );

    await logAudit({
      actor_user_id: req.user.id,
      actor_role: 'voter',
      action: `SUBMIT_${form_type}`,
      target_type: 'revision_requests',
      target_id: tracking_id,
      details_json: { request_subtype, new_data }
    });

    res.status(201).json({
      message: 'Revision request submitted successfully',
      tracking_id,
      status: 'SUBMITTED'
    });
  } catch (error: any) {
    console.error('Submit revision error:', error);
    res.status(500).json({ error: 'Failed to submit revision request' });
  }
});

// 5. My Revision Requests
router.get('/my-requests', authenticateToken, async (req: any, res: any) => {
  try {
    const [requests]: any = await pool.query(
      `SELECT r.*, b.name as blo_name, b.phone as blo_phone 
       FROM revision_requests r
       LEFT JOIN blo_officers b ON r.assigned_blo_id = b.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(requests);
  } catch (error: any) {
    console.error('My requests error:', error);
    res.status(500).json({ error: 'Failed to fetch your revision requests' });
  }
});

// 6. List BLO Officers
router.get('/blos', async (req: any, res: any) => {
  const { constituency } = req.query;

  try {
    let query = 'SELECT * FROM blo_officers WHERE is_active = 1';
    const params: any[] = [];

    if (constituency) {
      query += ' AND LOWER(constituency) = LOWER(?)';
      params.push(String(constituency).trim());
    }

    query += ' ORDER BY constituency, part_number ASC';

    const [blos]: any = await pool.query(query, params);
    res.json(blos);
  } catch (error: any) {
    console.error('BLOs error:', error);
    res.status(500).json({ error: 'Failed to fetch BLO officers' });
  }
});

// 7. Book BLO Appointment
router.post('/blo-appointments', authenticateToken, async (req: any, res: any) => {
  const { blo_id, appointment_date, time_slot, purpose, is_home_visit, notes } = req.body;

  if (!blo_id || !appointment_date || !time_slot || !purpose) {
    return res.status(400).json({ error: 'All appointment fields are required' });
  }

  try {
    const [result]: any = await pool.query(
      `INSERT INTO blo_appointments (user_id, blo_id, appointment_date, time_slot, purpose, is_home_visit, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')`,
      [
        req.user.id,
        blo_id,
        appointment_date,
        time_slot,
        purpose,
        is_home_visit ? 1 : 0,
        notes || null
      ]
    );

    res.status(201).json({
      message: 'BLO appointment scheduled successfully',
      appointment_id: result.insertId
    });
  } catch (error: any) {
    console.error('Book appointment error:', error);
    res.status(500).json({ error: 'Failed to schedule BLO appointment' });
  }
});

// 8. List User's BLO Appointments
router.get('/blo-appointments', authenticateToken, async (req: any, res: any) => {
  try {
    const [appointments]: any = await pool.query(
      `SELECT a.*, b.name as blo_name, b.phone as blo_phone, b.office_address, b.constituency 
       FROM blo_appointments a
       JOIN blo_officers b ON a.blo_id = b.id
       WHERE a.user_id = ?
       ORDER BY a.appointment_date DESC, a.created_at DESC`,
      [req.user.id]
    );
    res.json(appointments);
  } catch (error: any) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// 9. Senior Citizen & PwD Assistance Pass & Home Voting
router.post('/elderly-assistance', authenticateToken, async (req: any, res: any) => {
  const { request_home_voting, request_priority_pass, disability_type, needs_wheelchair, needs_braille_audio } = req.body;

  try {
    let priorityPassCode = null;
    if (request_priority_pass) {
      priorityPassCode = `PRIORITY-PASS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    }

    // Update user disability/assistance flags
    await pool.query(
      `UPDATE users 
       SET disability_type = COALESCE(?, disability_type),
           needs_wheelchair = COALESCE(?, needs_wheelchair),
           needs_braille_audio = COALESCE(?, needs_braille_audio)
       WHERE id = ?`,
      [disability_type || null, needs_wheelchair ? 1 : 0, needs_braille_audio ? 1 : 0, req.user.id]
    );

    // Update voter home voting and priority pass
    await pool.query(
      `UPDATE voters 
       SET home_voting_requested = COALESCE(?, home_voting_requested),
           home_voting_status = CASE WHEN ? = 1 THEN 'REQUESTED' ELSE home_voting_status END,
           priority_pass_code = COALESCE(?, priority_pass_code)
       WHERE user_id = ?`,
      [
        request_home_voting ? 1 : 0,
        request_home_voting ? 1 : 0,
        priorityPassCode,
        req.user.id
      ]
    );

    await logAudit({
      actor_user_id: req.user.id,
      actor_role: 'voter',
      action: 'REQUEST_ELDERLY_ASSISTANCE',
      target_type: 'voters',
      target_id: String(req.user.id),
      details_json: { request_home_voting, priorityPassCode }
    });

    res.json({
      message: 'Assistance preferences updated successfully',
      priority_pass_code: priorityPassCode
    });
  } catch (error: any) {
    console.error('Elderly assistance error:', error);
    res.status(500).json({ error: 'Failed to update assistance request' });
  }
});

export default router;

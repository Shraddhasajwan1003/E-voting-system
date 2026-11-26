import crypto from 'crypto';
import { pool } from '../config/db.js';
import { triageComplaint } from '../utils/gemini.js';
import { logAudit } from '../utils/audit.js';

export const getCandidates = async (req: any, res: any) => {
  const electionIdParam = req.query.election_id;

  try {
    const [voters]: any = await pool.query(
      'SELECT constituency FROM voters WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );
    const voter = voters[0];
    if (!voter) return res.status(404).json({ error: 'Voter not found' });

    // Determine target election
    let targetElectionId = electionIdParam;
    if (!targetElectionId) {
      const [activeEl]: any = await pool.query("SELECT id FROM elections WHERE status = 'ACTIVE' LIMIT 1");
      targetElectionId = activeEl[0]?.id || 1;
    }

    const [candidates]: any = await pool.query(
      `SELECT id, election_id, name, party_name, party_symbol, constituency, city, state,
              age, education, occupation, assets_declared, criminal_cases, bio, manifesto_json, is_nota
       FROM candidates 
       WHERE (constituency = ? OR is_nota = 1) AND (election_id = ? OR election_id IS NULL)
       ORDER BY is_nota ASC, name ASC`,
      [voter.constituency, targetElectionId]
    );

    const formatted = candidates.map((c: any) => ({
      ...c,
      manifesto_json: typeof c.manifesto_json === 'string' ? JSON.parse(c.manifesto_json) : (c.manifesto_json || [])
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Failed to fetch candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
};

export const castVote = async (req: any, res: any) => {
  const { candidate_id, election_id } = req.body;

  if (!candidate_id) {
    return res.status(400).json({ error: 'Candidate ID is required' });
  }

  try {
    const [voters]: any = await pool.query(
      'SELECT id, constituency, has_voted FROM voters WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );
    const voter = voters[0];
    if (!voter) return res.status(404).json({ error: 'Voter record not found' });

    // Find election
    let elId = election_id;
    if (!elId) {
      const [activeEl]: any = await pool.query("SELECT id FROM elections WHERE status = 'ACTIVE' LIMIT 1");
      elId = activeEl[0]?.id || 1;
    }

    const [elections]: any = await pool.query('SELECT * FROM elections WHERE id = ? LIMIT 1', [elId]);
    const election = elections[0];

    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    const now = new Date();
    if (election.status !== 'ACTIVE' || (election.start_time && new Date(election.start_time) > now) || (election.end_time && new Date(election.end_time) < now)) {
      return res.status(400).json({ error: 'Voting is not currently active for this election.' });
    }

    // Check if voter already participated in THIS election
    const [participated]: any = await pool.query(
      'SELECT id FROM voter_participations WHERE election_id = ? AND voter_id = ? LIMIT 1',
      [elId, voter.id]
    );

    if (participated.length > 0) {
      return res.status(400).json({ error: 'You have already cast your vote in this election.' });
    }

    const [candidates]: any = await pool.query('SELECT id, name, constituency FROM candidates WHERE id = ? LIMIT 1', [candidate_id]);
    const candidate = candidates[0];
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    // Generate cryptographic ballot hash and VVPAT receipt code
    const rawSecret = `${elId}-${voter.id}-${Date.now()}-${Math.random()}`;
    const ballot_hash = crypto.createHash('sha256').update(rawSecret).digest('hex').substring(0, 32);
    const vvpat_receipt_code = `VVPAT-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insert strictly anonymous ballot (NO voter_id or user_id!)
      await connection.query(
        'INSERT INTO votes (candidate_id, election_id, constituency, ballot_hash) VALUES (?, ?, ?, ?)',
        [candidate_id, elId, voter.constituency, ballot_hash]
      );

      // Record voter participation and VVPAT code separately
      await connection.query(
        'INSERT INTO voter_participations (election_id, voter_id, constituency, vvpat_receipt_code) VALUES (?, ?, ?, ?)',
        [elId, voter.id, voter.constituency, vvpat_receipt_code]
      );

      // Update voter flag
      await connection.query('UPDATE voters SET has_voted = 1 WHERE id = ?', [voter.id]);

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    await logAudit({
      actor_user_id: req.user.id,
      actor_role: 'voter',
      action: 'VOTE_CAST_VVPAT_ISSUED',
      target_type: 'elections',
      target_id: String(elId),
      details_json: { vvpat_receipt_code, constituency: voter.constituency }
    });

    res.json({
      message: 'Vote cast successfully. Your ballot has been recorded anonymously.',
      vvpat_receipt_code,
      ballot_hash,
      voted_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to cast vote:', error);
    res.status(500).json({ error: 'Failed to cast vote' });
  }
};

export const getReceipt = async (req: any, res: any) => {
  const electionIdParam = req.params.electionId;

  try {
    const [voters]: any = await pool.query('SELECT id, constituency FROM voters WHERE user_id = ? LIMIT 1', [req.user.id]);
    const voter = voters[0];
    if (!voter) return res.status(404).json({ error: 'Voter not found' });

    let query = `
      SELECT vp.vvpat_receipt_code, vp.constituency, vp.voted_at, e.title as election_title, e.election_type 
      FROM voter_participations vp
      JOIN elections e ON vp.election_id = e.id
      WHERE vp.voter_id = ?
    `;
    const params: any[] = [voter.id];

    if (electionIdParam && electionIdParam !== 'latest') {
      query += ' AND vp.election_id = ?';
      params.push(electionIdParam);
    }

    query += ' ORDER BY vp.voted_at DESC LIMIT 1';

    const [receipts]: any = await pool.query(query, params);

    if (receipts.length === 0) {
      return res.status(404).json({ error: 'No vote receipt found for this voter' });
    }

    res.json(receipts[0]);
  } catch (error) {
    console.error('Failed to fetch receipt:', error);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
};

export const getEpicCard = async (req: any, res: any) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT u.id, u.name, u.email, u.mobile, u.address, u.city, u.state, u.date_of_birth, u.gender,
              u.is_senior_citizen, u.disability_type,
              v.epic_number, v.constituency, v.polling_station, v.part_number, v.serial_number,
              v.booth_address, v.priority_pass_code, v.sir_status,
              f.face_descriptor
       FROM users u
       JOIN voters v ON u.id = v.user_id
       LEFT JOIN face_data f ON u.id = f.user_id
       WHERE u.id = ?
       ORDER BY f.created_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    const data = rows[0];
    if (!data) return res.status(404).json({ error: 'E-EPIC record not found' });

    res.json({
      epic_number: data.epic_number,
      name: data.name,
      dob: data.date_of_birth,
      gender: data.gender || 'Not specified',
      constituency: data.constituency,
      polling_station: data.polling_station,
      part_number: data.part_number,
      serial_number: data.serial_number,
      booth_address: data.booth_address,
      address: `${data.address || ''}, ${data.city || ''}, ${data.state || ''}`.trim(),
      is_senior_citizen: Boolean(data.is_senior_citizen),
      priority_pass_code: data.priority_pass_code,
      sir_status: data.sir_status || 'VERIFIED',
      photo: data.face_descriptor || null,
      qr_payload: `ECI-EPIC:${data.epic_number}|NAME:${data.name}|CONST:${data.constituency}|PART:${data.part_number}|SR:${data.serial_number}`
    });
  } catch (error) {
    console.error('E-EPIC error:', error);
    res.status(500).json({ error: 'Failed to generate E-EPIC card' });
  }
};

export const submitComplaint = async (req: any, res: any) => {
  const { subject, description } = req.body;

  if (!subject || !description) {
    return res.status(400).json({ error: 'Subject and description are required' });
  }

  try {
    // Run AI triage
    let triageResult = {
      category: 'GENERAL',
      priority: 'MEDIUM',
      summary: subject,
      suggestedReply: 'Your grievance has been acknowledged and routed to the returning officer.'
    };

    try {
      triageResult = await triageComplaint({ subject, description });
    } catch (aiErr) {
      console.warn('AI Triage error fallback used:', aiErr);
    }

    const [result]: any = await pool.query(
      `INSERT INTO complaints (user_id, subject, description, category, priority, ai_summary, ai_suggested_reply, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.user.id,
        subject,
        description,
        triageResult.category,
        triageResult.priority,
        triageResult.summary,
        triageResult.suggestedReply
      ]
    );

    res.json({
      message: 'Complaint submitted successfully and analyzed by AI triage.',
      complaint_id: result.insertId,
      category: triageResult.category,
      priority: triageResult.priority
    });
  } catch (error) {
    console.error('Failed to submit complaint:', error);
    res.status(500).json({ error: 'Failed to submit complaint' });
  }
};

export const getTimeline = async (req: any, res: any) => {
  try {
    const [startRows]: any = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1', ['voting_start']);
    const [endRows]: any = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1', ['voting_end']);

    res.json({
      start: startRows.length > 0 ? startRows[0].setting_value : null,
      end: endRows.length > 0 ? endRows[0].setting_value : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
};

export const updateProfile = async (req: any, res: any) => {
  const { name, mobile, preferred_language } = req.body;
  if (!name || !mobile) return res.status(400).json({ error: 'Name and mobile are required' });

  try {
    await pool.query(
      'UPDATE users SET name = ?, mobile = ?, preferred_language = COALESCE(?, preferred_language) WHERE id = ?',
      [name, mobile, preferred_language || null, req.user.id]
    );

    const [users]: any = await pool.query(
      `SELECT u.id, u.name, u.email, u.mobile, u.role, u.preferred_language,
              v.epic_number, v.constituency, v.polling_station, v.part_number, v.serial_number,
              v.booth_address, v.has_voted, v.priority_pass_code, v.sir_status
       FROM users u
       LEFT JOIN voters v ON u.id = v.user_id
       WHERE u.id = ? LIMIT 1`,
      [req.user.id]
    );

    res.json({ message: 'Profile updated successfully', user: users[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const getFaceImage = async (req: any, res: any) => {
  try {
    const [rows]: any = await pool.query(
      'SELECT face_descriptor FROM face_data WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );

    if (rows.length > 0 && rows[0].face_descriptor) {
      res.json({ face_data: rows[0].face_descriptor });
    } else {
      res.status(404).json({ error: 'No face image found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch face image' });
  }
};

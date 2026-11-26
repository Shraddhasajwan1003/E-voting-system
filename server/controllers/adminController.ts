import { pool } from '../config/db.js';
import { logAudit } from '../utils/audit.js';

export const getResults = async (req: any, res: any) => {
  const { election_id, constituency } = req.query;

  try {
    let query = `
      SELECT c.id, c.name, c.party_name, c.party_symbol, c.constituency, c.is_nota, c.election_id,
             COUNT(v.id) as votes
      FROM candidates c
      LEFT JOIN votes v ON c.id = v.candidate_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (election_id) {
      query += ' AND (c.election_id = ? OR c.election_id IS NULL)';
      params.push(election_id);
    }
    if (constituency) {
      query += ' AND (c.constituency = ? OR c.is_nota = 1)';
      params.push(constituency);
    }

    query += ' GROUP BY c.id ORDER BY votes DESC';

    const [results]: any = await pool.query(query, params);
    res.json(results);
  } catch (error) {
    console.error('getResults error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
};

export const getStats = async (req: any, res: any) => {
  try {
    const [totalVoters]: any = await pool.query('SELECT COUNT(*) as count FROM voters');
    const [totalVotes]: any = await pool.query('SELECT COUNT(*) as count FROM votes');
    const [pendingComplaints]: any = await pool.query('SELECT COUNT(*) as count FROM complaints WHERE status = ?', ['pending']);
    const [pendingSir]: any = await pool.query("SELECT COUNT(*) as count FROM revision_requests WHERE status IN ('SUBMITTED', 'BLO_ASSIGNED')");
    const [seniorVoters]: any = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_senior_citizen = 1');
    const [homeVotingRequests]: any = await pool.query('SELECT COUNT(*) as count FROM voters WHERE home_voting_requested = 1');

    const vCount = totalVoters[0].count;
    const voteCount = totalVotes[0].count;

    res.json({
      totalVoters: vCount,
      totalVotes: voteCount,
      turnoutPercentage: vCount > 0 ? ((voteCount / vCount) * 100).toFixed(2) : 0,
      pendingComplaints: pendingComplaints[0].count,
      pendingSir: pendingSir[0]?.count || 0,
      seniorVoters: seniorVoters[0]?.count || 0,
      homeVotingRequests: homeVotingRequests[0]?.count || 0
    });
  } catch (error) {
    console.error('getStats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

export const getVoters = async (req: any, res: any) => {
  const { constituency, senior_only, search } = req.query;

  try {
    let query = `
      SELECT u.id, u.name, u.email, u.mobile, u.address, u.city, u.state, u.aadhaar_last4,
             u.date_of_birth, u.gender, u.is_senior_citizen, u.disability_type,
             v.epic_number, v.constituency, v.polling_station, v.part_number, v.serial_number,
             v.has_voted, v.home_voting_requested, v.home_voting_status, v.priority_pass_code, v.sir_status
      FROM users u
      JOIN voters v ON u.id = v.user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (constituency) {
      query += ' AND LOWER(v.constituency) = LOWER(?)';
      params.push(constituency);
    }
    if (senior_only === 'true' || senior_only === '1') {
      query += ' AND (u.is_senior_citizen = 1 OR v.home_voting_requested = 1)';
    }
    if (search) {
      query += ' AND (LOWER(u.name) LIKE LOWER(?) OR UPPER(v.epic_number) LIKE UPPER(?))';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY u.created_at DESC LIMIT 200';

    const [voters] = await pool.query(query, params);
    res.json(voters);
  } catch (error) {
    console.error('getVoters error:', error);
    res.status(500).json({ error: 'Failed to fetch voters' });
  }
};

export const updateVoter = async (req: any, res: any) => {
  const { constituency, polling_station, part_number, sir_status, home_voting_status } = req.body;
  const userId = req.params.id;

  try {
    await pool.query(
      `UPDATE voters 
       SET constituency = COALESCE(?, constituency),
           polling_station = COALESCE(?, polling_station),
           part_number = COALESCE(?, part_number),
           sir_status = COALESCE(?, sir_status),
           home_voting_status = COALESCE(?, home_voting_status)
       WHERE user_id = ?`,
      [constituency, polling_station, part_number, sir_status, home_voting_status, userId]
    );

    await logAudit({
      actor_user_id: req.user.id,
      actor_role: 'admin',
      action: 'UPDATE_VOTER_DETAILS',
      target_type: 'voters',
      target_id: String(userId),
      details_json: { constituency, polling_station, sir_status }
    });

    res.json({ message: 'Voter updated successfully' });
  } catch (error) {
    console.error('updateVoter error:', error);
    res.status(500).json({ error: 'Failed to update voter' });
  }
};

export const getComplaints = async (req: any, res: any) => {
  try {
    const [complaints] = await pool.query(`
      SELECT c.*, u.name as user_name, u.email as user_email, u.mobile as user_mobile, v.epic_number
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN voters v ON u.id = v.user_id
      ORDER BY FIELD(c.status, 'pending') DESC, c.created_at DESC
    `);
    res.json(complaints);
  } catch (error) {
    console.error('getComplaints error:', error);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
};

export const updateComplaint = async (req: any, res: any) => {
  const { status, admin_reply } = req.body;
  const complaintId = req.params.id;

  try {
    await pool.query(
      `UPDATE complaints 
       SET status = COALESCE(?, status),
           admin_reply = COALESCE(?, admin_reply),
           resolved_at = CASE WHEN ? = 'resolved' THEN NOW() ELSE resolved_at END
       WHERE id = ?`,
      [status, admin_reply, status, complaintId]
    );

    await logAudit({
      actor_user_id: req.user.id,
      actor_role: 'admin',
      action: 'RESOLVE_COMPLAINT',
      target_type: 'complaints',
      target_id: String(complaintId),
      details_json: { status, admin_reply }
    });

    res.json({ message: 'Complaint updated successfully' });
  } catch (error) {
    console.error('updateComplaint error:', error);
    res.status(500).json({ error: 'Failed to update complaint' });
  }
};

export const getCandidates = async (req: any, res: any) => {
  try {
    const [candidates]: any = await pool.query('SELECT * FROM candidates ORDER BY is_nota ASC, id DESC');
    const formatted = candidates.map((c: any) => ({
      ...c,
      manifesto_json: typeof c.manifesto_json === 'string' ? JSON.parse(c.manifesto_json) : (c.manifesto_json || [])
    }));
    res.json(formatted);
  } catch (error) {
    console.error('getCandidates error:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
};

export const addCandidate = async (req: any, res: any) => {
  const {
    name,
    party_name,
    party_symbol,
    constituency,
    city,
    state,
    election_id,
    age,
    education,
    occupation,
    assets_declared,
    criminal_cases,
    bio,
    manifesto_json,
    is_nota
  } = req.body;

  try {
    const manifestoStr = Array.isArray(manifesto_json) ? JSON.stringify(manifesto_json) : (manifesto_json || '[]');

    const [result]: any = await pool.query(
      `INSERT INTO candidates (
        name, party_name, party_symbol, constituency, city, state,
        election_id, age, education, occupation, assets_declared,
        criminal_cases, bio, manifesto_json, is_nota
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        party_name,
        party_symbol,
        constituency,
        city || '',
        state || '',
        election_id || 1,
        age || null,
        education || '',
        occupation || '',
        assets_declared || '',
        criminal_cases || 0,
        bio || '',
        manifestoStr,
        is_nota ? 1 : 0
      ]
    );

    await logAudit({
      actor_user_id: req.user.id,
      actor_role: 'admin',
      action: 'CREATE_CANDIDATE',
      target_type: 'candidates',
      target_id: String(result.insertId),
      details_json: { name, party_name, constituency }
    });

    res.json({ message: 'Candidate added successfully', id: result.insertId });
  } catch (error) {
    console.error('addCandidate error:', error);
    res.status(500).json({ error: 'Failed to add candidate' });
  }
};

export const updateCandidate = async (req: any, res: any) => {
  const candidateId = req.params.id;
  const {
    name,
    party_name,
    party_symbol,
    constituency,
    city,
    state,
    age,
    education,
    occupation,
    assets_declared,
    criminal_cases,
    bio,
    manifesto_json
  } = req.body;

  try {
    const manifestoStr = Array.isArray(manifesto_json) ? JSON.stringify(manifesto_json) : (manifesto_json || '[]');

    await pool.query(
      `UPDATE candidates 
       SET name = COALESCE(?, name),
           party_name = COALESCE(?, party_name),
           party_symbol = COALESCE(?, party_symbol),
           constituency = COALESCE(?, constituency),
           city = COALESCE(?, city),
           state = COALESCE(?, state),
           age = COALESCE(?, age),
           education = COALESCE(?, education),
           occupation = COALESCE(?, occupation),
           assets_declared = COALESCE(?, assets_declared),
           criminal_cases = COALESCE(?, criminal_cases),
           bio = COALESCE(?, bio),
           manifesto_json = COALESCE(?, manifesto_json)
       WHERE id = ?`,
      [
        name,
        party_name,
        party_symbol,
        constituency,
        city,
        state,
        age,
        education,
        occupation,
        assets_declared,
        criminal_cases,
        bio,
        manifestoStr,
        candidateId
      ]
    );

    await logAudit({
      actor_user_id: req.user.id,
      actor_role: 'admin',
      action: 'UPDATE_CANDIDATE',
      target_type: 'candidates',
      target_id: String(candidateId),
      details_json: { name, party_name }
    });

    res.json({ message: 'Candidate updated successfully' });
  } catch (error) {
    console.error('updateCandidate error:', error);
    res.status(500).json({ error: 'Failed to update candidate' });
  }
};

export const deleteCandidate = async (req: any, res: any) => {
  const candidateId = req.params.id;

  try {
    await pool.query('DELETE FROM candidates WHERE id = ?', [candidateId]);

    await logAudit({
      actor_user_id: req.user.id,
      actor_role: 'admin',
      action: 'DELETE_CANDIDATE',
      target_type: 'candidates',
      target_id: String(candidateId)
    });

    res.json({ message: 'Candidate deleted successfully' });
  } catch (error) {
    console.error('deleteCandidate error:', error);
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
};

// Elections Management
export const getElections = async (req: any, res: any) => {
  try {
    const [elections] = await pool.query('SELECT * FROM elections ORDER BY start_time DESC');
    res.json(elections);
  } catch (error) {
    console.error('getElections error:', error);
    res.status(500).json({ error: 'Failed to fetch elections' });
  }
};

export const createElection = async (req: any, res: any) => {
  const { title, election_type, description, state, start_time, end_time, status } = req.body;

  try {
    const [result]: any = await pool.query(
      `INSERT INTO elections (title, election_type, description, state, start_time, end_time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, election_type, description || '', state || null, start_time, end_time, status || 'UPCOMING']
    );

    await logAudit({
      actor_user_id: req.user.id,
      actor_role: 'admin',
      action: 'CREATE_ELECTION',
      target_type: 'elections',
      target_id: String(result.insertId),
      details_json: { title, election_type }
    });

    res.status(201).json({ message: 'Election created successfully', id: result.insertId });
  } catch (error) {
    console.error('createElection error:', error);
    res.status(500).json({ error: 'Failed to create election' });
  }
};

export const updateElection = async (req: any, res: any) => {
  const electionId = req.params.id;
  const { title, election_type, description, state, start_time, end_time, status, results_published } = req.body;

  try {
    await pool.query(
      `UPDATE elections 
       SET title = COALESCE(?, title),
           election_type = COALESCE(?, election_type),
           description = COALESCE(?, description),
           state = COALESCE(?, state),
           start_time = COALESCE(?, start_time),
           end_time = COALESCE(?, end_time),
           status = COALESCE(?, status),
           results_published = COALESCE(?, results_published)
       WHERE id = ?`,
      [title, election_type, description, state, start_time, end_time, status, results_published !== undefined ? (results_published ? 1 : 0) : null, electionId]
    );

    await logAudit({
      actor_user_id: req.user.id,
      actor_role: 'admin',
      action: 'UPDATE_ELECTION',
      target_type: 'elections',
      target_id: String(electionId),
      details_json: { title, status, results_published }
    });

    res.json({ message: 'Election updated successfully' });
  } catch (error) {
    console.error('updateElection error:', error);
    res.status(500).json({ error: 'Failed to update election' });
  }
};

// SIR Revision Requests Review Queue
export const getSirRequests = async (req: any, res: any) => {
  const { status, form_type } = req.query;

  try {
    let query = `
      SELECT r.*, u.name as voter_name, u.email as voter_email, u.mobile as voter_mobile,
             b.name as blo_name, b.phone as blo_phone
      FROM revision_requests r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN blo_officers b ON r.assigned_blo_id = b.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    if (form_type) {
      query += ' AND r.form_type = ?';
      params.push(form_type);
    }

    query += ' ORDER BY r.created_at DESC';

    const [requests] = await pool.query(query, params);
    res.json(requests);
  } catch (error) {
    console.error('getSirRequests error:', error);
    res.status(500).json({ error: 'Failed to fetch revision requests' });
  }
};

export const updateSirRequest = async (req: any, res: any) => {
  const requestId = req.params.id;
  const { status, admin_remarks, assigned_blo_id } = req.body;

  try {
    const [existing]: any = await pool.query('SELECT * FROM revision_requests WHERE id = ? LIMIT 1', [requestId]);
    const request = existing[0];
    if (!request) return res.status(404).json({ error: 'Revision request not found' });

    await pool.query(
      `UPDATE revision_requests 
       SET status = COALESCE(?, status),
           admin_remarks = COALESCE(?, admin_remarks),
           assigned_blo_id = COALESCE(?, assigned_blo_id)
       WHERE id = ?`,
      [status, admin_remarks, assigned_blo_id, requestId]
    );

    // If Approved, apply changes atomically
    if (status === 'APPROVED') {
      const newData = typeof request.new_data_json === 'string' ? JSON.parse(request.new_data_json) : request.new_data_json;

      if (request.form_type === 'FORM_8' && newData) {
        // Apply address/name/constituency update
        await pool.query(
          `UPDATE users 
           SET name = COALESCE(?, name),
               address = COALESCE(?, address),
               city = COALESCE(?, city),
               state = COALESCE(?, state)
           WHERE id = ?`,
          [newData.name || null, newData.address || null, newData.city || null, newData.state || null, request.user_id]
        );

        if (newData.constituency || newData.polling_station) {
          await pool.query(
            `UPDATE voters 
             SET constituency = COALESCE(?, constituency),
                 polling_station = COALESCE(?, polling_station),
                 part_number = COALESCE(?, part_number),
                 sir_status = 'VERIFIED'
             WHERE user_id = ?`,
            [newData.constituency || null, newData.polling_station || null, newData.part_number || null, request.user_id]
          );
        }
      } else if (request.form_type === 'FORM_7') {
        // Deletion objection approved
        await pool.query("UPDATE voters SET sir_status = 'DELETED', has_voted = 1 WHERE user_id = ?", [request.user_id]);
      }
    }

    await logAudit({
      actor_user_id: req.user.id,
      actor_role: 'admin',
      action: `REVIEW_SIR_${status}`,
      target_type: 'revision_requests',
      target_id: String(requestId),
      details_json: { status, admin_remarks }
    });

    res.json({ message: `Revision request ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error('updateSirRequest error:', error);
    res.status(500).json({ error: 'Failed to update revision request' });
  }
};

// BLO Officers Management
export const getBloOfficers = async (req: any, res: any) => {
  try {
    const [blos] = await pool.query('SELECT * FROM blo_officers ORDER BY constituency, part_number ASC');
    res.json(blos);
  } catch (error) {
    console.error('getBloOfficers error:', error);
    res.status(500).json({ error: 'Failed to fetch BLO officers' });
  }
};

export const addBloOfficer = async (req: any, res: any) => {
  const { name, phone, email, constituency, part_number, office_address } = req.body;

  try {
    const [result]: any = await pool.query(
      `INSERT INTO blo_officers (name, phone, email, constituency, part_number, office_address, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [name, phone, email || '', constituency, part_number, office_address]
    );

    await logAudit({
      actor_user_id: req.user.id,
      actor_role: 'admin',
      action: 'ADD_BLO_OFFICER',
      target_type: 'blo_officers',
      target_id: String(result.insertId),
      details_json: { name, constituency, part_number }
    });

    res.json({ message: 'BLO Officer added successfully', id: result.insertId });
  } catch (error) {
    console.error('addBloOfficer error:', error);
    res.status(500).json({ error: 'Failed to add BLO officer' });
  }
};

export const deleteBloOfficer = async (req: any, res: any) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM blo_officers WHERE id = ?', [id]);
    res.json({ message: 'BLO Officer removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete BLO officer' });
  }
};

// Announcements Management
export const getAnnouncements = async (req: any, res: any) => {
  try {
    const [announcements] = await pool.query('SELECT * FROM announcements ORDER BY is_pinned DESC, created_at DESC');
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
};

export const addAnnouncement = async (req: any, res: any) => {
  const { title, content, category, is_pinned } = req.body;
  try {
    const [result]: any = await pool.query(
      'INSERT INTO announcements (title, content, category, is_pinned) VALUES (?, ?, ?, ?)',
      [title, content, category || 'NOTICE', is_pinned ? 1 : 0]
    );
    res.json({ message: 'Announcement created successfully', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add announcement' });
  }
};

export const deleteAnnouncement = async (req: any, res: any) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM announcements WHERE id = ?', [id]);
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
};

// Audit Logs
export const getAuditLogs = async (req: any, res: any) => {
  try {
    const [logs] = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 150');
    res.json(logs);
  } catch (error) {
    console.error('getAuditLogs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

// CSV Data Exports
export const exportData = async (req: any, res: any) => {
  const type = req.params.type;

  try {
    if (type === 'voters') {
      const [rows]: any = await pool.query(`
        SELECT u.id, u.name, u.email, u.mobile, v.epic_number, v.constituency, v.polling_station, v.part_number,
               v.has_voted, u.is_senior_citizen, v.sir_status
        FROM users u JOIN voters v ON u.id = v.user_id
      `);
      let csv = 'User ID,Name,Email,Mobile,EPIC Number,Constituency,Polling Station,Part Number,Voted,Senior Citizen,SIR Status\n';
      for (const r of rows) {
        csv += `"${r.id}","${r.name}","${r.email}","${r.mobile}","${r.epic_number}","${r.constituency}","${r.polling_station}","${r.part_number}","${r.has_voted ? 'Yes' : 'No'}","${r.is_senior_citizen ? 'Yes' : 'No'}","${r.sir_status}"\n`;
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ECI_Voters_Export.csv"');
      return res.send(csv);
    }

    if (type === 'results') {
      const [rows]: any = await pool.query(`
        SELECT c.id, c.name, c.party_name, c.constituency, c.is_nota, COUNT(v.id) as votes
        FROM candidates c LEFT JOIN votes v ON c.id = v.candidate_id
        GROUP BY c.id ORDER BY c.constituency, votes DESC
      `);
      let csv = 'Candidate ID,Name,Party,Constituency,Is NOTA,Votes Tallied\n';
      for (const r of rows) {
        csv += `"${r.id}","${r.name}","${r.party_name}","${r.constituency}","${r.is_nota ? 'Yes' : 'No'}","${r.votes}"\n`;
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ECI_Election_Results.csv"');
      return res.send(csv);
    }

    if (type === 'sir') {
      const [rows]: any = await pool.query(`
        SELECT r.tracking_id, r.epic_number, r.form_type, r.request_subtype, r.status, r.created_at, u.name as voter_name
        FROM revision_requests r JOIN users u ON r.user_id = u.id
      `);
      let csv = 'Tracking ID,EPIC Number,Form Type,Subtype,Status,Created At,Voter Name\n';
      for (const r of rows) {
        csv += `"${r.tracking_id}","${r.epic_number || 'N/A'}","${r.form_type}","${r.request_subtype}","${r.status}","${r.created_at}","${r.voter_name}"\n`;
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ECI_SIR_Requests.csv"');
      return res.send(csv);
    }

    if (type === 'audit') {
      const [rows]: any = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500');
      let csv = 'ID,Actor User ID,Actor Role,Action,Target Type,Target ID,Created At\n';
      for (const r of rows) {
        csv += `"${r.id}","${r.actor_user_id || 'System'}","${r.actor_role}","${r.action}","${r.target_type}","${r.target_id || ''}","${r.created_at}"\n`;
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ECI_Security_Audit_Logs.csv"');
      return res.send(csv);
    }

    res.status(400).json({ error: 'Invalid export type. Supported: voters, results, sir, audit' });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
};

export const updateTimeline = async (req: any, res: any) => {
  const { start, end } = req.body;

  try {
    await pool.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [start, 'voting_start']);
    await pool.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [end, 'voting_end']);

    await logAudit({
      actor_user_id: req.user.id,
      actor_role: 'admin',
      action: 'UPDATE_TIMELINE',
      target_type: 'settings',
      target_id: 'voting_schedule',
      details_json: { start, end }
    });

    res.json({ message: 'Timeline updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update timeline' });
  }
};

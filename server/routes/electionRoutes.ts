import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-voting-app';

// Helper to check if requester is admin
function getRequesterRole(req: express.Request): string | null {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    return decoded.role || null;
  } catch (e) {
    return null;
  }
}

// 1. List Elections
router.get('/', async (req, res) => {
  try {
    const [elections] = await pool.query('SELECT * FROM elections ORDER BY start_time DESC');
    res.json(elections);
  } catch (error) {
    console.error('List elections error:', error);
    res.status(500).json({ error: 'Failed to fetch elections' });
  }
});

// 2. Candidates Directory for an Election
router.get('/:id/candidates', async (req, res) => {
  const electionId = req.params.id;
  const { state, city, constituency, search } = req.query;

  try {
    let query = 'SELECT * FROM candidates WHERE election_id = ?';
    const params: any[] = [electionId];

    if (state) {
      query += ' AND LOWER(state) = LOWER(?)';
      params.push(String(state).trim());
    }
    if (city) {
      query += ' AND LOWER(city) = LOWER(?)';
      params.push(String(city).trim());
    }
    if (constituency) {
      query += ' AND LOWER(constituency) = LOWER(?)';
      params.push(String(constituency).trim());
    }
    if (search) {
      query += ' AND (LOWER(name) LIKE LOWER(?) OR LOWER(party_name) LIKE LOWER(?))';
      params.push(`%${String(search).trim()}%`, `%${String(search).trim()}%`);
    }

    query += ' ORDER BY is_nota ASC, name ASC';

    const [candidates]: any = await pool.query(query, params);

    // Format manifesto_json
    const formatted = candidates.map((c: any) => ({
      ...c,
      manifesto_json: typeof c.manifesto_json === 'string' ? JSON.parse(c.manifesto_json) : (c.manifesto_json || [])
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Election candidates error:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// 3. Election History Archive
router.get('/history', async (req, res) => {
  const { year, constituency, party } = req.query;

  try {
    let query = 'SELECT * FROM election_history WHERE 1=1';
    const params: any[] = [];

    if (year) {
      query += ' AND year = ?';
      params.push(year);
    }
    if (constituency) {
      query += ' AND LOWER(constituency) = LOWER(?)';
      params.push(String(constituency).trim());
    }
    if (party) {
      query += ' AND (LOWER(winner_party) LIKE LOWER(?) OR LOWER(runner_up_party) LIKE LOWER(?))';
      params.push(`%${String(party).trim()}%`, `%${String(party).trim()}%`);
    }

    query += ' ORDER BY year DESC, constituency ASC';

    const [history] = await pool.query(query, params);
    res.json(history);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to fetch election history' });
  }
});

// 4. Public / Official Results
router.get('/results/:electionId', async (req, res) => {
  const electionId = req.params.electionId;
  const role = getRequesterRole(req);

  try {
    const [elections]: any = await pool.query('SELECT * FROM elections WHERE id = ? LIMIT 1', [electionId]);
    const election = elections[0];

    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    if (!election.results_published && role !== 'admin') {
      return res.status(403).json({
        locked: true,
        message: 'Results for this election have not been officially published yet by the Election Commission.',
        election_title: election.title,
        end_time: election.end_time
      });
    }

    // Tally votes by candidate
    const [tally]: any = await pool.query(
      `SELECT c.id, c.name, c.party_name, c.party_symbol, c.constituency, c.is_nota, COUNT(v.id) as votes
       FROM candidates c
       LEFT JOIN votes v ON c.id = v.candidate_id AND v.election_id = ?
       WHERE c.election_id = ?
       GROUP BY c.id
       ORDER BY c.constituency ASC, votes DESC`,
      [electionId, electionId]
    );

    const [totalVotes]: any = await pool.query('SELECT COUNT(*) as count FROM votes WHERE election_id = ?', [electionId]);
    const [totalParticipations]: any = await pool.query('SELECT COUNT(*) as count FROM voter_participations WHERE election_id = ?', [electionId]);

    res.json({
      election,
      results: tally,
      total_votes: totalVotes[0]?.count || 0,
      total_voters_participated: totalParticipations[0]?.count || 0
    });
  } catch (error) {
    console.error('Results error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// 5. Public VVPAT Verification
router.get('/verify-receipt/:receiptCode', async (req, res) => {
  const receiptCode = req.params.receiptCode.trim();

  try {
    const [participations]: any = await pool.query(
      `SELECT vp.vvpat_receipt_code, vp.constituency, vp.voted_at, e.title as election_title, e.election_type 
       FROM voter_participations vp
       JOIN elections e ON vp.election_id = e.id
       WHERE UPPER(vp.vvpat_receipt_code) = UPPER(?)
       LIMIT 1`,
      [receiptCode]
    );

    if (participations.length === 0) {
      return res.status(404).json({
        verified: false,
        error: 'VVPAT Receipt code not found in official electoral ledger'
      });
    }

    const record = participations[0];
    res.json({
      verified: true,
      vvpat_receipt_code: record.vvpat_receipt_code,
      election_title: record.election_title,
      election_type: record.election_type,
      constituency: record.constituency,
      voted_at: record.voted_at,
      integrity_status: 'CRYPTOGRAPHICALLY_VERIFIED_IN_LEDGER'
    });
  } catch (error) {
    console.error('Verify receipt error:', error);
    res.status(500).json({ error: 'Failed to verify receipt code' });
  }
});

// 6. Announcements / Public Notices
router.get('/announcements/all', async (req, res) => {
  try {
    const [notices] = await pool.query('SELECT * FROM announcements ORDER BY is_pinned DESC, created_at DESC');
    res.json(notices);
  } catch (error) {
    console.error('Announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

export default router;

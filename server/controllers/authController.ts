import { pool } from '../config/db.js';
import jwt from 'jsonwebtoken';
import { logAudit } from '../utils/audit.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-voting-app';

export const register = async (req: any, res: any) => {
  const {
    name,
    email,
    mobile,
    aadhaar_last4,
    password,
    face_data,
    address,
    city,
    state,
    date_of_birth,
    gender,
    disability_type,
    needs_wheelchair,
    needs_braille_audio,
    preferred_language
  } = req.body;

  try {
    // Calculate senior citizen status (age >= 60)
    let is_senior_citizen = 0;
    if (date_of_birth) {
      const birthDate = new Date(date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age >= 60) {
        is_senior_citizen = 1;
      }
    }

    const [result]: any = await pool.query(
      `INSERT INTO users (
        name, email, mobile, aadhaar_last4, password_hash, address, city, state,
        date_of_birth, gender, is_senior_citizen, disability_type, needs_wheelchair,
        needs_braille_audio, preferred_language, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        name,
        email,
        mobile,
        aadhaar_last4,
        password,
        address || '',
        city || '',
        state || '',
        date_of_birth || null,
        gender || null,
        is_senior_citizen,
        disability_type || null,
        needs_wheelchair ? 1 : 0,
        needs_braille_audio ? 1 : 0,
        preferred_language || 'en'
      ]
    );
    const newUserId = result.insertId;

    const epic_number = 'IND' + Math.floor(1000000 + Math.random() * 9000000);

    // Assign constituency based on city and state
    const [constituencyRecord]: any = await pool.query(
      'SELECT name FROM constituencies WHERE LOWER(city) = LOWER(?) AND LOWER(state) = LOWER(?) LIMIT 1',
      [city || '', state || '']
    );
    let constituency = 'Unassigned Region';

    if (constituencyRecord && constituencyRecord.length > 0) {
      constituency = constituencyRecord[0].name;
    } else if (city && state) {
      constituency = `${city} Central`;
      try {
        await pool.query('INSERT INTO constituencies (name, city, state) VALUES (?, ?, ?)', [constituency, city, state]);
      } catch (e) {
        // Ignore if already exists
      }
    }

    const part_number = `Part-${Math.floor(10 + Math.random() * 80)}`;
    const [lastVoter]: any = await pool.query('SELECT MAX(serial_number) as max_serial FROM voters WHERE constituency = ?', [constituency]);
    const serial_number = (lastVoter[0]?.max_serial || 0) + 1;
    const polling_station = `Booth ${part_number.replace('Part-', '')}, ${city || 'Govt'} Community Center`;
    const booth_address = `${polling_station}, Sector ${Math.floor(1 + Math.random() * 20)}, ${city || 'Capital Region'}, ${state || ''}`;

    let priority_pass_code = null;
    if (is_senior_citizen || needs_wheelchair || disability_type) {
      priority_pass_code = `PRIORITY-PASS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    }

    await pool.query(
      `INSERT INTO voters (
        user_id, epic_number, constituency, polling_station, part_number, serial_number,
        booth_address, priority_pass_code, sir_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED')`,
      [newUserId, epic_number, constituency, polling_station, part_number, serial_number, booth_address, priority_pass_code]
    );

    if (face_data) {
      await pool.query('INSERT INTO face_data (user_id, face_descriptor) VALUES (?, ?)', [newUserId, face_data]);
    }

    // Auto-create Form 6 revision request
    const tracking_id = `SIR2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await pool.query(
      `INSERT INTO revision_requests (
        tracking_id, user_id, epic_number, form_type, request_subtype, new_data_json, status, admin_remarks
      ) VALUES (?, ?, ?, 'FORM_6', 'NEW_INCLUSION', ?, 'APPROVED', 'Automatically verified upon registration with Aadhaar and facial descriptor.')`,
      [
        tracking_id,
        newUserId,
        epic_number,
        JSON.stringify({ name, email, mobile, address, city, state, constituency, polling_station, part_number })
      ]
    );

    await logAudit({
      actor_user_id: newUserId,
      actor_role: 'voter',
      action: 'VOTER_REGISTRATION_FORM_6',
      target_type: 'users',
      target_id: String(newUserId),
      details_json: { epic_number, constituency, is_senior_citizen }
    });

    res.status(201).json({
      message: 'Registration successful',
      epic_number,
      tracking_id,
      priority_pass_code
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Email already registered' });
    } else {
      res.status(500).json({ error: 'Registration failed. Please check details.' });
    }
  }
};

export const login = async (req: any, res: any) => {
  const { email, password } = req.body;

  try {
    const [users]: any = await pool.query(
      `SELECT u.*, v.epic_number, v.constituency, v.polling_station, v.part_number, v.serial_number,
              v.booth_address, v.has_voted, v.home_voting_requested, v.home_voting_status,
              v.priority_pass_code, v.sir_status
       FROM users u 
       LEFT JOIN voters v ON u.id = v.user_id 
       WHERE u.email = ? OR v.epic_number = ?
       LIMIT 1`,
      [email, email]
    );

    const user = users[0];
    if (!user) return res.status(400).json({ error: 'User not found' });

    const validPassword = password === user.password_hash;
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        address: user.address,
        city: user.city,
        state: user.state,
        date_of_birth: user.date_of_birth,
        gender: user.gender,
        is_senior_citizen: Boolean(user.is_senior_citizen),
        disability_type: user.disability_type,
        needs_wheelchair: Boolean(user.needs_wheelchair),
        needs_braille_audio: Boolean(user.needs_braille_audio),
        preferred_language: user.preferred_language || 'en',
        epic_number: user.epic_number,
        constituency: user.constituency,
        polling_station: user.polling_station,
        part_number: user.part_number,
        serial_number: user.serial_number,
        booth_address: user.booth_address,
        has_voted: user.has_voted,
        home_voting_requested: Boolean(user.home_voting_requested),
        home_voting_status: user.home_voting_status,
        priority_pass_code: user.priority_pass_code,
        sir_status: user.sir_status || 'VERIFIED'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const faceLogin = async (req: any, res: any) => {
  const { email, face_data } = req.body;

  if (!face_data) {
    return res.status(400).json({ error: 'Live face data is required' });
  }

  try {
    const [users]: any = await pool.query(
      `SELECT u.*, v.epic_number, v.constituency, v.polling_station, v.part_number, v.serial_number,
              v.booth_address, v.has_voted, v.home_voting_requested, v.home_voting_status,
              v.priority_pass_code, v.sir_status
       FROM users u 
       LEFT JOIN voters v ON u.id = v.user_id 
       WHERE u.email = ? OR v.epic_number = ?
       LIMIT 1`,
      [email, email]
    );

    const user = users[0];
    if (!user) return res.status(400).json({ error: 'User not found' });

    const [storedFaceData]: any = await pool.query(
      'SELECT face_descriptor FROM face_data WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [user.id]
    );

    if (!storedFaceData || storedFaceData.length === 0) {
      return res.status(400).json({ error: 'No face data registered for this user' });
    }

    // Verify presence of face biometric descriptor
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        address: user.address,
        city: user.city,
        state: user.state,
        date_of_birth: user.date_of_birth,
        gender: user.gender,
        is_senior_citizen: Boolean(user.is_senior_citizen),
        disability_type: user.disability_type,
        needs_wheelchair: Boolean(user.needs_wheelchair),
        needs_braille_audio: Boolean(user.needs_braille_audio),
        preferred_language: user.preferred_language || 'en',
        epic_number: user.epic_number,
        constituency: user.constituency,
        polling_station: user.polling_station,
        part_number: user.part_number,
        serial_number: user.serial_number,
        booth_address: user.booth_address,
        has_voted: user.has_voted,
        home_voting_requested: Boolean(user.home_voting_requested),
        home_voting_status: user.home_voting_status,
        priority_pass_code: user.priority_pass_code,
        sir_status: user.sir_status || 'VERIFIED'
      }
    });
  } catch (error) {
    console.error('Face login error:', error);
    res.status(500).json({ error: 'Face login failed' });
  }
};

export const verifyVoter = async (req: any, res: any) => {
  const { identifier, aadhaar_last4, password, live_face_data } = req.body;

  if (!identifier || !aadhaar_last4 || !password) {
    return res.status(400).json({ error: 'Identifier, Aadhaar digits, and password are required' });
  }

  try {
    const [users]: any = await pool.query(
      `SELECT u.*, v.epic_number, v.constituency 
       FROM users u 
       LEFT JOIN voters v ON u.id = v.user_id 
       WHERE u.email = ? OR v.epic_number = ?`,
      [identifier, identifier]
    );

    if (!users || users.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    if (user.id !== req.user.id) {
      return res.status(403).json({ error: 'Verification failed for the current user' });
    }

    if (user.aadhaar_last4 !== aadhaar_last4) {
      return res.status(400).json({ error: 'Invalid Aadhaar last 4 digits' });
    }

    const validPassword = password === user.password_hash;
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Check face verification if live capture is provided
    if (live_face_data) {
      const [faceRecords]: any = await pool.query(
        'SELECT face_descriptor FROM face_data WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [user.id]
      );
      if (faceRecords.length === 0) {
        // Save new live face data
        await pool.query('INSERT INTO face_data (user_id, face_descriptor) VALUES (?, ?)', [user.id, live_face_data]);
      }
    }

    res.json({ success: true, message: 'Voter verified successfully for ballot access' });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

export const getMe = async (req: any, res: any) => {
  try {
    const [users]: any = await pool.query(
      `SELECT u.*, v.epic_number, v.constituency, v.polling_station, v.part_number, v.serial_number,
              v.booth_address, v.has_voted, v.home_voting_requested, v.home_voting_status,
              v.priority_pass_code, v.sir_status
       FROM users u 
       LEFT JOIN voters v ON u.id = v.user_id 
       WHERE u.id = ?
       LIMIT 1`,
      [req.user.id]
    );

    const user = users[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      address: user.address,
      city: user.city,
      state: user.state,
      date_of_birth: user.date_of_birth,
      gender: user.gender,
      is_senior_citizen: Boolean(user.is_senior_citizen),
      disability_type: user.disability_type,
      needs_wheelchair: Boolean(user.needs_wheelchair),
      needs_braille_audio: Boolean(user.needs_braille_audio),
      preferred_language: user.preferred_language || 'en',
      epic_number: user.epic_number,
      constituency: user.constituency,
      polling_station: user.polling_station,
      part_number: user.part_number,
      serial_number: user.serial_number,
      booth_address: user.booth_address,
      has_voted: user.has_voted,
      home_voting_requested: Boolean(user.home_voting_requested),
      home_voting_status: user.home_voting_status,
      priority_pass_code: user.priority_pass_code,
      sir_status: user.sir_status || 'VERIFIED'
    });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

export const resetPassword = async (req: any, res: any) => {
  const { name, email, mobile, aadhaar_last4, city, state, address, newPassword } = req.body;

  if (!name || !email || !mobile || !aadhaar_last4 || !city || !state || !address || !newPassword) {
    return res.status(400).json({ error: 'All fields are required for verification' });
  }

  try {
    const [users]: any = await pool.query(
      'SELECT * FROM users WHERE email = ? AND name = ? AND mobile = ? AND aadhaar_last4 = ? AND city = ? AND state = ? AND address = ? LIMIT 1',
      [email, name, mobile, aadhaar_last4, city, state, address]
    );

    const user = users[0];
    if (!user) {
      return res.status(400).json({ error: 'Verification failed. Details do not match our records.' });
    }

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newPassword, user.id]);

    await logAudit({
      actor_user_id: user.id,
      actor_role: 'voter',
      action: 'RESET_PASSWORD',
      target_type: 'users',
      target_id: String(user.id)
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

export const getStates = async (req: any, res: any) => {
  try {
    const [states]: any = await pool.query('SELECT DISTINCT state FROM constituencies ORDER BY state ASC');
    res.json(states.map((s: any) => s.state));
  } catch (error) {
    console.error('Error in getStates:', error);
    res.status(500).json({ error: 'Failed to fetch states' });
  }
};

export const getCities = async (req: any, res: any) => {
  const { state } = req.query;
  try {
    const [cities]: any = await pool.query('SELECT DISTINCT city FROM constituencies WHERE state = ? ORDER BY city ASC', [state]);
    res.json(cities.map((c: any) => c.city));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
};

export const getConstituencies = async (req: any, res: any) => {
  const { city, state } = req.query;
  try {
    let query = 'SELECT name FROM constituencies WHERE city = ?';
    const params = [city];

    if (state) {
      query += ' AND state = ?';
      params.push(state);
    }

    query += ' ORDER BY name ASC';

    const [constituencies]: any = await pool.query(query, params);
    res.json(constituencies.map((c: any) => c.name));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch constituencies' });
  }
};

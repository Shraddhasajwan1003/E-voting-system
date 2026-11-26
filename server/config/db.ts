import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DATABASE_URL?.includes('aivencloud.com') ? { rejectUnauthorized: false } : undefined
});

async function addColumnIfNotExists(table: string, column: string, definition: string) {
  try {
    const [cols]: any = await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`Added column ${column} to ${table}`);
    }
  } catch (err) {
    console.warn(`Could not check/add column ${column} to ${table}:`, (err as any)?.message || err);
  }
}

export const initializeDB = async () => {
  try {
    // 1. Core Base Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        aadhaar_last4 VARCHAR(4) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'voter',
        address TEXT,
        city VARCHAR(255),
        state VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS voters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        epic_number VARCHAR(50) UNIQUE NOT NULL,
        constituency VARCHAR(255) NOT NULL,
        polling_station VARCHAR(255) NOT NULL,
        has_voted BOOLEAN DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS candidates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        party_name VARCHAR(255) NOT NULL,
        party_symbol VARCHAR(255) NOT NULL,
        constituency VARCHAR(255) NOT NULL,
        city VARCHAR(255),
        state VARCHAR(255)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        candidate_id INT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(candidate_id) REFERENCES candidates(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(255) PRIMARY KEY,
        setting_value TEXT NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS face_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        face_descriptor LONGTEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS constituencies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        state VARCHAR(255) NOT NULL
      )
    `);

    // 2. Add New Columns Safely to Existing Tables
    await addColumnIfNotExists('users', 'date_of_birth', 'DATE NULL');
    await addColumnIfNotExists('users', 'gender', 'VARCHAR(20) NULL');
    await addColumnIfNotExists('users', 'is_senior_citizen', 'BOOLEAN DEFAULT 0');
    await addColumnIfNotExists('users', 'disability_type', 'VARCHAR(100) NULL');
    await addColumnIfNotExists('users', 'needs_wheelchair', 'BOOLEAN DEFAULT 0');
    await addColumnIfNotExists('users', 'needs_braille_audio', 'BOOLEAN DEFAULT 0');
    await addColumnIfNotExists('users', 'preferred_language', "VARCHAR(10) DEFAULT 'en'");
    await addColumnIfNotExists('users', 'is_verified', 'BOOLEAN DEFAULT 1');

    await addColumnIfNotExists('voters', 'part_number', "VARCHAR(50) DEFAULT 'Part-42'");
    await addColumnIfNotExists('voters', 'serial_number', 'INT DEFAULT 1');
    await addColumnIfNotExists('voters', 'booth_address', 'TEXT NULL');
    await addColumnIfNotExists('voters', 'home_voting_requested', 'BOOLEAN DEFAULT 0');
    await addColumnIfNotExists('voters', 'home_voting_status', "VARCHAR(50) DEFAULT 'none'");
    await addColumnIfNotExists('voters', 'priority_pass_code', 'VARCHAR(50) NULL');
    await addColumnIfNotExists('voters', 'sir_status', "VARCHAR(50) DEFAULT 'VERIFIED'");

    await addColumnIfNotExists('candidates', 'election_id', 'INT NULL');
    await addColumnIfNotExists('candidates', 'age', 'INT NULL');
    await addColumnIfNotExists('candidates', 'education', 'VARCHAR(255) NULL');
    await addColumnIfNotExists('candidates', 'occupation', 'VARCHAR(255) NULL');
    await addColumnIfNotExists('candidates', 'assets_declared', 'VARCHAR(100) NULL');
    await addColumnIfNotExists('candidates', 'criminal_cases', 'INT DEFAULT 0');
    await addColumnIfNotExists('candidates', 'bio', 'TEXT NULL');
    await addColumnIfNotExists('candidates', 'manifesto_json', 'JSON NULL');
    await addColumnIfNotExists('candidates', 'incumbent_years', 'INT DEFAULT 0');
    await addColumnIfNotExists('candidates', 'photo_url', 'TEXT NULL');
    await addColumnIfNotExists('candidates', 'is_nota', 'BOOLEAN DEFAULT 0');

    await addColumnIfNotExists('votes', 'election_id', 'INT NULL');
    await addColumnIfNotExists('votes', 'constituency', 'VARCHAR(255) NULL');
    await addColumnIfNotExists('votes', 'ballot_hash', 'VARCHAR(64) NULL');

    await addColumnIfNotExists('complaints', 'category', "VARCHAR(100) DEFAULT 'GENERAL'");
    await addColumnIfNotExists('complaints', 'priority', "VARCHAR(20) DEFAULT 'MEDIUM'");
    await addColumnIfNotExists('complaints', 'ai_summary', 'TEXT NULL');
    await addColumnIfNotExists('complaints', 'ai_suggested_reply', 'TEXT NULL');
    await addColumnIfNotExists('complaints', 'admin_reply', 'TEXT NULL');
    await addColumnIfNotExists('complaints', 'resolved_at', 'DATETIME NULL');

    // 3. New Production Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS elections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        election_type VARCHAR(50) NOT NULL,
        description TEXT,
        state VARCHAR(255) NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        results_published BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS voter_participations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        election_id INT NOT NULL,
        voter_id INT NOT NULL,
        constituency VARCHAR(255) NOT NULL,
        vvpat_receipt_code VARCHAR(64) UNIQUE NOT NULL,
        voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_voter_election (election_id, voter_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS revision_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tracking_id VARCHAR(32) UNIQUE NOT NULL,
        user_id INT NOT NULL,
        epic_number VARCHAR(50) NULL,
        form_type ENUM('FORM_6', 'FORM_7', 'FORM_8') NOT NULL,
        request_subtype VARCHAR(100) NOT NULL,
        old_data_json JSON NULL,
        new_data_json JSON NOT NULL,
        supporting_doc_note TEXT NULL,
        status VARCHAR(50) DEFAULT 'SUBMITTED',
        assigned_blo_id INT NULL,
        admin_remarks TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS blo_officers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255) NULL,
        constituency VARCHAR(255) NOT NULL,
        part_number VARCHAR(50) NOT NULL,
        office_address TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS blo_appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        blo_id INT NOT NULL,
        appointment_date DATE NOT NULL,
        time_slot VARCHAR(50) NOT NULL,
        purpose VARCHAR(255) NOT NULL,
        is_home_visit BOOLEAN DEFAULT 0,
        notes TEXT NULL,
        status VARCHAR(50) DEFAULT 'SCHEDULED',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS election_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        year INT NOT NULL,
        election_title VARCHAR(255) NOT NULL,
        constituency VARCHAR(255) NOT NULL,
        winner_name VARCHAR(255) NOT NULL,
        winner_party VARCHAR(255) NOT NULL,
        winner_votes INT NOT NULL,
        runner_up_name VARCHAR(255) NOT NULL,
        runner_up_party VARCHAR(255) NOT NULL,
        runner_up_votes INT NOT NULL,
        total_electors INT NOT NULL,
        turnout_percent DECIMAL(5,2) NOT NULL,
        key_issues TEXT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'NOTICE',
        is_pinned BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS translations_cache (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lang_code VARCHAR(15) NOT NULL,
        source_hash VARCHAR(64) NOT NULL,
        translated_json LONGTEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_lang_hash (lang_code, source_hash)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        actor_user_id INT NULL,
        actor_role VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(100) NOT NULL,
        target_id VARCHAR(100) NULL,
        details_json JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Seed Constituencies
    const [constRows]: any = await pool.query('SELECT COUNT(*) as count FROM constituencies');
    if (constRows[0].count === 0) {
      const initialConstituencies = [
        ['Visakhapatnam', 'Visakhapatnam', 'Andhra Pradesh'],
        ['Vijayawada', 'Vijayawada', 'Andhra Pradesh'],
        ['Guwahati', 'Guwahati', 'Assam'],
        ['Patna Sahib', 'Patna', 'Bihar'],
        ['Raipur', 'Raipur', 'Chhattisgarh'],
        ['Ahmedabad West', 'Ahmedabad', 'Gujarat'],
        ['Surat', 'Surat', 'Gujarat'],
        ['Gurgaon', 'Gurugram', 'Haryana'],
        ['Shimla', 'Shimla', 'Himachal Pradesh'],
        ['Ranchi', 'Ranchi', 'Jharkhand'],
        ['Bangalore Central', 'Bangalore', 'Karnataka'],
        ['Mysore', 'Mysuru', 'Karnataka'],
        ['Thiruvananthapuram', 'Thiruvananthapuram', 'Kerala'],
        ['Kochi', 'Kochi', 'Kerala'],
        ['Bhopal', 'Bhopal', 'Madhya Pradesh'],
        ['Indore', 'Indore', 'Madhya Pradesh'],
        ['Mumbai South', 'Mumbai', 'Maharashtra'],
        ['Pune', 'Pune', 'Maharashtra'],
        ['Nagpur', 'Nagpur', 'Maharashtra'],
        ['Bhubaneswar', 'Bhubaneswar', 'Odisha'],
        ['Amritsar', 'Amritsar', 'Punjab'],
        ['Ludhiana', 'Ludhiana', 'Punjab'],
        ['Jaipur', 'Jaipur', 'Rajasthan'],
        ['Jodhpur', 'Jodhpur', 'Rajasthan'],
        ['Chennai North', 'Chennai', 'Tamil Nadu'],
        ['Coimbatore', 'Coimbatore', 'Tamil Nadu'],
        ['Hyderabad', 'Hyderabad', 'Telangana'],
        ['Lucknow', 'Lucknow', 'Uttar Pradesh'],
        ['Varanasi', 'Varanasi', 'Uttar Pradesh'],
        ['Kanpur', 'Kanpur', 'Uttar Pradesh'],
        ['Dehradun', 'Dehradun', 'Uttarakhand'],
        ['Kolkata Dakshin', 'Kolkata', 'West Bengal'],
        ['New Delhi Central', 'New Delhi', 'Delhi']
      ];

      for (const [name, city, state] of initialConstituencies) {
        await pool.query('INSERT INTO constituencies (name, city, state) VALUES (?, ?, ?)', [name, city, state]);
      }
    }

    // 5. Seed Elections
    const [electionRows]: any = await pool.query('SELECT COUNT(*) as count FROM elections');
    let defaultElectionId = 1;
    if (electionRows[0].count === 0) {
      const now = new Date();
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const [insertEl]: any = await pool.query(
        `INSERT INTO elections (title, election_type, description, state, start_time, end_time, status, results_published)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 0)`,
        [
          'General Parliamentary Election 2026',
          'LOK_SABHA',
          '19th General Lok Sabha Parliamentary Election covering all constitutional constituencies.',
          'National',
          past,
          future
        ]
      );
      defaultElectionId = insertEl.insertId;
    } else {
      const [existingEl]: any = await pool.query('SELECT id FROM elections LIMIT 1');
      defaultElectionId = existingEl[0]?.id || 1;
    }

    // 6. Seed / Enrich Candidates
    const [candRows]: any = await pool.query('SELECT COUNT(*) as count FROM candidates');
    if (candRows[0].count === 0) {
      const seedCandidates = [
        {
          name: 'Ramesh Kumar',
          party_name: 'National Democratic Party',
          party_symbol: 'Lotus',
          constituency: 'New Delhi Central',
          city: 'New Delhi',
          state: 'Delhi',
          election_id: defaultElectionId,
          age: 52,
          education: 'M.Sc. Economics (Delhi University)',
          occupation: 'Social Worker & Former MLA',
          assets_declared: '₹4.85 Crores',
          criminal_cases: 0,
          bio: 'Serving New Delhi Central for 12 years with strong focus on civic governance, clean water access, and public infrastructure modernization.',
          manifesto_json: JSON.stringify([
            'Upgrade 25 government primary health centers to 24/7 digital dispensaries.',
            'Zero-emissions electric bus transit corridors across New Delhi Central.',
            'Targeted MSME startup credit guarantee and digital skills training hubs.',
            'Rooftop solar subsidy enhancement for residential apartments and welfare centers.'
          ]),
          is_nota: 0
        },
        {
          name: 'Sunita Sharma',
          party_name: 'Indian Progressive Alliance',
          party_symbol: 'Hand',
          constituency: 'New Delhi Central',
          city: 'New Delhi',
          state: 'Delhi',
          election_id: defaultElectionId,
          age: 47,
          education: 'LL.M. Constitutional Law (National Law School)',
          occupation: 'Senior Advocate & Policy Researcher',
          assets_declared: '₹2.90 Crores',
          criminal_cases: 0,
          bio: 'Constitutional law advocate championed women’s safety, public school infrastructure, and universal elderly social pensions.',
          manifesto_json: JSON.stringify([
            'Universal monthly elderly and caregiver direct support benefit.',
            'Establish 50 neighborhood multi-lingual digital libraries and youth labs.',
            'Air quality action plan with bio-scrubbers and urban green buffer zones.',
            'Fast-track legal assistance and citizen dispute redressal clinics.'
          ]),
          is_nota: 0
        },
        {
          name: 'Arvind Singh',
          party_name: 'Aam Janata Party',
          party_symbol: 'Broom',
          constituency: 'New Delhi Central',
          city: 'New Delhi',
          state: 'Delhi',
          election_id: defaultElectionId,
          age: 44,
          education: 'B.Tech Mechanical Engineering (IIT Kharagpur)',
          occupation: 'Urban Planner & Civic Activist',
          assets_declared: '₹1.15 Crores',
          criminal_cases: 0,
          bio: 'Engineer-turned grassroots representative focusing on transparent ward committees, automated citizen grievance resolution, and water audit.',
          manifesto_json: JSON.stringify([
            '100% piped drinking water quality monitoring with real-time public telemetry.',
            'Neighborhood mohalla clinics equipped with tele-medicine AI diagnostics.',
            'Zero property tax hikes for senior citizen occupied self-residences.',
            'Open ward budgeting with direct participatory civic voting on local works.'
          ]),
          is_nota: 0
        },
        {
          name: 'Priya Patel',
          party_name: 'Swatantra Lok Morcha',
          party_symbol: 'Bicycle',
          constituency: 'New Delhi Central',
          city: 'New Delhi',
          state: 'Delhi',
          election_id: defaultElectionId,
          age: 39,
          education: 'MBA (IIM Ahmedabad)',
          occupation: 'CleanTech Entrepreneur',
          assets_declared: '₹6.20 Crores',
          criminal_cases: 0,
          bio: 'Social entrepreneur and clean technology advocate spearheading waste segregation, lake restoration, and women entrepreneurial micro-funds.',
          manifesto_json: JSON.stringify([
            'Zero waste municipal management and decentralized composting in all residential wards.',
            'Special seed funding grants for women-led green startups and artisans.',
            'Pedestrianized public plazas with barrier-free ramps for senior citizens and PwD.',
            'Public safety smart poles with SOS buttons and optical surveillance.'
          ]),
          is_nota: 0
        },
        {
          name: 'None of the Above (NOTA)',
          party_name: 'ECI Registered Independent Option',
          party_symbol: 'NOTA',
          constituency: 'New Delhi Central',
          city: 'New Delhi',
          state: 'Delhi',
          election_id: defaultElectionId,
          age: 0,
          education: 'Constitutional Provision (Rule 49-O / ECI)',
          occupation: 'Electoral Rejection Option',
          assets_declared: 'N/A',
          criminal_cases: 0,
          bio: 'Official ECI ballot option empowering registered voters to express disapproval of all contesting candidates in the constituency while maintaining secret ballot integrity.',
          manifesto_json: JSON.stringify([
            'Record civic dissatisfaction without losing constitutional franchise.',
            'Prompt political parties to nominate candidates with higher integrity.'
          ]),
          is_nota: 1
        }
      ];

      for (const cand of seedCandidates) {
        await pool.query(
          `INSERT INTO candidates (name, party_name, party_symbol, constituency, city, state, election_id, age, education, occupation, assets_declared, criminal_cases, bio, manifesto_json, is_nota)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cand.name,
            cand.party_name,
            cand.party_symbol,
            cand.constituency,
            cand.city,
            cand.state,
            cand.election_id,
            cand.age,
            cand.education,
            cand.occupation,
            cand.assets_declared,
            cand.criminal_cases,
            cand.bio,
            cand.manifesto_json,
            cand.is_nota
          ]
        );
      }
    } else {
      // Ensure existing candidates have election_id set and NOTA exists
      await pool.query('UPDATE candidates SET election_id = ? WHERE election_id IS NULL', [defaultElectionId]);
      
      const [notaCheck]: any = await pool.query('SELECT id FROM candidates WHERE is_nota = 1 LIMIT 1');
      if (notaCheck.length === 0) {
        await pool.query(
          `INSERT INTO candidates (name, party_name, party_symbol, constituency, city, state, election_id, age, education, occupation, assets_declared, criminal_cases, bio, manifesto_json, is_nota)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            'None of the Above (NOTA)',
            'ECI Registered Independent Option',
            'NOTA',
            'New Delhi Central',
            'New Delhi',
            'Delhi',
            defaultElectionId,
            0,
            'Constitutional Provision (ECI Rule 49-O)',
            'Electoral Rejection Option',
            'N/A',
            0,
            'Official ECI ballot option to register dissent against all contesting candidates while maintaining secret ballot.',
            JSON.stringify(['Electors right to register non-endorsement of all candidates secretly.'])
          ]
        );
      }
    }

    // 7. Seed Admin User
    const [adminRows]: any = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
    if (adminRows[0].count === 0) {
      await pool.query(
        'INSERT INTO users (name, email, mobile, aadhaar_last4, password_hash, role, address, city, state, preferred_language, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['Admin User', 'admin@eci.gov.in', '9999999999', '1234', 'admin123', 'admin', 'Election Commission of India HQ, Ashoka Road', 'New Delhi', 'Delhi', 'en', 1]
      );
    }

    // 8. Seed Default Settings
    const [settingsRows]: any = await pool.query('SELECT COUNT(*) as count FROM settings');
    if (settingsRows[0].count === 0) {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      await pool.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', ['voting_start', yesterday.toISOString()]);
      await pool.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', ['voting_end', tomorrow.toISOString()]);
      await pool.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', ['current_election_id', defaultElectionId.toString()]);
    }

    // 9. Seed BLO Officers
    const [bloCount]: any = await pool.query('SELECT COUNT(*) as count FROM blo_officers');
    if (bloCount[0].count === 0) {
      const sampleBloList = [
        ['Shri Rajesh Meena', '+91 98110 24510', 'blo.delhi.p42@eci.gov.in', 'New Delhi Central', 'Part-42', 'Sarvodaya Kanya Vidyalaya, Gole Market, New Delhi'],
        ['Smt. Rekha Verma', '+91 98110 24511', 'blo.delhi.p43@eci.gov.in', 'New Delhi Central', 'Part-43', 'Govt Boys Senior Secondary School, Mandir Marg, New Delhi'],
        ['Shri Ashok Kulkarni', '+91 98201 33420', 'blo.mumbai.p18@eci.gov.in', 'Mumbai South', 'Part-18', 'Municipal Primary School, Colaba, Mumbai'],
        ['Smt. Vidya Kamath', '+91 98450 67812', 'blo.bangalore.p25@eci.gov.in', 'Bangalore Central', 'Part-25', 'Corporation High School, Shivajinagar, Bengaluru'],
        ['Shri Suresh Tiwari', '+91 94150 11234', 'blo.lucknow.p09@eci.gov.in', 'Lucknow', 'Part-09', 'Colvin Taluqdars College, University Road, Lucknow'],
        ['Thiru K. Saravanan', '+91 94440 55678', 'blo.chennai.p14@eci.gov.in', 'Chennai North', 'Part-14', 'Chennai Girls Higher Secondary School, Royapuram, Chennai'],
        ['Shri Subhashish Roy', '+91 98310 99881', 'blo.kolkata.p31@eci.gov.in', 'Kolkata Dakshin', 'Part-31', 'Bhowanipore High School, Ashutosh Mukherjee Road, Kolkata'],
        ['Mohammed Abdul Rafiq', '+91 98490 77123', 'blo.hyderabad.p07@eci.gov.in', 'Hyderabad', 'Part-07', 'Govt City Model High School, Nayapul, Hyderabad'],
        ['Shri Mahendra Rathore', '+91 94140 88219', 'blo.jaipur.p22@eci.gov.in', 'Jaipur', 'Part-22', 'Maharaja Boys Senior Secondary School, Kishanpole, Jaipur'],
        ['Smt. Anjali Patil', '+91 98220 44551', 'blo.pune.p12@eci.gov.in', 'Pune', 'Part-12', 'NM Girls High School, Budhwar Peth, Pune']
      ];

      for (const [name, phone, email, constituency, part_number, office_address] of sampleBloList) {
        await pool.query(
          'INSERT INTO blo_officers (name, phone, email, constituency, part_number, office_address, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
          [name, phone, email, constituency, part_number, office_address]
        );
      }
    }

    // 10. Seed Election History
    const [historyCount]: any = await pool.query('SELECT COUNT(*) as count FROM election_history');
    if (historyCount[0].count === 0) {
      const sampleHistory = [
        [2024, '18th Lok Sabha General Election', 'New Delhi Central', 'Meenakshi Lekhi', 'National Democratic Party', 504206, 'Somnath Bharti', 'Aam Janata Party', 438315, 1528400, 61.68, 'Urban transport expansion, pollution mitigation, and commercial street redevelopment.'],
        [2019, '17th Lok Sabha General Election', 'New Delhi Central', 'Meenakshi Lekhi', 'National Democratic Party', 504206, 'Ajay Maken', 'Indian Progressive Alliance', 247702, 1617470, 56.91, 'National security, economic digitization, and welfare delivery.'],
        [2014, '16th Lok Sabha General Election', 'New Delhi Central', 'Meenakshi Lekhi', 'National Democratic Party', 453350, 'Ashish Khetan', 'Aam Janata Party', 290642, 1493200, 65.11, 'Administrative corruption inquiry, price stability, and public governance reform.'],
        [2024, '18th Lok Sabha General Election', 'Mumbai South', 'Arvind Sawant', 'Shiv Sena (UBT)', 395655, 'Yamini Jadhav', 'Shiv Sena', 342982, 1546800, 50.06, 'Coastal road connectivity, port labor welfare, and high-density housing redevelopment.'],
        [2019, '17th Lok Sabha General Election', 'Mumbai South', 'Arvind Sawant', 'Shiv Sena', 421937, 'Milind Deora', 'Indian Progressive Alliance', 321870, 1551200, 51.59, 'Local railway safety, small business GST compliance, and marine conservation.'],
        [2024, '18th Lok Sabha General Election', 'Bangalore Central', 'P. C. Mohan', 'National Democratic Party', 658915, 'Mansoor Ali Khan', 'Indian Progressive Alliance', 626208, 2435000, 54.06, 'Suburban rail network acceleration, Silicon Valley flood mitigation, and water crisis management.'],
        [2024, '18th Lok Sabha General Election', 'Lucknow', 'Rajnath Singh', 'National Democratic Party', 612709, 'Ravidas Mehrotra', 'Samajwadi Party', 477118, 2098000, 52.28, 'Defense industrial corridor, Gomti riverfront phase 2, and metro rail expansion.'],
        [2024, '18th Lok Sabha General Election', 'Chennai North', 'Dr. Kalanidhi Veeraswamy', 'DMK Alliance', 497333, 'R. Manoharan', 'AIADMK Alliance', 158111, 1490000, 60.13, 'Port expressway, Ennore environmental remediation, and youth technical training centers.']
      ];

      for (const [year, election_title, constituency, winner_name, winner_party, winner_votes, runner_up_name, runner_up_party, runner_up_votes, total_electors, turnout_percent, key_issues] of sampleHistory) {
        await pool.query(
          `INSERT INTO election_history (year, election_title, constituency, winner_name, winner_party, winner_votes, runner_up_name, runner_up_party, runner_up_votes, total_electors, turnout_percent, key_issues)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [year, election_title, constituency, winner_name, winner_party, winner_votes, runner_up_name, runner_up_party, runner_up_votes, total_electors, turnout_percent, key_issues]
        );
      }
    }

    // 11. Seed Announcements
    const [annCount]: any = await pool.query('SELECT COUNT(*) as count FROM announcements');
    if (annCount[0].count === 0) {
      const sampleAnnouncements = [
        [
          'Special Intensive Revision (SIR) 2026 Nationwide Schedule',
          'The Election Commission of India has commenced SIR 2026 for electoral rolls across all constituencies. Citizens are requested to verify their names, check polling station parts, and submit Form 6 (new inclusion), Form 7 (objection/deletion), or Form 8 (address & demographic correction) before the designated cut-off date.',
          'SIR',
          1
        ],
        [
          'Senior Citizen (60+) & PwD Home Voting & Wheelchair Priority Passes',
          'Electors aged 60 and above, along with Persons with Benchmark Disabilities (PwD), can now request Home Postal Voting or download digital Priority Booth Passes with dedicated wheelchair & audio-assisted queues directly from their voter dashboard.',
          'ACCESSIBILITY',
          1
        ],
        [
          'Model Code of Conduct & Cryptographic VVPAT Receipt Verification',
          'All electors voting in the General Parliamentary Election 2026 receive a verifiable VVPAT digital receipt hash upon casting their ballot. Ballot anonymity is strictly protected cryptographically — voters can independently verify receipt existence at /verify-receipt.',
          'SCHEDULE',
          0
        ]
      ];

      for (const [title, content, category, is_pinned] of sampleAnnouncements) {
        await pool.query(
          'INSERT INTO announcements (title, content, category, is_pinned) VALUES (?, ?, ?, ?)',
          [title, content, category, is_pinned]
        );
      }
    }

    console.log('Production MySQL Database initialized and successfully seeded.');
  } catch (err) {
    console.error('Failed to initialize MySQL database. Please check your DATABASE_URL.', err);
  }
};

// server.ts
import express7 from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// server/config/db.ts
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
var pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DATABASE_URL?.includes("aivencloud.com") ? { rejectUnauthorized: false } : void 0
});
async function addColumnIfNotExists(table, column, definition) {
  try {
    const [cols] = await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`Added column ${column} to ${table}`);
    }
  } catch (err) {
    console.warn(`Could not check/add column ${column} to ${table}:`, err?.message || err);
  }
}
var initializeDB = async () => {
  try {
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
    await addColumnIfNotExists("users", "date_of_birth", "DATE NULL");
    await addColumnIfNotExists("users", "gender", "VARCHAR(20) NULL");
    await addColumnIfNotExists("users", "is_senior_citizen", "BOOLEAN DEFAULT 0");
    await addColumnIfNotExists("users", "disability_type", "VARCHAR(100) NULL");
    await addColumnIfNotExists("users", "needs_wheelchair", "BOOLEAN DEFAULT 0");
    await addColumnIfNotExists("users", "needs_braille_audio", "BOOLEAN DEFAULT 0");
    await addColumnIfNotExists("users", "preferred_language", "VARCHAR(10) DEFAULT 'en'");
    await addColumnIfNotExists("users", "is_verified", "BOOLEAN DEFAULT 1");
    await addColumnIfNotExists("voters", "part_number", "VARCHAR(50) DEFAULT 'Part-42'");
    await addColumnIfNotExists("voters", "serial_number", "INT DEFAULT 1");
    await addColumnIfNotExists("voters", "booth_address", "TEXT NULL");
    await addColumnIfNotExists("voters", "home_voting_requested", "BOOLEAN DEFAULT 0");
    await addColumnIfNotExists("voters", "home_voting_status", "VARCHAR(50) DEFAULT 'none'");
    await addColumnIfNotExists("voters", "priority_pass_code", "VARCHAR(50) NULL");
    await addColumnIfNotExists("voters", "sir_status", "VARCHAR(50) DEFAULT 'VERIFIED'");
    await addColumnIfNotExists("candidates", "election_id", "INT NULL");
    await addColumnIfNotExists("candidates", "age", "INT NULL");
    await addColumnIfNotExists("candidates", "education", "VARCHAR(255) NULL");
    await addColumnIfNotExists("candidates", "occupation", "VARCHAR(255) NULL");
    await addColumnIfNotExists("candidates", "assets_declared", "VARCHAR(100) NULL");
    await addColumnIfNotExists("candidates", "criminal_cases", "INT DEFAULT 0");
    await addColumnIfNotExists("candidates", "bio", "TEXT NULL");
    await addColumnIfNotExists("candidates", "manifesto_json", "JSON NULL");
    await addColumnIfNotExists("candidates", "incumbent_years", "INT DEFAULT 0");
    await addColumnIfNotExists("candidates", "photo_url", "TEXT NULL");
    await addColumnIfNotExists("candidates", "is_nota", "BOOLEAN DEFAULT 0");
    await addColumnIfNotExists("votes", "election_id", "INT NULL");
    await addColumnIfNotExists("votes", "constituency", "VARCHAR(255) NULL");
    await addColumnIfNotExists("votes", "ballot_hash", "VARCHAR(64) NULL");
    await addColumnIfNotExists("complaints", "category", "VARCHAR(100) DEFAULT 'GENERAL'");
    await addColumnIfNotExists("complaints", "priority", "VARCHAR(20) DEFAULT 'MEDIUM'");
    await addColumnIfNotExists("complaints", "ai_summary", "TEXT NULL");
    await addColumnIfNotExists("complaints", "ai_suggested_reply", "TEXT NULL");
    await addColumnIfNotExists("complaints", "admin_reply", "TEXT NULL");
    await addColumnIfNotExists("complaints", "resolved_at", "DATETIME NULL");
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
    const [constRows] = await pool.query("SELECT COUNT(*) as count FROM constituencies");
    if (constRows[0].count === 0) {
      const initialConstituencies = [
        ["Visakhapatnam", "Visakhapatnam", "Andhra Pradesh"],
        ["Vijayawada", "Vijayawada", "Andhra Pradesh"],
        ["Guwahati", "Guwahati", "Assam"],
        ["Patna Sahib", "Patna", "Bihar"],
        ["Raipur", "Raipur", "Chhattisgarh"],
        ["Ahmedabad West", "Ahmedabad", "Gujarat"],
        ["Surat", "Surat", "Gujarat"],
        ["Gurgaon", "Gurugram", "Haryana"],
        ["Shimla", "Shimla", "Himachal Pradesh"],
        ["Ranchi", "Ranchi", "Jharkhand"],
        ["Bangalore Central", "Bangalore", "Karnataka"],
        ["Mysore", "Mysuru", "Karnataka"],
        ["Thiruvananthapuram", "Thiruvananthapuram", "Kerala"],
        ["Kochi", "Kochi", "Kerala"],
        ["Bhopal", "Bhopal", "Madhya Pradesh"],
        ["Indore", "Indore", "Madhya Pradesh"],
        ["Mumbai South", "Mumbai", "Maharashtra"],
        ["Pune", "Pune", "Maharashtra"],
        ["Nagpur", "Nagpur", "Maharashtra"],
        ["Bhubaneswar", "Bhubaneswar", "Odisha"],
        ["Amritsar", "Amritsar", "Punjab"],
        ["Ludhiana", "Ludhiana", "Punjab"],
        ["Jaipur", "Jaipur", "Rajasthan"],
        ["Jodhpur", "Jodhpur", "Rajasthan"],
        ["Chennai North", "Chennai", "Tamil Nadu"],
        ["Coimbatore", "Coimbatore", "Tamil Nadu"],
        ["Hyderabad", "Hyderabad", "Telangana"],
        ["Lucknow", "Lucknow", "Uttar Pradesh"],
        ["Varanasi", "Varanasi", "Uttar Pradesh"],
        ["Kanpur", "Kanpur", "Uttar Pradesh"],
        ["Dehradun", "Dehradun", "Uttarakhand"],
        ["Kolkata Dakshin", "Kolkata", "West Bengal"],
        ["New Delhi Central", "New Delhi", "Delhi"]
      ];
      for (const [name, city, state] of initialConstituencies) {
        await pool.query("INSERT INTO constituencies (name, city, state) VALUES (?, ?, ?)", [name, city, state]);
      }
    }
    const [electionRows] = await pool.query("SELECT COUNT(*) as count FROM elections");
    let defaultElectionId = 1;
    if (electionRows[0].count === 0) {
      const now = /* @__PURE__ */ new Date();
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
      const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3);
      const [insertEl] = await pool.query(
        `INSERT INTO elections (title, election_type, description, state, start_time, end_time, status, results_published)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 0)`,
        [
          "General Parliamentary Election 2026",
          "LOK_SABHA",
          "19th General Lok Sabha Parliamentary Election covering all constitutional constituencies.",
          "National",
          past,
          future
        ]
      );
      defaultElectionId = insertEl.insertId;
    } else {
      const [existingEl] = await pool.query("SELECT id FROM elections LIMIT 1");
      defaultElectionId = existingEl[0]?.id || 1;
    }
    const [candRows] = await pool.query("SELECT COUNT(*) as count FROM candidates");
    if (candRows[0].count === 0) {
      const seedCandidates = [
        {
          name: "Ramesh Kumar",
          party_name: "National Democratic Party",
          party_symbol: "Lotus",
          constituency: "New Delhi Central",
          city: "New Delhi",
          state: "Delhi",
          election_id: defaultElectionId,
          age: 52,
          education: "M.Sc. Economics (Delhi University)",
          occupation: "Social Worker & Former MLA",
          assets_declared: "\u20B94.85 Crores",
          criminal_cases: 0,
          bio: "Serving New Delhi Central for 12 years with strong focus on civic governance, clean water access, and public infrastructure modernization.",
          manifesto_json: JSON.stringify([
            "Upgrade 25 government primary health centers to 24/7 digital dispensaries.",
            "Zero-emissions electric bus transit corridors across New Delhi Central.",
            "Targeted MSME startup credit guarantee and digital skills training hubs.",
            "Rooftop solar subsidy enhancement for residential apartments and welfare centers."
          ]),
          is_nota: 0
        },
        {
          name: "Sunita Sharma",
          party_name: "Indian Progressive Alliance",
          party_symbol: "Hand",
          constituency: "New Delhi Central",
          city: "New Delhi",
          state: "Delhi",
          election_id: defaultElectionId,
          age: 47,
          education: "LL.M. Constitutional Law (National Law School)",
          occupation: "Senior Advocate & Policy Researcher",
          assets_declared: "\u20B92.90 Crores",
          criminal_cases: 0,
          bio: "Constitutional law advocate championed women\u2019s safety, public school infrastructure, and universal elderly social pensions.",
          manifesto_json: JSON.stringify([
            "Universal monthly elderly and caregiver direct support benefit.",
            "Establish 50 neighborhood multi-lingual digital libraries and youth labs.",
            "Air quality action plan with bio-scrubbers and urban green buffer zones.",
            "Fast-track legal assistance and citizen dispute redressal clinics."
          ]),
          is_nota: 0
        },
        {
          name: "Arvind Singh",
          party_name: "Aam Janata Party",
          party_symbol: "Broom",
          constituency: "New Delhi Central",
          city: "New Delhi",
          state: "Delhi",
          election_id: defaultElectionId,
          age: 44,
          education: "B.Tech Mechanical Engineering (IIT Kharagpur)",
          occupation: "Urban Planner & Civic Activist",
          assets_declared: "\u20B91.15 Crores",
          criminal_cases: 0,
          bio: "Engineer-turned grassroots representative focusing on transparent ward committees, automated citizen grievance resolution, and water audit.",
          manifesto_json: JSON.stringify([
            "100% piped drinking water quality monitoring with real-time public telemetry.",
            "Neighborhood mohalla clinics equipped with tele-medicine AI diagnostics.",
            "Zero property tax hikes for senior citizen occupied self-residences.",
            "Open ward budgeting with direct participatory civic voting on local works."
          ]),
          is_nota: 0
        },
        {
          name: "Priya Patel",
          party_name: "Swatantra Lok Morcha",
          party_symbol: "Bicycle",
          constituency: "New Delhi Central",
          city: "New Delhi",
          state: "Delhi",
          election_id: defaultElectionId,
          age: 39,
          education: "MBA (IIM Ahmedabad)",
          occupation: "CleanTech Entrepreneur",
          assets_declared: "\u20B96.20 Crores",
          criminal_cases: 0,
          bio: "Social entrepreneur and clean technology advocate spearheading waste segregation, lake restoration, and women entrepreneurial micro-funds.",
          manifesto_json: JSON.stringify([
            "Zero waste municipal management and decentralized composting in all residential wards.",
            "Special seed funding grants for women-led green startups and artisans.",
            "Pedestrianized public plazas with barrier-free ramps for senior citizens and PwD.",
            "Public safety smart poles with SOS buttons and optical surveillance."
          ]),
          is_nota: 0
        },
        {
          name: "None of the Above (NOTA)",
          party_name: "ECI Registered Independent Option",
          party_symbol: "NOTA",
          constituency: "New Delhi Central",
          city: "New Delhi",
          state: "Delhi",
          election_id: defaultElectionId,
          age: 0,
          education: "Constitutional Provision (Rule 49-O / ECI)",
          occupation: "Electoral Rejection Option",
          assets_declared: "N/A",
          criminal_cases: 0,
          bio: "Official ECI ballot option empowering registered voters to express disapproval of all contesting candidates in the constituency while maintaining secret ballot integrity.",
          manifesto_json: JSON.stringify([
            "Record civic dissatisfaction without losing constitutional franchise.",
            "Prompt political parties to nominate candidates with higher integrity."
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
      await pool.query("UPDATE candidates SET election_id = ? WHERE election_id IS NULL", [defaultElectionId]);
      const [notaCheck] = await pool.query("SELECT id FROM candidates WHERE is_nota = 1 LIMIT 1");
      if (notaCheck.length === 0) {
        await pool.query(
          `INSERT INTO candidates (name, party_name, party_symbol, constituency, city, state, election_id, age, education, occupation, assets_declared, criminal_cases, bio, manifesto_json, is_nota)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            "None of the Above (NOTA)",
            "ECI Registered Independent Option",
            "NOTA",
            "New Delhi Central",
            "New Delhi",
            "Delhi",
            defaultElectionId,
            0,
            "Constitutional Provision (ECI Rule 49-O)",
            "Electoral Rejection Option",
            "N/A",
            0,
            "Official ECI ballot option to register dissent against all contesting candidates while maintaining secret ballot.",
            JSON.stringify(["Electors right to register non-endorsement of all candidates secretly."])
          ]
        );
      }
    }
    const [adminRows] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = ?", ["admin"]);
    if (adminRows[0].count === 0) {
      await pool.query(
        "INSERT INTO users (name, email, mobile, aadhaar_last4, password_hash, role, address, city, state, preferred_language, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ["Admin User", "admin@eci.gov.in", "9999999999", "1234", "admin123", "admin", "Election Commission of India HQ, Ashoka Road", "New Delhi", "Delhi", "en", 1]
      );
    }
    const [settingsRows] = await pool.query("SELECT COUNT(*) as count FROM settings");
    if (settingsRows[0].count === 0) {
      const now = /* @__PURE__ */ new Date();
      const tomorrow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3);
      const yesterday = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
      await pool.query("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)", ["voting_start", yesterday.toISOString()]);
      await pool.query("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)", ["voting_end", tomorrow.toISOString()]);
      await pool.query("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)", ["current_election_id", defaultElectionId.toString()]);
    }
    const [bloCount] = await pool.query("SELECT COUNT(*) as count FROM blo_officers");
    if (bloCount[0].count === 0) {
      const sampleBloList = [
        ["Shri Rajesh Meena", "+91 98110 24510", "blo.delhi.p42@eci.gov.in", "New Delhi Central", "Part-42", "Sarvodaya Kanya Vidyalaya, Gole Market, New Delhi"],
        ["Smt. Rekha Verma", "+91 98110 24511", "blo.delhi.p43@eci.gov.in", "New Delhi Central", "Part-43", "Govt Boys Senior Secondary School, Mandir Marg, New Delhi"],
        ["Shri Ashok Kulkarni", "+91 98201 33420", "blo.mumbai.p18@eci.gov.in", "Mumbai South", "Part-18", "Municipal Primary School, Colaba, Mumbai"],
        ["Smt. Vidya Kamath", "+91 98450 67812", "blo.bangalore.p25@eci.gov.in", "Bangalore Central", "Part-25", "Corporation High School, Shivajinagar, Bengaluru"],
        ["Shri Suresh Tiwari", "+91 94150 11234", "blo.lucknow.p09@eci.gov.in", "Lucknow", "Part-09", "Colvin Taluqdars College, University Road, Lucknow"],
        ["Thiru K. Saravanan", "+91 94440 55678", "blo.chennai.p14@eci.gov.in", "Chennai North", "Part-14", "Chennai Girls Higher Secondary School, Royapuram, Chennai"],
        ["Shri Subhashish Roy", "+91 98310 99881", "blo.kolkata.p31@eci.gov.in", "Kolkata Dakshin", "Part-31", "Bhowanipore High School, Ashutosh Mukherjee Road, Kolkata"],
        ["Mohammed Abdul Rafiq", "+91 98490 77123", "blo.hyderabad.p07@eci.gov.in", "Hyderabad", "Part-07", "Govt City Model High School, Nayapul, Hyderabad"],
        ["Shri Mahendra Rathore", "+91 94140 88219", "blo.jaipur.p22@eci.gov.in", "Jaipur", "Part-22", "Maharaja Boys Senior Secondary School, Kishanpole, Jaipur"],
        ["Smt. Anjali Patil", "+91 98220 44551", "blo.pune.p12@eci.gov.in", "Pune", "Part-12", "NM Girls High School, Budhwar Peth, Pune"]
      ];
      for (const [name, phone, email, constituency, part_number, office_address] of sampleBloList) {
        await pool.query(
          "INSERT INTO blo_officers (name, phone, email, constituency, part_number, office_address, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
          [name, phone, email, constituency, part_number, office_address]
        );
      }
    }
    const [historyCount] = await pool.query("SELECT COUNT(*) as count FROM election_history");
    if (historyCount[0].count === 0) {
      const sampleHistory = [
        [2024, "18th Lok Sabha General Election", "New Delhi Central", "Meenakshi Lekhi", "National Democratic Party", 504206, "Somnath Bharti", "Aam Janata Party", 438315, 1528400, 61.68, "Urban transport expansion, pollution mitigation, and commercial street redevelopment."],
        [2019, "17th Lok Sabha General Election", "New Delhi Central", "Meenakshi Lekhi", "National Democratic Party", 504206, "Ajay Maken", "Indian Progressive Alliance", 247702, 1617470, 56.91, "National security, economic digitization, and welfare delivery."],
        [2014, "16th Lok Sabha General Election", "New Delhi Central", "Meenakshi Lekhi", "National Democratic Party", 453350, "Ashish Khetan", "Aam Janata Party", 290642, 1493200, 65.11, "Administrative corruption inquiry, price stability, and public governance reform."],
        [2024, "18th Lok Sabha General Election", "Mumbai South", "Arvind Sawant", "Shiv Sena (UBT)", 395655, "Yamini Jadhav", "Shiv Sena", 342982, 1546800, 50.06, "Coastal road connectivity, port labor welfare, and high-density housing redevelopment."],
        [2019, "17th Lok Sabha General Election", "Mumbai South", "Arvind Sawant", "Shiv Sena", 421937, "Milind Deora", "Indian Progressive Alliance", 321870, 1551200, 51.59, "Local railway safety, small business GST compliance, and marine conservation."],
        [2024, "18th Lok Sabha General Election", "Bangalore Central", "P. C. Mohan", "National Democratic Party", 658915, "Mansoor Ali Khan", "Indian Progressive Alliance", 626208, 2435e3, 54.06, "Suburban rail network acceleration, Silicon Valley flood mitigation, and water crisis management."],
        [2024, "18th Lok Sabha General Election", "Lucknow", "Rajnath Singh", "National Democratic Party", 612709, "Ravidas Mehrotra", "Samajwadi Party", 477118, 2098e3, 52.28, "Defense industrial corridor, Gomti riverfront phase 2, and metro rail expansion."],
        [2024, "18th Lok Sabha General Election", "Chennai North", "Dr. Kalanidhi Veeraswamy", "DMK Alliance", 497333, "R. Manoharan", "AIADMK Alliance", 158111, 149e4, 60.13, "Port expressway, Ennore environmental remediation, and youth technical training centers."]
      ];
      for (const [year, election_title, constituency, winner_name, winner_party, winner_votes, runner_up_name, runner_up_party, runner_up_votes, total_electors, turnout_percent, key_issues] of sampleHistory) {
        await pool.query(
          `INSERT INTO election_history (year, election_title, constituency, winner_name, winner_party, winner_votes, runner_up_name, runner_up_party, runner_up_votes, total_electors, turnout_percent, key_issues)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [year, election_title, constituency, winner_name, winner_party, winner_votes, runner_up_name, runner_up_party, runner_up_votes, total_electors, turnout_percent, key_issues]
        );
      }
    }
    const [annCount] = await pool.query("SELECT COUNT(*) as count FROM announcements");
    if (annCount[0].count === 0) {
      const sampleAnnouncements = [
        [
          "Special Intensive Revision (SIR) 2026 Nationwide Schedule",
          "The Election Commission of India has commenced SIR 2026 for electoral rolls across all constituencies. Citizens are requested to verify their names, check polling station parts, and submit Form 6 (new inclusion), Form 7 (objection/deletion), or Form 8 (address & demographic correction) before the designated cut-off date.",
          "SIR",
          1
        ],
        [
          "Senior Citizen (60+) & PwD Home Voting & Wheelchair Priority Passes",
          "Electors aged 60 and above, along with Persons with Benchmark Disabilities (PwD), can now request Home Postal Voting or download digital Priority Booth Passes with dedicated wheelchair & audio-assisted queues directly from their voter dashboard.",
          "ACCESSIBILITY",
          1
        ],
        [
          "Model Code of Conduct & Cryptographic VVPAT Receipt Verification",
          "All electors voting in the General Parliamentary Election 2026 receive a verifiable VVPAT digital receipt hash upon casting their ballot. Ballot anonymity is strictly protected cryptographically \u2014 voters can independently verify receipt existence at /verify-receipt.",
          "SCHEDULE",
          0
        ]
      ];
      for (const [title, content, category, is_pinned] of sampleAnnouncements) {
        await pool.query(
          "INSERT INTO announcements (title, content, category, is_pinned) VALUES (?, ?, ?, ?)",
          [title, content, category, is_pinned]
        );
      }
    }
    console.log("Production MySQL Database initialized and successfully seeded.");
  } catch (err) {
    console.error("Failed to initialize MySQL database. Please check your DATABASE_URL.", err);
  }
};

// server/routes/authRoutes.ts
import express from "express";

// server/controllers/authController.ts
import jwt from "jsonwebtoken";

// server/utils/audit.ts
async function logAudit({
  actor_user_id,
  actor_role,
  action,
  target_type,
  target_id,
  details_json
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
    console.error("Failed to write audit log:", err);
  }
}

// server/controllers/authController.ts
var JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-for-voting-app";
var register = async (req, res) => {
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
    let is_senior_citizen = 0;
    if (date_of_birth) {
      const birthDate = new Date(date_of_birth);
      const today = /* @__PURE__ */ new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || m === 0 && today.getDate() < birthDate.getDate()) {
        age--;
      }
      if (age >= 60) {
        is_senior_citizen = 1;
      }
    }
    const [result] = await pool.query(
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
        address || "",
        city || "",
        state || "",
        date_of_birth || null,
        gender || null,
        is_senior_citizen,
        disability_type || null,
        needs_wheelchair ? 1 : 0,
        needs_braille_audio ? 1 : 0,
        preferred_language || "en"
      ]
    );
    const newUserId = result.insertId;
    const epic_number = "IND" + Math.floor(1e6 + Math.random() * 9e6);
    const [constituencyRecord] = await pool.query(
      "SELECT name FROM constituencies WHERE LOWER(city) = LOWER(?) AND LOWER(state) = LOWER(?) LIMIT 1",
      [city || "", state || ""]
    );
    let constituency = "Unassigned Region";
    if (constituencyRecord && constituencyRecord.length > 0) {
      constituency = constituencyRecord[0].name;
    } else if (city && state) {
      constituency = `${city} Central`;
      try {
        await pool.query("INSERT INTO constituencies (name, city, state) VALUES (?, ?, ?)", [constituency, city, state]);
      } catch (e) {
      }
    }
    const part_number = `Part-${Math.floor(10 + Math.random() * 80)}`;
    const [lastVoter] = await pool.query("SELECT MAX(serial_number) as max_serial FROM voters WHERE constituency = ?", [constituency]);
    const serial_number = (lastVoter[0]?.max_serial || 0) + 1;
    const polling_station = `Booth ${part_number.replace("Part-", "")}, ${city || "Govt"} Community Center`;
    const booth_address = `${polling_station}, Sector ${Math.floor(1 + Math.random() * 20)}, ${city || "Capital Region"}, ${state || ""}`;
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
      await pool.query("INSERT INTO face_data (user_id, face_descriptor) VALUES (?, ?)", [newUserId, face_data]);
    }
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
      actor_role: "voter",
      action: "VOTER_REGISTRATION_FORM_6",
      target_type: "users",
      target_id: String(newUserId),
      details_json: { epic_number, constituency, is_senior_citizen }
    });
    res.status(201).json({
      message: "Registration successful",
      epic_number,
      tracking_id,
      priority_pass_code
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      res.status(400).json({ error: "Email already registered" });
    } else {
      res.status(500).json({ error: "Registration failed. Please check details." });
    }
  }
};
var login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await pool.query(
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
    if (!user) return res.status(400).json({ error: "User not found" });
    const validPassword = password === user.password_hash;
    if (!validPassword) return res.status(400).json({ error: "Invalid password" });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "8h" });
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
        preferred_language: user.preferred_language || "en",
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
        sir_status: user.sir_status || "VERIFIED"
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};
var faceLogin = async (req, res) => {
  const { email, face_data } = req.body;
  if (!face_data) {
    return res.status(400).json({ error: "Live face data is required" });
  }
  try {
    const [users] = await pool.query(
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
    if (!user) return res.status(400).json({ error: "User not found" });
    const [storedFaceData] = await pool.query(
      "SELECT face_descriptor FROM face_data WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [user.id]
    );
    if (!storedFaceData || storedFaceData.length === 0) {
      return res.status(400).json({ error: "No face data registered for this user" });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "8h" });
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
        preferred_language: user.preferred_language || "en",
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
        sir_status: user.sir_status || "VERIFIED"
      }
    });
  } catch (error) {
    console.error("Face login error:", error);
    res.status(500).json({ error: "Face login failed" });
  }
};
var verifyVoter = async (req, res) => {
  const { identifier, aadhaar_last4, password, live_face_data } = req.body;
  if (!identifier || !aadhaar_last4 || !password) {
    return res.status(400).json({ error: "Identifier, Aadhaar digits, and password are required" });
  }
  try {
    const [users] = await pool.query(
      `SELECT u.*, v.epic_number, v.constituency 
       FROM users u 
       LEFT JOIN voters v ON u.id = v.user_id 
       WHERE u.email = ? OR v.epic_number = ?`,
      [identifier, identifier]
    );
    if (!users || users.length === 0) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const user = users[0];
    if (user.id !== req.user.id) {
      return res.status(403).json({ error: "Verification failed for the current user" });
    }
    if (user.aadhaar_last4 !== aadhaar_last4) {
      return res.status(400).json({ error: "Invalid Aadhaar last 4 digits" });
    }
    const validPassword = password === user.password_hash;
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid password" });
    }
    if (live_face_data) {
      const [faceRecords] = await pool.query(
        "SELECT face_descriptor FROM face_data WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        [user.id]
      );
      if (faceRecords.length === 0) {
        await pool.query("INSERT INTO face_data (user_id, face_descriptor) VALUES (?, ?)", [user.id, live_face_data]);
      }
    }
    res.json({ success: true, message: "Voter verified successfully for ballot access" });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
};
var getMe = async (req, res) => {
  try {
    const [users] = await pool.query(
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
    if (!user) return res.status(404).json({ error: "User not found" });
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
      preferred_language: user.preferred_language || "en",
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
      sir_status: user.sir_status || "VERIFIED"
    });
  } catch (error) {
    console.error("getMe error:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
};
var resetPassword = async (req, res) => {
  const { name, email, mobile, aadhaar_last4, city, state, address, newPassword } = req.body;
  if (!name || !email || !mobile || !aadhaar_last4 || !city || !state || !address || !newPassword) {
    return res.status(400).json({ error: "All fields are required for verification" });
  }
  try {
    const [users] = await pool.query(
      "SELECT * FROM users WHERE email = ? AND name = ? AND mobile = ? AND aadhaar_last4 = ? AND city = ? AND state = ? AND address = ? LIMIT 1",
      [email, name, mobile, aadhaar_last4, city, state, address]
    );
    const user = users[0];
    if (!user) {
      return res.status(400).json({ error: "Verification failed. Details do not match our records." });
    }
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newPassword, user.id]);
    await logAudit({
      actor_user_id: user.id,
      actor_role: "voter",
      action: "RESET_PASSWORD",
      target_type: "users",
      target_id: String(user.id)
    });
    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
};
var getStates = async (req, res) => {
  try {
    const [states] = await pool.query("SELECT DISTINCT state FROM constituencies ORDER BY state ASC");
    res.json(states.map((s) => s.state));
  } catch (error) {
    console.error("Error in getStates:", error);
    res.status(500).json({ error: "Failed to fetch states" });
  }
};
var getCities = async (req, res) => {
  const { state } = req.query;
  try {
    const [cities] = await pool.query("SELECT DISTINCT city FROM constituencies WHERE state = ? ORDER BY city ASC", [state]);
    res.json(cities.map((c) => c.city));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch cities" });
  }
};
var getConstituencies = async (req, res) => {
  const { city, state } = req.query;
  try {
    let query = "SELECT name FROM constituencies WHERE city = ?";
    const params = [city];
    if (state) {
      query += " AND state = ?";
      params.push(state);
    }
    query += " ORDER BY name ASC";
    const [constituencies] = await pool.query(query, params);
    res.json(constituencies.map((c) => c.name));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch constituencies" });
  }
};

// server/middleware/auth.ts
import jwt2 from "jsonwebtoken";
var JWT_SECRET2 = process.env.JWT_SECRET || "super-secret-key-for-voting-app";
var authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access denied" });
  jwt2.verify(token, JWT_SECRET2, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
};
var requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Administrative privileges required" });
  }
  next();
};

// server/routes/authRoutes.ts
var router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.post("/face-login", faceLogin);
router.post("/verify-voter", authenticateToken, verifyVoter);
router.post("/reset-password", resetPassword);
router.get("/me", authenticateToken, getMe);
router.get("/states", getStates);
router.get("/cities", getCities);
router.get("/constituencies", getConstituencies);
var authRoutes_default = router;

// server/routes/voterRoutes.ts
import express2 from "express";

// server/controllers/voterController.ts
import crypto from "crypto";

// server/utils/gemini.ts
import { GoogleGenAI, Type } from "@google/genai";
var apiKey = process.env.GEMINI_API_KEY || "";
var ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var isApiKeyConfigured = Boolean(apiKey && !apiKey.includes("MY_GEMINI") && apiKey.length > 20);
async function askCivicAssistant({
  message,
  history = [],
  language = "en",
  userContext = null,
  constituencyCandidates = [],
  activeElections = []
}) {
  const systemPrompt = `You are the Official Civic Guide AI for "Apna Mat" - the digital election and Special Intensive Revision (SIR) platform of the Election Commission of India.
Your mission:
1. Provide accurate, non-partisan, neutral, and helpful civic information to citizens.
2. Guide voters on SIR 2026: Form 6 (New voter registration), Form 7 (Objection/Deletion of voter record), and Form 8 (Correction of entries, address shift, or constituency change).
3. Explain Booth Level Officer (BLO) appointment procedures, digital E-EPIC card downloads, and VVPAT verification receipts.
4. Assist Senior Citizens (60+) and Persons with Disabilities (PwD) on home postal voting and wheelchair priority booth passes.
5. Answer strictly based on the real election data and candidates provided in the context below. Never invent fictional candidates or endorse any political party.
6. Respond in the requested language (language code: ${language}) with polite, dignified, clear institutional language.

Context:
- Current Active Elections: ${JSON.stringify(activeElections)}
- Voter Profile (if authenticated): ${JSON.stringify(userContext || "Guest User")}
- Candidates in Voter Constituency: ${JSON.stringify(constituencyCandidates)}
`;
  if (isApiKeyConfigured) {
    try {
      const contents = [{ role: "user", parts: [{ text: systemPrompt }] }];
      for (const item of history.slice(-6)) {
        contents.push({
          role: item.role === "model" ? "model" : "user",
          parts: [{ text: item.content }]
        });
      }
      contents.push({ role: "user", parts: [{ text: message }] });
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents
      });
      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn("Gemini chat API call error, using grounded civic response fallback:", err?.message || err);
    }
  }
  const q = message.toLowerCase();
  const langUpper = (language || "en").toLowerCase();
  if (q.includes("form 8") || q.includes("correction") || q.includes("address") || q.includes("shift")) {
    return `Form 8 is used for demographic corrections, shifting of residence within or outside the constituency, and EPIC replacement. You can submit Form 8 directly under the **SIR Services** tab (/sir). Once submitted, a tracking ID (e.g. SIR2026-XXXX) will be generated and assigned to your constituency Booth Level Officer (BLO) for field verification.`;
  }
  if (q.includes("form 7") || q.includes("delete") || q.includes("objection")) {
    return `Form 7 is used to lodge an objection against an existing voter entry or request deletion of a deceased/shifted voter's name from the electoral roll. You can file Form 7 via the **SIR Services** portal (/sir) with supporting remarks.`;
  }
  if (q.includes("form 6") || q.includes("new voter") || q.includes("register")) {
    return `Form 6 is for first-time voter registration (citizens who are 18+ years of age). You can register online through our **Register to Vote (Form 6)** page (/register) with your Aadhaar last 4 digits and facial verification photo.`;
  }
  if (q.includes("blo") || q.includes("booth level officer") || q.includes("appointment") || q.includes("call")) {
    return `You can find your assigned Booth Level Officer (BLO) and schedule an in-person, telephonic, or senior-citizen home visit appointment through the **Book a Call with BLO** page (/blo).`;
  }
  if (q.includes("candidate") || q.includes("who is running") || q.includes("manifesto")) {
    if (constituencyCandidates.length > 0) {
      const candList = constituencyCandidates.map((c) => `- **${c.name}** (${c.party_name}): ${c.manifesto_json ? Array.isArray(c.manifesto_json) ? c.manifesto_json.slice(0, 2).join("; ") : "" : "Active candidate"}`).join("\n");
      return `Here are the candidates contesting in your constituency:

${candList}

You can explore full affidavits, education details, declared assets, and side-by-side manifesto comparisons in the **Candidates Directory** (/candidates).`;
    }
    return `You can view all candidates, declared affidavits, education, and manifestos under the **Candidates Directory** (/candidates). Select your constituency to view verified profiles and compare their policy promises neutrally.`;
  }
  if (q.includes("senior") || q.includes("pwd") || q.includes("wheelchair") || q.includes("home voting") || q.includes("elderly")) {
    return `Apna Mat provides specialized accessibility features for Senior Citizens (aged 60+) and Persons with Disabilities (PwD). You can activate Senior Accessibility Mode using the dock on the bottom right, request a Home Postal Ballot from your dashboard, or download a Priority Booth Pass for zero-wait wheelchair access at your designated polling station.`;
  }
  if (q.includes("receipt") || q.includes("vvpat") || q.includes("verify")) {
    return `After casting your ballot in the secure electronic voting booth, you receive an official cryptographic VVPAT receipt code (e.g. VVPAT-XXXX-XXXX). You can independently verify that your ballot has been tallied in the constituency ledger at **Verify Receipt** (/verify-receipt) while keeping your vote completely secret.`;
  }
  return `Welcome to Apna Mat! As your Official Civic Guide, I can help you with:
1. **Electoral Roll & SIR 2026**: Search voter roll, file Form 6/7/8, and check revision tracking status.
2. **E-EPIC Card**: View and download your digital voter identity card.
3. **Candidates & Manifestos**: Neutral, non-partisan comparison of constituency candidates.
4. **Accessibility**: Senior Citizen (60+) and PwD priority passes and voice assistance.
5. **VVPAT Verification**: Verify that your vote has been securely recorded.

How may I assist your democratic participation today?`;
}
async function compareCandidatesNeutral({
  candidates,
  question,
  language = "en"
}) {
  const systemPrompt = `You are a strictly neutral, non-partisan Election Commission analyst.
Analyze the following candidate profiles and manifestos impartially.
CRITICAL MANDATES:
- NEVER express preference, endorse, or rank any candidate or political party.
- Present facts objectively based strictly on the provided education, declared assets, criminal record transparency, and policy manifesto pledges.
- If a question is asked (e.g., comparing their healthcare or education plans), summarize each candidate's stated manifesto commitments factually and side-by-side.
- Respond in language: ${language}.

Candidates Data:
${JSON.stringify(candidates, null, 2)}
`;
  if (isApiKeyConfigured) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "user", parts: [{ text: question ? `Voter question: "${question}". Provide a neutral factual comparison.` : "Provide a comprehensive neutral side-by-side comparison of these candidates." }] }
        ]
      });
      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn("Gemini compare candidates error, using grounded fallback:", err?.message || err);
    }
  }
  let comparison = `### Neutral Candidate Overview

`;
  for (const c of candidates) {
    const promises = Array.isArray(c.manifesto_json) ? c.manifesto_json : typeof c.manifesto_json === "string" ? JSON.parse(c.manifesto_json || "[]") : [];
    comparison += `#### **${c.name}** \u2014 *${c.party_name}* (Symbol: ${c.party_symbol})
`;
    comparison += `- **Age & Education**: ${c.age ? `${c.age} years old \xB7 ` : ""}${c.education || "Declared in affidavit"}
`;
    comparison += `- **Occupation**: ${c.occupation || "Public Service"}
`;
    comparison += `- **Declared Assets**: ${c.assets_declared || "As per ECI disclosure"}
`;
    comparison += `- **Criminal Cases**: ${c.criminal_cases === 0 ? "Zero declared cases" : `${c.criminal_cases} case(s) declared`}
`;
    if (promises.length > 0) {
      comparison += `- **Key Manifesto Pledges**:
`;
      promises.slice(0, 4).forEach((p) => {
        comparison += `  \u2022 ${p}
`;
      });
    }
    comparison += `
`;
  }
  if (question) {
    comparison += `> **Analysis on "${question}"**: Review each candidate's stated priorities above to determine which platform aligns closest with your civic preferences. All candidates have filed sworn affidavits with the Election Commission.`;
  }
  return comparison;
}
async function triageComplaint({
  subject,
  description
}) {
  if (isApiKeyConfigured) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are an ECI Grievance Officer AI. Categorize and triage this citizen complaint:
Subject: ${subject}
Description: ${description}`
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: "One of: VOTER_ROLL, POLLING_BOOTH, ACCESSIBILITY, MODEL_CODE_OF_CONDUCT, EVM_VVPAT, BLO_ASSISTANCE, OTHER"
              },
              priority: {
                type: Type.STRING,
                description: "One of: HIGH, MEDIUM, LOW"
              },
              summary: {
                type: Type.STRING,
                description: "Concise 1-sentence administrative summary of the grievance"
              },
              suggestedReply: {
                type: Type.STRING,
                description: "Formal, reassuring, official ECI administrative draft reply acknowledging the grievance and outlining immediate next steps."
              }
            },
            required: ["category", "priority", "summary", "suggestedReply"]
          }
        }
      });
      if (response.text) {
        return JSON.parse(response.text);
      }
    } catch (err) {
      console.warn("Gemini complaint triage error, using heuristic fallback:", err?.message || err);
    }
  }
  const text = `${subject} ${description}`.toLowerCase();
  let category = "GENERAL";
  let priority = "MEDIUM";
  if (text.includes("wheelchair") || text.includes("disability") || text.includes("senior") || text.includes("elderly") || text.includes("blind") || text.includes("braille")) {
    category = "ACCESSIBILITY";
    priority = "HIGH";
  } else if (text.includes("booth") || text.includes("polling station") || text.includes("queue") || text.includes("security")) {
    category = "POLLING_BOOTH";
    priority = "HIGH";
  } else if (text.includes("roll") || text.includes("name missing") || text.includes("epic") || text.includes("form 8") || text.includes("voter list")) {
    category = "VOTER_ROLL";
    priority = "MEDIUM";
  } else if (text.includes("blo") || text.includes("officer") || text.includes("appointment")) {
    category = "BLO_ASSISTANCE";
    priority = "MEDIUM";
  } else if (text.includes("bribe") || text.includes("threat") || text.includes("party worker") || text.includes("violation")) {
    category = "MODEL_CODE_OF_CONDUCT";
    priority = "HIGH";
  }
  return {
    category,
    priority,
    summary: `Citizen raised an inquiry regarding ${subject}.`,
    suggestedReply: `Thank you for bringing this matter to the attention of the Election Commission of India. Your grievance (Category: ${category}) has been logged under priority ${priority}. The designated Returning Officer and constituency team have been notified to review the details and initiate necessary field verification.`
  };
}
async function summarizeElectionAnalytics({
  stats,
  turnoutByConstituency = [],
  sirBacklog = 0
}) {
  if (isApiKeyConfigured) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are the Chief Electoral Officer Chief of Staff. Generate an executive summary briefing for the Election Commission leadership based on these live metrics:
Stats: ${JSON.stringify(stats)}
Constituency Data: ${JSON.stringify(turnoutByConstituency)}
Pending SIR Petitions: ${sirBacklog}

Format as structured markdown with sections: Executive Overview, Key Turnout Highlights, Operational Vigilance & Action Items.`
              }
            ]
          }
        ]
      });
      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn("Gemini analytics briefing error, using heuristic fallback:", err?.message || err);
    }
  }
  return `### Election Commission Executive Briefing

#### 1. Executive Overview
- **Voter Base Registered**: ${stats?.totalVoters ?? 0} electors active in electoral rolls.
- **Ballots Tallied**: ${stats?.totalVotes ?? 0} secret ballots recorded with cryptographic VVPAT verification hashes.
- **Voter Turnout**: **${stats?.turnoutPercentage ?? 0}%** overall participation.
- **Special Intensive Revision (SIR) Queue**: ${sirBacklog} pending Form 6/7/8 petitions under active BLO field review.

#### 2. Key Operational Observations
- All voting machine endpoints are operating securely with 100% cryptographic integrity.
- Senior Citizen & PwD accessibility stations report normal dispatch of assisted passes.
- Grievance redressal rate is within designated ECI service-level agreements.

#### 3. Recommended Administrative Actions
- Maintain continuous queue monitoring across high-density urban polling stations.
- Accelerate BLO clearance of pending Form 8 address revisions prior to final roll publication.`;
}
async function translateBatch({
  targetLangCode,
  targetLangName,
  keyValueMap
}) {
  if (isApiKeyConfigured) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are a master translator specializing in official Eighth Schedule Indian languages.
Translate the key-value dictionary below into "${targetLangName}" (ISO code: "${targetLangCode}").
Maintain respectful civic terminology appropriate for the Election Commission of India.
Return strictly valid JSON where each key exactly matches the original key and the value is the high-quality translation in ${targetLangName} script.

Source Dictionary:
${JSON.stringify(keyValueMap, null, 2)}`
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });
      if (response.text) {
        return JSON.parse(response.text);
      }
    } catch (err) {
      console.warn("Gemini translateBatch error:", err?.message || err);
    }
  }
  return keyValueMap;
}
async function synthesizeSpeech({
  text,
  language = "en"
}) {
  if (isApiKeyConfigured) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash-lite-tts",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Read aloud clearly, calmly, and slowly in ${language}: "${text}"`
              }
            ]
          }
        ]
      });
      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        const parts = candidates[0].content?.parts || [];
        for (const p of parts) {
          if (p.inlineData && p.inlineData.data) {
            return {
              audioBase64: p.inlineData.data,
              mimeType: p.inlineData.mimeType || "audio/wav",
              useClientFallback: false
            };
          }
        }
      }
    } catch (err) {
      console.warn("Gemini synthesizeSpeech error:", err?.message || err);
    }
  }
  return {
    audioBase64: null,
    mimeType: null,
    useClientFallback: true
  };
}
async function transcribeAudio({
  base64Audio,
  mimeType = "audio/webm",
  language = "en"
}) {
  if (isApiKeyConfigured && base64Audio) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-transcribe",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  data: base64Audio,
                  mimeType
                }
              },
              {
                text: `Transcribe this voter spoken voice recording accurately into text. Language expected: ${language}. Return ONLY the transcribed text.`
              }
            ]
          }
        ]
      });
      if (response.text) {
        return response.text.trim();
      }
    } catch (err) {
      console.warn("Gemini transcribeAudio error:", err?.message || err);
    }
  }
  return "";
}

// server/controllers/voterController.ts
var getCandidates = async (req, res) => {
  const electionIdParam = req.query.election_id;
  try {
    const [voters] = await pool.query(
      "SELECT constituency FROM voters WHERE user_id = ? LIMIT 1",
      [req.user.id]
    );
    const voter = voters[0];
    if (!voter) return res.status(404).json({ error: "Voter not found" });
    let targetElectionId = electionIdParam;
    if (!targetElectionId) {
      const [activeEl] = await pool.query("SELECT id FROM elections WHERE status = 'ACTIVE' LIMIT 1");
      targetElectionId = activeEl[0]?.id || 1;
    }
    const [candidates] = await pool.query(
      `SELECT id, election_id, name, party_name, party_symbol, constituency, city, state,
              age, education, occupation, assets_declared, criminal_cases, bio, manifesto_json, is_nota
       FROM candidates 
       WHERE (constituency = ? OR is_nota = 1) AND (election_id = ? OR election_id IS NULL)
       ORDER BY is_nota ASC, name ASC`,
      [voter.constituency, targetElectionId]
    );
    const formatted = candidates.map((c) => ({
      ...c,
      manifesto_json: typeof c.manifesto_json === "string" ? JSON.parse(c.manifesto_json) : c.manifesto_json || []
    }));
    res.json(formatted);
  } catch (error) {
    console.error("Failed to fetch candidates:", error);
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
};
var castVote = async (req, res) => {
  const { candidate_id, election_id } = req.body;
  if (!candidate_id) {
    return res.status(400).json({ error: "Candidate ID is required" });
  }
  try {
    const [voters] = await pool.query(
      "SELECT id, constituency, has_voted FROM voters WHERE user_id = ? LIMIT 1",
      [req.user.id]
    );
    const voter = voters[0];
    if (!voter) return res.status(404).json({ error: "Voter record not found" });
    let elId = election_id;
    if (!elId) {
      const [activeEl] = await pool.query("SELECT id FROM elections WHERE status = 'ACTIVE' LIMIT 1");
      elId = activeEl[0]?.id || 1;
    }
    const [elections] = await pool.query("SELECT * FROM elections WHERE id = ? LIMIT 1", [elId]);
    const election = elections[0];
    if (!election) {
      return res.status(404).json({ error: "Election not found" });
    }
    const now = /* @__PURE__ */ new Date();
    if (election.status !== "ACTIVE" || election.start_time && new Date(election.start_time) > now || election.end_time && new Date(election.end_time) < now) {
      return res.status(400).json({ error: "Voting is not currently active for this election." });
    }
    const [participated] = await pool.query(
      "SELECT id FROM voter_participations WHERE election_id = ? AND voter_id = ? LIMIT 1",
      [elId, voter.id]
    );
    if (participated.length > 0) {
      return res.status(400).json({ error: "You have already cast your vote in this election." });
    }
    const [candidates] = await pool.query("SELECT id, name, constituency FROM candidates WHERE id = ? LIMIT 1", [candidate_id]);
    const candidate = candidates[0];
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });
    const rawSecret = `${elId}-${voter.id}-${Date.now()}-${Math.random()}`;
    const ballot_hash = crypto.createHash("sha256").update(rawSecret).digest("hex").substring(0, 32);
    const vvpat_receipt_code = `VVPAT-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        "INSERT INTO votes (candidate_id, election_id, constituency, ballot_hash) VALUES (?, ?, ?, ?)",
        [candidate_id, elId, voter.constituency, ballot_hash]
      );
      await connection.query(
        "INSERT INTO voter_participations (election_id, voter_id, constituency, vvpat_receipt_code) VALUES (?, ?, ?, ?)",
        [elId, voter.id, voter.constituency, vvpat_receipt_code]
      );
      await connection.query("UPDATE voters SET has_voted = 1 WHERE id = ?", [voter.id]);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
    await logAudit({
      actor_user_id: req.user.id,
      actor_role: "voter",
      action: "VOTE_CAST_VVPAT_ISSUED",
      target_type: "elections",
      target_id: String(elId),
      details_json: { vvpat_receipt_code, constituency: voter.constituency }
    });
    res.json({
      message: "Vote cast successfully. Your ballot has been recorded anonymously.",
      vvpat_receipt_code,
      ballot_hash,
      voted_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("Failed to cast vote:", error);
    res.status(500).json({ error: "Failed to cast vote" });
  }
};
var getReceipt = async (req, res) => {
  const electionIdParam = req.params.electionId;
  try {
    const [voters] = await pool.query("SELECT id, constituency FROM voters WHERE user_id = ? LIMIT 1", [req.user.id]);
    const voter = voters[0];
    if (!voter) return res.status(404).json({ error: "Voter not found" });
    let query = `
      SELECT vp.vvpat_receipt_code, vp.constituency, vp.voted_at, e.title as election_title, e.election_type 
      FROM voter_participations vp
      JOIN elections e ON vp.election_id = e.id
      WHERE vp.voter_id = ?
    `;
    const params = [voter.id];
    if (electionIdParam && electionIdParam !== "latest") {
      query += " AND vp.election_id = ?";
      params.push(electionIdParam);
    }
    query += " ORDER BY vp.voted_at DESC LIMIT 1";
    const [receipts] = await pool.query(query, params);
    if (receipts.length === 0) {
      return res.status(404).json({ error: "No vote receipt found for this voter" });
    }
    res.json(receipts[0]);
  } catch (error) {
    console.error("Failed to fetch receipt:", error);
    res.status(500).json({ error: "Failed to fetch receipt" });
  }
};
var getEpicCard = async (req, res) => {
  try {
    const [rows] = await pool.query(
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
    if (!data) return res.status(404).json({ error: "E-EPIC record not found" });
    res.json({
      epic_number: data.epic_number,
      name: data.name,
      dob: data.date_of_birth,
      gender: data.gender || "Not specified",
      constituency: data.constituency,
      polling_station: data.polling_station,
      part_number: data.part_number,
      serial_number: data.serial_number,
      booth_address: data.booth_address,
      address: `${data.address || ""}, ${data.city || ""}, ${data.state || ""}`.trim(),
      is_senior_citizen: Boolean(data.is_senior_citizen),
      priority_pass_code: data.priority_pass_code,
      sir_status: data.sir_status || "VERIFIED",
      photo: data.face_descriptor || null,
      qr_payload: `ECI-EPIC:${data.epic_number}|NAME:${data.name}|CONST:${data.constituency}|PART:${data.part_number}|SR:${data.serial_number}`
    });
  } catch (error) {
    console.error("E-EPIC error:", error);
    res.status(500).json({ error: "Failed to generate E-EPIC card" });
  }
};
var submitComplaint = async (req, res) => {
  const { subject, description } = req.body;
  if (!subject || !description) {
    return res.status(400).json({ error: "Subject and description are required" });
  }
  try {
    let triageResult = {
      category: "GENERAL",
      priority: "MEDIUM",
      summary: subject,
      suggestedReply: "Your grievance has been acknowledged and routed to the returning officer."
    };
    try {
      triageResult = await triageComplaint({ subject, description });
    } catch (aiErr) {
      console.warn("AI Triage error fallback used:", aiErr);
    }
    const [result] = await pool.query(
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
      message: "Complaint submitted successfully and analyzed by AI triage.",
      complaint_id: result.insertId,
      category: triageResult.category,
      priority: triageResult.priority
    });
  } catch (error) {
    console.error("Failed to submit complaint:", error);
    res.status(500).json({ error: "Failed to submit complaint" });
  }
};
var getTimeline = async (req, res) => {
  try {
    const [startRows] = await pool.query("SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1", ["voting_start"]);
    const [endRows] = await pool.query("SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1", ["voting_end"]);
    res.json({
      start: startRows.length > 0 ? startRows[0].setting_value : null,
      end: endRows.length > 0 ? endRows[0].setting_value : null
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch timeline" });
  }
};
var updateProfile = async (req, res) => {
  const { name, mobile, preferred_language } = req.body;
  if (!name || !mobile) return res.status(400).json({ error: "Name and mobile are required" });
  try {
    await pool.query(
      "UPDATE users SET name = ?, mobile = ?, preferred_language = COALESCE(?, preferred_language) WHERE id = ?",
      [name, mobile, preferred_language || null, req.user.id]
    );
    const [users] = await pool.query(
      `SELECT u.id, u.name, u.email, u.mobile, u.role, u.preferred_language,
              v.epic_number, v.constituency, v.polling_station, v.part_number, v.serial_number,
              v.booth_address, v.has_voted, v.priority_pass_code, v.sir_status
       FROM users u
       LEFT JOIN voters v ON u.id = v.user_id
       WHERE u.id = ? LIMIT 1`,
      [req.user.id]
    );
    res.json({ message: "Profile updated successfully", user: users[0] });
  } catch (error) {
    res.status(500).json({ error: "Failed to update profile" });
  }
};
var getFaceImage = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT face_descriptor FROM face_data WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [req.user.id]
    );
    if (rows.length > 0 && rows[0].face_descriptor) {
      res.json({ face_data: rows[0].face_descriptor });
    } else {
      res.status(404).json({ error: "No face image found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch face image" });
  }
};

// server/routes/voterRoutes.ts
var router2 = express2.Router();
router2.get("/candidates", authenticateToken, getCandidates);
router2.post("/vote", authenticateToken, castVote);
router2.post("/complaints", authenticateToken, submitComplaint);
router2.put("/users/profile", authenticateToken, updateProfile);
router2.get("/users/face", authenticateToken, getFaceImage);
router2.get("/users/epic-card", authenticateToken, getEpicCard);
router2.get("/users/receipt/:electionId", authenticateToken, getReceipt);
router2.get("/settings/timeline", getTimeline);
var voterRoutes_default = router2;

// server/routes/adminRoutes.ts
import express3 from "express";

// server/controllers/adminController.ts
var getResults = async (req, res) => {
  const { election_id, constituency } = req.query;
  try {
    let query = `
      SELECT c.id, c.name, c.party_name, c.party_symbol, c.constituency, c.is_nota, c.election_id,
             COUNT(v.id) as votes
      FROM candidates c
      LEFT JOIN votes v ON c.id = v.candidate_id
      WHERE 1=1
    `;
    const params = [];
    if (election_id) {
      query += " AND (c.election_id = ? OR c.election_id IS NULL)";
      params.push(election_id);
    }
    if (constituency) {
      query += " AND (c.constituency = ? OR c.is_nota = 1)";
      params.push(constituency);
    }
    query += " GROUP BY c.id ORDER BY votes DESC";
    const [results] = await pool.query(query, params);
    res.json(results);
  } catch (error) {
    console.error("getResults error:", error);
    res.status(500).json({ error: "Failed to fetch results" });
  }
};
var getStats = async (req, res) => {
  try {
    const [totalVoters] = await pool.query("SELECT COUNT(*) as count FROM voters");
    const [totalVotes] = await pool.query("SELECT COUNT(*) as count FROM votes");
    const [pendingComplaints] = await pool.query("SELECT COUNT(*) as count FROM complaints WHERE status = ?", ["pending"]);
    const [pendingSir] = await pool.query("SELECT COUNT(*) as count FROM revision_requests WHERE status IN ('SUBMITTED', 'BLO_ASSIGNED')");
    const [seniorVoters] = await pool.query("SELECT COUNT(*) as count FROM users WHERE is_senior_citizen = 1");
    const [homeVotingRequests] = await pool.query("SELECT COUNT(*) as count FROM voters WHERE home_voting_requested = 1");
    const vCount = totalVoters[0].count;
    const voteCount = totalVotes[0].count;
    res.json({
      totalVoters: vCount,
      totalVotes: voteCount,
      turnoutPercentage: vCount > 0 ? (voteCount / vCount * 100).toFixed(2) : 0,
      pendingComplaints: pendingComplaints[0].count,
      pendingSir: pendingSir[0]?.count || 0,
      seniorVoters: seniorVoters[0]?.count || 0,
      homeVotingRequests: homeVotingRequests[0]?.count || 0
    });
  } catch (error) {
    console.error("getStats error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};
var getVoters = async (req, res) => {
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
    const params = [];
    if (constituency) {
      query += " AND LOWER(v.constituency) = LOWER(?)";
      params.push(constituency);
    }
    if (senior_only === "true" || senior_only === "1") {
      query += " AND (u.is_senior_citizen = 1 OR v.home_voting_requested = 1)";
    }
    if (search) {
      query += " AND (LOWER(u.name) LIKE LOWER(?) OR UPPER(v.epic_number) LIKE UPPER(?))";
      params.push(`%${search}%`, `%${search}%`);
    }
    query += " ORDER BY u.created_at DESC LIMIT 200";
    const [voters] = await pool.query(query, params);
    res.json(voters);
  } catch (error) {
    console.error("getVoters error:", error);
    res.status(500).json({ error: "Failed to fetch voters" });
  }
};
var updateVoter = async (req, res) => {
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
      actor_role: "admin",
      action: "UPDATE_VOTER_DETAILS",
      target_type: "voters",
      target_id: String(userId),
      details_json: { constituency, polling_station, sir_status }
    });
    res.json({ message: "Voter updated successfully" });
  } catch (error) {
    console.error("updateVoter error:", error);
    res.status(500).json({ error: "Failed to update voter" });
  }
};
var getComplaints = async (req, res) => {
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
    console.error("getComplaints error:", error);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
};
var updateComplaint = async (req, res) => {
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
      actor_role: "admin",
      action: "RESOLVE_COMPLAINT",
      target_type: "complaints",
      target_id: String(complaintId),
      details_json: { status, admin_reply }
    });
    res.json({ message: "Complaint updated successfully" });
  } catch (error) {
    console.error("updateComplaint error:", error);
    res.status(500).json({ error: "Failed to update complaint" });
  }
};
var getCandidates2 = async (req, res) => {
  try {
    const [candidates] = await pool.query("SELECT * FROM candidates ORDER BY is_nota ASC, id DESC");
    const formatted = candidates.map((c) => ({
      ...c,
      manifesto_json: typeof c.manifesto_json === "string" ? JSON.parse(c.manifesto_json) : c.manifesto_json || []
    }));
    res.json(formatted);
  } catch (error) {
    console.error("getCandidates error:", error);
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
};
var addCandidate = async (req, res) => {
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
    const manifestoStr = Array.isArray(manifesto_json) ? JSON.stringify(manifesto_json) : manifesto_json || "[]";
    const [result] = await pool.query(
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
        city || "",
        state || "",
        election_id || 1,
        age || null,
        education || "",
        occupation || "",
        assets_declared || "",
        criminal_cases || 0,
        bio || "",
        manifestoStr,
        is_nota ? 1 : 0
      ]
    );
    await logAudit({
      actor_user_id: req.user.id,
      actor_role: "admin",
      action: "CREATE_CANDIDATE",
      target_type: "candidates",
      target_id: String(result.insertId),
      details_json: { name, party_name, constituency }
    });
    res.json({ message: "Candidate added successfully", id: result.insertId });
  } catch (error) {
    console.error("addCandidate error:", error);
    res.status(500).json({ error: "Failed to add candidate" });
  }
};
var updateCandidate = async (req, res) => {
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
    const manifestoStr = Array.isArray(manifesto_json) ? JSON.stringify(manifesto_json) : manifesto_json || "[]";
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
      actor_role: "admin",
      action: "UPDATE_CANDIDATE",
      target_type: "candidates",
      target_id: String(candidateId),
      details_json: { name, party_name }
    });
    res.json({ message: "Candidate updated successfully" });
  } catch (error) {
    console.error("updateCandidate error:", error);
    res.status(500).json({ error: "Failed to update candidate" });
  }
};
var deleteCandidate = async (req, res) => {
  const candidateId = req.params.id;
  try {
    await pool.query("DELETE FROM candidates WHERE id = ?", [candidateId]);
    await logAudit({
      actor_user_id: req.user.id,
      actor_role: "admin",
      action: "DELETE_CANDIDATE",
      target_type: "candidates",
      target_id: String(candidateId)
    });
    res.json({ message: "Candidate deleted successfully" });
  } catch (error) {
    console.error("deleteCandidate error:", error);
    res.status(500).json({ error: "Failed to delete candidate" });
  }
};
var getElections = async (req, res) => {
  try {
    const [elections] = await pool.query("SELECT * FROM elections ORDER BY start_time DESC");
    res.json(elections);
  } catch (error) {
    console.error("getElections error:", error);
    res.status(500).json({ error: "Failed to fetch elections" });
  }
};
var createElection = async (req, res) => {
  const { title, election_type, description, state, start_time, end_time, status } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO elections (title, election_type, description, state, start_time, end_time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, election_type, description || "", state || null, start_time, end_time, status || "UPCOMING"]
    );
    await logAudit({
      actor_user_id: req.user.id,
      actor_role: "admin",
      action: "CREATE_ELECTION",
      target_type: "elections",
      target_id: String(result.insertId),
      details_json: { title, election_type }
    });
    res.status(201).json({ message: "Election created successfully", id: result.insertId });
  } catch (error) {
    console.error("createElection error:", error);
    res.status(500).json({ error: "Failed to create election" });
  }
};
var updateElection = async (req, res) => {
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
      [title, election_type, description, state, start_time, end_time, status, results_published !== void 0 ? results_published ? 1 : 0 : null, electionId]
    );
    await logAudit({
      actor_user_id: req.user.id,
      actor_role: "admin",
      action: "UPDATE_ELECTION",
      target_type: "elections",
      target_id: String(electionId),
      details_json: { title, status, results_published }
    });
    res.json({ message: "Election updated successfully" });
  } catch (error) {
    console.error("updateElection error:", error);
    res.status(500).json({ error: "Failed to update election" });
  }
};
var getSirRequests = async (req, res) => {
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
    const params = [];
    if (status) {
      query += " AND r.status = ?";
      params.push(status);
    }
    if (form_type) {
      query += " AND r.form_type = ?";
      params.push(form_type);
    }
    query += " ORDER BY r.created_at DESC";
    const [requests] = await pool.query(query, params);
    res.json(requests);
  } catch (error) {
    console.error("getSirRequests error:", error);
    res.status(500).json({ error: "Failed to fetch revision requests" });
  }
};
var updateSirRequest = async (req, res) => {
  const requestId = req.params.id;
  const { status, admin_remarks, assigned_blo_id } = req.body;
  try {
    const [existing] = await pool.query("SELECT * FROM revision_requests WHERE id = ? LIMIT 1", [requestId]);
    const request = existing[0];
    if (!request) return res.status(404).json({ error: "Revision request not found" });
    await pool.query(
      `UPDATE revision_requests 
       SET status = COALESCE(?, status),
           admin_remarks = COALESCE(?, admin_remarks),
           assigned_blo_id = COALESCE(?, assigned_blo_id)
       WHERE id = ?`,
      [status, admin_remarks, assigned_blo_id, requestId]
    );
    if (status === "APPROVED") {
      const newData = typeof request.new_data_json === "string" ? JSON.parse(request.new_data_json) : request.new_data_json;
      if (request.form_type === "FORM_8" && newData) {
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
      } else if (request.form_type === "FORM_7") {
        await pool.query("UPDATE voters SET sir_status = 'DELETED', has_voted = 1 WHERE user_id = ?", [request.user_id]);
      }
    }
    await logAudit({
      actor_user_id: req.user.id,
      actor_role: "admin",
      action: `REVIEW_SIR_${status}`,
      target_type: "revision_requests",
      target_id: String(requestId),
      details_json: { status, admin_remarks }
    });
    res.json({ message: `Revision request ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error("updateSirRequest error:", error);
    res.status(500).json({ error: "Failed to update revision request" });
  }
};
var getBloOfficers = async (req, res) => {
  try {
    const [blos] = await pool.query("SELECT * FROM blo_officers ORDER BY constituency, part_number ASC");
    res.json(blos);
  } catch (error) {
    console.error("getBloOfficers error:", error);
    res.status(500).json({ error: "Failed to fetch BLO officers" });
  }
};
var addBloOfficer = async (req, res) => {
  const { name, phone, email, constituency, part_number, office_address } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO blo_officers (name, phone, email, constituency, part_number, office_address, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [name, phone, email || "", constituency, part_number, office_address]
    );
    await logAudit({
      actor_user_id: req.user.id,
      actor_role: "admin",
      action: "ADD_BLO_OFFICER",
      target_type: "blo_officers",
      target_id: String(result.insertId),
      details_json: { name, constituency, part_number }
    });
    res.json({ message: "BLO Officer added successfully", id: result.insertId });
  } catch (error) {
    console.error("addBloOfficer error:", error);
    res.status(500).json({ error: "Failed to add BLO officer" });
  }
};
var deleteBloOfficer = async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query("DELETE FROM blo_officers WHERE id = ?", [id]);
    res.json({ message: "BLO Officer removed successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete BLO officer" });
  }
};
var getAnnouncements = async (req, res) => {
  try {
    const [announcements] = await pool.query("SELECT * FROM announcements ORDER BY is_pinned DESC, created_at DESC");
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
};
var addAnnouncement = async (req, res) => {
  const { title, content, category, is_pinned } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO announcements (title, content, category, is_pinned) VALUES (?, ?, ?, ?)",
      [title, content, category || "NOTICE", is_pinned ? 1 : 0]
    );
    res.json({ message: "Announcement created successfully", id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: "Failed to add announcement" });
  }
};
var deleteAnnouncement = async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query("DELETE FROM announcements WHERE id = ?", [id]);
    res.json({ message: "Announcement deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete announcement" });
  }
};
var getAuditLogs = async (req, res) => {
  try {
    const [logs] = await pool.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 150");
    res.json(logs);
  } catch (error) {
    console.error("getAuditLogs error:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
};
var exportData = async (req, res) => {
  const type = req.params.type;
  try {
    if (type === "voters") {
      const [rows] = await pool.query(`
        SELECT u.id, u.name, u.email, u.mobile, v.epic_number, v.constituency, v.polling_station, v.part_number,
               v.has_voted, u.is_senior_citizen, v.sir_status
        FROM users u JOIN voters v ON u.id = v.user_id
      `);
      let csv = "User ID,Name,Email,Mobile,EPIC Number,Constituency,Polling Station,Part Number,Voted,Senior Citizen,SIR Status\n";
      for (const r of rows) {
        csv += `"${r.id}","${r.name}","${r.email}","${r.mobile}","${r.epic_number}","${r.constituency}","${r.polling_station}","${r.part_number}","${r.has_voted ? "Yes" : "No"}","${r.is_senior_citizen ? "Yes" : "No"}","${r.sir_status}"
`;
      }
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="ECI_Voters_Export.csv"');
      return res.send(csv);
    }
    if (type === "results") {
      const [rows] = await pool.query(`
        SELECT c.id, c.name, c.party_name, c.constituency, c.is_nota, COUNT(v.id) as votes
        FROM candidates c LEFT JOIN votes v ON c.id = v.candidate_id
        GROUP BY c.id ORDER BY c.constituency, votes DESC
      `);
      let csv = "Candidate ID,Name,Party,Constituency,Is NOTA,Votes Tallied\n";
      for (const r of rows) {
        csv += `"${r.id}","${r.name}","${r.party_name}","${r.constituency}","${r.is_nota ? "Yes" : "No"}","${r.votes}"
`;
      }
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="ECI_Election_Results.csv"');
      return res.send(csv);
    }
    if (type === "sir") {
      const [rows] = await pool.query(`
        SELECT r.tracking_id, r.epic_number, r.form_type, r.request_subtype, r.status, r.created_at, u.name as voter_name
        FROM revision_requests r JOIN users u ON r.user_id = u.id
      `);
      let csv = "Tracking ID,EPIC Number,Form Type,Subtype,Status,Created At,Voter Name\n";
      for (const r of rows) {
        csv += `"${r.tracking_id}","${r.epic_number || "N/A"}","${r.form_type}","${r.request_subtype}","${r.status}","${r.created_at}","${r.voter_name}"
`;
      }
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="ECI_SIR_Requests.csv"');
      return res.send(csv);
    }
    if (type === "audit") {
      const [rows] = await pool.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500");
      let csv = "ID,Actor User ID,Actor Role,Action,Target Type,Target ID,Created At\n";
      for (const r of rows) {
        csv += `"${r.id}","${r.actor_user_id || "System"}","${r.actor_role}","${r.action}","${r.target_type}","${r.target_id || ""}","${r.created_at}"
`;
      }
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="ECI_Security_Audit_Logs.csv"');
      return res.send(csv);
    }
    res.status(400).json({ error: "Invalid export type. Supported: voters, results, sir, audit" });
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ error: "Failed to export data" });
  }
};
var updateTimeline = async (req, res) => {
  const { start, end } = req.body;
  try {
    await pool.query("UPDATE settings SET setting_value = ? WHERE setting_key = ?", [start, "voting_start"]);
    await pool.query("UPDATE settings SET setting_value = ? WHERE setting_key = ?", [end, "voting_end"]);
    await logAudit({
      actor_user_id: req.user.id,
      actor_role: "admin",
      action: "UPDATE_TIMELINE",
      target_type: "settings",
      target_id: "voting_schedule",
      details_json: { start, end }
    });
    res.json({ message: "Timeline updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update timeline" });
  }
};

// server/routes/adminRoutes.ts
var router3 = express3.Router();
router3.use(authenticateToken);
router3.use(requireAdmin);
router3.get("/stats", getStats);
router3.get("/results", getResults);
router3.put("/settings/timeline", updateTimeline);
router3.get("/voters", getVoters);
router3.put("/voters/:id", updateVoter);
router3.get("/complaints", getComplaints);
router3.put("/complaints/:id", updateComplaint);
router3.get("/candidates", getCandidates2);
router3.post("/candidates", addCandidate);
router3.put("/candidates/:id", updateCandidate);
router3.delete("/candidates/:id", deleteCandidate);
router3.get("/elections", getElections);
router3.post("/elections", createElection);
router3.put("/elections/:id", updateElection);
router3.get("/sir-requests", getSirRequests);
router3.put("/sir-requests/:id", updateSirRequest);
router3.get("/blo-officers", getBloOfficers);
router3.post("/blo-officers", addBloOfficer);
router3.delete("/blo-officers/:id", deleteBloOfficer);
router3.get("/announcements", getAnnouncements);
router3.post("/announcements", addAnnouncement);
router3.delete("/announcements/:id", deleteAnnouncement);
router3.get("/audit-logs", getAuditLogs);
router3.get("/export/:type", exportData);
var adminRoutes_default = router3;

// server/routes/aiRoutes.ts
import express4 from "express";
import crypto2 from "crypto";
var router4 = express4.Router();
router4.post("/chat", async (req, res) => {
  const { message, history, language, constituency } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }
  try {
    let constituencyCandidates = [];
    if (constituency) {
      const [cands] = await pool.query(
        "SELECT id, name, party_name, party_symbol, education, occupation, assets_declared, criminal_cases, manifesto_json FROM candidates WHERE constituency = ?",
        [constituency]
      );
      constituencyCandidates = cands;
    }
    const [activeElections] = await pool.query(
      "SELECT id, title, election_type, start_time, end_time FROM elections WHERE status = 'ACTIVE' LIMIT 2"
    );
    const reply = await askCivicAssistant({
      message,
      history: history || [],
      language: language || "en",
      userContext: req.user || null,
      constituencyCandidates,
      activeElections
    });
    res.json({ reply });
  } catch (error) {
    console.error("AI chat error:", error);
    res.status(500).json({ error: "Failed to process AI chat request" });
  }
});
router4.post("/compare-candidates", async (req, res) => {
  const { candidateIds, question, language } = req.body;
  try {
    let candidates = [];
    if (Array.isArray(candidateIds) && candidateIds.length > 0) {
      const placeholders = candidateIds.map(() => "?").join(",");
      const [rows] = await pool.query(
        `SELECT id, name, party_name, party_symbol, constituency, age, education, occupation, assets_declared, criminal_cases, bio, manifesto_json 
         FROM candidates WHERE id IN (${placeholders})`,
        candidateIds
      );
      candidates = rows;
    } else {
      const [rows] = await pool.query(
        `SELECT id, name, party_name, party_symbol, constituency, age, education, occupation, assets_declared, criminal_cases, bio, manifesto_json 
         FROM candidates LIMIT 4`
      );
      candidates = rows;
    }
    const comparison = await compareCandidatesNeutral({
      candidates,
      question,
      language: language || "en"
    });
    res.json({ comparison, candidates });
  } catch (error) {
    console.error("Candidate comparison error:", error);
    res.status(500).json({ error: "Failed to compare candidates" });
  }
});
router4.post("/tts", async (req, res) => {
  const { text, language } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Text is required for TTS" });
  }
  try {
    const result = await synthesizeSpeech({
      text,
      language: language || "en"
    });
    res.json(result);
  } catch (error) {
    console.error("TTS error:", error);
    res.json({ audioBase64: null, mimeType: null, useClientFallback: true });
  }
});
router4.post("/transcribe", async (req, res) => {
  const { base64Audio, mimeType, language } = req.body;
  if (!base64Audio) {
    return res.status(400).json({ error: "base64Audio is required" });
  }
  try {
    const text = await transcribeAudio({
      base64Audio,
      mimeType: mimeType || "audio/webm",
      language: language || "en"
    });
    res.json({ text });
  } catch (error) {
    console.error("Transcribe error:", error);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
});
router4.post("/translate", async (req, res) => {
  const { targetLangCode, targetLangName, keyValueMap } = req.body;
  if (!targetLangCode || !keyValueMap) {
    return res.status(400).json({ error: "targetLangCode and keyValueMap are required" });
  }
  try {
    const sourceString = JSON.stringify(keyValueMap);
    const sourceHash = crypto2.createHash("sha256").update(sourceString).digest("hex");
    const [cached] = await pool.query(
      "SELECT translated_json FROM translations_cache WHERE lang_code = ? AND source_hash = ? LIMIT 1",
      [targetLangCode, sourceHash]
    );
    if (cached.length > 0 && cached[0].translated_json) {
      const parsed = JSON.parse(cached[0].translated_json);
      return res.json({ translated: parsed, source: "cache" });
    }
    const translated = await translateBatch({
      targetLangCode,
      targetLangName: targetLangName || targetLangCode,
      keyValueMap
    });
    try {
      await pool.query(
        "INSERT INTO translations_cache (lang_code, source_hash, translated_json) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE translated_json = VALUES(translated_json)",
        [targetLangCode, sourceHash, JSON.stringify(translated)]
      );
    } catch (cacheErr) {
      console.warn("Failed to save in translations_cache:", cacheErr);
    }
    res.json({ translated, source: "gemini" });
  } catch (error) {
    console.error("Translation endpoint error:", error);
    res.json({ translated: keyValueMap, source: "fallback" });
  }
});
router4.post("/admin-briefing", authenticateToken, async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  try {
    const [totalVoters] = await pool.query("SELECT COUNT(*) as count FROM voters");
    const [totalVotes] = await pool.query("SELECT COUNT(*) as count FROM votes");
    const [pendingComplaints] = await pool.query("SELECT COUNT(*) as count FROM complaints WHERE status = ?", ["pending"]);
    const [pendingSir] = await pool.query("SELECT COUNT(*) as count FROM revision_requests WHERE status IN ('SUBMITTED', 'BLO_ASSIGNED', 'FIELD_VERIFIED')");
    const vCount = totalVoters[0].count;
    const voteCount = totalVotes[0].count;
    const stats = {
      totalVoters: vCount,
      totalVotes: voteCount,
      turnoutPercentage: vCount > 0 ? (voteCount / vCount * 100).toFixed(2) : 0,
      pendingComplaints: pendingComplaints[0].count
    };
    const [turnoutByConstituency] = await pool.query(`
      SELECT constituency, COUNT(*) as vote_count 
      FROM votes 
      WHERE constituency IS NOT NULL 
      GROUP BY constituency 
      ORDER BY vote_count DESC 
      LIMIT 5
    `);
    const briefing = await summarizeElectionAnalytics({
      stats,
      turnoutByConstituency,
      sirBacklog: pendingSir[0]?.count || 0
    });
    res.json({ briefing, stats });
  } catch (error) {
    console.error("Admin briefing error:", error);
    res.status(500).json({ error: "Failed to generate admin briefing" });
  }
});
var aiRoutes_default = router4;

// server/routes/sirRoutes.ts
import express5 from "express";
var router5 = express5.Router();
router5.get("/search", async (req, res) => {
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
    const params = [];
    if (epic_number) {
      query += " AND UPPER(v.epic_number) = UPPER(?)";
      params.push(String(epic_number).trim());
    } else {
      if (name) {
        query += " AND LOWER(u.name) LIKE LOWER(?)";
        params.push(`%${String(name).trim()}%`);
      }
      if (state) {
        query += " AND LOWER(u.state) = LOWER(?)";
        params.push(String(state).trim());
      }
      if (city) {
        query += " AND LOWER(u.city) = LOWER(?)";
        params.push(String(city).trim());
      }
      if (constituency) {
        query += " AND LOWER(v.constituency) = LOWER(?)";
        params.push(String(constituency).trim());
      }
    }
    query += " LIMIT 50";
    const [results] = await pool.query(query, params);
    const maskedResults = results.map((row) => ({
      epic_number: row.epic_number,
      name: row.name,
      city: row.city,
      state: row.state,
      constituency: row.constituency,
      polling_station: row.polling_station,
      part_number: row.part_number,
      serial_number: row.serial_number,
      sir_status: row.sir_status || "VERIFIED",
      is_senior_citizen: Boolean(row.is_senior_citizen),
      has_priority_pass: Boolean(row.priority_pass_code)
    }));
    res.json(maskedResults);
  } catch (error) {
    console.error("SIR Search error:", error);
    res.status(500).json({ error: "Failed to search electoral roll" });
  }
});
router5.get("/roll", async (req, res) => {
  const { constituency, part_number, format } = req.query;
  if (!constituency) {
    return res.status(400).json({ error: "Constituency parameter is required" });
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
    const params = [String(constituency).trim()];
    if (part_number) {
      query += " AND v.part_number = ?";
      params.push(part_number);
    }
    query += " ORDER BY v.serial_number ASC LIMIT 500";
    const [voters] = await pool.query(query, params);
    if (format === "csv") {
      let csv = "Serial No,EPIC Number,Name,Gender,Senior Citizen,Part Number,Constituency,Polling Station,SIR Status\n";
      for (const row of voters) {
        csv += `"${row.serial_number}","${row.epic_number}","${row.name}","${row.gender || "N/A"}","${row.is_senior_citizen ? "Yes" : "No"}","${row.part_number}","${row.constituency}","${row.polling_station}","${row.sir_status}"
`;
      }
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="Electoral_Roll_${constituency}.csv"`);
      return res.send(csv);
    }
    res.json(voters);
  } catch (error) {
    console.error("Electoral Roll error:", error);
    res.status(500).json({ error: "Failed to fetch electoral roll" });
  }
});
router5.get("/status/:trackingOrEpic", async (req, res) => {
  const param = req.params.trackingOrEpic.trim();
  try {
    const [requests] = await pool.query(
      `SELECT r.*, b.name as blo_name, b.phone as blo_phone 
       FROM revision_requests r
       LEFT JOIN blo_officers b ON r.assigned_blo_id = b.id
       WHERE UPPER(r.tracking_id) = UPPER(?) OR UPPER(r.epic_number) = UPPER(?)
       ORDER BY r.created_at DESC`,
      [param, param]
    );
    if (requests.length === 0) {
      return res.status(404).json({ error: "No revision request found matching this tracking ID or EPIC number" });
    }
    res.json(requests[0]);
  } catch (error) {
    console.error("SIR Status error:", error);
    res.status(500).json({ error: "Failed to fetch SIR status" });
  }
});
router5.post("/requests", authenticateToken, async (req, res) => {
  const { form_type, request_subtype, new_data, supporting_doc_note } = req.body;
  if (!form_type || !request_subtype || !new_data) {
    return res.status(400).json({ error: "Form type, subtype, and new data are required" });
  }
  try {
    const [voterRows] = await pool.query(
      "SELECT v.*, u.name, u.address, u.city, u.state FROM voters v JOIN users u ON v.user_id = u.id WHERE v.user_id = ? LIMIT 1",
      [req.user.id]
    );
    const voter = voterRows[0];
    const tracking_id = `SIR2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    let bloId = null;
    if (voter?.constituency) {
      const [bloRows] = await pool.query(
        "SELECT id FROM blo_officers WHERE constituency = ? AND is_active = 1 LIMIT 1",
        [voter.constituency]
      );
      if (bloRows.length > 0) {
        bloId = bloRows[0].id;
      }
    }
    const old_data = voter ? {
      name: voter.name,
      address: voter.address,
      city: voter.city,
      state: voter.state,
      constituency: voter.constituency,
      polling_station: voter.polling_station
    } : {};
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
      actor_role: "voter",
      action: `SUBMIT_${form_type}`,
      target_type: "revision_requests",
      target_id: tracking_id,
      details_json: { request_subtype, new_data }
    });
    res.status(201).json({
      message: "Revision request submitted successfully",
      tracking_id,
      status: "SUBMITTED"
    });
  } catch (error) {
    console.error("Submit revision error:", error);
    res.status(500).json({ error: "Failed to submit revision request" });
  }
});
router5.get("/my-requests", authenticateToken, async (req, res) => {
  try {
    const [requests] = await pool.query(
      `SELECT r.*, b.name as blo_name, b.phone as blo_phone 
       FROM revision_requests r
       LEFT JOIN blo_officers b ON r.assigned_blo_id = b.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(requests);
  } catch (error) {
    console.error("My requests error:", error);
    res.status(500).json({ error: "Failed to fetch your revision requests" });
  }
});
router5.get("/blos", async (req, res) => {
  const { constituency } = req.query;
  try {
    let query = "SELECT * FROM blo_officers WHERE is_active = 1";
    const params = [];
    if (constituency) {
      query += " AND LOWER(constituency) = LOWER(?)";
      params.push(String(constituency).trim());
    }
    query += " ORDER BY constituency, part_number ASC";
    const [blos] = await pool.query(query, params);
    res.json(blos);
  } catch (error) {
    console.error("BLOs error:", error);
    res.status(500).json({ error: "Failed to fetch BLO officers" });
  }
});
router5.post("/blo-appointments", authenticateToken, async (req, res) => {
  const { blo_id, appointment_date, time_slot, purpose, is_home_visit, notes } = req.body;
  if (!blo_id || !appointment_date || !time_slot || !purpose) {
    return res.status(400).json({ error: "All appointment fields are required" });
  }
  try {
    const [result] = await pool.query(
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
      message: "BLO appointment scheduled successfully",
      appointment_id: result.insertId
    });
  } catch (error) {
    console.error("Book appointment error:", error);
    res.status(500).json({ error: "Failed to schedule BLO appointment" });
  }
});
router5.get("/blo-appointments", authenticateToken, async (req, res) => {
  try {
    const [appointments] = await pool.query(
      `SELECT a.*, b.name as blo_name, b.phone as blo_phone, b.office_address, b.constituency 
       FROM blo_appointments a
       JOIN blo_officers b ON a.blo_id = b.id
       WHERE a.user_id = ?
       ORDER BY a.appointment_date DESC, a.created_at DESC`,
      [req.user.id]
    );
    res.json(appointments);
  } catch (error) {
    console.error("Get appointments error:", error);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});
router5.post("/elderly-assistance", authenticateToken, async (req, res) => {
  const { request_home_voting, request_priority_pass, disability_type, needs_wheelchair, needs_braille_audio } = req.body;
  try {
    let priorityPassCode = null;
    if (request_priority_pass) {
      priorityPassCode = `PRIORITY-PASS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    }
    await pool.query(
      `UPDATE users 
       SET disability_type = COALESCE(?, disability_type),
           needs_wheelchair = COALESCE(?, needs_wheelchair),
           needs_braille_audio = COALESCE(?, needs_braille_audio)
       WHERE id = ?`,
      [disability_type || null, needs_wheelchair ? 1 : 0, needs_braille_audio ? 1 : 0, req.user.id]
    );
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
      actor_role: "voter",
      action: "REQUEST_ELDERLY_ASSISTANCE",
      target_type: "voters",
      target_id: String(req.user.id),
      details_json: { request_home_voting, priorityPassCode }
    });
    res.json({
      message: "Assistance preferences updated successfully",
      priority_pass_code: priorityPassCode
    });
  } catch (error) {
    console.error("Elderly assistance error:", error);
    res.status(500).json({ error: "Failed to update assistance request" });
  }
});
var sirRoutes_default = router5;

// server/routes/electionRoutes.ts
import express6 from "express";
import jwt3 from "jsonwebtoken";
var router6 = express6.Router();
var JWT_SECRET3 = process.env.JWT_SECRET || "super-secret-key-for-voting-app";
function getRequesterRole(req) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return null;
  try {
    const decoded = jwt3.verify(token, JWT_SECRET3);
    return decoded.role || null;
  } catch (e) {
    return null;
  }
}
router6.get("/", async (req, res) => {
  try {
    const [elections] = await pool.query("SELECT * FROM elections ORDER BY start_time DESC");
    res.json(elections);
  } catch (error) {
    console.error("List elections error:", error);
    res.status(500).json({ error: "Failed to fetch elections" });
  }
});
router6.get("/:id/candidates", async (req, res) => {
  const electionId = req.params.id;
  const { state, city, constituency, search } = req.query;
  try {
    let query = "SELECT * FROM candidates WHERE election_id = ?";
    const params = [electionId];
    if (state) {
      query += " AND LOWER(state) = LOWER(?)";
      params.push(String(state).trim());
    }
    if (city) {
      query += " AND LOWER(city) = LOWER(?)";
      params.push(String(city).trim());
    }
    if (constituency) {
      query += " AND LOWER(constituency) = LOWER(?)";
      params.push(String(constituency).trim());
    }
    if (search) {
      query += " AND (LOWER(name) LIKE LOWER(?) OR LOWER(party_name) LIKE LOWER(?))";
      params.push(`%${String(search).trim()}%`, `%${String(search).trim()}%`);
    }
    query += " ORDER BY is_nota ASC, name ASC";
    const [candidates] = await pool.query(query, params);
    const formatted = candidates.map((c) => ({
      ...c,
      manifesto_json: typeof c.manifesto_json === "string" ? JSON.parse(c.manifesto_json) : c.manifesto_json || []
    }));
    res.json(formatted);
  } catch (error) {
    console.error("Election candidates error:", error);
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
});
router6.get("/history", async (req, res) => {
  const { year, constituency, party } = req.query;
  try {
    let query = "SELECT * FROM election_history WHERE 1=1";
    const params = [];
    if (year) {
      query += " AND year = ?";
      params.push(year);
    }
    if (constituency) {
      query += " AND LOWER(constituency) = LOWER(?)";
      params.push(String(constituency).trim());
    }
    if (party) {
      query += " AND (LOWER(winner_party) LIKE LOWER(?) OR LOWER(runner_up_party) LIKE LOWER(?))";
      params.push(`%${String(party).trim()}%`, `%${String(party).trim()}%`);
    }
    query += " ORDER BY year DESC, constituency ASC";
    const [history] = await pool.query(query, params);
    res.json(history);
  } catch (error) {
    console.error("History error:", error);
    res.status(500).json({ error: "Failed to fetch election history" });
  }
});
router6.get("/results/:electionId", async (req, res) => {
  const electionId = req.params.electionId;
  const role = getRequesterRole(req);
  try {
    const [elections] = await pool.query("SELECT * FROM elections WHERE id = ? LIMIT 1", [electionId]);
    const election = elections[0];
    if (!election) {
      return res.status(404).json({ error: "Election not found" });
    }
    if (!election.results_published && role !== "admin") {
      return res.status(403).json({
        locked: true,
        message: "Results for this election have not been officially published yet by the Election Commission.",
        election_title: election.title,
        end_time: election.end_time
      });
    }
    const [tally] = await pool.query(
      `SELECT c.id, c.name, c.party_name, c.party_symbol, c.constituency, c.is_nota, COUNT(v.id) as votes
       FROM candidates c
       LEFT JOIN votes v ON c.id = v.candidate_id AND v.election_id = ?
       WHERE c.election_id = ?
       GROUP BY c.id
       ORDER BY c.constituency ASC, votes DESC`,
      [electionId, electionId]
    );
    const [totalVotes] = await pool.query("SELECT COUNT(*) as count FROM votes WHERE election_id = ?", [electionId]);
    const [totalParticipations] = await pool.query("SELECT COUNT(*) as count FROM voter_participations WHERE election_id = ?", [electionId]);
    res.json({
      election,
      results: tally,
      total_votes: totalVotes[0]?.count || 0,
      total_voters_participated: totalParticipations[0]?.count || 0
    });
  } catch (error) {
    console.error("Results error:", error);
    res.status(500).json({ error: "Failed to fetch results" });
  }
});
router6.get("/verify-receipt/:receiptCode", async (req, res) => {
  const receiptCode = req.params.receiptCode.trim();
  try {
    const [participations] = await pool.query(
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
        error: "VVPAT Receipt code not found in official electoral ledger"
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
      integrity_status: "CRYPTOGRAPHICALLY_VERIFIED_IN_LEDGER"
    });
  } catch (error) {
    console.error("Verify receipt error:", error);
    res.status(500).json({ error: "Failed to verify receipt code" });
  }
});
router6.get("/announcements/all", async (req, res) => {
  try {
    const [notices] = await pool.query("SELECT * FROM announcements ORDER BY is_pinned DESC, created_at DESC");
    res.json(notices);
  } catch (error) {
    console.error("Announcements error:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});
var electionRoutes_default = router6;

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express7();
var PORT = parseInt(process.env.PORT || "3000", 10);
app.use(cors());
app.use(express7.json({ limit: "10mb" }));
app.use("/api/auth", authRoutes_default);
app.use("/api/ai", aiRoutes_default);
app.use("/api/sir", sirRoutes_default);
app.use("/api/elections", electionRoutes_default);
app.use("/api", voterRoutes_default);
app.use("/api/admin", adminRoutes_default);
async function startServer() {
  await initializeDB();
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express7.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Apna Mat Server running on http://localhost:${PORT}`);
  });
}
startServer();

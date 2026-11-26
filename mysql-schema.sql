-- Apna Mat - Production E-Voting System Schema (MySQL 8.0 / Aiven Cloud)

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
  date_of_birth DATE NULL,
  gender VARCHAR(20) NULL,
  is_senior_citizen BOOLEAN DEFAULT 0,
  disability_type VARCHAR(100) NULL,
  needs_wheelchair BOOLEAN DEFAULT 0,
  needs_braille_audio BOOLEAN DEFAULT 0,
  preferred_language VARCHAR(10) DEFAULT 'en',
  is_verified BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS constituencies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  state VARCHAR(255) NOT NULL
);

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
);

CREATE TABLE IF NOT EXISTS voters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  epic_number VARCHAR(50) UNIQUE NOT NULL,
  constituency VARCHAR(255) NOT NULL,
  polling_station VARCHAR(255) NOT NULL,
  part_number VARCHAR(50) DEFAULT 'Part-42',
  serial_number INT DEFAULT 1,
  booth_address TEXT NULL,
  has_voted BOOLEAN DEFAULT 0,
  home_voting_requested BOOLEAN DEFAULT 0,
  home_voting_status VARCHAR(50) DEFAULT 'none',
  priority_pass_code VARCHAR(50) NULL,
  sir_status VARCHAR(50) DEFAULT 'VERIFIED',
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NULL,
  name VARCHAR(255) NOT NULL,
  party_name VARCHAR(255) NOT NULL,
  party_symbol VARCHAR(255) NOT NULL,
  constituency VARCHAR(255) NOT NULL,
  city VARCHAR(255),
  state VARCHAR(255),
  age INT NULL,
  education VARCHAR(255) NULL,
  occupation VARCHAR(255) NULL,
  assets_declared VARCHAR(100) NULL,
  criminal_cases INT DEFAULT 0,
  bio TEXT NULL,
  manifesto_json JSON NULL,
  incumbent_years INT DEFAULT 0,
  photo_url TEXT NULL,
  is_nota BOOLEAN DEFAULT 0
);

-- Note: Ballot secrecy preserved — votes table never contains user_id or voter_id
CREATE TABLE IF NOT EXISTS votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NULL,
  candidate_id INT NOT NULL,
  constituency VARCHAR(255) NULL,
  ballot_hash VARCHAR(64) NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS voter_participations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NOT NULL,
  voter_id INT NOT NULL,
  constituency VARCHAR(255) NOT NULL,
  vvpat_receipt_code VARCHAR(64) UNIQUE NOT NULL,
  voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_voter_election (election_id, voter_id)
);

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
);

CREATE TABLE IF NOT EXISTS blo_officers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NULL,
  constituency VARCHAR(255) NOT NULL,
  part_number VARCHAR(50) NOT NULL,
  office_address TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1
);

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
);

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
);

CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'NOTICE',
  is_pinned BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'GENERAL',
  priority VARCHAR(20) DEFAULT 'MEDIUM',
  ai_summary TEXT NULL,
  ai_suggested_reply TEXT NULL,
  admin_reply TEXT NULL,
  resolved_at DATETIME NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS translations_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lang_code VARCHAR(15) NOT NULL,
  source_hash VARCHAR(64) NOT NULL,
  translated_json LONGTEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_lang_hash (lang_code, source_hash)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT NULL,
  actor_role VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(100) NOT NULL,
  target_id VARCHAR(100) NULL,
  details_json JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS face_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  face_descriptor LONGTEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(255) PRIMARY KEY,
  setting_value TEXT NOT NULL
);

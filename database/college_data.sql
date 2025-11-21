-- database/college_data.sql
-- SQLite-ready SQL for HSIT (single-file)
-- Contains: college_info, departments (CSE only), faculty_list (CSE), curriculum (CSE sem1-8), college_faq

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- Drop if exists (safe to re-run in SQLite)
DROP TABLE IF EXISTS college_faq;
DROP TABLE IF EXISTS curriculum;
DROP TABLE IF EXISTS faculty_list;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS college_info;

-- 1) College information
CREATE TABLE college_info (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  short_name TEXT,
  established_year INTEGER,
  affiliation TEXT,
  approved_by TEXT,
  type TEXT,
  campus_area TEXT,
  address TEXT,
  city TEXT,
  taluk TEXT,
  district TEXT,
  state TEXT,
  country TEXT,
  pincode TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now'))
);

INSERT INTO college_info (
  name, short_name, established_year, affiliation, approved_by, type,
  campus_area, address, city, taluk, district, state, country, pincode,
  phone, email, website, notes
) VALUES (
  'Hirasugar Institute of Technology',
  'HSIT',
  1996,
  'Visvesvaraya Technological University (VTU), Belagavi',
  'Approved by AICTE, New Delhi',
  'Private Engineering College',
  'Approx. 50+ acres',
  'Nidasoshi',
  'Nidasoshi',
  'Hukkeri',
  'Belagavi',
  'Karnataka',
  'India',
  '591236',
  '08333-278887',
  'principal@hsit.ac.in',
  'https://hsit.ac.in',
  'HSIT (aka HIT) located in Nidasoshi, Hukkeri taluk, Belagavi district'
);

-- 2) Departments (we only add CSE now)
CREATE TABLE departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  short_name TEXT,
  created_at DATETIME DEFAULT (datetime('now'))
);

INSERT INTO departments (name, short_name) VALUES
('Computer Science and Engineering', 'CSE');

-- 3) Faculty list (CSE)
CREATE TABLE faculty_list (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  designation TEXT,
  department TEXT,
  department_id INTEGER,
  specialization TEXT,
  email_official TEXT,
  email_other TEXT,
  mobile TEXT,
  address TEXT,
  qualifications TEXT,
  courses_taught TEXT,
  profile_pdf TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- Insert CSE faculty rows (parsed from your uploaded PDFs)
INSERT INTO faculty_list (name, designation, department, department_id, specialization, email_official, email_other, mobile, address, qualifications, courses_taught, profile_pdf, notes)
VALUES
('Prof. Mallikarjun G. Ganachari', 'Assistant Professor', 'Computer Science and Engineering', 1, 'Industrial Electronics & Image Processing', 'mgganachari.cse@hsit.ac.in', '', '8904879471', 'Amminabhavi, Hukkeri, Belagavi, Karnataka - 591236', 'Ph.D (Pursuing); M.Tech 2013; B.E. 2009', 'Basic Electronics; Digital Electronics; Digital Image Processing', '/mnt/data/MGG25.pdf', 'Admin roles: Innovation Cell, Technical Club; research interests: Image Processing.'),
('Prof. Sapna B Patil', 'Assistant Professor', 'Computer Science and Engineering', 1, 'Digital Electronics; VLSI Design and Embedded System', 'sapna.cse@hsit.ac.in', '', '9740875627', 'Subhash Road, Patil Galli, Sankeshwar, Hukkeri, Belagavi - 591313', 'M.Tech 2018; B.E. 2016', 'Cryptography; Info Theory; Operating Systems', '/mnt/data/SBP125.pdf', 'Published papers (2023, 2025) and organized workshops.'),
('Mrs. Aruna Anil Daptardar', 'Assistant Professor', 'Computer Science and Engineering', 1, 'Computer Science and Engineering', 'arunadaptardar.cse@hsit.ac.in', '', '9620851002', '74, Math Galli, Sankeshwar, Hukkeri, Belagavi - 591313', 'M.Tech 2011; B.E 2003', 'Operating Systems; Java; Data Structures', '/mnt/data/AAD25.pdf', 'Has long teaching experience; many FDPs.'),
('Dr. K. B. Manwade', 'Professor', 'Computer Science and Engineering', 1, 'High Performance Computing; CSE', 'kbmanwade.cse@hsit.ac.in', '', '8412968254', 'Staff Quarters, HIT Nidasoshi, Hukkeri, Belagavi - 591236', 'Ph.D 2019; M.Tech 2008; B.E 2004', 'Parallel algorithms; HPC; Data Mining', '/mnt/data/kbm1.pdf', 'HOD CSE, many publications and administrative roles.'),
('Dr. S. V. Manjaragi', 'Associate Professor', 'Computer Science and Engineering', 1, 'Wireless Networks; CSE', 'svmanjaragi.cse@hsit.ac.in', 'shiva.vm@gmail.com', '+919986658309', '1466, Laxmnagar, A/P: Ammanagi, Hukkeri, Belagavi - 591236', 'Ph.D 2024; M.Tech 2010; B.E 2002', 'Machine Learning; Cloud Computing; Graph Theory', '/mnt/data/SVM25.pdf', 'IT Incharge; HOD; many publications and FDPs.');

-- 4) Curriculum table and CSE semester entries (example subjects)
CREATE TABLE curriculum (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_short TEXT,
  year_number INTEGER,
  semester_number INTEGER,
  subject_code TEXT,
  subject_name TEXT,
  credits REAL,
  elective INTEGER DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now'))
);

-- Semester 1 (CSE) - typical example subjects
INSERT INTO curriculum (branch_short, year_number, semester_number, subject_code, subject_name, credits) VALUES
('CSE', 1, 1, 'CSE101', 'Engineering Mathematics I', 4),
('CSE', 1, 1, 'CSE102', 'Engineering Physics', 3),
('CSE', 1, 1, 'CSE103', 'Engineering Chemistry', 3),
('CSE', 1, 1, 'CSE104', 'Basic Electrical & Electronics Engineering', 3),
('CSE', 1, 1, 'CSE105', 'Programming for Problem Solving (C)', 3),
('CSE', 1, 1, 'CSE106', 'Engineering Graphics', 2),
('CSE', 1, 1, 'CSE107', 'Workshop Practice', 1);

-- Semester 2 (CSE)
INSERT INTO curriculum (branch_short, year_number, semester_number, subject_code, subject_name, credits) VALUES
('CSE', 1, 2, 'CSE108', 'Engineering Mathematics II', 4),
('CSE', 1, 2, 'CSE109', 'Data Structures using C', 4),
('CSE', 1, 2, 'CSE110', 'Digital Logic Design', 3),
('CSE', 1, 2, 'CSE111', 'Object Oriented Programming', 3),
('CSE', 1, 2, 'CSE112', 'Communicative English / Professional Communication', 2);

-- Semester 3 (CSE)
INSERT INTO curriculum (branch_short, year_number, semester_number, subject_code, subject_name, credits) VALUES
('CSE', 2, 3, 'CSE201', 'Discrete Mathematics', 4),
('CSE', 2, 3, 'CSE202', 'Computer Organization and Architecture', 3),
('CSE', 2, 3, 'CSE203', 'Data Structures and Algorithms', 4),
('CSE', 2, 3, 'CSE204', 'Database Management Systems', 3),
('CSE', 2, 3, 'CSE205', 'Operating Systems (Intro)', 3);

-- Semester 4 (CSE)
INSERT INTO curriculum (branch_short, year_number, semester_number, subject_code, subject_name, credits) VALUES
('CSE', 2, 4, 'CSE206', 'Design and Analysis of Algorithms', 4),
('CSE', 2, 4, 'CSE207', 'Computer Networks', 3),
('CSE', 2, 4, 'CSE208', 'Software Engineering', 3),
('CSE', 2, 4, 'CSE209', 'Formal Languages & Automata Theory', 3);

-- Semester 5 (CSE)
INSERT INTO curriculum (branch_short, year_number, semester_number, subject_code, subject_name, credits) VALUES
('CSE', 3, 5, 'CSE301', 'Compiler Design', 3),
('CSE', 3, 5, 'CSE302', 'Distributed Systems', 3),
('CSE', 3, 5, 'CSE303', 'Web Technologies', 3),
('CSE', 3, 5, 'CSE304', 'Database Systems (Advanced)', 3);

-- Semester 6 (CSE)
INSERT INTO curriculum (branch_short, year_number, semester_number, subject_code, subject_name, credits) VALUES
('CSE', 3, 6, 'CSE305', 'Artificial Intelligence', 3),
('CSE', 3, 6, 'CSE306', 'Machine Learning', 3),
('CSE', 3, 6, 'CSE307', 'Software Project Lab', 2),
('CSE', 3, 6, 'CSE308', 'Elective I', 3);

-- Semester 7 (CSE)
INSERT INTO curriculum (branch_short, year_number, semester_number, subject_code, subject_name, credits) VALUES
('CSE', 4, 7, 'CSE401', 'Cloud Computing', 3),
('CSE', 4, 7, 'CSE402', 'Information Security', 3),
('CSE', 4, 7, 'CSE403', 'Elective II', 3),
('CSE', 4, 7, 'CSE404', 'Project Phase I', 4);

-- Semester 8 (CSE)
INSERT INTO curriculum (branch_short, year_number, semester_number, subject_code, subject_name, credits) VALUES
('CSE', 4, 8, 'CSE405', 'Project Phase II', 6),
('CSE', 4, 8, 'CSE406', 'Seminar & Technical Presentation', 2),
('CSE', 4, 8, 'CSE407', 'Elective III', 3);

-- 5) FAQ (small examples)
CREATE TABLE college_faq (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at DATETIME DEFAULT (datetime('now'))
);

INSERT INTO college_faq (question, answer) VALUES
('When was HSIT established?', 'HSIT was established in 1996.'),
('Where is HSIT located?', 'HSIT is located in Nidasoshi, Belagavi District, Karnataka.'),
('What is HSIT affiliated to?', 'HSIT is affiliated to Visvesvaraya Technological University (VTU), Belagavi.');

COMMIT;

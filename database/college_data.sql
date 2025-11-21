-- =============================================
-- HSIT College Master SQL File
-- database/college_data.sql
-- =============================================

-- CLEAN RESET (optional)
DROP TABLE IF EXISTS college_faq;
DROP TABLE IF EXISTS curriculum;
DROP TABLE IF EXISTS faculty_list;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS college_info;

-- =============================================
-- 1) COLLEGE BASIC INFORMATION
-- =============================================
CREATE TABLE college_info (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  short_name text,
  established_year int,
  affiliation text,
  approved_by text,
  type text,
  campus_area text,
  address text,
  city text,
  taluk text,
  district text,
  state text,
  country text,
  pincode text,
  phone text,
  email text,
  website text,
  notes text,
  created_at timestamptz DEFAULT now()
);

INSERT INTO college_info (
  name, short_name, established_year, affiliation, approved_by, type,
  campus_area, address, city, taluk, district, state, country, pincode,
  phone, email, website, notes
)
VALUES (
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
  'HSIT is located in Nidasoshi, Belagavi District, Karnataka.'
);

-- =============================================
-- 2) DEPARTMENTS / BRANCHES
-- =============================================
CREATE TABLE departments (
  id bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  short_name text,
  created_at timestamptz DEFAULT now()
);

INSERT INTO departments (name, short_name) VALUES
('Computer Science and Engineering', 'CSE'),
('Electronics & Communication Engineering', 'ECE'),
('Mechanical Engineering', 'ME'),
('Civil Engineering', 'CE'),
('Electrical & Electronics Engineering', 'EEE');

-- =============================================
-- 3) FACULTY TABLE
-- (faculty for each branch will be added via separate files)
-- =============================================
CREATE TABLE faculty_list (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  designation text,
  department text,
  specialization text,
  email_official text,
  email_other text,
  mobile text,
  address text,
  qualifications text,
  courses_taught text,
  profile_pdf text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- NOTE: Faculty rows will come from:
--    database/cse_data.sql
--    database/mech_data.sql
--    database/ece_data.sql
--    database/ce_data.sql
--    database/eee_data.sql

-- =============================================
-- 4) CURRICULUM TABLE (4 Years → 8 Semesters)
-- =============================================
CREATE TABLE curriculum (
  id bigserial PRIMARY KEY,
  branch_short text,
  year_number int,
  semester_number int,
  subject_code text,
  subject_name text,
  credits numeric,
  elective boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Insert academic structure (empty subjects)
INSERT INTO curriculum (branch_short, year_number, semester_number, subject_code, subject_name, credits)
VALUES
('CSE', 1, 1, NULL, 'Semester 1 Subjects TBD', NULL),
('CSE', 1, 2, NULL, 'Semester 2 Subjects TBD', NULL),
('CSE', 2, 3, NULL, 'Semester 3 Subjects TBD', NULL),
('CSE', 2, 4, NULL, 'Semester 4 Subjects TBD', NULL),
('CSE', 3, 5, NULL, 'Semester 5 Subjects TBD', NULL),
('CSE', 3, 6, NULL, 'Semester 6 Subjects TBD', NULL),
('CSE', 4, 7, NULL, 'Semester 7 Subjects TBD', NULL),
('CSE', 4, 8, NULL, 'Semester 8 Subjects TBD', NULL);

-- (Other branch semesters can be added later using separate files)

-- =============================================
-- 5) FAQ TABLE (Optional)
-- =============================================
CREATE TABLE college_faq (
  id bigserial PRIMARY KEY,
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz DEFAULT now()
);

INSERT INTO college_faq (question, answer) VALUES
('When was HSIT established?', 'HSIT was established in 1996.'),
('Where is HSIT located?', 'HSIT is located in Nidasoshi, Belagavi District, Karnataka.'),
('What is HSIT affiliated to?', 'HSIT is affiliated to Visvesvaraya Technological University (VTU), Belagavi.');

-- =============================================
-- END OF FILE
-- =============================================

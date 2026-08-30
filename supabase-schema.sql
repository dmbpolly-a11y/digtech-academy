-- DigiTech Academy Database Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/bibhhrpnubdazxdxoglx/sql/new

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS TABLE (Extended from Supabase Auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'tutor', 'admin', 'principal')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'suspended', 'deleted')),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Create index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ============================================================================
-- 2. ACTIVITY LOGS (Track all user actions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- ============================================================================
-- 3. VISIT STATISTICS (Track website visitors)
-- ============================================================================
CREATE TABLE IF NOT EXISTS visit_stats (
  id BIGSERIAL PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  referrer TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  ip_address TEXT,
  visited_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_stats_visitor ON visit_stats(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visit_stats_date ON visit_stats(visited_at DESC);

-- ============================================================================
-- 4. APPLICATION ATTEMPTS (Track registration attempts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS application_attempts (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  course_id INTEGER,
  full_name TEXT,
  phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'abandoned')),
  form_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_application_attempts_email ON application_attempts(email);
CREATE INDEX IF NOT EXISTS idx_application_attempts_status ON application_attempts(status);

-- ============================================================================
-- 5. COURSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS courses (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  tutor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  price DECIMAL(10, 2) DEFAULT 0,
  category TEXT NOT NULL,
  level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  duration TEXT,
  image_url TEXT,
  video_url TEXT,
  is_free BOOLEAN DEFAULT FALSE,
  is_live BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  enrollments_count INTEGER DEFAULT 0,
  rating DECIMAL(2, 1) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_tutor ON courses(tutor_id);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- ============================================================================
-- 6. COURSE MODULES (Sub-courses under main courses)
-- ============================================================================
CREATE TABLE IF NOT EXISTS course_modules (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) DEFAULT 0,
  duration TEXT,
  order_index INTEGER DEFAULT 0,
  content JSONB, -- lessons, videos, materials
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modules_course ON course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_order ON course_modules(order_index);

-- ============================================================================
-- 7. ENROLLMENTS (Student-Course relationship)
-- ============================================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  module_id BIGINT REFERENCES course_modules(id) ON DELETE SET NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_amount DECIMAL(10, 2),
  payment_reference TEXT,
  progress DECIMAL(5, 2) DEFAULT 0, -- 0-100%
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(student_id, course_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);

-- ============================================================================
-- 8. FEES MANAGEMENT
-- ============================================================================
CREATE TABLE IF NOT EXISTS fees (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  module_id BIGINT REFERENCES course_modules(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'UGX',
  description TEXT,
  is_locked BOOLEAN DEFAULT FALSE,
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fees_course ON fees(course_id);

-- ============================================================================
-- 9. EXAMS & ASSESSMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS exams (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  module_id BIGINT REFERENCES course_modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  total_marks INTEGER NOT NULL,
  passing_marks INTEGER NOT NULL,
  questions JSONB NOT NULL, -- Array of questions with options
  form_link TEXT, -- External Google Form link
  time_limit TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_course ON exams(course_id);

-- ============================================================================
-- 10. EXAM SUBMISSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS exam_submissions (
  id BIGSERIAL PRIMARY KEY,
  exam_id BIGINT REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  marks_obtained DECIMAL(5, 2),
  grade TEXT,
  feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  marked_at TIMESTAMPTZ,
  marked_by UUID REFERENCES users(id),
  UNIQUE(exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_exam ON exam_submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON exam_submissions(student_id);

-- ============================================================================
-- 11. CERTIFICATES
-- ============================================================================
CREATE TABLE IF NOT EXISTS certificates (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  certificate_number TEXT UNIQUE NOT NULL,
  issue_date TIMESTAMPTZ DEFAULT NOW(),
  pdf_url TEXT,
  issued_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course ON certificates(course_id);

-- ============================================================================
-- 12. MEDIA LINKS (Zoom, YouTube, Google Meet)
-- ============================================================================
CREATE TABLE IF NOT EXISTS media_links (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('zoom', 'google-meet', 'youtube', 'other')),
  url TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ,           -- when the live class is scheduled
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_links_course ON media_links(course_id);
CREATE INDEX IF NOT EXISTS idx_media_links_type ON media_links(link_type);

-- ============================================================================
-- 13. WEBSITE CONTENT (Admin editable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS website_content (
  id BIGSERIAL PRIMARY KEY,
  section TEXT UNIQUE NOT NULL, -- 'hero', 'about', 'testimonials', etc.
  content JSONB NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 14. PRINCIPAL COMMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS principal_comments (
  id BIGSERIAL PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('course', 'user', 'enrollment', 'general')),
  target_id TEXT,
  comment TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_target ON principal_comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON principal_comments(created_by);

-- ============================================================================
-- 15. STUDENT REGISTRATION FORMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_registrations (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  education_level TEXT,
  previous_experience TEXT,
  motivation TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_registrations_student ON student_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON student_registrations(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE principal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_registrations ENABLE ROW LEVEL SECURITY;

-- Public read access for courses (anyone can view)
CREATE POLICY "Public courses are viewable by everyone" ON courses
  FOR SELECT USING (status = 'published');

-- Admins can do everything
CREATE POLICY "Admins have full access" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (id = auth.uid());

-- Tutors can manage their own courses
CREATE POLICY "Tutors can manage own courses" ON courses
  FOR ALL USING (tutor_id = auth.uid());

-- Tutors can manage live links for their own courses
CREATE POLICY "Tutors can manage own live links" ON media_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = media_links.course_id
        AND courses.tutor_id = auth.uid()
    )
  );

-- Enrolled students can view live links for their courses
CREATE POLICY "Students can view live links for enrolled courses" ON media_links
  FOR SELECT USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.course_id = media_links.course_id
        AND enrollments.student_id = auth.uid()
    )
  );

-- Students can view their enrollments
CREATE POLICY "Students can view own enrollments" ON enrollments
  FOR SELECT USING (student_id = auth.uid());

-- Public can track visits
CREATE POLICY "Anyone can insert visit stats" ON visit_stats
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON course_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Increment course enrollment counter
CREATE OR REPLACE FUNCTION increment_course_enrollments()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE courses
  SET enrollments_count = enrollments_count + 1
  WHERE id = NEW.course_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_enrollments_trigger AFTER INSERT ON enrollments
  FOR EACH ROW EXECUTE FUNCTION increment_course_enrollments();

-- ============================================================================
-- SEED DATA (Default Admin User)
-- ============================================================================
-- Note: You'll need to create this user through Supabase Auth first,
-- then add their UUID to the users table with role='admin'

-- Example for manual creation:
-- INSERT INTO users (id, email, full_name, role) VALUES
-- ('<uuid-from-auth>', 'admin@digtechacademy.ug', 'Super Admin', 'admin');

-- ============================================================================
-- COMPLETED!
-- ============================================================================
-- After running this schema:
-- 1. Go to Authentication -> Users in Supabase dashboard
-- 2. Create users for each role (admin, principal, tutor, student)
-- 3. Note their UUIDs and insert into users table with correct roles
-- 4. Test the application login

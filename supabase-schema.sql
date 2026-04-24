-- Stellify Supabase Schema
-- Run this in the Supabase SQL editor after creating your project.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users table (extends auth.users) ─────────────────────────────────────────
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  role TEXT DEFAULT 'client' CHECK (role IN ('client', 'pro', 'unlimited', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  free_generations_used INT DEFAULT 0,
  tool_uses INT DEFAULT 0,
  daily_tool_uses INT DEFAULT 0,
  last_daily_reset DATE,
  last_monthly_reset TEXT,
  cv_context TEXT,
  has_seen_tutorial BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'DE',
  theme TEXT DEFAULT 'light',
  subscription_expires_at TIMESTAMPTZ,
  subscription_interval TEXT CHECK (subscription_interval IN ('monthly', 'annual')),
  stripe_customer_id TEXT,
  search_uses INT DEFAULT 0
);

-- ── Messages table ────────────────────────────────────────────────────────────
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'ai')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Applications table ────────────────────────────────────────────────────────
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  company TEXT,
  position TEXT,
  status TEXT DEFAULT 'Applied',
  location TEXT,
  salary TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CV Analyses table ─────────────────────────────────────────────────────────
CREATE TABLE public.cv_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Salary Calculations table ─────────────────────────────────────────────────
CREATE TABLE public.salary_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tool Results table ────────────────────────────────────────────────────────
CREATE TABLE public.tool_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  tool_id TEXT,
  tool_title TEXT,
  input JSONB,
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_results ENABLE ROW LEVEL SECURITY;

-- Users: own data only
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Messages
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Applications
CREATE POLICY "Users can CRUD own applications" ON public.applications FOR ALL USING (auth.uid() = user_id);

-- CV Analyses
CREATE POLICY "Users can view own cv_analyses" ON public.cv_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cv_analyses" ON public.cv_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Salary Calculations
CREATE POLICY "Users can view own salary_calculations" ON public.salary_calculations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own salary_calculations" ON public.salary_calculations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tool Results
CREATE POLICY "Users can view own tool_results" ON public.tool_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tool_results" ON public.tool_results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Enable Realtime ───────────────────────────────────────────────────────────
-- Run in Supabase Dashboard → Database → Replication → enable for:
-- public.users, public.messages, public.applications

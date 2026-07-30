-- ============================================================
-- Migration: Persistent Personal Memory (Phase 3 additive)
-- Tables: personal_notes, conversation_summaries, agent_scratchpads
-- RPCs: get_lead_memory, upsert_personal_note, save_conversation_summary
-- Date: 2026-07-30
-- 
-- Priority 1 from Handoff 2026-07-30 Afternoon.
-- Read path first: wire get_lead_memory into -chat.ts BEFORE any auto-extraction.
-- Additive only — does not touch existing Phase 1/2 tables or ChatWidget multi-turn / listings / voice.
-- ============================================================

-- 0. Shared updated_at helper (idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 1. personal_notes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.personal_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key     TEXT NOT NULL,
  lead_id         UUID NULL REFERENCES public.leads(id) ON DELETE SET NULL,
  category        TEXT NOT NULL,                    -- family | preferences | timeline | budget | objections | property_interest | other
  note_key        TEXT NOT NULL,                    -- spouse_name | pet_name | relocation_reason | etc.
  excerpt         TEXT NOT NULL CHECK (char_length(excerpt) <= 300),
  confidence      NUMERIC(3,2) NOT NULL DEFAULT 0.65
                    CHECK (confidence >= 0 AND confidence <= 1),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  source          TEXT NOT NULL DEFAULT 'extractor'
                    CHECK (source IN ('extractor', 'agent', 'user', 'system')),
  updated_by      TEXT NULL,                        -- optional per locked refinement
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes (locked + practical)
CREATE INDEX IF NOT EXISTS idx_personal_notes_session_category_active
  ON public.personal_notes (session_key, category)
  WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_personal_notes_unique_active
  ON public.personal_notes (session_key, category, note_key)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_personal_notes_lead_id
  ON public.personal_notes (lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_personal_notes_session_active
  ON public.personal_notes (session_key)
  WHERE is_active = true;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_personal_notes_updated_at ON public.personal_notes;
CREATE TRIGGER trg_personal_notes_updated_at
  BEFORE UPDATE ON public.personal_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. conversation_summaries
-- ============================================================
CREATE TABLE IF NOT EXISTS public.conversation_summaries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key       TEXT NOT NULL,
  lead_id           UUID NULL REFERENCES public.leads(id) ON DELETE SET NULL,
  summary           TEXT NOT NULL,
  turn_count        INTEGER NOT NULL DEFAULT 0 CHECK (turn_count >= 0),
  key_entities      JSONB NOT NULL DEFAULT '{}'::jsonb,  -- optional structured facts
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_session_created
  ON public.conversation_summaries (session_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_lead
  ON public.conversation_summaries (lead_id)
  WHERE lead_id IS NOT NULL;

-- ============================================================
-- 3. agent_scratchpads
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agent_scratchpads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name    TEXT NOT NULL,
  session_key   TEXT,                               -- NULL = global/shared scratchpad
  content       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique per agent + session (NULLS NOT DISTINCT for global)
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_scratchpads_unique
  ON public.agent_scratchpads (agent_name, session_key)
  NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_agent_scratchpads_agent
  ON public.agent_scratchpads (agent_name);

DROP TRIGGER IF EXISTS trg_agent_scratchpads_updated_at ON public.agent_scratchpads;
CREATE TRIGGER trg_agent_scratchpads_updated_at
  BEFORE UPDATE ON public.agent_scratchpads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. RLS — enable and lock down (no anon / no direct client writes)
-- ============================================================
ALTER TABLE public.personal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_scratchpads ENABLE ROW LEVEL SECURITY;

-- Explicitly revoke direct table privileges from anon + authenticated
REVOKE ALL ON public.personal_notes FROM anon, authenticated;
REVOKE ALL ON public.conversation_summaries FROM anon, authenticated;
REVOKE ALL ON public.agent_scratchpads FROM anon, authenticated;

-- service_role retains full access (bypasses RLS by design)
-- No CREATE POLICY for public/anon SELECT/INSERT etc. — force all access through SECURITY DEFINER RPCs

-- ============================================================
-- 5. SECURITY DEFINER RPCs
-- ============================================================

-- 5a. get_lead_memory
CREATE OR REPLACE FUNCTION public.get_lead_memory(
  p_session_key TEXT,
  p_lead_id     UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notes     JSONB;
  v_summaries JSONB;
BEGIN
  IF p_session_key IS NULL OR length(trim(p_session_key)) = 0 THEN
    RAISE EXCEPTION 'session_key is required';
  END IF;

  -- Active personal notes (prefer lead_id match if provided, else session_key)
  SELECT COALESCE(jsonb_agg(to_jsonb(n) ORDER BY n.confidence DESC, n.updated_at DESC), '[]'::jsonb)
  INTO v_notes
  FROM public.personal_notes n
  WHERE n.is_active = true
    AND (
      (p_lead_id IS NOT NULL AND n.lead_id = p_lead_id)
      OR n.session_key = p_session_key
    );

  -- Recent conversation summaries (last 5)
  SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.created_at DESC), '[]'::jsonb)
  INTO v_summaries
  FROM (
    SELECT *
    FROM public.conversation_summaries cs
    WHERE (p_lead_id IS NOT NULL AND cs.lead_id = p_lead_id)
       OR cs.session_key = p_session_key
    ORDER BY cs.created_at DESC
    LIMIT 5
  ) s;

  RETURN jsonb_build_object(
    'session_key', p_session_key,
    'lead_id', p_lead_id,
    'notes', v_notes,
    'summaries', v_summaries,
    'retrieved_at', now()
  );
END;
$$;

-- 5b. upsert_personal_note
CREATE OR REPLACE FUNCTION public.upsert_personal_note(
  p_session_key TEXT,
  p_category    TEXT,
  p_note_key    TEXT,
  p_excerpt     TEXT,
  p_confidence  NUMERIC DEFAULT 0.65,
  p_source      TEXT DEFAULT 'extractor',
  p_lead_id     UUID DEFAULT NULL,
  p_updated_by  TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_session_key IS NULL OR length(trim(p_session_key)) = 0 THEN
    RAISE EXCEPTION 'session_key is required';
  END IF;
  IF p_category IS NULL OR p_note_key IS NULL OR p_excerpt IS NULL THEN
    RAISE EXCEPTION 'category, note_key and excerpt are required';
  END IF;
  IF char_length(p_excerpt) > 300 THEN
    RAISE EXCEPTION 'excerpt exceeds 300 character limit';
  END IF;

  -- Soft-deactivate any existing active note with same (session, category, note_key)
  UPDATE public.personal_notes
  SET is_active = false,
      updated_at = now(),
      updated_by = COALESCE(p_updated_by, updated_by)
  WHERE session_key = p_session_key
    AND category = p_category
    AND note_key = p_note_key
    AND is_active = true;

  -- Insert new active version
  INSERT INTO public.personal_notes (
    session_key, lead_id, category, note_key, excerpt,
    confidence, source, updated_by, is_active
  ) VALUES (
    p_session_key, p_lead_id, p_category, p_note_key, p_excerpt,
    COALESCE(p_confidence, 0.65), COALESCE(p_source, 'extractor'),
    p_updated_by, true
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 5c. save_conversation_summary
CREATE OR REPLACE FUNCTION public.save_conversation_summary(
  p_session_key     TEXT,
  p_summary         TEXT,
  p_turn_count      INTEGER DEFAULT 0,
  p_key_entities    JSONB DEFAULT '{}'::jsonb,
  p_lead_id         UUID DEFAULT NULL,
  p_last_message_at TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_session_key IS NULL OR length(trim(p_session_key)) = 0 THEN
    RAISE EXCEPTION 'session_key is required';
  END IF;
  IF p_summary IS NULL OR length(trim(p_summary)) = 0 THEN
    RAISE EXCEPTION 'summary is required';
  END IF;

  INSERT INTO public.conversation_summaries (
    session_key, lead_id, summary, turn_count, key_entities, last_message_at
  ) VALUES (
    p_session_key, p_lead_id, p_summary, COALESCE(p_turn_count, 0),
    COALESCE(p_key_entities, '{}'::jsonb), p_last_message_at
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ============================================================
-- 6. Grants — execute only (tables already revoked from anon/authenticated)
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_lead_memory(TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_personal_note(TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_conversation_summary(TEXT, TEXT, INTEGER, JSONB, UUID, TIMESTAMPTZ) TO authenticated, service_role;

-- Optional: if the chat server function runs as anon in some paths, we can add TO anon later with extra hardening.
-- For now keep authenticated + service_role only. Server-side -chat.ts should use the service role or authenticated context.
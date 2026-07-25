-- ARIA Phase 2 – Lead Capture & Behavioral Scoring
-- Migration: 20260723_create_leads_and_lead_events.sql
-- Master Section 5

-- ============================================================
-- 1. LEADS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name        text,
  last_name         text,
  email             text,
  phone             text,
  source            text,                          -- e.g. 'website_form', 'map', 'chat', 'aikenhomesforsale'
  utm_source        text,
  utm_medium        text,
  utm_campaign      text,
  consent_given     boolean NOT NULL DEFAULT false,
  consent_sms       boolean NOT NULL DEFAULT false,
  consent_email     boolean NOT NULL DEFAULT false,
  consent_timestamp timestamptz,
  score             integer NOT NULL DEFAULT 0,
  stage             text DEFAULT 'new',            -- new | warm | hot | nurture | closed | unsubscribed
  assigned_agent_id uuid,                          -- will FK to users later
  sms_opt_out       boolean NOT NULL DEFAULT false,
  email_opt_out     boolean NOT NULL DEFAULT false,
  email_bounced     boolean NOT NULL DEFAULT false,
  last_activity_at  timestamptz DEFAULT now(),
  erased_at         timestamptz,                   -- CCPA / right-to-erasure
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  metadata          jsonb DEFAULT '{}'::jsonb
);

-- Partial unique indexes (allow nulls for anonymous → identified conversion)
CREATE UNIQUE INDEX IF NOT EXISTS leads_email_unique 
  ON public.leads (email) WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS leads_phone_unique 
  ON public.leads (phone) WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS leads_score_idx 
  ON public.leads (score DESC);

CREATE INDEX IF NOT EXISTS leads_last_activity_idx 
  ON public.leads (last_activity_at DESC);

CREATE INDEX IF NOT EXISTS leads_stage_idx 
  ON public.leads (stage);

-- ============================================================
-- 2. LEAD_EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lead_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  session_id  text,                                -- anonymous tracking until identified
  event_type  text NOT NULL,                       -- page_view | listing_view | map_interaction | polygon_draw | form_start | form_submit | chat_open | chat_message | search
  event_data  jsonb DEFAULT '{}'::jsonb,
  page_url    text,
  referrer    text,
  user_agent  text,
  ip_hash     text,                                -- hashed only – never store raw IP
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_events_lead_id_idx 
  ON public.lead_events (lead_id);

CREATE INDEX IF NOT EXISTS lead_events_session_id_idx 
  ON public.lead_events (session_id);

CREATE INDEX IF NOT EXISTS lead_events_event_type_idx 
  ON public.lead_events (event_type);

CREATE INDEX IF NOT EXISTS lead_events_occurred_at_idx 
  ON public.lead_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS lead_events_lead_occurred_idx 
  ON public.lead_events (lead_id, occurred_at DESC);

-- ============================================================
-- 3. UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. RECALCULATE LEAD SCORE FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalculate_lead_score(p_lead_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_score integer := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE event_type
      WHEN 'form_submit'      THEN 50
      WHEN 'form_start'       THEN 15
      WHEN 'polygon_draw'     THEN 20
      WHEN 'listing_view'     THEN 10
      WHEN 'map_interaction'  THEN 5
      WHEN 'chat_open'        THEN 12
      WHEN 'chat_message'     THEN 8
      WHEN 'search'           THEN 4
      WHEN 'page_view'        THEN 1
      ELSE 2
    END
  ), 0)::integer
  INTO new_score
  FROM public.lead_events
  WHERE lead_id = p_lead_id
    AND occurred_at > now() - interval '30 days';

  UPDATE public.leads
  SET 
    score = new_score,
    last_activity_at = now(),
    updated_at = now()
  WHERE id = p_lead_id;

  RETURN new_score;
END;
$$;

COMMENT ON FUNCTION public.recalculate_lead_score IS 
  'Phase 2 – Recompute behavioral score from lead_events (last 30 days). Call via trigger or pg_cron.';

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

-- Leads policies
CREATE POLICY "Authenticated full access on leads"
  ON public.leads
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can insert leads (form capture)"
  ON public.leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Lead events policies
CREATE POLICY "Authenticated full access on lead_events"
  ON public.lead_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can insert lead_events"
  ON public.lead_events
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON TABLE public.leads IS 'Phase 2 – Lead identity, consent flags, and behavioral score (Master Section 5)';
COMMENT ON TABLE public.lead_events IS 'Phase 2 – Behavioral event stream used for scoring and analytics';
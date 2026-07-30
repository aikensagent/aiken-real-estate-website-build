-- Persistent Personal Memory Layer (additive)
-- RLS on. No anon table grants. SECURITY DEFINER RPCs only.

CREATE TABLE IF NOT EXISTS public.conversation_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  session_key text NOT NULL,
  summary text NOT NULL,
  key_facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  message_count integer NOT NULL DEFAULT 0,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_lead ON public.conversation_summaries(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cs_session ON public.conversation_summaries(session_key);
CREATE INDEX IF NOT EXISTS idx_cs_updated ON public.conversation_summaries(updated_at DESC);

CREATE TABLE IF NOT EXISTS public.personal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  session_key text NOT NULL,
  spouse_name text,
  pet_name text,
  relocation_reason text,
  preferred_style text,
  timeline text,
  budget_notes text,
  kids text,
  prior_objection text,
  favorite_feature text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_key)
);

CREATE INDEX IF NOT EXISTS idx_pn_lead ON public.personal_notes(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pn_session ON public.personal_notes(session_key);

CREATE TABLE IF NOT EXISTS public.agent_scratchpads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text NOT NULL,
  agent_name text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_key, agent_name)
);

CREATE INDEX IF NOT EXISTS idx_as_session ON public.agent_scratchpads(session_key);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_cs_updated ON public.conversation_summaries;
CREATE TRIGGER trg_cs_updated BEFORE UPDATE ON public.conversation_summaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_pn_updated ON public.personal_notes;
CREATE TRIGGER trg_pn_updated BEFORE UPDATE ON public.personal_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_as_updated ON public.agent_scratchpads;
CREATE TRIGGER trg_as_updated BEFORE UPDATE ON public.agent_scratchpads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_scratchpads ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_lead_memory(
  p_session_key text,
  p_lead_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'summary', (
      SELECT jsonb_build_object(
        'id', id, 'summary', summary, 'key_facts', key_facts,
        'message_count', message_count, 'last_message_at', last_message_at
      )
      FROM public.conversation_summaries
      WHERE (p_lead_id IS NOT NULL AND lead_id = p_lead_id) OR session_key = p_session_key
      ORDER BY updated_at DESC LIMIT 1
    ),
    'notes', (
      SELECT jsonb_build_object(
        'spouse_name', spouse_name, 'pet_name', pet_name,
        'relocation_reason', relocation_reason, 'preferred_style', preferred_style,
        'timeline', timeline, 'budget_notes', budget_notes, 'kids', kids,
        'prior_objection', prior_objection, 'favorite_feature', favorite_feature,
        'extra', extra
      )
      FROM public.personal_notes
      WHERE (p_lead_id IS NOT NULL AND lead_id = p_lead_id) OR session_key = p_session_key
      LIMIT 1
    )
  ) INTO v_result;
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_conversation_summary(
  p_session_key text,
  p_summary text,
  p_key_facts jsonb DEFAULT '{}'::jsonb,
  p_message_count integer DEFAULT 0,
  p_lead_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  UPDATE public.conversation_summaries
  SET summary = p_summary,
      key_facts = p_key_facts,
      message_count = p_message_count,
      last_message_at = now(),
      lead_id = COALESCE(p_lead_id, lead_id)
  WHERE session_key = p_session_key
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    INSERT INTO public.conversation_summaries (
      session_key, lead_id, summary, key_facts, message_count, last_message_at
    ) VALUES (
      p_session_key, p_lead_id, p_summary, p_key_facts, p_message_count, now()
    ) RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_memory(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_conversation_summary(text, text, jsonb, integer, uuid) TO authenticated, service_role;

REVOKE ALL ON public.conversation_summaries FROM anon, authenticated;
REVOKE ALL ON public.personal_notes FROM anon, authenticated;
REVOKE ALL ON public.agent_scratchpads FROM anon, authenticated;
-- Funnel analytics: lightweight, append-only event log for conversion tracking
CREATE TABLE public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  anonymous_id text,
  user_id uuid,
  session_id text,
  path text,
  referrer text,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_funnel_events_name_time ON public.funnel_events (event_name, created_at DESC);
CREATE INDEX idx_funnel_events_anon ON public.funnel_events (anonymous_id) WHERE anonymous_id IS NOT NULL;
CREATE INDEX idx_funnel_events_user ON public.funnel_events (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_funnel_events_session ON public.funnel_events (session_id) WHERE session_id IS NOT NULL;

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

-- Anyone (anonymous or authed) can write events
CREATE POLICY "Anyone can insert funnel events"
  ON public.funnel_events
  FOR INSERT
  WITH CHECK (true);

-- Only admins can read / manage
CREATE POLICY "Admins can view funnel events"
  ON public.funnel_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete funnel events"
  ON public.funnel_events
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

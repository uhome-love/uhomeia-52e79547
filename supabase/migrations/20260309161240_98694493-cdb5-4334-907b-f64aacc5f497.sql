
-- Fix realtime filtered subscriptions by setting FULL replica identity
-- This allows filters like corretor_id=eq.XXX to work on UPDATE events
ALTER TABLE public.pipeline_leads REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

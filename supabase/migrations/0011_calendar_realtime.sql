-- Enable full row identity so Supabase Realtime UPDATE events carry the new values.
-- Without this, UPDATE events on calendar_events never reach subscribing clients.
ALTER TABLE calendar_events REPLICA IDENTITY FULL;

-- Add calendar_events to the realtime publication so all INSERT/UPDATE/DELETE
-- changes are broadcast to clients subscribed via supabase.channel().
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'calendar_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;
  END IF;
END $$;

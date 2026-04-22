-- Restrict Realtime channel subscriptions to user-scoped topics
-- Topic name MUST contain the authenticated user's UID for SELECT to be allowed
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only subscribe to their own user-scoped topics" ON realtime.messages;

CREATE POLICY "Users can only subscribe to their own user-scoped topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
);
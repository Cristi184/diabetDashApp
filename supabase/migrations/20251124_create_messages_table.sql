-- Create messages table for patient-doctor chat
CREATE TABLE IF NOT EXISTS app_adf262f319_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users NOT NULL,
    receiver_id UUID REFERENCES auth.users NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS messages_sender_idx ON app_adf262f319_messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_idx ON app_adf262f319_messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON app_adf262f319_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON app_adf262f319_messages(sender_id, receiver_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE app_adf262f319_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read messages where they are sender or receiver
CREATE POLICY "users_read_own_messages" ON app_adf262f319_messages
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

-- Policy: Users can insert messages where they are the sender
CREATE POLICY "users_send_messages" ON app_adf262f319_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
    );

-- Policy: Users can update messages where they are the receiver (for marking as read)
CREATE POLICY "users_mark_received_messages_read" ON app_adf262f319_messages
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = receiver_id
    )
    WITH CHECK (
        auth.uid() = receiver_id
    );

-- Enable real-time for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE app_adf262f319_messages;
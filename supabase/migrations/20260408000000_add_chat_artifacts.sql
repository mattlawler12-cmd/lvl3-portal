-- Add artifacts column to ask_lvl3_messages for persisting spreadsheet downloads
ALTER TABLE ask_lvl3_messages ADD COLUMN IF NOT EXISTS artifacts jsonb DEFAULT '[]';

-- Create private storage bucket for chat artifacts (spreadsheets, etc.)
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-artifacts', 'chat-artifacts', false)
ON CONFLICT (id) DO NOTHING;

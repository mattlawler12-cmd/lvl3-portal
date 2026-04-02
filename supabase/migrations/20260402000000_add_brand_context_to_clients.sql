-- Add brand_context column to clients table
-- Stores per-client brand voice/tone/style instructions for the SEO Content Engine
ALTER TABLE public.clients ADD COLUMN brand_context TEXT;

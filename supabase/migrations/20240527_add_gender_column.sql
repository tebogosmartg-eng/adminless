-- Add optional gender column to learners table
-- This allows synchronization of the new lightweight attribute
ALTER TABLE learners ADD COLUMN IF NOT EXISTS gender TEXT;
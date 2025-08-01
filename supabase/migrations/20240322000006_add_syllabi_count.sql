ALTER TABLE public.users ADD COLUMN IF NOT EXISTS syllabi_processed integer DEFAULT 0;

alter publication supabase_realtime add table users;
# Project Changelog

## [Environment Alignment Update]
- **Environment**: Consolidated all environment variables into `.env.local` and removed legacy `.env` files.
- **Startup**: Implemented environment auditing in `main.tsx` to log Supabase URL and execution mode.
- **Security**: Removed hardcoded Supabase credentials, switching strictly to Vite environment variables.
- **Architecture**: Created migration for `rubrics`, `lesson_logs`, and `curriculum_topics` tables to resolve 404 errors.
- **Sync**: Updated synchronization engine to support curriculum and lesson logging features.
- **Cleanup**: Verified absence of service workers and redundant dev server configurations.
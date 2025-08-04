# SQLite to Supabase Migration Guide

This guide will help you migrate your existing SQLite database to Supabase.

## Prerequisites

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note down your project URL and anon key

2. **Set up Environment Variables**
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase credentials:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

## Migration Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set up Supabase Database Schema
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Run the SQL to create the tables and policies

### Step 3: Migrate Existing Data (Optional)
If you have existing SQLite data in `tasks.db`:

```bash
npm run migrate-data
```

This will:
- Read your existing SQLite database
- Transfer all tasks and task logs to Supabase
- Preserve all data relationships and timestamps

### Step 4: Test the Migration
1. Start your development server:
   ```bash
   npm run dev
   ```
2. Verify that all your existing tasks and logs are visible
3. Test creating, updating, and deleting tasks

### Step 5: Clean Up (Optional)
After confirming the migration worked:
- You can safely delete `tasks.db`
- Remove `tasks.json.backup` if it exists

## Key Changes

### Database Operations
- **Before**: SQLite with callback-based operations
- **After**: Supabase with async/await operations

### Schema Changes
- Column names changed from camelCase to snake_case (e.g., `startTime` → `start_time`)
- Added `created_at` and `updated_at` timestamps
- Boolean fields now use proper boolean type instead of integers

### Benefits of Supabase
- ✅ Cloud-hosted database (no local file dependency)
- ✅ Built-in authentication and authorization
- ✅ Real-time subscriptions capability
- ✅ Automatic backups and maintenance
- ✅ Better scalability and performance
- ✅ RESTful API auto-generation

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Make sure `.env.local` exists and contains valid Supabase credentials
   - Restart your development server after adding environment variables

2. **Migration Script Fails**
   - Ensure your Supabase database schema is set up correctly
   - Check that your Supabase project has the correct permissions

3. **API Errors**
   - Verify your Supabase URL and anon key are correct
   - Check the Supabase dashboard for any error logs

### Getting Help
- Check the [Supabase Documentation](https://supabase.com/docs)
- Review the Supabase project logs in your dashboard
- Ensure your database policies allow the operations you're trying to perform

## Rollback Plan
If you need to rollback to SQLite:
1. Keep your `tasks.db` file until you're confident in the migration
2. The old SQLite code is preserved in git history
3. You can revert the changes and reinstall `sqlite3` dependency if needed
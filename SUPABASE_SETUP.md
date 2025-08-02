# Supabase Setup Guide for Phone Range Nexus

This guide will help you set up Supabase database integration for the Phone Range Nexus application.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. Node.js and npm installed
3. The Phone Range Nexus application code

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `phone-range-nexus`
   - **Database Password**: Choose a strong password
   - **Region**: Select the region closest to your users
5. Click "Create new project"
6. Wait for the project to be created (this may take a few minutes)

## Step 2: Set Up Database Schema

1. In your Supabase dashboard, go to the **SQL Editor**
2. Copy the contents of `supabase-schema.sql` from this project
3. Paste it into the SQL Editor
4. Click **Run** to execute the schema creation
5. Verify that the tables were created by checking the **Table Editor**

You should see these tables:
- `phone_numbers`
- `number_ranges`
- `bulk_operations`
- `audit_log`

## Step 3: Configure Environment Variables

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy your **Project URL** and **anon public** key
3. Create a `.env` file in your project root (copy from `.env.example`):

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace the values with your actual Supabase project URL and anon key.

## Step 4: Install Dependencies

The Supabase client is already included in the project dependencies. If you need to install it manually:

```bash
npm install @supabase/supabase-js
```

## Step 5: Test the Connection

1. Start your development server:
```bash
npm run dev
```

2. Open the application in your browser
3. Log in with any email/password (demo mode)
4. Navigate to different sections to verify the database connection is working

## Step 6: Authentication (Optional)

For production use, you may want to set up proper authentication:

1. In Supabase dashboard, go to **Authentication** → **Settings**
2. Configure your authentication providers
3. Update the Row Level Security policies in the database as needed
4. Modify the login component to use Supabase Auth instead of demo mode

## Features Enabled with Supabase

✅ **Persistent Data Storage**: All phone numbers, ranges, and operations are stored in the database

✅ **Real-time Updates**: Changes are immediately reflected across all users

✅ **Bulk Operations**: CSV import/export with full database integration

✅ **Project-based Reservations**: Numbers can be reserved for specific projects with automatic expiration

✅ **Audit Logging**: All actions are logged with timestamps and user information

✅ **Analytics**: Real-time statistics and reporting based on actual data

## Database Schema Overview

### phone_numbers
- Stores individual phone number records
- Tracks status, assignments, usage, and project associations
- Supports aging analysis and utilization tracking

### number_ranges
- Manages blocks of phone numbers
- Tracks utilization statistics per range
- Associates ranges with departments and projects

### bulk_operations
- Logs all bulk import/export/assignment operations
- Tracks progress and results
- Provides operation history

### audit_log
- Records all system activities
- Tracks user actions and system events
- Provides compliance and troubleshooting information

## Troubleshooting

### Connection Issues
- Verify your `.env` file has the correct Supabase URL and key
- Check that your Supabase project is active and not paused
- Ensure Row Level Security policies allow your operations

### Data Not Appearing
- Check the browser console for any error messages
- Verify the database tables were created correctly
- Test the connection using the Supabase dashboard

### Performance Issues
- The schema includes optimized indexes for common queries
- Consider adding additional indexes based on your usage patterns
- Monitor query performance in the Supabase dashboard

## Production Deployment

For production deployment:

1. **Environment Variables**: Set up proper environment variables in your hosting platform
2. **Authentication**: Implement proper user authentication
3. **Row Level Security**: Review and tighten RLS policies
4. **Backup**: Set up automated database backups
5. **Monitoring**: Enable database monitoring and alerts

## Support

For issues specific to this integration:
- Check the application console for error messages
- Review the Supabase dashboard logs
- Ensure your database schema matches the expected structure

For Supabase-specific issues:
- Visit [Supabase Documentation](https://supabase.com/docs)
- Check [Supabase Community](https://github.com/supabase/supabase/discussions)
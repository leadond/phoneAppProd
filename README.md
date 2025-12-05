# Phone Range Nexus - Local Database Edition

A comprehensive phone number range management system that runs completely offline with a local SQLite database.

## 🚀 Features

- **Complete Offline Functionality** - Works entirely within corporate firewalls
- **Local SQLite Database** - No external dependencies or cloud services
- **Multi-User Support** - Shared database for team collaboration
- **Simple Authentication** - File-based user management
- **Phone Number Management** - Track, assign, and manage phone number ranges
- **Bulk Operations** - Import/export and bulk processing capabilities
- **Audit Logging** - Complete activity tracking
- **PBX Integration** - Manage connections to various PBX systems
- **Scheduled PBX Sync** - Automatically sync with your PBX systems
- **Read-Only API** - Programmatic access to your data
- **Advanced Filtering & Saved Searches** - Powerful data exploration tools
- **Custom Tagging** - Organize your numbers with custom tags
- **Bulk Editing** - Perform actions on multiple numbers at once
- **Utilization Dashboard** - Visualize your number usage
- **Searchable Audit Log** - Easily search and filter the audit log
- **Webhook Notifications** - Get notified of important events
- **Analytics Dashboard** - Real-time statistics and insights

## ✨ What's New in Version 2.0

- **Scheduled PBX Sync**: Automatically sync with your PBX systems on a configurable schedule.
- **Read-Only API**: Access your phone number data programmatically with a secure, token-based API.
- **Advanced Filtering & Saved Searches**: Create, save, and load complex filter combinations.
- **Custom Tagging System**: Organize your numbers with custom tags and colors.
- **Bulk Editing**: Perform bulk actions on multiple numbers at once, including tagging.
- **Number Utilization Dashboard**: Visualize your phone number usage with interactive charts.
- **Searchable Audit Log UI**: A dedicated interface for searching and filtering the audit log.
- **Temporary Reservations with Expiry**: Reservations are now automatically released after a configurable period.
- **Webhook Notifications**: Get notified in Slack or Teams about important events.

## 📋 Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager

## 🛠️ Installation

1. **Clone or extract the project:**
   ```bash
   cd phone-range-nexus
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment setup:**
   ```bash
   cp .env.example .env
   ```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
The application will be available at `http://localhost:5173`

### Production Build
```bash
npm run build
npm run preview
```

### Production Deployment
```bash
npm run build
# Serve the dist/ folder with any web server
```

## 🔐 Default Authentication

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

⚠️ **Important:** Change the default password after first login for security.

## 💾 Database

The application uses SQLite with the database file `phone-range-nexus.db` created automatically in the project root directory.

### Database Features:
- **Automatic initialization** - Database and tables created on first run
- **Sample data included** - Ready-to-use test data
- **Backup friendly** - Single file database easy to backup
- **Local storage** - All data stays on your server

## 🌐 Multi-User Access

### Server Setup for Multiple Users:

1. **Run the application on a server:**
   ```bash
   npm run dev -- --host 0.0.0.0
   ```

2. **Access from other machines:**
   - Users connect to: `http://YOUR_SERVER_IP:5173`
   - All users share the same database
   - Concurrent access supported

### Network Configuration:
- Ensure port 5173 is accessible on your network
- For production, use a reverse proxy (nginx, Apache)
- Consider HTTPS for secure access

## 📁 Project Structure

```
phone-range-nexus/
├── src/
│   ├── lib/
│   │   ├── localDatabase.ts      # SQLite database operations
│   │   ├── localAuth.ts          # Authentication system
│   │   ├── localClient.ts        # Database client
│   │   └── local-database-schema.sql # Database schema
│   ├── services/
│   │   └── dataService.ts        # Data management service
│   ├── components/               # React components
│   └── pages/                    # Application pages
├── phone-range-nexus.db         # SQLite database (created automatically)
├── .env                         # Environment configuration
└── package.json                 # Dependencies and scripts
```

## 🔧 Configuration

### Environment Variables (.env):
```bash
# Local Database Configuration
LOCAL_DB_PATH=phone-range-nexus.db
AUTH_SESSION_DURATION=24h
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
APP_NAME=Phone Range Nexus
NODE_ENV=development
```

## 📊 Key Features Explained

### Phone Number Management
- **Add/Edit/Delete** phone numbers
- **Status tracking** (available, assigned, reserved, aging, blocked)
- **Bulk import** from CSV files
- **Range management** with pattern support
- **Department and location** organization

### Authentication System
- **Simple file-based authentication**
- **Session management** with configurable duration
- **Local user storage** in SQLite
- **Password protection** for admin access

### Data Import/Export
- **CSV import/export** functionality
- **Bulk operations** with progress tracking
- **Data backup** through export features
- **Sample data** included for testing

### Audit Logging
- **Complete activity tracking**
- **User action logging**
- **Timestamp records**
- **Activity categorization**

## 🔒 Security Considerations

### For Corporate Environments:
- **No external connections** - completely offline
- **Local data storage** - sensitive data stays internal
- **Network isolation** - works within firewalls
- **Access control** - admin authentication required

### Security Best Practices:
1. Change default admin password immediately
2. Regular database backups
3. Restrict network access to authorized users
4. Use HTTPS in production environments
5. Regular security updates for Node.js

## 🗄️ Database Backup & Recovery

### Backup:
```bash
# Simple file copy
cp phone-range-nexus.db phone-range-nexus-backup-$(date +%Y%m%d).db
```

### Recovery:
```bash
# Restore from backup
cp phone-range-nexus-backup-YYYYMMDD.db phone-range-nexus.db
```

### Scheduled Backups:
```bash
# Add to crontab for daily backups
0 2 * * * cp /path/to/phone-range-nexus.db /backup/location/phone-range-nexus-$(date +\%Y\%m\%d).db
```

## 🚨 Troubleshooting

### Common Issues:

**Database not found:**
- Database is created automatically on first run
- Check write permissions in project directory

**Port already in use:**
```bash
# Use different port
npm run dev -- --port 3000
```

**Permission denied:**
- Ensure Node.js has file system permissions
- Check SQLite database file permissions

**Can't connect from other machines:**
```bash
# Bind to all interfaces
npm run dev -- --host 0.0.0.0
```

## 🔄 Migration from Supabase

The application has been successfully converted from Supabase to local SQLite:

### Changes Made:
- ✅ Replaced Supabase with SQLite database
- ✅ Implemented local authentication system
- ✅ Removed all external API dependencies
- ✅ Added offline functionality
- ✅ Maintained all existing features
- ✅ Compatible with corporate firewalls

### Data Migration:
If you have existing Supabase data, you can:
1. Export data from Supabase
2. Use the CSV import feature in the new system
3. Manual data entry through the interface

## 📞 Support

For questions or issues:
1. Check this README first
2. Review the troubleshooting section
3. Check application logs in the browser console
4. Verify Node.js and npm versions

## 🏗️ Development

### Adding Features:
1. Database changes: Update `src/lib/local-database-schema.sql`
2. Service layer: Modify `src/services/dataService.ts`
3. Components: Add/edit React components in `src/components/`

### Testing:
```bash
npm run test:e2e        # End-to-end tests
npm run test:e2e:ui     # Interactive test UI
```

---

**Phone Range Nexus** - Complete offline phone number management for corporate environments.

# FeedbackFlow Database

This directory contains the complete database setup for the FeedbackFlow application, including schema definitions, migrations, views, procedures, and Docker configuration.

## 📁 Directory Structure

```
database/
├── sql/
│   ├── schema/           # Core database schema files
│   │   ├── 01_users_and_auth.sql
│   │   ├── 02_organizations.sql
│   │   ├── 03_feedback_system.sql
│   │   ├── 04_cycles_and_workflows.sql
│   │   ├── 05_notifications.sql
│   │   └── 06_analytics_and_audit.sql
│   ├── views/            # Database views for analytics
│   │   ├── cycle_completion_rates.sql
│   │   ├── team_analytics.sql
│   │   └── user_feedback_summary.sql
│   ├── procedures/       # Stored procedures
│   │   ├── calculate_completion_rates.sql
│   │   └── generate_cycle_participants.sql
│   └── indexes/          # Performance and search indexes
│       ├── performance_indexes.sql
│       └── search_indexes.sql
├── scripts/              # Database management scripts
│   ├── backup.sh
│   ├── migrate.sh
│   └── restore.sh
├── backups/              # Database backup storage
├── init/                 # Docker initialization scripts
│   └── 01-init.sql
├── docker-compose.yml    # Docker database setup
├── setup.sql            # Complete database setup script
└── README.md            # This file
```

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Start the database services:**
   ```bash
   cd database
   docker-compose up -d
   ```

2. **Run the database setup:**
   ```bash
   # Connect to the database and run setup
   docker exec -i feedbackflow-postgres psql -U feedbackflow_app -d feedbackflow < setup.sql
   ```

3. **Access pgAdmin (optional):**
   - URL: http://localhost:8080
   - Email: admin@feedbackflow.com
   - Password: admin123

### Manual Setup

1. **Install PostgreSQL 15+ with extensions:**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql-15 postgresql-contrib-15
   
   # macOS
   brew install postgresql@15
   ```

2. **Create database and user:**
   ```sql
   CREATE DATABASE feedbackflow;
   CREATE USER feedbackflow_app WITH PASSWORD 'feedbackflow_password';
   GRANT ALL PRIVILEGES ON DATABASE feedbackflow TO feedbackflow_app;
   ```

3. **Run the setup script:**
   ```bash
   psql -U feedbackflow_app -d feedbackflow -f setup.sql
   ```

## 📊 Database Schema Overview

### Core Tables

#### Users & Authentication
- `users` - User accounts and profiles
- `roles` - System and organization roles
- `user_roles` - User role assignments
- `oauth_providers` - OAuth integration data
- `user_sessions` - Active user sessions
- `password_reset_tokens` - Password reset functionality
- `email_verification_tokens` - Email verification

#### Organizations
- `organizations` - Organization data and settings
- `departments` - Organizational departments
- `teams` - Teams within departments
- `organization_members` - User-organization relationships
- `organization_invitations` - Organization invitations

#### Feedback System
- `feedback_cycles` - Feedback cycle definitions
- `feedback_requests` - Individual feedback requests
- `feedback_responses` - Actual feedback content
- `feedback_templates` - Reusable feedback templates
- `feedback_categories` - Feedback categorization
- `feedback_tags` - Feedback tagging system
- `feedback_comments` - Comments on feedback
- `feedback_acknowledgments` - Feedback acknowledgments

#### Cycles & Workflows
- `cycle_participants` - Who participates in cycles
- `cycle_milestones` - Cycle milestones and deadlines
- `workflow_templates` - Workflow definitions
- `workflow_instances` - Active workflow instances
- `workflow_step_executions` - Workflow step tracking
- `cycle_automation_rules` - Automation rules
- `cycle_notifications` - Cycle-related notifications
- `cycle_statistics` - Cached cycle statistics

#### Notifications
- `notification_templates` - Notification templates
- `user_notifications` - User notification queue
- `notification_preferences` - User notification preferences
- `notification_channels` - External notification channels
- `notification_delivery_logs` - Delivery tracking
- `email_queue` - Email processing queue
- `notification_subscriptions` - Real-time subscriptions

#### Analytics & Audit
- `analytics_events` - User action tracking
- `analytics_metrics` - Calculated metrics
- `audit_logs` - System change tracking
- `system_health_metrics` - System health data
- `performance_metrics` - API performance data
- `error_logs` - Error tracking
- `report_templates` - Report definitions
- `report_executions` - Report execution history
- `data_exports` - Data export tracking

### Views

- `cycle_completion_rates` - Real-time cycle completion statistics
- `team_analytics` - Comprehensive team performance metrics
- `user_feedback_summary` - User feedback activity summary

### Stored Procedures

- `calculate_cycle_completion_rates()` - Calculate cycle statistics
- `update_cycle_statistics()` - Update cached cycle data
- `generate_cycle_participants()` - Auto-generate cycle participants
- `generate_feedback_requests()` - Auto-generate feedback requests
- `get_organization_stats()` - Get organization statistics
- `cleanup_expired_data()` - Clean up old data

## 🔧 Database Management

### Migrations

The application includes a migration system for database schema changes:

```bash
# Run migrations
npm run migrate

# Check migration status
npm run migrate:status

# Rollback last migration
npm run migrate:rollback
```

### Backups

```bash
# Create backup
./scripts/backup.sh

# Restore backup
./scripts/restore.sh backup_file.sql
```

### Performance Monitoring

The database includes comprehensive performance monitoring:

- **Performance Metrics**: API response times, query performance
- **System Health**: Database health metrics
- **Analytics Events**: User action tracking
- **Audit Logs**: All system changes

## 🔍 Key Features

### Multi-Tenancy
- Row Level Security (RLS) for data isolation
- Organization-based data segregation
- User role-based access control

### Performance Optimization
- Comprehensive indexing strategy
- Full-text search capabilities
- Query optimization
- Connection pooling

### Data Integrity
- Foreign key constraints
- Check constraints for data validation
- Triggers for automatic timestamp updates
- Unique constraints for data consistency

### Scalability
- Partitioning support for large tables
- Efficient pagination
- Cached statistics
- Background cleanup procedures

## 🔐 Security

### Row Level Security (RLS)
- Organization data isolation
- User-based access control
- Secure multi-tenant architecture

### Data Protection
- Encrypted sensitive data
- Audit trail for all changes
- Secure session management
- OAuth integration support

## 📈 Analytics & Reporting

### Built-in Analytics
- User engagement metrics
- Feedback completion rates
- Performance analytics
- System health monitoring

### Custom Reports
- Flexible report templates
- Scheduled report generation
- Data export capabilities
- Real-time dashboards

## 🛠️ Development

### Local Development
```bash
# Start database
docker-compose up -d

# Run migrations
npm run migrate

# Seed test data
npm run seed
```

### Testing
```bash
# Run database tests
npm run test:db

# Performance testing
npm run test:performance
```

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Design Best Practices](./docs/database-design.md)
- [Performance Tuning Guide](./docs/performance-tuning.md)
- [Backup & Recovery Guide](./docs/backup-recovery.md)

## 🤝 Contributing

When making database changes:

1. Create a new migration file
2. Update the schema documentation
3. Add appropriate indexes
4. Update tests
5. Test performance impact

## 📞 Support

For database-related issues:
- Check the logs: `docker-compose logs postgres`
- Review the performance metrics
- Consult the troubleshooting guide
- Contact the development team

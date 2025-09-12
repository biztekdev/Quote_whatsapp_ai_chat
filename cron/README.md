# Cron Jobs System

This directory contains the cron job system for the WhatsApp AI Chat application. It provides a structured and maintainable way to handle scheduled tasks.

## Directory Structure

```
cron/
├── index.js                 # Main cron manager
├── jobs/                    # Individual job implementations
│   ├── index.js            # Job exports
│   └── cleanupJobs.js      # Cleanup-related jobs
├── config/                  # Configuration files
│   └── schedules.js        # Cron schedule definitions
├── utils/                   # Utility functions
│   ├── index.js            # Utility exports
│   ├── jobLogger.js        # Enhanced logging for jobs
│   └── retryHandler.js     # Retry logic for failed jobs
└── README.md               # This file
```

## Features

- **Centralized Management**: All cron jobs are managed through a single CronManager class
- **Enhanced Logging**: Specialized logging for cron jobs with timing and context
- **Retry Logic**: Automatic retry with exponential backoff for failed jobs
- **Flexible Scheduling**: Easy configuration of cron schedules
- **Error Handling**: Comprehensive error handling and logging
- **Job Status Tracking**: Monitor job execution status

## Usage

### Starting the Cron System

```javascript
import cronManager from './cron/index.js';

// Start all cron jobs
cronManager.start();
```

### Adding New Jobs

1. Create a new job file in `cron/jobs/`
2. Export the job function
3. Register it in `cron/index.js`

Example:
```javascript
// cron/jobs/myNewJob.js
export async function myNewJob() {
    // Job implementation
}

// cron/index.js
import { myNewJob } from './jobs/myNewJob.js';

// In initialize() method:
this.registerJob('my-new-job', '0 */6 * * *', myNewJob);
```

### Job Configuration

Schedules are defined in `cron/config/schedules.js`:

```javascript
export const CRON_SCHEDULES = {
    CLEANUP_LEGACY_CONVERSATIONS: '*/5 * * * *', // Every 5 minutes
    CLEANUP_OLD_QUOTES: '0 2 * * *', // Daily at 2 AM UTC
};
```

## Available Jobs

### Cleanup Jobs

- **cleanupLegacyConversations**: Removes inactive conversation states older than 10 minutes (runs every minute)
- **cleanupLegacyConversationsCustom**: Custom cleanup with configurable time threshold
- **getLegacyConversationStats**: Provides statistics about conversation states

**Note**: Only the inactive conversation state cleanup job is currently active. All other jobs are disabled.

## Monitoring

The system provides comprehensive logging and monitoring:

- Job start/completion times
- Execution duration
- Error tracking with stack traces
- Retry attempt logging
- Performance metrics

## Error Handling

- Automatic retry with exponential backoff
- Non-retryable error detection
- Comprehensive error logging
- Graceful failure handling

## Best Practices

1. **Keep jobs focused**: Each job should have a single responsibility
2. **Handle errors gracefully**: Always wrap job logic in try-catch blocks
3. **Log appropriately**: Use the JobLogger for consistent logging
4. **Test thoroughly**: Test jobs in development before deploying
5. **Monitor performance**: Keep track of job execution times and resource usage
6. **Use retry logic**: Implement retry for jobs that might fail due to temporary issues

## Schedule Format

Cron schedules use the standard 5-field format:
```
* * * * *
│ │ │ │ │
│ │ │ │ └── Day of week (0-7, Sunday = 0 or 7)
│ │ │ └──── Month (1-12)
│ │ └────── Day of month (1-31)
│ └──────── Hour (0-23)
└────────── Minute (0-59)
```

Examples:
- `*/5 * * * *` - Every 5 minutes
- `0 2 * * *` - Daily at 2 AM
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 */6 * * *` - Every 6 hours

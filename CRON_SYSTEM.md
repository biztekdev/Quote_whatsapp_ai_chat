# Cron Jobs System Documentation

## Overview

This document describes the cron jobs system implemented for the WhatsApp AI Chat application. The system provides a structured and maintainable way to handle scheduled tasks with comprehensive logging, error handling, and monitoring capabilities.

## Directory Structure

```
cron/
├── index.js                 # Main cron manager (CronManager class)
├── jobs/                    # Individual job implementations
│   ├── index.js            # Job exports
│   └── cleanupJobs.js      # Cleanup-related jobs
├── config/                  # Configuration files
│   └── schedules.js        # Cron schedule definitions
├── utils/                   # Utility functions
│   ├── index.js            # Utility exports
│   ├── jobLogger.js        # Enhanced logging for jobs
│   └── retryHandler.js     # Retry logic for failed jobs
└── README.md               # Detailed documentation
```

## Features

### 🎯 Core Features
- **Centralized Management**: All cron jobs managed through a single CronManager class
- **Enhanced Logging**: Specialized logging with timing, context, and error tracking
- **Retry Logic**: Automatic retry with exponential backoff for failed jobs
- **Flexible Scheduling**: Easy configuration of cron schedules
- **Error Handling**: Comprehensive error handling and logging
- **Job Status Tracking**: Monitor job execution status in real-time

### 🔧 Technical Features
- **ES6 Modules**: Modern JavaScript module system
- **Async/Await**: Full async support for all operations
- **MongoDB Integration**: Direct database operations for cleanup jobs
- **UTC Timezone**: All schedules run in UTC for consistency
- **Memory Efficient**: Proper cleanup and resource management

## Implementation Details

### CronManager Class

The `CronManager` class is the central component that handles all cron job operations:

```javascript
import cronManager from './cron/index.js';

// Start all cron jobs
cronManager.start();

// Stop all cron jobs
cronManager.stop();

// Get job status
const status = cronManager.getStatus();
```

### Job Registration

Jobs are registered in the `initialize()` method:

```javascript
this.registerJob('cleanup-legacy-conversations', '*/5 * * * *', cleanupLegacyConversations);
```

### Schedule Configuration

Schedules are defined in `cron/config/schedules.js`:

```javascript
export const CRON_SCHEDULES = {
    CLEANUP_LEGACY_CONVERSATIONS: '*/5 * * * *', // Every 5 minutes
    CLEANUP_OLD_QUOTES: '0 2 * * *', // Daily at 2 AM UTC
    HEALTH_CHECK: '*/10 * * * *', // Every 10 minutes
};
```

## Available Jobs

### 1. Legacy Conversation Cleanup

**Job Name**: `cleanup-legacy-conversations`  
**Schedule**: Every minute (`* * * * *`)  
**Purpose**: Updates conversation states older than 10 minutes to set isActive: false

**Function**: `cleanupLegacyConversations()`

**What it does**:
- Finds `LegacyConversationState` documents where `isActive: true` and `createdAt` is older than 10 minutes
- Updates these documents to set `isActive: false` and `updatedAt: current timestamp`
- Logs the number of updated documents
- Returns execution statistics

**Database Query**:
```javascript
await LegacyConversationState.updateMany({
    isActive: true, // Only update active conversations
    createdAt: { $lt: tenMinutesAgo }
}, {
    $set: { 
        isActive: false,
        updatedAt: new Date()
    }
});
```

### 2. Custom Update

**Function**: `cleanupLegacyConversationsCustom(minutesOld)`

**Parameters**:
- `minutesOld` (number): Custom time threshold in minutes (default: 10)

**Usage**:
```javascript
// Update conversations older than 30 minutes to inactive
await cleanupLegacyConversationsCustom(30);
```

### 3. Statistics

**Function**: `getLegacyConversationStats()`

**Returns**:
```javascript
{
    total: 150,           // Total conversation states
    active: 25,           // Currently active conversations
    inactive: 125,        // Inactive conversations
    oldInactive: 45,      // Inactive conversations older than 10 minutes
    timestamp: "2024-01-15T10:30:00.000Z"
}
```

## API Endpoints

### Get Cron Status
```
GET /cron/status
```

**Response**:
```json
{
    "success": true,
    "cronJobs": {
        "cleanup-legacy-conversations": {
            "running": true,
            "scheduled": true
        }
    },
    "isRunning": true,
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Execute Job Manually
```
POST /cron/execute/cleanup-legacy-conversations
```

**Response**:
```json
{
    "success": true,
    "jobName": "cleanup-legacy-conversations",
    "result": {
        "success": true,
        "deletedCount": 5,
        "timestamp": "2024-01-15T10:30:00.000Z"
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Logging

### JobLogger Class

Enhanced logging for cron jobs with timing and context:

```javascript
import { createJobLogger } from './cron/utils/jobLogger.js';

const logger = createJobLogger('my-job');

logger.start();
logger.progress('Processing data...');
logger.complete({ processed: 100 });
logger.error(error, { context: 'data-processing' });
```

### Log Levels

- **INFO**: Job start, completion, progress updates
- **WARN**: Retry attempts, non-critical issues
- **ERROR**: Job failures, exceptions
- **DEBUG**: Detailed execution information

## Error Handling

### Retry Logic

Automatic retry with exponential backoff:

```javascript
import { withRetry } from './cron/utils/retryHandler.js';

const retryableJob = withRetry(cleanupLegacyConversations, {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: 1000,
    MAX_DELAY: 30000
});
```

### Retry Configuration

```javascript
export const RETRY_CONFIG = {
    MAX_ATTEMPTS: 3,           // Maximum retry attempts
    INITIAL_DELAY: 1000,       // Initial delay (1 second)
    MAX_DELAY: 30000,          // Maximum delay (30 seconds)
    BACKOFF_MULTIPLIER: 2      // Exponential backoff multiplier
};
```

### Non-Retryable Errors

Certain errors are not retried:
- `ValidationError`
- `CastError`
- `SyntaxError`
- `TypeError`

## Testing

### Test Script

Run the test script to verify cron job functionality:

```bash
npm run test:cron
```

### Manual Testing

1. **Check Status**: `GET /cron/status`
2. **Execute Job**: `POST /cron/execute/cleanup-legacy-conversations`
3. **Monitor Logs**: Check application logs for job execution

### Test Scenarios

1. **Normal Operation**: Jobs run on schedule
2. **Manual Execution**: Jobs can be triggered manually
3. **Error Handling**: Failed jobs are retried appropriately
4. **Database Operations**: Cleanup jobs modify database correctly
5. **Logging**: All operations are properly logged

## Monitoring

### Health Checks

The system provides comprehensive monitoring:

- Job execution status
- Execution duration
- Error rates
- Database operation results
- Memory usage

### Metrics

Track these key metrics:
- Jobs executed per hour
- Average execution time
- Error rate percentage
- Database cleanup efficiency
- Memory usage trends

## Best Practices

### 1. Job Design
- Keep jobs focused on single responsibilities
- Handle errors gracefully with try-catch blocks
- Use appropriate logging levels
- Test thoroughly before deployment

### 2. Performance
- Monitor job execution times
- Optimize database queries
- Use appropriate indexes
- Avoid blocking operations

### 3. Maintenance
- Regular monitoring of job status
- Review error logs frequently
- Update schedules as needed
- Clean up old job data

### 4. Security
- Validate all inputs
- Use proper error messages
- Log security-relevant events
- Monitor for suspicious activity

## Troubleshooting

### Common Issues

1. **Jobs Not Running**
   - Check database connection
   - Verify cron manager initialization
   - Review error logs

2. **Database Errors**
   - Ensure MongoDB is running
   - Check connection string
   - Verify collection permissions

3. **Memory Issues**
   - Monitor job execution times
   - Check for memory leaks
   - Optimize database queries

### Debug Steps

1. Check cron status: `GET /cron/status`
2. Review application logs
3. Test manual job execution
4. Verify database connectivity
5. Check system resources

## Future Enhancements

### Planned Features

1. **Job Dependencies**: Chain jobs with dependencies
2. **Job Queuing**: Queue system for heavy jobs
3. **Web Dashboard**: Web interface for job management
4. **Email Notifications**: Alerts for job failures
5. **Metrics Dashboard**: Real-time job metrics

### Configuration Options

1. **Dynamic Schedules**: Change schedules without restart
2. **Job Priorities**: Priority-based job execution
3. **Resource Limits**: CPU and memory limits per job
4. **Distributed Jobs**: Multi-instance job coordination

## Conclusion

The cron jobs system provides a robust, scalable solution for scheduled tasks in the WhatsApp AI Chat application. With comprehensive logging, error handling, and monitoring capabilities, it ensures reliable operation of background processes while maintaining system performance and stability.

For questions or issues, refer to the logs or contact the development team.

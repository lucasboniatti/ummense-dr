# Full-Text Search & S3 Archival Guide

**Document Version:** 1.0
**Last Updated:** 2026-03-03
**Related Stories:** Story 3.5 (Execution History & Audit Log), Story 3.5.1 (Post-Deployment Improvements)

---

## Overview

This guide covers two complementary features for managing execution history at scale:

1. **Full-Text Search** - Fast keyword search on 100K+ execution records using PostgreSQL `tsvector` GIN indexes
2. **S3 Archival** - Long-term compliance storage with 80-90% cost reduction vs. PostgreSQL

Combined, these features enable:
- ✓ Sub-100ms search across 100K+ execution records
- ✓ 50-200x cost savings for long-term retention (7 years)
- ✓ Compliance with audit retention requirements
- ✓ Non-blocking, automatic archival on cleanup schedule

---

## Full-Text Search

### Overview

PostgreSQL's native `tsvector` (text search vector) provides efficient full-text search with GIN indexes. This is far more efficient than LIKE-based searching for large datasets.

**Performance Targets:**
- Single keyword: <100ms on 100K records
- Multi-word phrase: <150ms with filters
- Concurrent searches: <200ms (10 simultaneous)

### Database Schema

Two tables have `search_vector` columns:

#### execution_histories
```sql
ALTER TABLE execution_histories
ADD COLUMN search_vector tsvector;

CREATE INDEX idx_execution_histories_search
ON execution_histories USING GIN(search_vector);
```

The `search_vector` is automatically updated via triggers and includes:
- Error messages (weight A - most important)
- Automation names (weight B)
- Trigger metadata (weight C - least important)

#### audit_logs
```sql
ALTER TABLE audit_logs
ADD COLUMN search_vector tsvector;

CREATE INDEX idx_audit_logs_search
ON audit_logs USING GIN(search_vector);
```

The `search_vector` includes:
- Action type (weight A)
- Changed values (old + new) (weight B)
- User agent (weight C)

### Usage

#### API Endpoint

```typescript
GET /api/automations/history/search?q={searchTerm}&filters={json}
```

**Query Parameters:**
- `q` (required): Search term (supports multi-word phrases)
- `filters` (optional): JSON object with:
  - `automationId`: Filter by automation
  - `status`: 'success', 'failed', or 'skipped'
  - `dateRange`: `{ start: "2026-03-01", end: "2026-03-03" }`
  - `limit`: Results per page (default: 50)
  - `offset`: Pagination offset (default: 0)

**Examples:**

```bash
# Simple keyword search
GET /api/automations/history/search?q=timeout

# Multi-word phrase search
GET /api/automations/history/search?q=database+connection+timeout

# Search with filters
GET /api/automations/history/search?q=error&filters={"status":"failed","limit":20}

# Date range + status
GET /api/automations/history/search?q=timeout&filters={
  "status":"failed",
  "dateRange":{
    "start":"2026-03-01",
    "end":"2026-03-03"
  }
}
```

#### Backend Service

```typescript
import { ExecutionHistoryService, FullTextSearchQuery } from '@/automations/history/history.service';

const historyService = new ExecutionHistoryService(db);

const results = await historyService.searchExecutionHistory({
  userId: 'user-123',
  searchTerm: 'timeout error',
  filters: {
    automationId: 'auto-456',
    status: 'failed',
    dateRange: {
      start: new Date('2026-03-01'),
      end: new Date('2026-03-03'),
    },
  },
  limit: 50,
  offset: 0,
});

console.log(results);
// {
//   executions: [...],
//   total: 1247,
//   limit: 50,
//   offset: 0,
//   searchTime: 47,  // milliseconds
//   searchTerm: 'timeout error'
// }
```

#### Frontend Component

The `ExecutionHistoryTable` component includes integrated search:

```typescript
<ExecutionHistoryTable
  executions={searchResults}
  total={totalCount}
  limit={50}
  offset={0}
  onSearch={(term) => {
    // Triggers search API call
    performSearch(term);
  }}
  searchTerm={currentSearchTerm}
  searchTime={lastSearchTime}  // Shows "47ms" in UI
  onFilterChange={(filters) => {
    // Advanced filters (status, date range, automation)
  }}
  onRowClick={(executionId) => {
    // Navigate to detail page
  }}
/>
```

**UI Features:**
- ✓ Search box with autocomplete suggestions
- ✓ Result count and search time displayed
- ✓ Advanced filter toggle (status, date range, automation)
- ✓ Relevance ranking (most relevant first)
- ✓ Pagination support

### Searching Audit Logs

Similar API for audit logs:

```typescript
const auditResults = await historyService.searchAuditLogs(
  userId: 'user-123',
  searchTerm: 'modified_schedule',
  automationId: 'auto-456',
  limit: 50,
  offset: 0
);
```

### Performance Optimization Tips

1. **Use Specific Phrases** - `"database connection timeout"` is faster than just `"error"`
2. **Combine with Filters** - Status + date range narrows result set first
3. **Avoid Wildcards** - `plainto_tsquery` doesn't use wildcards; it's more efficient
4. **Check Result Count** - If >10K results, suggest more specific search

### Troubleshooting

**Q: Searches are slow (>200ms)?**
- Check if GIN indexes are built: `SELECT * FROM pg_indexes WHERE tablename = 'execution_histories';`
- Rebuild if needed: `REINDEX INDEX idx_execution_histories_search;`
- Ensure composite indexes exist: `CREATE INDEX idx_execution_histories_user_created_at ON execution_histories(user_id, created_at DESC);`

**Q: Partial matches not working?**
- `plainto_tsquery` doesn't support wildcards like LIKE
- Use `ts_query` for advanced patterns (slower)
- For prefix search: "timeout" matches "timeout_error" (word boundary matching)

**Q: Search result ranking seems off?**
- Results are ranked by `ts_rank()` (relevance) then `created_at DESC` (recency)
- Adjust weights in database migration if needed: `setweight(..., 'A')` (A=most important)

---

## S3 Archival

### Overview

S3 archival automatically moves execution history to cost-effective long-term storage before deletion. Combined with PostgreSQL retention policy (default: 90 days in DB), archived records remain accessible for 7 years per compliance requirements.

**Cost Savings:**
- PostgreSQL storage: ~$1.5-5/GB/month
- S3 storage: ~$0.023/GB/month
- **Savings: 50-200x cheaper with S3**

**Example:** 1GB of compressed execution history
- DB storage: $1.50/month × 84 months = **$126**
- S3 storage: $0.023/month × 84 months = **$1.93**
- **Savings: $124 (98% reduction)**

### Configuration

#### 1. Database Setup

User retention policies already support archival:

```sql
SELECT * FROM user_retention_policies;
-- Columns:
-- - user_id (UUID) - FK to auth.users
-- - retention_days (INT) - 90 (default)
-- - archive_enabled (BOOLEAN) - false (default)
-- - archive_bucket (VARCHAR) - S3 bucket name
```

#### 2. Enable Archival for User

```typescript
import { ExecutionHistoryService } from '@/automations/history/history.service';

const historyService = new ExecutionHistoryService(db);

await historyService.updateRetentionPolicy(
  userId: 'user-123',
  retentionDays: 90,        // Keep in DB for 90 days
  archiveEnabled: true,
  archiveBucket: 'my-org-archives'  // S3 bucket
);
```

#### 3. AWS S3 Bucket Setup

Create S3 bucket with appropriate configuration:

```bash
# Create bucket
aws s3 mb s3://my-org-archives --region us-east-1

# Enable versioning (optional, for point-in-time recovery)
aws s3api put-bucket-versioning \
  --bucket my-org-archives \
  --versioning-configuration Status=Enabled

# Set intelligent-tiering for cost optimization
aws s3api put-bucket-intelligent-tiering-configuration \
  --bucket my-org-archives \
  --id auto-archive \
  --intelligent-tiering-configuration '{
    "Id": "auto-archive",
    "Filter": {"Prefix": "archive/"},
    "Status": "Enabled",
    "Tierings": [
      {"Days": 90, "AccessTier": "ARCHIVE_ACCESS"},
      {"Days": 180, "AccessTier": "DEEP_ARCHIVE_ACCESS"}
    ]
  }'

# Set lifecycle policy (optional, for automatic cleanup after 7 years)
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-org-archives \
  --lifecycle-configuration '{
    "Rules": [
      {
        "Id": "delete-after-7-years",
        "Status": "Enabled",
        "Prefix": "archive/",
        "ExpirationInDays": 2555
      }
    ]
  }'
```

#### 4. Environment Variables

```bash
# .env
S3_ARCHIVAL_BUCKET=my-org-archives
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...
```

Or use IAM roles (recommended for production):

```bash
# AWS SDK v3 will auto-detect IAM role from EC2 metadata
# No need for explicit credentials if running on EC2/ECS
```

### How It Works

#### Nightly Cleanup Job (2 AM UTC)

The retention job (`retention.job.ts`) runs automatically:

```typescript
import { startRetentionCleanupJob } from '@/automations/history/retention.job';

// Scheduled for 2 AM UTC every day
startRetentionCleanupJob(historyService);
```

**Flow:**
1. Get all user retention policies
2. For each policy:
   - Calculate cutoff date: `now - retention_days`
   - Find all executions older than cutoff
   - If `archive_enabled`:
     - ✓ Archive to S3 (with compression)
     - ✓ Verify success
   - Delete from PostgreSQL only after archival confirmed

**Pseudo-code:**
```typescript
async function cleanupOldExecutions() {
  const policies = await db.from('user_retention_policies').select('*');

  for (const policy of policies) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

    const oldExecutions = await db
      .from('execution_histories')
      .select('*')
      .eq('user_id', policy.user_id)
      .lt('created_at', cutoffDate.toISOString());

    if (policy.archive_enabled && oldExecutions.length > 0) {
      const archiveResult = await archivalService.archiveExecutionRecords(
        oldExecutions,
        policy.user_id
      );

      if (!archiveResult.success) {
        console.error(`Archival failed for ${policy.user_id}: skipping deletion`);
        continue; // Don't delete if archival failed (data safety first)
      }
    }

    // Delete only after successful archival
    await db.from('execution_histories').delete().in('id', oldExecutions.map(e => e.id));
  }
}
```

#### Archive Format

Archives are organized by user and date:

```
s3://my-org-archives/archive/{user_id}/{YYYY-MM-DD}/execution-history.json.gz
```

**Archive file structure:**
```json
{
  "version": "1.0",
  "archiveDate": "2026-03-03T10:00:00Z",
  "userId": "user-123",
  "recordCount": 1247,
  "records": [
    {
      "id": "exec-1",
      "automation_id": "auto-456",
      "status": "success",
      "error_context": null,
      "created_at": "2026-01-03T10:00:00Z"
    },
    ...
  ]
}
```

**Compression:**
- Original size: ~50MB (1247 records × ~40KB each)
- Compressed size: ~5MB (gzip 90% reduction typical)
- Storage savings: 45MB → 5MB

### Retrieving Archived Records

#### List Archives for User

```typescript
const archivalService = new S3ArchivalService({
  bucket: 'my-org-archives',
});

const archives = await archivalService.listArchives('user-123');
// Returns: [
//   'archive/user-123/2026-01-03/execution-history.json.gz',
//   'archive/user-123/2026-02-03/execution-history.json.gz',
//   ...
// ]
```

#### Retrieve Specific Archive

```typescript
const archive = await archivalService.retrieveArchive(
  'user-123',
  '2026-01-03'
);

console.log(archive);
// {
//   version: '1.0',
//   archiveDate: '2026-03-03T10:00:00Z',
//   recordCount: 1247,
//   records: [...]
// }
```

### Cost Analysis

#### Calculation Example

**Scenario:** User with 1000 executions/day over 7 years

```
Records/day: 1000
Records/month: 30,000
Records/year: 365,000
Total 7 years: 2,555,000 executions

Archive size calculation:
- Avg record: 500 bytes (with error_context)
- 2,555,000 records × 500 bytes = 1.28 GB uncompressed
- After gzip (85% compression): 192 MB
```

**Cost Comparison (7-year retention):**

| Storage | Monthly Cost | 7-Year Cost |
|---------|--------------|------------|
| **PostgreSQL** | 1.28 GB × $1.50 = $1.92 | $1.92 × 84 = **$161** |
| **S3 Standard** | 0.192 GB × $0.023 = $0.004 | $0.004 × 84 = **$0.34** |
| **S3 Intelligent-Tiering** | ~$0.002 (after 90 days in Archive tier) | ~$0.17 |
| **Savings** | - | **~$161 → ~$0.17 (99.9% reduction)** |

#### What's Included in Cost

**PostgreSQL Storage:**
- Base price: ~$1-5/GB/month (varies by cloud provider)
- Includes: Redundancy (3x copies), WAL backups, PITR capability
- Overhead: Index maintenance, query processing

**S3 Storage:**
- Standard: $0.023/GB/month (warm storage)
- Intelligent-Tiering: Auto-transitions to Archive ($0.004/month) after 90 days
- Deep Archive: $0.00099/GB/month (very cold, 12-hour retrieval)
- Includes: 99.999999999% (11 nines) durability, cross-region replication

### Compliance & Retention

#### 7-Year Retention Requirement

Many regulations require 7-year retention of audit logs:
- SOC 2
- HIPAA
- PCI-DSS
- GDPR (in some contexts)

**Implementation:**
1. Executions stored in PostgreSQL for 90 days (hot)
2. Archived to S3 for remaining 6 years 9 months (cold)
3. S3 lifecycle policy auto-deletes after 7 years if needed

#### Audit Trail Integrity

- Archives are immutable (S3 object lock not required, but can enable)
- Original records preserved with timestamps
- Sanitization prevents PII leakage before archival
- Export functionality available for compliance audits

### Error Handling

#### Archival Failure Scenarios

**Scenario 1: S3 unavailable during cleanup**
```
→ Archival fails
→ Delete is skipped (data safety first)
→ Records remain in DB
→ Retry on next nightly run
```

**Scenario 2: Partial archival (some records fail)**
```
→ Log error
→ Incomplete archives should be deleted manually
→ Retry with clean state
```

**Scenario 3: Bucket quota exceeded**
```
→ Archival fails
→ Delete is skipped
→ Alert ops team to add capacity
```

### Monitoring & Alerts

Track archival health:

```typescript
// Monitor archival success rate
const archivalMetrics = {
  total_runs: 365,
  successful: 359,
  failed: 6,
  success_rate: (359 / 365) * 100, // 98.4%
  avg_archive_size: '12 MB',
  total_archived: '4.4 TB',
};

// Alert if failure rate > 5%
if (archivalMetrics.failed / archivalMetrics.total_runs > 0.05) {
  sendAlert('Archival failure rate exceeded 5%');
}
```

### Troubleshooting

**Q: Archival is slow?**
- Check S3 bucket region (should match app region for throughput)
- Enable S3 Transfer Acceleration if available
- Batch records (group into 100-record chunks) for faster uploads

**Q: S3 costs are higher than expected?**
- Check if Intelligent-Tiering is configured (auto cost optimization)
- Review data transfer costs (large downloads for retrieval)
- Consider Deep Archive for very old records (>1 year)

**Q: Can't retrieve archive from S3?**
- Verify bucket name and region
- Check IAM permissions (GetObject, ListBucket)
- If expired (>7 years), it may have been deleted per lifecycle policy

---

## Integration with Cleanup Job

The cleanup job automatically handles both database deletion and S3 archival:

```typescript
// In retention.job.ts
export function startRetentionCleanupJob(historyService: ExecutionHistoryService) {
  schedule.scheduleJob('0 2 * * *', async () => {
    try {
      await historyService.cleanupOldExecutions();
      // This now includes:
      // 1. Archive to S3 if enabled
      // 2. Delete from DB only after successful archival
    } catch (error) {
      console.error('[Retention Job] Error:', error);
    }
  });
}
```

---

## Debugging Guide

### How to Search for Specific Errors

**Find all "timeout" errors in past 7 days:**
```bash
curl "http://localhost:3000/api/automations/history/search?q=timeout&filters={\"dateRange\":{\"start\":\"2026-02-24\",\"end\":\"2026-03-03\"}}"
```

**Find all failed executions with "database" in error message:**
```bash
curl "http://localhost:3000/api/automations/history/search?q=database&filters={\"status\":\"failed\"}"
```

**Find error spikes for specific automation:**
```bash
curl "http://localhost:3000/api/automations/history/search?q=error&filters={\"automationId\":\"auto-456\",\"status\":\"failed\"}"
```

### Performance Diagnostics

**Check search performance:**
1. Note the `searchTime` in API response
2. If >200ms, check database indexes: `EXPLAIN ANALYZE SELECT...`
3. Verify GIN index size: `SELECT pg_size_pretty(pg_relation_size('idx_execution_histories_search'));`

---

## Related Documentation

- [Execution Engine Guide](../architecture/execution-engine-guide.md) - Data models and error handling
- [Story 3.5: Execution History & Audit Log](../stories/3.5.story.md) - Foundation for search/archival
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/) - Bucket configuration details
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html) - tsvector reference

---

**End of Guide**

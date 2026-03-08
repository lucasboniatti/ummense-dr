# Epic 2.0: Wave 2 — Automations & Webhooks

**Status:** Draft
**Created:** 2026-03-01
**Target Completion:** Week 4-5 (after Wave 1 deployment)
**Priority:** HIGH
**Complexity:** MEDIUM

---

## Executive Summary

Wave 2 introduces automated workflows and webhook integrations to TaskFlow, enabling users to:
- Create rules-based automations triggered by card/task events
- Send data to external services via webhooks
- Automate repetitive workflow steps
- Integrate with third-party tools (Slack, Discord, Zapier, etc)

**Value Proposition:**
- Reduce manual task management by 40%
- Enable cross-platform notifications and integrations
- Improve team collaboration through automation
- Unlock integration ecosystem

---

## Strategic Alignment

**From PRD — Wave 2 Requirements:**
- [x] Automation engine with rule builder
- [x] Webhook delivery system
- [x] Event triggers (card moved, task created, tag applied, etc)
- [x] Third-party service integration
- [x] Automation logging and debugging
- [x] Webhook management UI

**Dependencies:**
- ✅ Requires Wave 1 complete (authentication, kanban, tasks, tags)
- ✅ Requires event system in place
- ⚠️ May inform Wave 3 calendar integrations

---

## Stories (6 planned)

| ID | Title | Complexity | Points | Status |
|---|---|---|---|---|
| 2.1 | Event System & Triggers | HIGH | 13 | Draft |
| 2.2 | Rule-Based Automation Engine | HIGH | 13 | Draft |
| 2.3 | Webhook Integration & Delivery | MEDIUM | 8 | Draft |
| 2.4 | Webhook Management UI | MEDIUM | 8 | Draft |
| 2.5 | Automation Dashboard & Logs | MEDIUM | 8 | Done |
| 2.6 | Third-Party Integrations (Slack/Discord) | MEDIUM | 8 | Draft |

**Total: 58 story points**

---

## Story Breakdowns

### Story 2.1: Event System & Triggers
**Goal:** Establish event infrastructure for all card/task/flow changes

**Scope:**
- Event emitter system (EventEmitter pattern)
- Trigger types: `card.created`, `card.moved`, `card.deleted`, `task.created`, `task.completed`, `tag.added`, `column.created`
- Event payload standardization
- Event queue/persistence for reliability
- Real-time event WebSocket broadcast
- **[CRITICAL]** Event deduplication & versioning

**Acceptance Criteria:**
- All card/task/column operations emit standardized events
- Events persisted in database for audit trail
- WebSocket broadcasts events to connected clients in real-time
- Event system tested with >90% coverage
- Performance: Event processing <100ms p99
- **[CRITICAL - Architect]** Event deduplication: Each event has UUID, duplicate events within 1s ignored
- **[CRITICAL - Architect]** Event versioning: Schema version tracked, supports backward compatibility
- **[CRITICAL - Architect]** WebSocket cleanup: Dead connections removed after 5m inactivity or 10 missed heartbeats
- **[ARCHITECT]** Log retention: Events archived after 90 days, soft delete with `deleted_at` timestamp

**Technical Notes:**
- Use Node EventEmitter as base
- Implement event store in PostgreSQL
- Add event_logs table with user_id, event_type, entity_id, payload, created_at, **event_id (UUID), event_version**
- WebSocket server broadcasts to subscribed users
- Add deduplication logic: check for duplicate event_id within 1s window
- Implement heartbeat mechanism for WebSocket connections
- Archive event_logs older than 90 days to S3 or separate archive table

---

### Story 2.2: Rule-Based Automation Engine
**Goal:** Enable users to create "if this then that" automations

**Scope:**
- Rule builder UI component (drag-drop trigger + action)
- Rule evaluation engine (condition matching)
- Action executors (move card, create task, send webhook, add tag)
- Rule storage and management
- Rule scheduling (immediate, delayed, scheduled)
- Rule testing/dry-run capability
- **[CRITICAL]** Loop detection & prevention
- **[CRITICAL]** Rate limiting per user/rule
- **[CRITICAL]** Atomic action execution

**Acceptance Criteria:**
- Users can create rules with: Trigger + Conditions + Actions
- Rules execute reliably with >99% success rate
- Rules can chain (action triggers another automation)
- UI provides rule preview and testing
- Automation history tracked per rule
- Rules tested with >90% coverage
- **[CRITICAL - Architect]** Loop detection: Max 3 levels deep, block self-triggering automations, counter in execution context
- **[CRITICAL - Architect]** Rate limiting: <100 rules/user, <1000 executions/rule/day, user-level throttling
- **[CRITICAL - Architect]** Atomic actions: All actions in a rule execute or all rollback (transaction wrapper)
- **[ARCHITECT]** Rule audit: `rule_history` table tracks changes with `changed_by`, `changed_at`, `diff`
- **[ARCHITECT]** Performance: Condition evaluation <50ms p99, even for complex nested conditions

**Technical Notes:**
- Rules table: user_id, name, trigger, conditions (JSON), actions (JSON), is_active, created_at, **rule_version**
- Condition evaluator: compare task priority, dates, assignees, tags
- Action executor: execute webhooks, create tasks, move cards, add tags
- Rule engine: async processing with Bull/BullMQ queue
- **[CRITICAL]** Add execution_depth counter to prevent loops >3 levels
- **[CRITICAL]** Add rule execution rate limiting: check user_id execution count per hour
- **[CRITICAL]** Wrap all rule actions in database transaction for atomicity
- Add rule_history table: rule_id, version, changed_by, changed_at, diff (JSON)

---

### Story 2.3: Webhook Integration & Delivery
**Goal:** Send TaskFlow events to external services reliably

**Scope:**
- Webhook URL registration and validation
- Webhook payload formatting (JSON, with TaskFlow schema)
- Retry logic (exponential backoff, max 5 retries)
- Delivery authentication (API key, HMAC signing)
- Webhook history and status tracking
- Dead letter queue for failed deliveries
- **[CRITICAL]** SSRF protection
- **[HIGH]** Detailed retry strategy

**Acceptance Criteria:**
- Users can register multiple webhook endpoints
- Webhooks deliver events reliably (>99.9% uptime)
- Failed deliveries retried with exponential backoff
- HMAC signing verifies webhook authenticity
- Webhook history UI shows delivery status
- Dead letter queue prevents data loss
- **[CRITICAL - Architect]** Retry strategy: 2^attempt seconds, max 300s, 5 retries, 31min window
- **[CRITICAL - Architect]** Timeout: 10s per HTTP request, configurable per webhook
- **[CRITICAL - Architect]** SSRF protection: Validate URLs against internal IP ranges, prevent private network access
- **[ARCHITECT]** Payload limit: Max 1MB, gzip compression option
- **[ARCHITECT]** Authentication: API key + HMAC for webhooks, OAuth for Slack/Discord
- **[ARCHITECT]** Delivery: At-least-once (not guaranteed order); clients must handle duplicates
- **[ARCHITECT]** DLQ: Accessible via UI, manual retry capability, exportable for debugging

**Technical Notes:**
- Webhooks table: user_id, url, events (JSON array), api_key, is_active, created_at
- Webhook_deliveries table: webhook_id, event_id, status (pending, success, failed), attempts, created_at, delivered_at
- Use Bull/BullMQ for reliable job queue
- HMAC-SHA256 signing: sha256(JSON.stringify(payload) + secret_key)
- **[CRITICAL]** URL validation: Block private IPs (127.0.0.1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), require HTTPS
- **[CRITICAL]** Retry backoff: attempt 1=2s, 2=4s, 3=8s, 4=16s, 5=32s (capped at 300s)
- Request timeout: 10s, configurable in webhook settings
- DLQ table: webhook_id, event_id, payload, reason, created_at, retryable (bool)

---

### Story 2.4: Webhook Management UI
**Goal:** Provide UI for users to manage webhooks and test deliveries

**Scope:**
- Webhook list page with add/edit/delete
- Create/edit webhook modal (URL input, event selection, auth setup)
- Webhook test button (send sample event)
- Delivery history view (status, timestamp, response)
- Manual retry for failed deliveries
- API key generation and rotation
- **[HIGH]** API key security & masking
- **[HIGH]** URL validation

**Acceptance Criteria:**
- Users can create/edit/delete webhooks via UI
- Webhook testing shows delivery result in real-time
- Delivery history shows success/failure with error details
- Failed deliveries can be manually retried
- API keys can be rotated securely
- UI is responsive and accessible
- **[HIGH - Architect]** URL validation: HTTPS enforced (except localhost), DNS resolution check, test connectivity
- **[HIGH - Architect]** Test payload: Use actual recent event, show realistic delivery result
- **[HIGH - Architect]** API key security: Display only last 4 chars, mask rest, show only at generation time
- **[ARCHITECT]** Deletion UX: Confirmation dialog, show last delivery info, allow disable instead of delete

**Technical Notes:**
- Pages/components:
  - `pages/webhooks/index.tsx` - Webhook list
  - `components/WebhookForm.tsx` - Create/edit form with URL validation
  - `components/WebhookHistory.tsx` - Delivery history table
  - `components/WebhookTest.tsx` - Test payload builder using actual recent event
- **[HIGH]** Store API keys hashed in database, display only last 4 chars on UI
- **[HIGH]** URL validation: regex HTTPS check, DNS resolution, test connectivity before save
- Test payload: Query webhook_deliveries for most recent successful event, use as test
- Deletion: Show confirmation with last delivery timestamp, offer "disable" toggle first

---

### Story 2.5: Automation Dashboard & Logs
**Goal:** Provide visibility into automation execution and debugging

**Scope:**
- Automation dashboard: active rules count, recent executions, success rate
- Automation logs: detailed execution history with payloads
- Rule enable/disable toggles
- Rule execution statistics (runs, success, failures)
- Real-time execution monitoring
- Log export (CSV/JSON)
- **[MEDIUM]** Performance optimization for aggregation
- **[MEDIUM]** Observability & alerting (optional)

**Acceptance Criteria:**
- Dashboard shows all active automations with metrics
- Users can view execution logs with full payloads
- Success/failure breakdown visible
- Rules can be toggled on/off without deletion
- Log search by rule, date range, status
- Logs retained for 90 days
- **[ARCHITECT]** Aggregation: Pre-computed metrics table (hourly), indexed by (user_id, date), max 365 rows/user
- **[ARCHITECT]** Search: Full-text search via PostgreSQL or Elasticsearch, <500ms query time
- **[ARCHITECT]** Dashboard: Real-time updates via WebSocket, max 30s lag acceptable
- **[ARCHITECT]** Alerts: Optional — failure rate alerts (>10% in 5min), configurable thresholds

**Technical Notes:**
- Automation_logs table: rule_id, trigger_event, condition_result, actions_executed, error (if failed), created_at
- Dashboard aggregates metrics: count (active), count (total_runs), avg_duration, success_rate
- Real-time updates via WebSocket
- **[ARCHITECT]** Add automation_metrics table: user_id, rule_id, date, exec_count, success_count, error_count, avg_duration_ms (refreshed hourly)
- **[ARCHITECT]** Index: (user_id, date) for fast dashboard queries
- **[ARCHITECT]** Search: PostgreSQL full-text search OR Elasticsearch integration
- **[ARCHITECT]** Optional alerting: Webhook alert on high failure rates

**Closure Note (2026-03-08):**
- Story 2.5 was formally closed as `Done` after the backend stub follow-up was completed.
- The original Wave 2 dashboard UX was later redistributed across:
  - Story `3.2` for DLQ operations
  - Story `3.5` for execution history and audit log
  - Story `6.2` for `/dashboard/automations` route continuity via Fluxos 2.0

---

### Story 2.6: Third-Party Integrations (Slack/Discord)
**Goal:** Enable TaskFlow events to notify in Slack/Discord

**Scope:**
- Slack webhook integration (post messages to channels)
- Discord webhook integration (embed messages)
- Pre-built message templates (card moved, task completed, etc)
- User-configurable message formatting
- Slack slash commands for TaskFlow management
- OAuth setup for Slack app
- **[CRITICAL]** Token encryption & security
- **[HIGH]** OAuth PKCE flow
- **[HIGH]** Rate limiting per workspace

**Acceptance Criteria:**
- Users can connect Slack workspace and authorize TaskFlow app
- TaskFlow events trigger Slack messages in selected channels
- Discord webhooks work similarly
- Messages include relevant context (card title, task priority, assignee)
- Users can customize message templates
- Slack commands work (/taskflow list, /taskflow create, etc)
- **[CRITICAL - Architect]** Token encryption: Slack tokens encrypted with KMS, stored with `encrypted_token` field, never logged
- **[CRITICAL - Architect]** OAuth security: State parameter + PKCE, 5min expiry on authorization code
- **[HIGH - Architect]** Rate limiting: Queue by workspace, respect Slack 429 responses, backoff 1min
- **[ARCHITECT]** Slash commands: /taskflow create, /taskflow list, /taskflow help, /taskflow settings
- **[ARCHITECT]** Discord validation: Webhook URL format check, test delivery before save
- **[ARCHITECT]** Templates: Pre-built templates for common events, user customization via Handlebars

**Technical Notes:**
- Slack OAuth: request `chat:write`, `incoming-webhook` scopes
- **[CRITICAL]** Use AWS KMS or equivalent for token encryption at rest
- **[CRITICAL]** Never store plain-text tokens; store encrypted_token field with encryption_key_id
- **[CRITICAL]** OAuth: Include state parameter for CSRF protection, implement PKCE challenge
- **[CRITICAL]** Set authorization code expiry: 5 minutes
- Discord: simple webhook URL integration
- Message templates use handlebars: `{{cardTitle}} moved to {{columnName}}`
- Slash commands: register `/taskflow` command with Slack
- **[HIGH]** Implement workspace-level rate limiting: queue by workspace_id, max 60 messages/min
- **[HIGH]** Handle Slack 429 (rate limit) responses: exponential backoff, 1min initial retry
- Add slack_tokens table: user_id, workspace_id, encrypted_token, encryption_key_id, token_expiry, created_at
- Add integration_logs table: workspace_id, event_type, status, error, created_at

---

## Implementation Wave Plan

### Phase 1: Foundation (Week 4, Days 1-2)
- Story 2.1: Event System & Triggers
- Story 2.3: Webhook Integration & Delivery
- Database migrations, event tables, webhook tables

### Phase 2: Core Features (Week 4, Days 3-5)
- Story 2.2: Rule-Based Automation Engine
- Story 2.4: Webhook Management UI
- Test automation execution

### Phase 3: Polish & Integration (Week 5, Days 1-2)
- Story 2.5: Automation Dashboard & Logs
- Story 2.6: Third-Party Integrations
- End-to-end testing, performance tuning

### Phase 4: Quality & Deployment (Week 5, Days 3-4)
- CodeRabbit review, QA testing
- Production deployment
- Documentation and training

---

## Quality Gates

### Pre-Implementation
- [x] Epic validated by @po (Pax) — Quality Score 8/10
- [x] Architecture reviewed by @architect (Aria) — Score 7/10, GO com pré-requisitos
- [x] **Critical Security Prerequisites Added:**
  - [x] Story 2.1: Event deduplication, versioning, WebSocket cleanup
  - [x] Story 2.2: Loop detection, rate limiting, atomic actions, rule audit
  - [x] Story 2.3: Retry strategy, SSRF protection, OAuth, DLQ recovery
  - [x] Story 2.4: URL validation, API key security, test realism
  - [x] Story 2.5: Aggregation performance, search scalability, alerting
  - [x] Story 2.6: Token encryption, OAuth PKCE, rate limiting, slash commands
- [ ] Database schema reviewed by @data-engineer
- [x] Complexity score: 42/100 (MEDIUM)
- [x] **Architecture Prerequisites Addressed by @po (Pax)**
  - [x] Marked all CRITICAL items in story AC
  - [x] Marked all HIGH priority items in story AC
  - [x] Technical notes updated with implementation details

### Post-Implementation
- [ ] All 6 stories APPROVED by @qa
- [ ] >90% test coverage maintained
- [ ] CodeRabbit PASSED on all code
- [ ] Performance benchmarks met (Event <100ms p99, Webhook <500ms p99, Rule eval <50ms p99)
- [ ] Security audit: SSRF, CSRF, token encryption, loop prevention VERIFIED
- [ ] Documentation complete
- [ ] Deployment checklist passed

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Webhook delivery failures | HIGH | Retry logic, dead letter queue, monitoring |
| Complex rule evaluation | MEDIUM | Start with simple rules, expand gradually |
| Event flooding | MEDIUM | Rate limiting, batching, queue management |
| Third-party API limits | MEDIUM | Respect rate limits, add queuing, document limits |
| Circular automation loops | HIGH | Prevent self-triggering, add loop detection |

---

## Success Metrics

1. **Automation Adoption:** >40% of users create at least 1 automation
2. **Webhook Reliability:** >99.9% delivery success rate
3. **Performance:** Event processing <100ms, webhook delivery <500ms p99
4. **User Satisfaction:** >4.5/5 rating in feature feedback
5. **Support Tickets:** <10% of tickets related to automations/webhooks

---

## Dependencies & Blockers

- ✅ Wave 1 (MVP) must be deployed first
- ⚠️ None identified at this stage
- 🔄 May require performance optimization of event processing after load testing

---

## Next Epic Preview

**Epic 3.0: Wave 3 — Calendar, Views & Advanced Customizations**
- Calendar view (week/month)
- Advanced filtering and search
- Custom card fields
- Bulk operations
- Team templates

---

## Approval Chain

- [x] @pm (Morgan) - Create epic ✅ DONE
- [x] @po (Pax) - Validate completeness & Apply architect prerequisites ✅ DONE
- [x] @architect (Aria) - Review architecture & identify gaps ✅ DONE (7/10, GO com pré-requisitos)
- [ ] @data-engineer (Dara) - Review schema design ← **NEXT**
- [ ] @sm (River) - Create individual stories from epic
- [ ] @dev (Dex) - Begin implementation
- [ ] Team - Confirm capacity and timeline

---

**Created by:** @pm (Morgan)
**Last Updated:** 2026-03-01
**Version:** 1.1-with-prerequisites

---

## 📋 Update History

### v1.1 — Architecture Prerequisites Applied (2026-03-01)
**Updated by:** @po (Pax)

**Changes Made:**
- ✅ Added CRITICAL security requirements to all 6 stories based on @architect review
- ✅ Story 2.1: Event deduplication (UUID), versioning, WebSocket cleanup, log retention
- ✅ Story 2.2: Loop detection (max 3 levels), rate limiting (100 rules/user), atomic actions, rule audit
- ✅ Story 2.3: Retry strategy (2^n seconds, 31min window), SSRF protection, timeout (10s), OAuth
- ✅ Story 2.4: URL validation (HTTPS, DNS, connectivity), API key security (mask), test realism
- ✅ Story 2.5: Aggregation performance (pre-computed metrics), search scalability, alerting
- ✅ Story 2.6: Token encryption (KMS), OAuth PKCE, rate limiting per workspace, slash commands
- ✅ Updated Quality Gates section with all prerequisites tracked
- ✅ Updated Approval Chain: @architect review complete, awaiting @data-engineer review

**Rationale:**
@architect (Aria) identified 4 CRITICAL gaps + 4 HIGH priority items during architecture review. All critical items have been integrated into story acceptance criteria to ensure security, reliability, and performance requirements are met before development begins.

**Next Step:**
→ @data-engineer (Dara) review database schema design for all new tables (event_logs, rules, webhooks, integrations, etc)

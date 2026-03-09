# Epic 3.6: Real-Time Dashboard

**Epic ID:** EPIC-3.6
**Wave:** Wave 3 (Advanced Automation, Reliability & Scaling)
**Status:** In Progress (3/4 sub-stories closed)
**Created:** 2026-03-03
**Priority:** HIGH (P1)

---

## Epic Goal

Enable platform operators to monitor automation execution history in real-time with advanced filtering, search, and cost-aware analytics, improving visibility into execution patterns and accelerating debugging workflows.

---

## Epic Description

### Existing System Context

**Current Functionality (Story 3.5.1 ✅):**
- Execution history table with pagination and basic filtering
- Full-text search via PostgreSQL tsvector + GIN indexes (<100ms on 100K+ records)
- Stack trace sanitization (12 regex patterns)
- S3 archival with 50-200x cost reduction

**Technology Stack:**
- Frontend: React + TypeScript (ExecutionHistoryTable component)
- Backend: Node.js + Express (ExecutionHistoryService with `queryExecutionHistory()` + `searchExecutionHistory()`)
- Database: PostgreSQL (tsvector, triggers, GIN indexes)
- Search: PostgreSQL full-text search (plainto_tsquery)

**Integration Points:**
- `queryExecutionHistory()` + `searchExecutionHistory()` API (Story 3.5.1) — delta polling, filtering, relevance ranking, pagination
- `ExecutionHistoryTable` component — frontend UI for results
- Audit logs (sanitized) — metadata and change tracking
- S3 archival service — long-term data retention

### Enhancement Details

**What's Being Added:**
1. **Real-Time Data Refresh** — WebSocket-based live updates to execution history (5-10s refresh cadence)
2. **Advanced Analytics Dashboard** — Execution trends, success/failure rates, performance metrics
3. **Saved Searches & Filters** — User-configurable filter presets for common queries
4. **Cost Monitoring** — Real-time cost tracking (DB storage vs. S3 archival savings)
5. **Export & Reporting** — Filtered data export to CSV/JSON with sanitization verification

**How It Integrates:**
- Extends existing `ExecutionHistoryTable` component with WebSocket polling layer
- Leverages `queryExecutionHistory()` for delta polling and `searchExecutionHistory()` for user-driven filtering
- Adds `DashboardAnalyticsService` for trend calculation and cost metrics
- Uses existing sanitization (no new security concerns)

**Success Criteria:**
- Real-time execution updates with <5s latency (WebSocket-based)
- Analytics dashboard shows accurate trends (validated against raw data)
- Saved filters reduce query time by 70% (user testing)
- Cost monitoring accuracy within ±5% of actual S3/DB costs
- Export functionality maintains data sanitization (no PII leakage)

**Revalidation Note (2026-03-08):**
- Stories `3.6.1`, `3.6.2`, and `3.6.3` are `Done`
- Story `3.6.3` was closed after wiring the real `/api/users/saved-filters` backend flow into `/automations/history`, with seeded defaults, soft-delete, and executable route tests
- Story `3.6.4` remains the only open implementation gap in Epic 3.6
- `3.6.1` was promoted after a sustained 1-hour benchmark with `100/100` successful connections, `p95=1ms`, `memoryDelta=13.08MB`, and `cpuAvg=0.43%`

---

## Stories

### Story 3.6.1: WebSocket Real-Time Updates

**Type:** Backend + Infrastructure
**Estimated Points:** 3
**Complexity:** STANDARD

**Description:**
Implement WebSocket server to push execution history updates to connected clients in real-time (5-10s cadence). Use existing `queryExecutionHistory()` API to fetch deltas, emit only changed records.

**Acceptance Criteria:**
- WebSocket server listens on dedicated port (9001)
- Clients subscribe to user's execution history channel
- Server sends execution updates every 5-10s (configurable)
- Latency: <500ms from database write to client notification
- Handle disconnects gracefully (automatic reconnect after 3s)
- Load test: 100+ concurrent WebSocket connections
- No memory leaks (tested with 1-hour sustained load)

**Technical Notes:**
- Use `ws` library (lightweight WebSocket server)
- Implement delta detection: only send changed fields
- Use Redis pub/sub for horizontal scaling (multi-server deployments)
- Client: Use native WebSocket API (no Socket.io overhead)

**Assigned to:** @dev (Dex)
**Quality Gate:** @architect (Aria)

---

### Story 3.6.2: Analytics Dashboard UI

**Type:** Frontend
**Estimated Points:** 3
**Complexity:** STANDARD

**Description:**
Create React dashboard component displaying execution trends, success/failure rates, performance metrics, and cost analysis. Integrate with WebSocket updates for live refresh.

**Acceptance Criteria:**
- Dashboard displays 5 key metrics:
  1. Execution success rate (7-day trend)
  2. Average execution duration (performance)
  3. Failed executions by automation (top 5)
  4. Cost savings from S3 archival (vs. DB storage)
  5. Storage utilization (DB + S3 combined)
- Charts update in real-time via WebSocket
- Responsive design (works on mobile/tablet)
- Performance: Initial load <1s, updates <100ms
- E2E tests: 3 scenarios (load dashboard, filter by date range, export trend data)

**Technical Notes:**
- Use Recharts for charting (simple, responsive)
- Component architecture: DashboardContainer → MetricCard (reusable)
- State management: React hooks (useState + useContext for WebSocket connection)
- Accessibility: WCAG 2.1 AA compliance (color contrast, keyboard nav)

**Assigned to:** @dev (Dex)
**Quality Gate:** @architect (Aria)

---

### Story 3.6.3: Saved Searches & Filter Presets

**Type:** Backend + Frontend
**Estimated Points:** 2
**Complexity:** SIMPLE

**Description:**
Allow users to create, save, and apply custom filter presets (e.g., "Failed executions last 24h", "Timeout errors"). Store presets in database per user.

**Acceptance Criteria:**
- Users can save current filter state as preset (name + description)
- Presets stored in new `user_saved_filters` table
- Apply preset: Single click loads filters + re-runs search
- Delete preset: Soft-delete (preserve audit trail)
- API endpoint: POST/GET/DELETE `/api/users/saved-filters`
- Max 20 presets per user
- Performance: Apply preset <500ms (reuses existing searchExecutionHistory)

**Technical Notes:**
- Schema: `user_saved_filters` (id, user_id, name, description, filter_json, created_at, deleted_at)
- RLS policy: Users can only see own presets
- Frontend: Add "Save Filter" button + preset dropdown in ExecutionHistoryTable
- Pre-populate 3 default presets: "Failed (24h)", "Timeout errors", "Recent executions"

**Assigned to:** @dev (Dex)
**Quality Gate:** @architect (Aria)

---

### Story 3.6.4: Cost Monitoring & Analytics

**Type:** Backend + Frontend
**Estimated Points:** 2
**Complexity:** SIMPLE

**Description:**
Display real-time cost metrics comparing DB storage vs. S3 archival savings. Integrate with existing S3 archival cost calculator from 3.5.1.

**Acceptance Criteria:**
- Cost dashboard displays:
  1. Current DB storage cost (estimate)
  2. S3 archival cost (actual from cost calculator)
  3. Monthly savings (S3 vs. DB)
  4. 7-year total savings projection
  5. Storage growth trend (7-day moving average)
- Accuracy: ±5% of actual AWS costs
- Update cost metrics daily (overnight job)
- API endpoint: GET `/api/analytics/cost-summary`
- Metrics persisted in `cost_snapshots` table for trending

**Technical Notes:**
- Reuse `S3ArchivalService.calculateCostSavings()` from 3.5.1
- Add nightly job (scheduled via node-schedule) to capture cost snapshot
- Cost model: RDS storage ~$1.5/GB/month, S3 ~$0.023/GB/month
- Handle edge cases: No S3 archival yet (show potential savings)
- Frontend: Cost card in analytics dashboard with ↓ savings trend

**Assigned to:** @dev (Dex)
**Quality Gate:** @architect (Aria)

---

## Dependencies & Integration

### Upstream Dependencies (Must Complete First)
- ✅ **Story 3.5.1** (Post-Deployment Execution History Improvements)
  - Provides: `queryExecutionHistory()` and `searchExecutionHistory()` APIs
  - Provides: Full-text search implementation
  - Provides: Stack trace sanitization
  - Provides: S3 archival cost calculator

### Downstream Dependencies
- **Story 3.7** (Compliance & Audit)
  - Will consume: Real-time dashboard cost metrics
  - Will use: Saved filter API for compliance reporting

### Technical Integration Points
1. **SearchExecutionHistory API** (Story 3.5.1)
   - Endpoint: `GET /api/automations/history/search?q={term}&filters={json}`
   - Used by: WebSocket server (delta detection)
   - Used by: Saved filters (apply preset)

2. **ExecutionHistoryTable Component** (Story 3.5.1)
   - Extend: Add real-time update badge
   - Extend: Add "Save Filter" button
   - Extend: Show cost metrics in header

3. **S3ArchivalService** (Story 3.5.1)
   - Call: `calculateCostSavings()` for metrics
   - Use: Cost model (S3 vs. RDS pricing)

---

## Quality Gates & Specialized Agents

### Pre-Story Quality Gates
- [ ] All stories pass architecture complexity assessment (@architect)
- [ ] WebSocket design reviewed for scalability (@architect)
- [ ] Dashboard performance targets validated (@architect)

### During Development
- [ ] CodeRabbit pre-commit validation (CRITICAL issues block)
- [ ] Performance benchmarks for WebSocket (100+ concurrent connections)
- [ ] E2E tests for WebSocket reconnect scenarios (flaky network)
- [ ] Cost metric accuracy validated (within ±5% of AWS)

### Pre-Merge Quality Gates
- [ ] All 4 stories pass individual QA gates
- [ ] Integration tests: Dashboard + WebSocket + API together
- [ ] Load test: 100 concurrent WebSocket + 50 concurrent API queries
- [ ] Cost metric comparison: Predicted savings vs. actual S3/DB bills

---

## Success Metrics

| Metric | Target | Owner |
|--------|--------|-------|
| Real-time latency | <5s DB→client | @dev |
| Analytics accuracy | ±5% vs. AWS | @dev |
| Dashboard load time | <1s initial | @dev |
| WebSocket connections | 100+ concurrent | @dev |
| Export performance | <2s for 10K rows | @dev |
| Test coverage | ≥95% | @qa |

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| WebSocket scaling (many connections) | MEDIUM | Use Redis pub/sub for horizontal scaling |
| Cost metric accuracy (API drift) | MEDIUM | Automated AWS cost validation (monthly audit) |
| Real-time data stale on reload | LOW | Client-side timestamp validation + fallback to API |
| Memory leaks in long-lived WebSocket | MEDIUM | Automated memory testing (1-hour sustained load) |

---

## Handoff & Next Steps

**After Epic Approval:**
1. ✅ Assign stories to @dev (all 4 stories)
2. ✅ Create story files for 3.6.1, 3.6.2, 3.6.3, 3.6.4
3. ✅ Schedule sprint planning with @sm (River)
4. ⏳ Execute Epic 3.6 via `@pm *execute-epic EPIC-3-WAVE-3-3.6`

---

**Created by:** @pm (Morgan)
**Status:** Ready for @po (Pax) validation
**Next:** Story creation and sprint planning with @sm

# Product API Contracts (Story 6.6)

## Auth

- All endpoints require `Authorization: Bearer <JWT>`.
- JWT must contain one of: `id`, `sub`, `user_id`, `uid`.
- Unauthorized/invalid token: `401`.

## Date/Time

- API uses ISO-8601 in UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).

## Error Format

```json
{
  "error": "Message",
  "status": 400,
  "timestamp": "2026-03-04T22:00:00.000Z"
}
```

## Status Codes

- `400` bad request
- `401` unauthorized
- `403` forbidden
- `404` not found
- `409` conflict
- `422` validation error
- `500` internal server error

## Endpoints

### Panel

- `GET /api/panel/overview`
  - Query: `limit` (optional)
  - Response: counts + upcoming events + recent cards

### Flows

- `POST /api/flows`
- `GET /api/flows/:flowId`
- `PUT /api/flows/:flowId/columns`
- `POST /api/flows/:flowId/columns`

### Cards

- `POST /api/cards`
- `GET /api/cards/:cardId`
- `PUT /api/cards/:cardId`
- `PATCH /api/cards/:cardId/move`
- `DELETE /api/cards/:cardId`
- `GET /api/cards/:cardId/timeline`
- `POST /api/cards/:cardId/timeline`

### Tasks

- `POST /api/tasks`
- `GET /api/tasks`
- `PUT /api/tasks/:taskId`
- `DELETE /api/tasks/:taskId`
- `GET /api/tasks/:taskId/history`

### Tags

- `POST /api/tags`
- `GET /api/tags`
- `PUT /api/tags/:tagId`
- `DELETE /api/tags/:tagId`
- `POST /api/tags/cards/:cardId/tags/:tagId`
- `DELETE /api/tags/cards/:cardId/tags/:tagId`

### Events

- `GET /api/events`
  - Query: `limit`, `offset`, `startDate`, `endDate`, `cardId`, `taskId`
- `POST /api/events`
- `PATCH /api/events/:eventId`
- `DELETE /api/events/:eventId`

## Pagination

- List endpoints use `limit` and `offset`.
- Defaults defined per route; limits capped server-side.

## Migration + Rollback

- Migration de schema de produto:
  - `supabase/migrations/20260305000001_create_product_workspace_tables.sql`
- Rollback manual (somente com backup e aprovação):
  - `supabase/migrations/rollback/20260305000001_down.sql`

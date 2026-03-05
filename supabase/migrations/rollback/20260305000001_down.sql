-- Manual rollback for 20260305000001_create_product_workspace_tables.sql
-- Execute only with explicit approval after backup.

BEGIN;

DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS task_history;
DROP TABLE IF EXISTS card_timeline_events;
DROP TABLE IF EXISTS task_tags;
DROP TABLE IF EXISTS card_tags;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS columns;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS flows;

COMMIT;

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(10) DEFAULT 'P3',
  status VARCHAR(20) DEFAULT 'open',
  due_date DATE,
  assigned_to INTEGER,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_card_id ON tasks(card_id);
CREATE INDEX idx_tasks_priority ON tasks(priority);

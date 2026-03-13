-- Story 4.1: Database Schema & Migrations
-- Creates TaskFlow core tables, indexes, triggers, and RLS policies

-- 1. Flows (Kanban boards)
CREATE TABLE IF NOT EXISTS public.flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flows_user_id
  ON public.flows(user_id);

-- 2. Flow columns (board columns)
CREATE TABLE IF NOT EXISTS public.flow_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flow_columns_flow_id
  ON public.flow_columns(flow_id);

CREATE INDEX IF NOT EXISTS idx_flow_columns_order
  ON public.flow_columns(flow_id, order_index);

-- 3. Cards (entities inside a board column)
CREATE TABLE IF NOT EXISTS public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES public.flow_columns(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cards_flow_id
  ON public.cards(flow_id);

CREATE INDEX IF NOT EXISTS idx_cards_column_id
  ON public.cards(column_id);

CREATE INDEX IF NOT EXISTS idx_cards_column_order
  ON public.cards(column_id, order_index);

-- 4. Tasks (items inside a card)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(2) NOT NULL DEFAULT 'P3'
    CHECK (priority IN ('P1', 'P2', 'P3')),
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'done', 'blocked')),
  due_date DATE,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_card_id
  ON public.tasks(card_id);

CREATE INDEX IF NOT EXISTS idx_tasks_status
  ON public.tasks(card_id, status);

CREATE INDEX IF NOT EXISTS idx_tasks_priority
  ON public.tasks(card_id, priority);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date
  ON public.tasks(due_date)
  WHERE due_date IS NOT NULL;

-- 5. updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS flows_updated_at ON public.flows;
CREATE TRIGGER flows_updated_at
  BEFORE UPDATE ON public.flows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS cards_updated_at ON public.cards;
CREATE TRIGGER cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 6. Row-level security
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS flows_select ON public.flows;
CREATE POLICY flows_select
  ON public.flows
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS flows_insert ON public.flows;
CREATE POLICY flows_insert
  ON public.flows
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS flows_update ON public.flows;
CREATE POLICY flows_update
  ON public.flows
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS flows_delete ON public.flows;
CREATE POLICY flows_delete
  ON public.flows
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS flow_columns_select ON public.flow_columns;
CREATE POLICY flow_columns_select
  ON public.flow_columns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.flows f
      WHERE f.id = flow_columns.flow_id
        AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS flow_columns_insert ON public.flow_columns;
CREATE POLICY flow_columns_insert
  ON public.flow_columns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.flows f
      WHERE f.id = flow_columns.flow_id
        AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS flow_columns_update ON public.flow_columns;
CREATE POLICY flow_columns_update
  ON public.flow_columns
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.flows f
      WHERE f.id = flow_columns.flow_id
        AND f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.flows f
      WHERE f.id = flow_columns.flow_id
        AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS flow_columns_delete ON public.flow_columns;
CREATE POLICY flow_columns_delete
  ON public.flow_columns
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.flows f
      WHERE f.id = flow_columns.flow_id
        AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS cards_select ON public.cards;
CREATE POLICY cards_select
  ON public.cards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.flows f
      WHERE f.id = cards.flow_id
        AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS cards_insert ON public.cards;
CREATE POLICY cards_insert
  ON public.cards
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.flow_columns fc
      JOIN public.flows f ON f.id = fc.flow_id
      WHERE fc.id = cards.column_id
        AND f.id = cards.flow_id
        AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS cards_update ON public.cards;
CREATE POLICY cards_update
  ON public.cards
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.flows f
      WHERE f.id = cards.flow_id
        AND f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.flow_columns fc
      JOIN public.flows f ON f.id = fc.flow_id
      WHERE fc.id = cards.column_id
        AND f.id = cards.flow_id
        AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS cards_delete ON public.cards;
CREATE POLICY cards_delete
  ON public.cards
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.flows f
      WHERE f.id = cards.flow_id
        AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS tasks_select ON public.tasks;
CREATE POLICY tasks_select
  ON public.tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.cards c
      JOIN public.flows f ON f.id = c.flow_id
      WHERE c.id = tasks.card_id
        AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS tasks_insert ON public.tasks;
CREATE POLICY tasks_insert
  ON public.tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.cards c
      JOIN public.flows f ON f.id = c.flow_id
      WHERE c.id = tasks.card_id
        AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS tasks_update ON public.tasks;
CREATE POLICY tasks_update
  ON public.tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.cards c
      JOIN public.flows f ON f.id = c.flow_id
      WHERE c.id = tasks.card_id
        AND f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.cards c
      JOIN public.flows f ON f.id = c.flow_id
      WHERE c.id = tasks.card_id
        AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS tasks_delete ON public.tasks;
CREATE POLICY tasks_delete
  ON public.tasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.cards c
      JOIN public.flows f ON f.id = c.flow_id
      WHERE c.id = tasks.card_id
        AND f.user_id = auth.uid()
    )
  );

-- 7. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flow_columns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;

-- 8. Documentation comments
COMMENT ON TABLE public.flows IS 'TaskFlow boards owned by a single authenticated user.';
COMMENT ON TABLE public.flow_columns IS 'Ordered columns belonging to a TaskFlow board.';
COMMENT ON TABLE public.cards IS 'Cards stored inside a flow column.';
COMMENT ON TABLE public.tasks IS 'Tasks associated with a TaskFlow card.';

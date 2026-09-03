CREATE TABLE IF NOT EXISTS games (id uuid PRIMARY KEY, state jsonb NOT NULL, version integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS one_active_game ON games(active) WHERE active;
CREATE TABLE IF NOT EXISTS used_commands (command_id uuid PRIMARY KEY, game_id uuid NOT NULL REFERENCES games(id), created_at timestamptz NOT NULL DEFAULT now());

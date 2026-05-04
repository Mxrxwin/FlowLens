-- Bootstrap schema for the analytics service.
-- Executed automatically by the postgres image on a fresh data volume
-- (files in /docker-entrypoint-initdb.d run once when the cluster is empty).

CREATE TABLE events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        TEXT NOT NULL,
    project_key TEXT NOT NULL,
    session_id  TEXT NOT NULL,
    timestamp   TIMESTAMPTZ NOT NULL,
    region      TEXT,
    device_type TEXT,
    browser     TEXT,
    os          TEXT,
    user_agent  TEXT,
    payload     JSONB,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE errors (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id          UUID REFERENCES events(id),
    message           TEXT NOT NULL,
    stack_trace       TEXT,
    endpoint          TEXT,
    preceding_actions JSONB,
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE performance_metrics (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id          UUID REFERENCES events(id),
    endpoint          TEXT,
    lcp               INTEGER,
    fid               INTEGER,
    ttfb              INTEGER,
    api_response_time INTEGER,
    is_error          BOOLEAN DEFAULT false,
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE correlations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_message TEXT NOT NULL,
    endpoint      TEXT NOT NULL,
    region        TEXT NOT NULL,
    device_type   TEXT NOT NULL,
    browser       TEXT,
    count         INTEGER NOT NULL DEFAULT 1,
    first_seen_at TIMESTAMPTZ NOT NULL,
    last_seen_at  TIMESTAMPTZ NOT NULL,
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_timestamp   ON events(timestamp DESC);
CREATE INDEX idx_events_project     ON events(project_key);
CREATE INDEX idx_events_session     ON events(session_id);
CREATE INDEX idx_errors_endpoint    ON errors(endpoint);
CREATE INDEX idx_correlations_count ON correlations(count DESC);

-- ON CONFLICT target for the correlation engine UPSERT.
-- NULLS NOT DISTINCT (PG15+) so NULL browser still collides on conflict.
CREATE UNIQUE INDEX idx_correlations_unique_group
    ON correlations (error_message, endpoint, region, device_type, browser)
    NULLS NOT DISTINCT;

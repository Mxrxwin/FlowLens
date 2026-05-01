-- +goose Up
CREATE UNIQUE INDEX IF NOT EXISTS idx_correlations_unique_group
ON correlations (error_message, endpoint, region, device_type, browser)
NULLS NOT DISTINCT;

-- +goose Down
DROP INDEX IF EXISTS idx_correlations_unique_group;

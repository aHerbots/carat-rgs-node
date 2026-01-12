-- Create the temporal database if it doesn't exist
SELECT 'CREATE DATABASE temporal_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'temporal_db')\gexec

-- Optional: Create visibility database if you want to separate it later
-- SELECT 'CREATE DATABASE temporal_visibility'
-- WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'temporal_visibility')\gexec

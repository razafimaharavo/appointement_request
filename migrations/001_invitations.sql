CREATE TABLE invitations (
 id TEXT PRIMARY KEY,
 token TEXT NOT NULL UNIQUE,
 first_name TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','completed')),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 revoked_at INTEGER,
 response_json TEXT
) STRICT;
CREATE TABLE notifications (
 id TEXT PRIMARY KEY,
 invitation_id TEXT NOT NULL REFERENCES invitations(id),
 kind TEXT NOT NULL CHECK(kind IN ('declined','completed')),
 payload_json TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','uncertain')),
 started_at INTEGER,
 lease_until INTEGER NOT NULL DEFAULT 0,
 claim TEXT,
 UNIQUE(invitation_id,kind)
) STRICT;
CREATE TABLE admin_sessions (hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, credential_version TEXT NOT NULL) STRICT;
CREATE TABLE login_attempts (occurred_at INTEGER NOT NULL) STRICT;
CREATE INDEX sessions_expiry ON admin_sessions(expires_at);
CREATE INDEX invitations_created ON invitations(created_at DESC);
PRAGMA user_version = 1;

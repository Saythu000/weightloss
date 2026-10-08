from __future__ import annotations
import sqlite3
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from utils.paths import get_data_dir

class SessionPersistence:
    """Stores session states and message histories in SQLite."""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or (get_data_dir() / "metadata.db")
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    tenant_id TEXT,
                    user_id TEXT,
                    current_agent TEXT,
                    state_json TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    role TEXT,
                    content TEXT,
                    metadata_json TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def save_session(self, session_id: str, tenant_id: str, user_id: str, current_agent: str, state: Dict[str, Any]) -> None:
        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO sessions (session_id, tenant_id, user_id, current_agent, state_json)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    current_agent=excluded.current_agent,
                    state_json=excluded.state_json,
                    updated_at=CURRENT_TIMESTAMP
            """, (session_id, tenant_id, user_id, current_agent, json.dumps(state)))
            conn.commit()

    def save_message(self, session_id: str, role: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO messages (session_id, role, content, metadata_json)
                VALUES (?, ?, ?, ?)
            """, (session_id, role, content, json.dumps(metadata or {})))
            conn.commit()

    def load_messages(self, session_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            rows = conn.execute("SELECT role, content, metadata_json FROM messages WHERE session_id=? ORDER BY id ASC", (session_id,)).fetchall()
            return [{"role": r["role"], "content": r["content"], "metadata": json.loads(r["metadata_json"] or "{}")} for r in rows]

from __future__ import annotations
import sqlite3
import uuid
import logging
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel
from config.config import config

logger = logging.getLogger(__name__)

class DocumentRecord(BaseModel):
    document_id: str
    tenant_id: str
    file_name: str
    file_type: str
    file_size_bytes: int
    storage_path: str
    status: str
    created_at: str

class MetadataDatabase:
    def __init__(self, db_url: str = "", sqlite_path: str = ""):
        self.db_url = db_url or config.database_url
        self.sqlite_path = sqlite_path or str(config.sqlite_db_path)
        self._is_postgres = bool(self.db_url.startswith("postgresql://"))
        self._init_db()

    def _init_db(self) -> None:
        if self._is_postgres:
            try:
                import psycopg2
                conn = psycopg2.connect(self.db_url)
                with conn.cursor() as cur:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS documents (
                            document_id VARCHAR(64) PRIMARY KEY,
                            tenant_id VARCHAR(64) NOT NULL,
                            file_name VARCHAR(255) NOT NULL,
                            file_type VARCHAR(32) NOT NULL,
                            file_size_bytes BIGINT NOT NULL,
                            storage_path TEXT NOT NULL,
                            status VARCHAR(32) NOT NULL,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                        );
                    """)
                conn.commit()
                conn.close()
                logger.info("Connected to Neon PostgreSQL Database successfully.")
                return
            except Exception as e:
                logger.warning(f"Could not connect to Neon PostgreSQL ({e}). Falling back to local SQLite database.")
                self._is_postgres = False

        # SQLite Fallback Initialization
        conn = sqlite3.connect(self.sqlite_path)
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                document_id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size_bytes INTEGER NOT NULL,
                storage_path TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        conn.commit()
        conn.close()
        logger.info(f"Initialized local SQLite database at {self.sqlite_path}")

    def insert_document(
        self,
        tenant_id: str,
        file_name: str,
        file_type: str,
        file_size_bytes: int,
        storage_path: str,
        status: str = "INDEXED"
    ) -> DocumentRecord:
        doc_id = f"doc_{uuid.uuid4().hex[:8]}"
        created_at = datetime.utcnow().isoformat()

        record = DocumentRecord(
            document_id=doc_id,
            tenant_id=tenant_id,
            file_name=file_name,
            file_type=file_type,
            file_size_bytes=file_size_bytes,
            storage_path=storage_path,
            status=status,
            created_at=created_at
        )

        if self._is_postgres:
            try:
                import psycopg2
                conn = psycopg2.connect(self.db_url)
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO documents (document_id, tenant_id, file_name, file_type, file_size_bytes, storage_path, status, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
                    """, (doc_id, tenant_id, file_name, file_type, file_size_bytes, storage_path, status, created_at))
                conn.commit()
                conn.close()
                return record
            except Exception as e:
                logger.error(f"PostgreSQL insert failed ({e}). Falling back to SQLite.")

        conn = sqlite3.connect(self.sqlite_path)
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO documents (document_id, tenant_id, file_name, file_type, file_size_bytes, storage_path, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (doc_id, tenant_id, file_name, file_type, file_size_bytes, storage_path, status, created_at))
        conn.commit()
        conn.close()
        return record

    def list_documents(self, tenant_id: str = "default_tenant") -> List[DocumentRecord]:
        results = []
        if self._is_postgres:
            try:
                import psycopg2
                conn = psycopg2.connect(self.db_url)
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT document_id, tenant_id, file_name, file_type, file_size_bytes, storage_path, status, created_at
                        FROM documents WHERE tenant_id = %s ORDER BY created_at DESC;
                    """, (tenant_id,))
                    rows = cur.fetchall()
                    for r in rows:
                        results.append(DocumentRecord(
                            document_id=r[0], tenant_id=r[1], file_name=r[2], file_type=r[3],
                            file_size_bytes=r[4], storage_path=r[5], status=r[6], created_at=str(r[7])
                        ))
                conn.close()
                return results
            except Exception as e:
                logger.error(f"PostgreSQL query failed ({e}). Falling back to SQLite.")

        conn = sqlite3.connect(self.sqlite_path)
        cur = conn.cursor()
        cur.execute("""
            SELECT document_id, tenant_id, file_name, file_type, file_size_bytes, storage_path, status, created_at
            FROM documents WHERE tenant_id = ? ORDER BY created_at DESC;
        """, (tenant_id,))
        rows = cur.fetchall()
        for r in rows:
            results.append(DocumentRecord(
                document_id=r[0], tenant_id=r[1], file_name=r[2], file_type=r[3],
                file_size_bytes=r[4], storage_path=r[5], status=r[6], created_at=str(r[7])
            ))
        conn.close()
        return results

    def get_document(self, document_id: str) -> Optional[DocumentRecord]:
        if self._is_postgres:
            try:
                import psycopg2
                conn = psycopg2.connect(self.db_url)
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT document_id, tenant_id, file_name, file_type, file_size_bytes, storage_path, status, created_at
                        FROM documents WHERE document_id = %s;
                    """, (document_id,))
                    row = cur.fetchone()
                    conn.close()
                    if row:
                        return DocumentRecord(
                            document_id=row[0], tenant_id=row[1], file_name=row[2], file_type=row[3],
                            file_size_bytes=row[4], storage_path=row[5], status=row[6], created_at=str(row[7])
                        )
            except Exception as e:
                logger.error(f"PostgreSQL fetch failed ({e}). Falling back to SQLite.")

        conn = sqlite3.connect(self.sqlite_path)
        cur = conn.cursor()
        cur.execute("""
            SELECT document_id, tenant_id, file_name, file_type, file_size_bytes, storage_path, status, created_at
            FROM documents WHERE document_id = ?;
        """, (document_id,))
        row = cur.fetchone()
        conn.close()
        if row:
            return DocumentRecord(
                document_id=row[0], tenant_id=row[1], file_name=row[2], file_type=row[3],
                file_size_bytes=row[4], storage_path=row[5], status=row[6], created_at=str(row[7])
            )
        return None

    def delete_document(self, document_id: str, tenant_id: str = "default_tenant") -> Optional[DocumentRecord]:
        doc_record = self.get_document(document_id)
        if not doc_record:
            return None

        if self._is_postgres:
            try:
                import psycopg2
                conn = psycopg2.connect(self.db_url)
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM documents WHERE document_id = %s AND tenant_id = %s;", (document_id, tenant_id))
                conn.commit()
                conn.close()
                return doc_record
            except Exception as e:
                logger.error(f"PostgreSQL delete failed ({e}). Falling back to SQLite.")

        conn = sqlite3.connect(self.sqlite_path)
        cur = conn.cursor()
        cur.execute("DELETE FROM documents WHERE document_id = ? AND tenant_id = ?;", (document_id, tenant_id))
        conn.commit()
        conn.close()
        return doc_record


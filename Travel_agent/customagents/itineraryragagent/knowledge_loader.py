"""
Trekatour Knowledge Base & Destination RAG Loader
Fetches official trip itineraries, day-by-day plans, inclusions, and pricing from PostgreSQL.
"""

from __future__ import annotations
import os
import psycopg2
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("Trekatour.ItineraryAgent.KnowledgeLoader")


def search_destination_knowledge(destination_or_query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Searches Trekatour's KnowledgeBase table for itinerary and package details
    matching the requested destination or search query.
    """
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        logger.warning("DATABASE_URL not set, returning empty knowledge")
        return []

    clean_term = (destination_or_query or "").strip().lower()
    if not clean_term:
        return []

    # Common aliases
    aliases = {
        "pondicherry": ["pondicherry", "pondy", "puducherry", "mahabalipuram", "pichavaram"],
        "gokarna": ["gokarna", "murudeshwar", "kudle", "om beach", "5-beach"],
        "coorg": ["coorg", "madikeri", "tadiandamol", "mandalpatti"],
        "manali": ["manali", "solang", "atal tunnel", "kasol", "sissu"],
        "dandeli": ["dandeli", "kali river", "rafting", "syntheri"],
    }

    search_keywords = [clean_term]
    for key, terms in aliases.items():
        if key in clean_term or any(t in clean_term for t in terms):
            search_keywords.extend(terms)
    search_keywords = list(set(search_keywords))

    try:
        conn = psycopg2.connect(db_url, connect_timeout=5)
        cur = conn.cursor()

        # Build parameterized ILIKE query
        where_clauses = []
        params = []
        for kw in search_keywords:
            where_clauses.append('(LOWER(title) LIKE %s OR LOWER(content) LIKE %s)')
            params.extend([f"%{kw}%", f"%{kw}%"])

        query_sql = f"""
            SELECT id, title, category, content
            FROM "KnowledgeBase"
            WHERE "isActive" = true AND ({' OR '.join(where_clauses)})
            ORDER BY
                CASE
                    WHEN category = 'PRODUCT_SPEC' THEN 1
                    WHEN category = 'FAQ' THEN 2
                    ELSE 3
                END,
                title ASC
            LIMIT %s;
        """
        params.append(top_k)

        cur.execute(query_sql, params)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        results = []
        for r in rows:
            results.append({
                "id": r[0],
                "title": r[1],
                "category": r[2],
                "content": r[3],
            })

        logger.info(f"Found {len(results)} knowledge records for '{destination_or_query}'")
        return results

    except Exception as e:
        logger.error(f"Error querying KnowledgeBase: {e}")
        return []

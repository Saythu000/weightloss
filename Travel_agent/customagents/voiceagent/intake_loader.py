"""
Dynamic Intake Question Loader for Voice & Multichannel Agents
Fetches the active intake questions configured by the admin from PostgreSQL/API.
"""

import os
import psycopg2
import logging
from typing import List, Dict, Any

logger = logging.getLogger("Trekatour.VoiceAgent.IntakeLoader")

DEFAULT_QUESTIONS = [
    {
        "stepOrder": 1,
        "fieldKey": "destination",
        "questionPrompt": "Which destination are you planning to explore with Trekatour? (e.g., Gokarna, Pondicherry, Coorg, Manali, Dandeli)",
        "validationType": "ENUM",
        "options": ["Gokarna", "Pondicherry", "Coorg", "Manali", "Dandeli", "Chikmagalur"],
        "isMandatory": True,
    },
    {
        "stepOrder": 2,
        "fieldKey": "departure_city",
        "questionPrompt": "Which city will you be traveling from? (e.g., Hyderabad, Bangalore, Chennai)",
        "validationType": "TEXT",
        "options": ["Hyderabad", "Bangalore", "Chennai"],
        "isMandatory": True,
    },
    {
        "stepOrder": 3,
        "fieldKey": "travel_dates",
        "questionPrompt": "When are you planning this trip? (e.g., Upcoming weekend, specific dates)",
        "validationType": "TEXT",
        "options": ["Upcoming Weekend", "Next Weekend", "Next Month", "Flexible"],
        "isMandatory": True,
    },
    {
        "stepOrder": 4,
        "fieldKey": "group_size",
        "questionPrompt": "How many people are traveling in your group (including yourself)?",
        "validationType": "NUMBER",
        "options": ["Solo (1)", "Couple (2)", "3-4 Friends", "5+ Group"],
        "isMandatory": True,
    },
    {
        "stepOrder": 5,
        "fieldKey": "budget_per_person",
        "questionPrompt": "What is your approximate budget per person for this trip?",
        "validationType": "CURRENCY",
        "options": ["Under ₹4,000", "₹4,000 - ₹6,000", "₹6,000 - ₹10,000", "₹10,000+"],
        "isMandatory": False,
    },
    {
        "stepOrder": 6,
        "fieldKey": "trip_style",
        "questionPrompt": "What kind of experience are you looking for?",
        "validationType": "ENUM",
        "options": ["Beach Camping & Watersports", "Trekking & Adventure", "Sightseeing & Leisure", "Party & Nightlife"],
        "isMandatory": False,
    },
    {
        "stepOrder": 7,
        "fieldKey": "customer_name",
        "questionPrompt": "May I know your name please?",
        "validationType": "TEXT",
        "options": None,
        "isMandatory": True,
    },
]


def load_dynamic_intake_questions() -> List[Dict[str, Any]]:
    """
    Loads active intake questions from PostgreSQL with fallback to defaults.
    """
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        return DEFAULT_QUESTIONS

    try:
        conn = psycopg2.connect(db_url, connect_timeout=5)
        cur = conn.cursor()
        cur.execute(
            'SELECT "stepOrder", "fieldKey", "questionPrompt", "validationType", "options", "isMandatory" '
            'FROM "DynamicIntakeQuestion" WHERE "isActive" = true ORDER BY "stepOrder" ASC;'
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        if rows:
            questions = []
            for r in rows:
                questions.append({
                    "stepOrder": r[0],
                    "fieldKey": r[1],
                    "questionPrompt": r[2],
                    "validationType": r[3],
                    "options": r[4],
                    "isMandatory": r[5],
                })
            return questions
    except Exception as e:
        logger.warning(f"Could not load dynamic questions from DB, using fallback: {e}")

    return DEFAULT_QUESTIONS

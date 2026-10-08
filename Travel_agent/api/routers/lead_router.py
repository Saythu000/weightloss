"""
FastAPI Excel Lead CRM Router
Manages lead ingestion, status logging, and human escalation workflows.
"""

from fastapi import APIRouter, Body, Query, HTTPException
from typing import Dict, Any, Optional
import logging

from .utils.lead_logger import LeadLogger if False else None
from pathlib import Path
import openpyxl

logger = logging.getLogger("Trekatour.API.LeadRouter")
router = APIRouter(prefix="/leads", tags=["Lead Management & CRM"])

LEADS_FILE = Path("/home/mi/Desktop/carsales/sales_bot/leads.xlsx")


@router.get("/")
async def list_all_leads():
    """
    Returns list of all leads recorded in Excel CRM.
    """
    if not LEADS_FILE.exists():
        return {"status": "SUCCESS", "count": 0, "leads": []}

    wb = openpyxl.load_workbook(LEADS_FILE)
    ws = wb.active

    leads = []
    for row in range(2, ws.max_row + 1):
        lead_id = ws.cell(row=row, column=1).value
        if not lead_id:
            continue
        leads.append(
            {
                "lead_id": lead_id,
                "name": ws.cell(row=row, column=2).value,
                "phone": ws.cell(row=row, column=3).value,
                "email": ws.cell(row=row, column=4).value,
                "destination": ws.cell(row=row, column=5).value,
                "travelers_count": ws.cell(row=row, column=6).value,
                "status": ws.cell(row=row, column=8).value,
                "quoted_price": ws.cell(row=row, column=9).value,
                "notes": ws.cell(row=row, column=13).value,
            }
        )

    return {"status": "SUCCESS", "count": len(leads), "leads": leads}


@router.post("/create")
async def create_new_lead(
    name: str = Body(...),
    phone: str = Body(...),
    destination: str = Body("Gokarna"),
    travelers_count: int = Body(1),
    quoted_price: float = Body(0.0),
):
    """
    Logs a new lead entry into Excel workbook.
    """
    from .utils.lead_logger import LeadLogger
    logger_instance = LeadLogger(LEADS_FILE)
    res = logger_instance.log_new_lead(
        name=name,
        phone=phone,
        destination=destination,
        travelers_count=travelers_count,
        quoted_price=quoted_price,
    )
    return res

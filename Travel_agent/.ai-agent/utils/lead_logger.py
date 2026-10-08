"""
Trekatour Excel Lead Logging & CRM Synchronization Utility
Logs new sales leads, updates lead status, records call notes, and updates booking progress in Excel.
"""

from typing import Dict, Any, List, Optional
from pathlib import Path
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

DEFAULT_LEADS_FILE = Path("/home/mi/Desktop/carsales/sales_bot/leads.xlsx")

HEADERS = [
    "Lead ID",
    "Customer Name",
    "Phone Number",
    "Email",
    "Destination",
    "Travelers Count",
    "Travel Date",
    "Status",
    "Quoted Price (INR)",
    "Deposit Paid (INR)",
    "Payment Link",
    "Last Interaction",
    "Notes & Preferences",
]


class LeadLogger:
    """
    Excel-backed Lead Management System for Trekatour Sales Pipeline.
    Manages reading, writing, and updating customer leads in openpyxl Excel workbooks.
    """

    def __init__(self, file_path: Path = DEFAULT_LEADS_FILE):
        self.file_path = file_path
        self._ensure_workbook_exists()

    def _ensure_workbook_exists(self) -> None:
        """Create lead workbook with styled headers if not existing."""
        if self.file_path.exists():
            return

        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Trekatour Leads"

        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
        center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

        ws.append(HEADERS)
        for col in range(1, len(HEADERS) + 1):
            cell = ws.cell(row=1, column=col)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = center_align

        # Auto-adjust column widths
        for col in ws.columns:
            ws.column_dimensions[col[0].column_letter].width = 18

        wb.save(self.file_path)

    def log_new_lead(
        self,
        name: str,
        phone: str,
        destination: str,
        travelers_count: int = 1,
        email: Optional[str] = None,
        travel_date: Optional[str] = None,
        quoted_price: float = 0.0,
        notes: str = "",
    ) -> Dict[str, Any]:
        """Appends a new lead entry into the Excel spreadsheet."""
        wb = openpyxl.load_workbook(self.file_path)
        ws = wb.active

        lead_id = f"TRK-{ws.max_row:04d}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        row_data = [
            lead_id,
            name.title(),
            phone,
            email or "",
            destination.title(),
            travelers_count,
            travel_date or "",
            "NEW",
            quoted_price,
            0.0,
            "",
            now_str,
            notes,
        ]

        ws.append(row_data)
        wb.save(self.file_path)

        return {
            "lead_id": lead_id,
            "status": "SUCCESS",
            "message": f"Lead {lead_id} for {name} logged successfully.",
            "file": str(self.file_path),
        }

    def update_lead_status(
        self,
        phone: str,
        status: str,
        notes: Optional[str] = None,
        quoted_price: Optional[float] = None,
        deposit_paid: Optional[float] = None,
        payment_link: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Updates status, notes, or payment details for a lead by phone number."""
        if not self.file_path.exists():
            return {"status": "ERROR", "message": "Leads spreadsheet does not exist."}

        wb = openpyxl.load_workbook(self.file_path)
        ws = wb.active

        phone_clean = phone.replace("+", "").replace("-", "").replace(" ", "")[-10:]
        found_row = None

        for row in range(2, ws.max_row + 1):
            cell_val = str(ws.cell(row=row, column=3).value or "")
            clean_cell = cell_val.replace("+", "").replace("-", "").replace(" ", "")[-10:]
            if clean_cell == phone_clean:
                found_row = row
                break

        if not found_row:
            return {"status": "NOT_FOUND", "message": f"No lead found with phone {phone}"}

        # Update fields
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ws.cell(row=found_row, column=8, value=status.upper())  # Status
        ws.cell(row=found_row, column=12, value=now_str)  # Last Interaction

        if quoted_price is not None:
            ws.cell(row=found_row, column=9, value=quoted_price)
        if deposit_paid is not None:
            ws.cell(row=found_row, column=10, value=deposit_paid)
        if payment_link is not None:
            ws.cell(row=found_row, column=11, value=payment_link)
        if notes:
            existing_notes = str(ws.cell(row=found_row, column=13).value or "")
            updated_notes = f"{existing_notes} | [{now_str}] {notes}".strip(" | ")
            ws.cell(row=found_row, column=13, value=updated_notes)

        wb.save(self.file_path)
        return {
            "status": "SUCCESS",
            "row": found_row,
            "updated_lead": str(ws.cell(row=found_row, column=1).value),
            "new_status": status.upper(),
        }

    def get_lead_by_phone(self, phone: str) -> Optional[Dict[str, Any]]:
        """Retrieves lead record dict by phone number."""
        if not self.file_path.exists():
            return None

        wb = openpyxl.load_workbook(self.file_path)
        ws = wb.active

        phone_clean = phone.replace("+", "").replace("-", "").replace(" ", "")[-10:]
        for row in range(2, ws.max_row + 1):
            cell_val = str(ws.cell(row=row, column=3).value or "")
            clean_cell = cell_val.replace("+", "").replace("-", "").replace(" ", "")[-10:]
            if clean_cell == phone_clean:
                return {
                    "lead_id": ws.cell(row=row, column=1).value,
                    "customer_name": ws.cell(row=row, column=2).value,
                    "phone": ws.cell(row=row, column=3).value,
                    "email": ws.cell(row=row, column=4).value,
                    "destination": ws.cell(row=row, column=5).value,
                    "travelers_count": ws.cell(row=row, column=6).value,
                    "travel_date": ws.cell(row=row, column=7).value,
                    "status": ws.cell(row=row, column=8).value,
                    "quoted_price": ws.cell(row=row, column=9).value,
                    "deposit_paid": ws.cell(row=row, column=10).value,
                    "payment_link": ws.cell(row=row, column=11).value,
                    "last_interaction": ws.cell(row=row, column=12).value,
                    "notes": ws.cell(row=row, column=13).value,
                }
        return None

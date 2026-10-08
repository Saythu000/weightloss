from __future__ import annotations
import os
from pathlib import Path
from typing import Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_pdf_voucher(
    booking_id: str,
    customer_name: str,
    customer_phone: str,
    destination: str,
    travel_dates: str,
    group_size: int,
    total_amount: float,
    deposit_paid: float,
    output_path: Path
) -> Path:
    """Generates a professional PDF Travel Booking Voucher & Invoice using ReportLab."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(output_path), pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#0f172a"),
        alignment=0
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#2563eb")
    )
    normal_style = styles['Normal']

    story = []

    # Header
    story.append(Paragraph("TREKATOUR ADVENTURES & TRAVELS", title_style))
    story.append(Paragraph("Official Booking Voucher & Tax Invoice | www.trekatour.in", subtitle_style))
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#2563eb"), spaceAfter=15))

    # Booking Overview Table
    balance_due = total_amount - deposit_paid
    table_data = [
        [Paragraph("<b>Booking ID:</b>", normal_style), Paragraph(booking_id, normal_style), Paragraph("<b>Booking Date:</b>", normal_style), Paragraph("2026-09-04", normal_style)],
        [Paragraph("<b>Lead Guest:</b>", normal_style), Paragraph(customer_name, normal_style), Paragraph("<b>Contact Phone:</b>", normal_style), Paragraph(customer_phone, normal_style)],
        [Paragraph("<b>Destination:</b>", normal_style), Paragraph(destination, normal_style), Paragraph("<b>Travel Dates:</b>", normal_style), Paragraph(travel_dates, normal_style)],
        [Paragraph("<b>Group Size:</b>", normal_style), Paragraph(f"{group_size} Person(s)", normal_style), Paragraph("<b>Payment Status:</b>", normal_style), Paragraph("<b>CONFIRMED (DEPOSIT PAID)</b>", normal_style)],
    ]
    t = Table(table_data, colWidths=[110, 160, 110, 160])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 18))

    # Payment Breakdown Table
    story.append(Paragraph("<b>Payment Summary & Invoice Details</b>", styles['Heading2']))
    story.append(Spacer(1, 6))

    pay_data = [
        ["Description", "Amount (INR)"],
        [f"Package Tour Charges ({destination} - {group_size} Pax)", f"₹{total_amount:,.2f}"],
        ["Booking Deposit Received (Razorpay)", f"- ₹{deposit_paid:,.2f}"],
        ["Balance Due on Departure / Boarding", f"₹{balance_due:,.2f}"]
    ]
    pt = Table(pay_data, colWidths=[380, 160])
    pt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#dbeafe")),
    ]))
    story.append(pt)
    story.append(Spacer(1, 20))

    # Terms & Conditions
    story.append(Paragraph("<b>Important Instructions & Travel Terms:</b>", styles['Heading3']))
    story.append(Paragraph("1. Please carry a valid Government-issued Photo ID (Aadhaar / Driving License / Passport) during trip departure.", normal_style))
    story.append(Paragraph("2. Train seat numbers & pickup coordinator contact details will be shared via WhatsApp 12 hours prior to departure.", normal_style))
    story.append(Paragraph("3. For assistance, reach Trekatour Support at <b>support@trekatour.in</b> or call <b>+91-9876543210</b>.", normal_style))

    doc.build(story)
    return output_path

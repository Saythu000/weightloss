from __future__ import annotations
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def get_base_dir() -> Path:
    return BASE_DIR

def get_data_dir() -> Path:
    data_dir = BASE_DIR / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir

def get_uploads_dir() -> Path:
    uploads_dir = get_data_dir() / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    return uploads_dir

def get_vouchers_dir() -> Path:
    vouchers_dir = get_data_dir() / "vouchers"
    vouchers_dir.mkdir(parents=True, exist_ok=True)
    return vouchers_dir

def get_leads_file() -> Path:
    return get_data_dir() / "leads.xlsx"

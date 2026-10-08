from __future__ import annotations
import os
import sys
from pathlib import Path
from typing import Any, Dict

if sys.version_info >= (3, 11):
    import tomllib
else:
    import tomli as tomllib

from config.config import config, BASE_DIR

def load_config_toml(config_path: Path | None = None) -> Dict[str, Any]:
    """Loads and parses .ai-agent/config.toml or standard config.toml."""
    if config_path is None:
        ai_agent_toml = BASE_DIR / ".ai-agent" / "config.toml"
        default_toml = BASE_DIR / "config.toml"
        if ai_agent_toml.exists():
            config_path = ai_agent_toml
        elif default_toml.exists():
            config_path = default_toml
        else:
            return {}

    if not config_path.exists():
        return {}

    with open(config_path, "rb") as f:
        return tomllib.load(f)

def get_merged_config() -> Dict[str, Any]:
    """Combines environment variables, Pydantic Config, and TOML configuration."""
    toml_data = load_config_toml()
    merged = config.model_dump()
    merged.update(toml_data)
    return merged

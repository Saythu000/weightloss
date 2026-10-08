from __future__ import annotations
import importlib
import pkgutil
import logging
from typing import Type
from tools.base import Tool
from tools.registry import ToolRegistry

logger = logging.getLogger("ToolDiscovery")

def discover_tools(package_name: str, registry: ToolRegistry) -> None:
    """Scans package for subclasses of Tool and registers them."""
    try:
        package = importlib.import_module(package_name)
    except ImportError as e:
        logger.error(f"Could not import package '{package_name}': {e}")
        return

    for _, module_name, is_pkg in pkgutil.walk_packages(package.__path__, package.__name__ + "."):
        try:
            mod = importlib.import_module(module_name)
            for attr_name in dir(mod):
                attr = getattr(mod, attr_name)
                if isinstance(attr, type) and issubclass(attr, Tool) and attr is not Tool:
                    try:
                        instance = attr()
                        registry.register(instance)
                    except Exception as ex:
                        logger.error(f"Failed to instantiate tool '{attr_name}': {ex}")
        except Exception as err:
            logger.error(f"Error scanning module '{module_name}': {err}")

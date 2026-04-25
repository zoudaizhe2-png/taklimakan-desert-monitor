"""
Google Earth Engine shared client — initialization, auth, status checks.

Authentication modes (checked in order):
  1. GEE_SERVICE_ACCOUNT_KEY env var → path to service account JSON key file
  2. GEE_SERVICE_ACCOUNT_KEY env var → inline JSON string
  3. Application Default Credentials (run `earthengine authenticate` first)

Other env vars:
  - GEE_PROJECT — GCP project ID (required for some auth modes)
  - GEE_SERVICE_ACCOUNT_EMAIL — service account email (optional, read from key file)

This module owns the singleton ee.Initialize() handshake; downstream data-source
modules (sentinel2, srtm, era5, smap) import `ee` directly and rely on the
process-wide initialization performed here.
"""

import os
import json
import logging

logger = logging.getLogger(__name__)

_initialized = False
_init_error = None

try:
    import ee
    _ee_available = True
except ImportError:
    _ee_available = False
    ee = None
    logger.warning("earthengine-api not installed. Run: pip install earthengine-api")


def initialize():
    """
    Initialize Earth Engine. Returns True on success, False on failure.
    Safe to call multiple times — only initializes once.
    """
    global _initialized, _init_error

    if _initialized:
        return True
    if _init_error:
        return False
    if not _ee_available:
        _init_error = "earthengine-api package not installed"
        return False

    project = os.environ.get("GEE_PROJECT")
    key_path = os.environ.get("GEE_SERVICE_ACCOUNT_KEY", "")
    service_email = os.environ.get("GEE_SERVICE_ACCOUNT_EMAIL", "")

    try:
        if key_path and os.path.isfile(key_path):
            # Mode 1: JSON key file on disk
            with open(key_path) as f:
                key_data = json.load(f)
            email = service_email or key_data.get("client_email", "")
            credentials = ee.ServiceAccountCredentials(email, key_file=key_path)
            ee.Initialize(credentials=credentials, project=project or key_data.get("project_id"))
            logger.info("GEE initialized via service account key file: %s", key_path)

        elif key_path:
            # Mode 2: Inline JSON string in env var
            try:
                key_data = json.loads(key_path)
            except json.JSONDecodeError:
                _init_error = "GEE_SERVICE_ACCOUNT_KEY is not a valid file path or JSON string"
                logger.error(_init_error)
                return False
            email = service_email or key_data.get("client_email", "")
            credentials = ee.ServiceAccountCredentials(email, key_data=json.dumps(key_data))
            ee.Initialize(credentials=credentials, project=project or key_data.get("project_id"))
            logger.info("GEE initialized via inline service account JSON")

        else:
            # Mode 3: Application default credentials
            ee.Initialize(project=project)
            logger.info("GEE initialized via application default credentials")

        _initialized = True
        return True

    except Exception as e:
        _init_error = str(e)
        logger.error("GEE initialization failed: %s", _init_error)
        return False


def is_available():
    """Check if GEE is initialized and ready."""
    return _initialized


def get_init_error():
    """Return initialization error message, or None if OK."""
    return _init_error

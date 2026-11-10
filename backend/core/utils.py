import os

import mysql.connector

from django.conf import settings


def get_db_connection():
    """Raw connection for the hand-written app views.

    Reads the same DB_* environment overrides as core/settings.py so the
    backend works identically on the host (defaults) and inside Docker
    (DB_HOST=db).
    """
    return mysql.connector.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", "3306")),
        user=os.environ.get("DB_USER", "root"),
        password=os.environ.get("DB_PASSWORD", "1234"),
        database=os.environ.get("DB_NAME", "suggestion_hub"),
    )

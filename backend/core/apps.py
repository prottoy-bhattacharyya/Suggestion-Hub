import os
import sys
from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = "core"

    def ready(self):
        # check db connection
        from core import utils
        try:
            conn = utils.get_db_connection()
            conn.close()
            print("Database connection successful.")
        except Exception as e:
            print(f"Database connection error: {e}")
            sys.exit(1)
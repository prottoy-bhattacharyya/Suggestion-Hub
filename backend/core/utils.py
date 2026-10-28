import mysql.connector

def get_db_connection():
    db_config = {
        "host": "localhost",
        "port": 3306,
        "user": "root",
        "password": "1234",
        "database": "suggestion_hub",
    }

    return mysql.connector.connect(
        host=db_config.get("host", "localhost"),
        port=int(db_config.get("port", 3306)),
        user=db_config.get("user", "root"),
        password=db_config.get("password", ""),
        database=db_config.get("database", "suggestion_hub"),
    )
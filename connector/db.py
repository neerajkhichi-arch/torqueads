"""Tiny database helper. SQLite for the demo; swap `connect()` for psycopg in production."""
import sqlite3
from pathlib import Path

from config import DATABASE_URL


def connect():
    if not DATABASE_URL.startswith("sqlite:///"):
        raise NotImplementedError("Use psycopg.connect(DATABASE_URL) here for Postgres")
    conn = sqlite3.connect(DATABASE_URL.removeprefix("sqlite:///"))
    conn.row_factory = sqlite3.Row
    return conn


def init(conn):
    conn.executescript((Path(__file__).parent / "schema.sql").read_text())
    conn.commit()

"""Normalise and hash identifiers exactly the way Google and Meta expect.

Both platforms want lowercase hex SHA-256 of a normalised value:
  email -> trim, lowercase
  phone -> E.164: digits only with leading '+' and country code (India = +91)
Hashing happens inside Torque; raw email/phone never leave our systems.
"""
import hashlib
import re


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def normalise_email(email: str | None) -> str | None:
    if not email:
        return None
    e = email.strip().lower()
    return e if re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", e) else None


def normalise_phone_in(phone: str | None) -> str | None:
    """Indian mobile numbers -> +91XXXXXXXXXX. Returns None if not a valid mobile."""
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    if len(digits) != 10 or digits[0] not in "6789":
        return None
    return "+91" + digits


def hash_email(email):
    n = normalise_email(email)
    return sha256(n) if n else None


def hash_phone(phone):
    n = normalise_phone_in(phone)
    return sha256(n) if n else None


# Meta's /users API documents phone as digits incl. country code, no '+'.
def hash_phone_meta(phone):
    n = normalise_phone_in(phone)
    return sha256(n.lstrip("+")) if n else None

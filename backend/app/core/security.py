import hashlib
from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt
from app.core.config import settings

def _hash_sha256(password: str) -> str:
    # Use SHA-256 with project salt for clean, robust cross-platform hashing
    salt = settings.SECRET_KEY[:16]
    return hashlib.sha256(f"{salt}{password}".encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _hash_sha256(plain_password) == hashed_password

def get_password_hash(password: str) -> str:
    return _hash_sha256(password)

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta

import os

# Security settings
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-change-this-later")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 10080

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(str(plain_password)[:72], hashed_password)

def get_password_hash(password: str):
    # 1. Force it to be a string
    # 2. Slice it at 72 characters to prevent the bcrypt crash
    safe_password = str(password)[:72]
    return pwd_context.hash(safe_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
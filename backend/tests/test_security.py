from datetime import timedelta

import pytest
from backend.app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from jwt import ExpiredSignatureError


def test_password_hash_round_trip() -> None:
    hashed = hash_password("StrongPassword123!")
    assert hashed != "StrongPassword123!"
    assert verify_password("StrongPassword123!", hashed)
    assert not verify_password("wrong-password", hashed)


def test_jwt_round_trip() -> None:
    token = create_access_token("user-123")
    assert decode_access_token(token)["sub"] == "user-123"


def test_expired_jwt_is_rejected() -> None:
    token = create_access_token("user-123", expires_delta=timedelta(seconds=-1))
    with pytest.raises(ExpiredSignatureError):
        decode_access_token(token)

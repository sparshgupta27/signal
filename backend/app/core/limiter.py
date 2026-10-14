"""Shared rate limiter (slowapi), keyed by client IP.

Where it sits: registered on the app in main.py; applied with
`@limiter.limit(...)` on request-otp, verify-otp, refresh and uploads.
Exceeding a limit returns 429.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# In-memory, per-process store — consistent with the WS connection manager
# and the OTP store: correct for a single-instance deploy, not something
# that survives a restart or coordinates across multiple replicas.
limiter = Limiter(key_func=get_remote_address)

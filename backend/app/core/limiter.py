from slowapi import Limiter
from slowapi.util import get_remote_address

# In-memory, per-process store — consistent with the WS connection manager
# and the OTP store: correct for a single-instance deploy, not something
# that survives a restart or coordinates across multiple replicas.
limiter = Limiter(key_func=get_remote_address)

"""Who is connected right now: an in-memory map of user id -> open sockets.

Where it sits: the last hop before the wire. ws/router.py registers and
unregisters sockets; ws/broadcast.py (and a few routers) call send_to_user
to deliver an event to every tab/device a user has open. Lives in this
process only, which is why the backend must run as a single worker.
"""

from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    """user_id -> set[WebSocket], so one user can have several tabs/devices open."""

    def __init__(self) -> None:
        self.active: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self.active[user_id].add(ws)

    def disconnect(self, user_id: str, ws: WebSocket) -> bool:
        """Returns True if that was the user's last open connection."""
        self.active[user_id].discard(ws)
        now_offline = not self.active[user_id]
        if now_offline:
            del self.active[user_id]
        return now_offline

    def is_online(self, user_id: str) -> bool:
        return bool(self.active.get(user_id))

    async def send_to_user(self, user_id: str, event: dict) -> None:
        """Sends to each of the user's sockets in turn; a socket that fails
        is dropped. Offline users simply get nothing (no queue)."""
        for ws in list(self.active.get(user_id, ())):
            try:
                await ws.send_json(event)
            except Exception:
                self.disconnect(user_id, ws)

    async def broadcast_all(self, event: dict) -> None:
        """Every connected user — used only for presence."""
        for user_id in list(self.active.keys()):
            await self.send_to_user(user_id, event)


manager = ConnectionManager()

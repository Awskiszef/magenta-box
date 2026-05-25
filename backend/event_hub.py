import asyncio
import json

class EventHub:
    def __init__(self):
        self._queues: list[asyncio.Queue] = []

    async def publish(self, event_type: str, data: dict | list):
        payload = {"event": event_type, "data": json.dumps(data)}
        for q in self._queues:
            await q.put(payload)

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self._queues.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self._queues:
            self._queues.remove(q)

hub = EventHub()

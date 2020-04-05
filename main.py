from RFM69 import Radio, FREQ_915MHZ
import time
import logging
import json
import asyncio
from aiohttp import web

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] - %(message)s')

current_data = {
    "last_update": time.time(),
    "active": False,
}

async def root(request):
    return web.json_response(current_data)

network_id = 1
my_node_id = 1
to_node_id = 2

# Message format:
#   "GHT" type<u8> [data...]
# Types:
#   0x01: Proximity State Change
#         Data: active<u8>
#           active: 0x00=false, 0x01=true

class Message:
    def __init__(self, type: int, data: bytes):
        self.type = type
        self.data = data

def parse_message(data: bytes) -> Message:
    if data[0:3] != b"GHT":
        return None
    
    type = data[3]
    return Message(type, data[4:])

def process_message(msg: Message):
    global current_data
    if msg.type == 0x01: # Proximity State Change
        active = msg.data[0] != 0
        logging.info("Proximity State Change: active=%s", repr(active))
        current_data = {
            "last_update": time.time(),
            "active": active,
        }

async def listen_radio_packets():
    with Radio(FREQ_915MHZ, my_node_id, networkID=network_id, isHighPower=True, verbose=False) as radio:
        logging.info("Radio initialized, waiting for packets...")

        heartbeat_counter = 0

        while True:
            # Send a broadcast every 30 seconds to keep radio awake
            if heartbeat_counter == 30:
                radio.send(255, require_ack=False)
                heartbeat_counter = 0
            else:
                heartbeat_counter += 1

            # Process any packets received in the last second
            for packet in radio.get_packets():
                logging.debug("Received packet from #%d (RSSI=%d): %s",
                              packet.sender, packet.RSSI, repr(packet.data))
                data = bytes(packet.data)
                msg = parse_message(data)
                if msg:
                    process_message(msg)
            
            await asyncio.sleep(1)

async def main():
    app = web.Application()
    app.add_routes([web.get("/", root)])
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host="0.0.0.0", port=8111)
    await site.start()

    await listen_radio_packets()

if __name__ == "__main__":
    asyncio.run(main())

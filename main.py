from RFM69 import Radio, FREQ_915MHZ
import time
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] - %(message)s')

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
    if msg.type == 0x01: # Proximity State Change
        active = msg.data[0] != 0
        logging.info("Proximity State Change: active=%s", repr(active))

if __name__ == "__main__":
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
                logging.debug("Received packet from #%d (RSSI=%d): %s", packet.sender, packet.RSSI, repr(packet.data))
                data = bytes(packet.data)
                msg = parse_message(data)
                if msg:
                    process_message(msg)
            
            time.sleep(1)

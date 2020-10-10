import { Logger, MessageHandler, Radio } from ".";
import RFM69 = require("rfm69radio");

export class RFM69Radio implements Radio {
    private log: Logger;
    private handler: MessageHandler;

    async init(logger: Logger, handler: MessageHandler): Promise<void> {
        this.log = logger;
        this.handler = handler;

        this.log("initializing radio")

        const radio = new RFM69();
        const ok = await radio.initialize({
            networkID: 1,
            address: 1,
            freqBand: "RF69_915MHZ",
            verbose: false,
        });

        if (!ok) {
            this.log("could not initialize radio");
            return;
        }

        this.log("radio initialized");

        const temp = await radio.readTemperature();
        this.log(`radio temperature: ${temp}`);

        await radio.calibrateRadio();

        radio.registerPacketReceivedCallback(this.packetReceived.bind(this));

        this.log("listening for packets");
    }

    private packetReceived(packet: RFM69.Packet): void {
        let buf = packet.payloadBuffer;
        if (buf.toString("UTF-8", 0, 3) == 'GHT') {
            buf = buf.slice(3);
            if (buf.readUInt8() == 0x01) {
                buf = buf.slice(1);
                let active = buf.readUInt8() != 0;
                this.log(`proximity change detected: ${active}`);
                this.handler({ kind: 'ProximityChanged', active: active });
            }
        }
    }
}

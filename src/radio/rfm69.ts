import { Logger, MessageHandler, Radio } from ".";
import RFM69 = require("rfm69radio");

export class RFM69Radio implements Radio {
    private log: Logger;
    private handler: MessageHandler;
    private radio: RFM69;

    async init(logger: Logger, handler: MessageHandler): Promise<void> {
        this.log = logger;
        this.handler = handler;

        this.log("Initializing radio")
        this.radio = new RFM69();
        try {
            const ok = await this.radio.initialize({
                networkID: 1,
                address: 1,
                freqBand: "RF69_915MHZ",
                verbose: false,
            });

            if (!ok) {
                this.log("could not initialize radio");
                return;
            }

            this.log("Radio initialized");
        }
        catch (e) {
            this.log(`Error initializing radio: ${e}`);
            return;
        }

        await this.checkTemp();
        setInterval(this.checkTemp.bind(this), 30000);

        await this.radio.calibrateRadio();
        this.radio.registerPacketReceivedCallback(this.packetReceived.bind(this));
        this.log("Radio listening");
    }

    public async requestProximityCheck(): Promise<boolean> {
        this.log("Requesting proximity check");
        var buf = Buffer.alloc(4);
        buf.write("GHT", 0, "utf-8");
        buf.writeUInt8(0x02, 3);
        var p = await this.radio.send({payload: [...buf], toAddress: 2});
        if (p.hasAck) {
            this.log("Proximity check request acknowledged");
        }
        return p.hasAck;
    }

    private packetReceived(packet: RFM69.Packet): void {
        let buf = packet.payloadBuffer;
        if (buf.toString("UTF-8", 0, 3) == 'GHT') {
            buf = buf.slice(3);
            if (buf.readUInt8(0) == 0x01) {
                buf = buf.slice(1);
                let active = buf.readUInt8(0) != 0;
                this.log(`Radio packet received: ProximityChanged: active=${active}`);
                this.handler({ kind: 'ProximityChanged', active: active });
            }
        }
    }

    private async checkTemp(): Promise<void> {
        const temp = await this.radio.readTemperature();
        this.log(`Radio temperature: ${temp}`);
    }
}

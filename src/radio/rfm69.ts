import { Logger, MessageHandler, Radio } from ".";
import RFM69 = require("rfm69radio");

const TemperatureCheckInterval = 60000;

export class RFM69Radio implements Radio {
    private log: Logger;
    private handler: MessageHandler;
    private radio: RFM69;
    private checkTempInterval: NodeJS.Timeout;

    async init(logger: Logger, handler: MessageHandler): Promise<void> {
        this.log = logger;
        this.handler = handler;

        try {
            await this.initRadio();
        }
        catch (e) {
            this.log(`Error initializing radio: ${e}`);
            throw e;
        }
    }

    public async requestProximityCheck(): Promise<boolean> {
        this.log("Requesting proximity check");
        var buf = Buffer.alloc(4);
        buf.write("GHT", 0, "utf-8");
        buf.writeUInt8(0x02, 3);
        for (var i = 0; i < 5; i++) {
            var p = await this.radio.send({ payload: [...buf], toAddress: 2, attempts: 20, attemptWait: 50 });
            if (p.hasAck) {
                this.log("Proximity check request acknowledged");
            }
            return p.hasAck;
        }
        return false;
    }

    public async restart(): Promise<void> {
        this.shutdown();
        await this.initRadio();
    }

    public shutdown(): void {
        clearInterval(this.checkTempInterval);
        this.checkTempInterval = null;

        this.radio.shutdown();
        this.radio = null;
    }

    private async initRadio(): Promise<void> {
        this.log("Initializing radio")

        this.radio = new RFM69();

        const ok = await this.radio.initialize({
            networkID: 1,
            address: 1,
            freqBand: "RF69_915MHZ",
            verbose: false,
        });

        if (!ok) {
            throw new Error("unable to initialize radio");
        }

        this.log("Radio initialized");

        await this.radio.calibrateRadio();
        this.radio.registerPacketReceivedCallback(this.packetReceived.bind(this));

        await this.checkTemp();
        this.checkTempInterval = setInterval(this.checkTemp.bind(this), TemperatureCheckInterval);

        this.log("Radio listening");
    }

    private packetReceived(packet: RFM69.Packet): void {
        let buf = packet.payloadBuffer;
        if (buf.toString('utf8', 0, 3) == 'GHT') {
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

        if (temp < 0 || temp > 100) {
            this.log("Unusual temperature reading, restarting radio...");
            
            try {
                await this.restart();
            }
            catch (e) {
                this.log(`Error restarting radio: ${e}`);
                this.shutdown();
            }
        }

    }
}

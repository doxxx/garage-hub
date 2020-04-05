declare module "rfm69radio-types" {
    interface InitializeArgs {
        /** 'RF69_315MHZ' or 'RF69_433MHZ' or 'RF69_868MHZ' or 'RF69_915MHZ' depending on radio hardware */
        freqBand: string,
        /** Address for this node */
        address: number,
        /** Network ID */
        networkID: number,
        /** Is High Power radio? Must be true for RF69HCW, RF69HW */
        isRFM69HW: boolean,
        /** Transmit power between 0 and 100 */
        powerLevelPercent: number,
        /** Pin number of interrupt pin. This is a GPIO number (GPIO24 = pin 18). */
        interruptPin: number,
        /** Pin number of reset pin. This is a GPIO number (GPIO5 = pin 29). */
        resetPin: number,
        /** SPI bus number. */
        spiBus: number,
        /** SPI device number. */
        spiDevice: number,
        /** Accept all packets */
        promiscuousMode: boolean,
        /** Key for AES encryption. Must be 16 chars long or no encryption set */
        encryptionKey: number,
        /** Automatically reply with Ack */
        autoAcknowledge: boolean,
        /** Verbose logging to console */
        verbose: boolean,
    }

    interface SendArgs {
        /** Destination address */
        toAddress: number,
        /** Payload */
        payload: string | number[] | any,
        /** Number of retry attempts, default is 3 */
        attempts: number,
        /** Timeout (milliseconds) between retries, default is 200. Wait for ack is 1000ms so total cycle = 1000 + attemptWait */
        attemptWait: number,
        /** Requires ack? Automatically set to true if attempts > 1 */
        requireAck: boolean,
    }

    interface Packet {
        targetAddress: number,
        senderAddress: number,
        rssi: number,
        payload: string,
        payloadBuffer: Buffer,
        requiresAck: boolean,
        hasAck: boolean,
        timestamp: Date,
    }

    type PacketReceivedCallback = (packet: Packet) => void;
}

declare module "rfm69radio" {
    import { InitializeArgs, Packet, PacketReceivedCallback, SendArgs } from "rfm69radio-types";

    class RFM69 {
        initialize(args: Partial<InitializeArgs>): Promise<boolean>;
        setPowerLevel(powerLevelPercent: number): void;
        readTemperature(): Promise<number>;
        send(args: Partial<SendArgs>): Promise<Packet>;
        broadcast(payload: string): Promise<Packet>;
        calibrateRadio(): Promise<void>;
        registerPacketReceivedCallback(packetReceivedCallback: PacketReceivedCallback): void;
        shutdown(): void;
    }

    export = RFM69;
}

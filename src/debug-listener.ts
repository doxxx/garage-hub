import RFM69 = require("rfm69radio");

const state = {
    lastUpdate: new Date(),
    active: false,
}

function packetReceived(packet: RFM69.Packet) {
    console.log("Received packet: ", packet.payload, packet.payloadBuffer)
    // let buf = packet.payloadBuffer;
    // if (buf.toString("UTF-8", 0, 3) == 'GHT') {
    //     buf = buf.slice(3);
    //     if (buf.readUInt8(0) == 0x01) {
    //         buf = buf.slice(1);
    //         let active = buf.readUInt8(0) != 0;
    //         console.log("proximity change detected:", { active });
    //         state.lastUpdate = new Date();
    //         state.active = active;
    //     }
    // }
}

async function main() {
    console.log("initializing radio")

    const radio = new RFM69();
    const ok = await radio.initialize({
        networkID: 1,
        address: 1,
        freqBand: "RF69_915MHZ",
        verbose: false,
    });

    if (!ok) {
        console.log("could not initialize radio");
        return;
    }

    console.log("radio initialized");

    const temp = await radio.readTemperature();
    console.log("radio temperature:", temp);

    await radio.calibrateRadio();

    radio.registerPacketReceivedCallback(packetReceived);

    console.log("listening for packets");
}

main();

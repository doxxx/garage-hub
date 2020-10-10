import { Message, Radio, RFM69Radio, ProximityChanged } from "./radio";
import { wait, asyncGetCallback, asyncSetCallback } from "./utils";

let Service: any, Characteristic: any;

module.exports = function (homebridge: any) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-garagedoor", "GarageDoor", GarageDoorAccessory);
};

class GarageDoorAccessory {
    log: any;
    config: any;
    doorService: any;

    doorState: { open: boolean };

    radio: Radio;

    constructor(log: any, config: any) {
        this.log = log;
        this.config = config;

        const doorService = new Service.GarageDoorOpener(config["name"]);
        doorService.getCharacteristic(Characteristic.CurrentDoorState)
            .on("get", asyncGetCallback(this.getDoorState.bind(this)));
        doorService.getCharacteristic(Characteristic.TargetDoorState)
            .on("get", asyncGetCallback(this.getTargetDoorState.bind(this)));
        // .on("set", asyncSetCallback(this.setTargetDoorState.bind(this)));
        // doorService.getCharacteristic(Characteristic.ObstructionDetected)
        //     .on("get", asyncGetCallback(this.getObstructionDetected.bind(this)));
        this.doorService = doorService;

        this.doorState = {
            open: true,
        };

        this.radio = new RFM69Radio();
        this.radio.init(log, this.handleRadioMessage.bind(this));
    }

    async getDoorState() {
        this.log("Retrieving current door state");
        if (this.doorState.open) {
            return Characteristic.CurrentDoorState.OPEN;
        } else {
            return Characteristic.CurrentDoorState.CLOSED;
        }
    }

    async getTargetDoorState() {
        this.log("Retrieving target door state");
        if (this.doorState.open) {
            return Characteristic.TargetDoorState.OPEN;
        } else {
            return Characteristic.TargetDoorState.CLOSED;
        }
    }

    // async setTargetDoorState(state: any) {
    //     this.log(`Setting target door state to ${state}`);

    //     switch (state) {
    //         case Characteristic.TargetDoorState.OPEN:
    //             this.doorState.open = true;
    //             break;
    //         case Characteristic.TargetDoorState.CLOSED:
    //             this.doorState.open = false;
    //             break;
    //     }

    //     this.log(`Current door state set to ${this.doorState}`);

    //     await wait(1);

    //     this.updateCurrentDoorState();

    //     this.log("setTargetDoorState complete");
    // }

    // async getObstructionDetected() {
    //     return false;
    // }

    getServices() {
        return [this.doorService];
    }

    handleRadioMessage(msg: Message): void {
        switch (msg.kind) {
            case 'ProximityChanged':
                this.onProximityChanged(msg.active);
                break;
        
            default:
                this.log(`unknown radio message: ${msg}`);
                break;
        }
    }

    onProximityChanged(active: boolean): void {
        this.doorState.open = !active;
        this.log(`Updating current/target door state: ${this.doorState}`);
        this.updateCurrentDoorState();
        this.updateTargetDoorState();
    }

    updateCurrentDoorState() {
        if (this.doorState.open) {
            this.log(`Setting current door state characteristic to ${Characteristic.CurrentDoorState.OPEN}`);
            this.doorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
        } else {
            this.log(`Setting current door state characteristic to ${Characteristic.CurrentDoorState.CLOSED}`);
            this.doorService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
        }
    }

    updateTargetDoorState() {
        if (this.doorState.open) {
            this.log(`Setting target door state characteristic to ${Characteristic.TargetDoorState.OPEN}`);
            this.doorService.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.OPEN);
        } else {
            this.log(`Setting target door state characteristic to ${Characteristic.TargetDoorState.CLOSED}`);
            this.doorService.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
        }
    }
}

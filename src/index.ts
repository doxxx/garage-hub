import { API, HAP, AccessoryPlugin, AccessoryConfig, Logging, Service } from "homebridge";
import { Message, Radio, RFM69Radio, ProximityChanged } from "./radio";
import { wait, asyncGetCallback, asyncSetCallback } from "./utils";

let hap: HAP;

export = (api: API) => {
    hap = api.hap;
    api.registerAccessory("GarageDoor", GarageDoorAccessory);
}

class GarageDoorAccessory implements AccessoryPlugin {
    log: Logging;
    config: AccessoryConfig;
    doorService: Service;
    informationService: Service;

    doorState: { open: boolean };

    radio: Radio;

    constructor(log: Logging, config: AccessoryConfig, api: API) {
        this.log = log;
        this.config = config;

        this.doorState = {
            open: true,
        };

        this.initRadio();

        this.doorService = new hap.Service.GarageDoorOpener(config["name"]);
        this.doorService.getCharacteristic(hap.Characteristic.CurrentDoorState)
            .on("get", asyncGetCallback(this.getDoorState.bind(this)));
            this.doorService.getCharacteristic(hap.Characteristic.TargetDoorState)
            .on("get", asyncGetCallback(this.getTargetDoorState.bind(this)));
        // .on("set", asyncSetCallback(this.setTargetDoorState.bind(this)));
        // doorService.getCharacteristic(Characteristic.ObstructionDetected)
        //     .on("get", asyncGetCallback(this.getObstructionDetected.bind(this)));

        this.informationService = new hap.Service.AccessoryInformation();
        this.informationService
            .setCharacteristic(hap.Characteristic.Manufacturer, "Gordon Tyler")
            .setCharacteristic(hap.Characteristic.Model, "GHT-GDD-001");

        this.log("GarageDoor finished initializing");
    }

    getServices() {
        return [
            this.informationService,
            this.doorService,
        ];
    }

    async getDoorState() {
        try {
            await this.radio.requestProximityCheck();
        }
        catch (e) {
            this.log(`ERROR: proximity check request failed: ${e}`)
        }

        await wait(100);

        if (this.doorState.open) {
            return hap.Characteristic.CurrentDoorState.OPEN;
        } else {
            return hap.Characteristic.CurrentDoorState.CLOSED;
        }
}

    async getTargetDoorState() {
        if (this.doorState.open) {
            return hap.Characteristic.TargetDoorState.OPEN;
        } else {
            return hap.Characteristic.TargetDoorState.CLOSED;
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

    private async initRadio(): Promise<void> {
        try {
            this.radio = new RFM69Radio();
            await this.radio.init(this.log, this.handleRadioMessage.bind(this));
            await this.radio.requestProximityCheck();
        }
        catch (e) {
            this.log(`ERROR: ${e}`);
        }
    }

    private handleRadioMessage(msg: Message): void {
        switch (msg.kind) {
            case 'ProximityChanged':
                this.onProximityChanged(msg.active);
                break;
        
            default:
                this.log(`unknown radio message: ${msg}`);
                break;
        }
    }

    private onProximityChanged(active: boolean): void {
        this.doorState.open = !active;
        this.updateCurrentDoorState();
        this.updateTargetDoorState();
    }

    private updateCurrentDoorState() {
        const currentDoorState = this.doorState.open ? hap.Characteristic.CurrentDoorState.OPEN : hap.Characteristic.CurrentDoorState.CLOSED;
        this.log(`Setting current door state to ${currentDoorState}`);
        this.doorService.setCharacteristic(hap.Characteristic.CurrentDoorState, currentDoorState);
    }

    private updateTargetDoorState() {
        const targetDoorState = this.doorState.open ? hap.Characteristic.TargetDoorState.OPEN : hap.Characteristic.TargetDoorState.CLOSED;
        this.log(`Setting target door state to ${targetDoorState}`);
        this.doorService.setCharacteristic(hap.Characteristic.TargetDoorState, targetDoorState);
    }
}

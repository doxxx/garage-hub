export class ProximityChanged {
    kind: 'ProximityChanged';
    active: boolean;
}

export type Message = ProximityChanged;

export type MessageHandler = (msg: Message) => void;

export type Logger = (s: string) => void;

export interface Radio {
    init(logger: Logger, handler: MessageHandler): Promise<void>;
    requestProximityCheck(): Promise<boolean> ;
}

export { RFM69Radio } from "./rfm69";

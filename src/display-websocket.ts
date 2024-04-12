import {debug} from "debug";
import {WebSocket} from "ws";

const log = debug("websocket");

export type WebSocketFrame = Buffer;

export class DisplayWebSocket {
    private websocket?: WebSocket;

    constructor(private readonly url: string, private readonly reconnectInterval: number) {
    }

    start(): void {
        this.websocket = new WebSocket(this.url);
        this.websocket.addEventListener("open", () => {
            log("Connected");
        });
        this.websocket.addEventListener("error", e => {
            log(`Failed, reconnecting: ${e}`);
            setTimeout(() => this.start(), this.reconnectInterval);
        });
        this.websocket.addEventListener("close", e => {
            log(`Closed, reconnecting: ${e.code}`);
            setTimeout(() => this.start(), this.reconnectInterval);
        });
    }

    sendFrame(frame: WebSocketFrame): void {
        if (!this.websocket) {
            return;
        }
        if (this.websocket.readyState !== WebSocket.OPEN) {
            return;
        }
        this.websocket.send(frame);
    }
}
import dotenv from "dotenv";

dotenv.config();

import express from "express";
import bodyParser from "body-parser";
import {debug} from "debug";
import {DisplayData, GLRenderer} from "./gl-renderer";
import {DisplayWebSocket} from "./display-websocket";
import {Record, String} from "runtypes";
import path from "node:path";

const log = debug("main");

const PORT = parseInt(process.env.PORT ?? "8080");
const FRAMERATE = parseInt(process.env.FRAMERATE ?? "30");
const WIDTH = parseInt(process.env.WIDTH ?? "40");
const HEIGHT = parseInt(process.env.HEIGHT ?? "32");
const DISPLAY_URL = process.env.DISPLAY_URL ?? "ws://10.0.2.31:8000/field";
const DISPLAY_RECONNECT_TIMEOUT = parseInt(process.env.DISPLAY_RECONNECT_TIMEOUT ?? "5000");

const renderer = new GLRenderer(WIDTH, HEIGHT);

renderer.initGLContext();

const startTime = process.hrtime.bigint();

const socket = new DisplayWebSocket(DISPLAY_URL, DISPLAY_RECONNECT_TIMEOUT);

socket.start();

function sendFrame(frame: DisplayData): void {
    const displayFrame: Buffer[] = [];
    for (const row of frame) {
        displayFrame.push(Buffer.from(row));
    }
    socket.sendFrame(Buffer.concat(displayFrame));
}

setInterval(() => {
    const currentTime = Number((process.hrtime.bigint() - startTime) / 1000n) / 1000000;
    const frame = renderer.renderFrame(currentTime);
    sendFrame(frame);
}, 1000 / FRAMERATE);

const app = express();

app.use(bodyParser.json());

const UpdateRequestType = Record({
    source: String
});

app.post("/update", (req, res) => {
    try {
        const rawRequest = req.body;
        const request = UpdateRequestType.check(rawRequest);

        renderer.loadFragmentShader(request.source);

        res.status(200).json({});
    } catch (e) {
        res.status(500).json({
            error: `${e}`
        });
    }
});

app.use("/", express.static(path.join(__dirname, "..", "static", "dist")));

app.listen(PORT, () => {
    log("Started");
});
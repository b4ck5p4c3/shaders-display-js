import gl from "gl";

export type DisplayData = number[][];

const DEFAULT_VERTEX_SHADER = `
precision highp float;

attribute vec2 position;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

const DEFAULT_FRAGMENT_SHADER = `
precision highp float;
uniform float iTime;

void main() {
    gl_FragColor = vec4(mod(iTime, 1.0), 0.0, 1.0, 1.0);
}
`;

export class GLRenderer {
    private gl: WebGLRenderingContext;
    private activeProgram?: WebGLProgram;
    private timeUniform: WebGLUniformLocation | null = null;
    private resolutionUniform: WebGLUniformLocation | null = null;

    constructor(private readonly width: number, private readonly height: number) {
        this.gl = gl(width, height, {
            preserveDrawingBuffer: true
        });
    }

    initGLContext(): void {
        const pointsData = new Float32Array([
            -1, -1,
            1, -1,
            1, 1,

            1, 1,
            -1, 1,
            -1, -1,
        ]);

        const buffer = this.gl.createBuffer();

        if (!buffer) {
            throw new Error("Failed to create buffer");
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, pointsData.buffer, this.gl.STATIC_DRAW);

        this.gl.enableVertexAttribArray(0);
        this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);

        this.loadFragmentShader(DEFAULT_FRAGMENT_SHADER);
    }

    loadFragmentShader(source: string): void {
        const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        if (!vertexShader) {
            throw new Error("Failed to create vertex shader");
        }
        this.gl.shaderSource(vertexShader, DEFAULT_VERTEX_SHADER);
        this.gl.compileShader(vertexShader);

        if (!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS)) {
            const vertexShaderCompileLog = this.gl.getShaderInfoLog(vertexShader);
            throw new Error(`Failed to compile vertex shader: ${vertexShaderCompileLog}`);
        }

        const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        if (!fragmentShader) {
            throw new Error("Failed to create fragment shader");
        }
        this.gl.shaderSource(fragmentShader, source);
        this.gl.compileShader(fragmentShader);

        if (!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS)) {
            const fragmentShaderCompileLog = this.gl.getShaderInfoLog(fragmentShader);
            this.gl.deleteShader(fragmentShader);
            throw new Error(`Failed to compile fragment shader: ${fragmentShaderCompileLog}`);
        }

        const program = this.gl.createProgram();
        if (!program) {
            this.gl.deleteShader(fragmentShader);
            throw new Error(`Failed to create program`);
        }

        this.gl.attachShader(program, fragmentShader);
        this.gl.attachShader(program, vertexShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const linkErrLog = this.gl.getProgramInfoLog(program);
            this.gl.deleteShader(fragmentShader);
            throw new Error(`Failed to link program: ${linkErrLog}`);
        }

        this.gl.detachShader(program, vertexShader);
        this.gl.detachShader(program, fragmentShader);
        this.gl.deleteShader(vertexShader);
        this.gl.deleteShader(fragmentShader);

        const oldProgram = this.activeProgram;
        this.activeProgram = program;

        this.timeUniform = this.gl.getUniformLocation(program, "iTime");
        this.resolutionUniform = this.gl.getUniformLocation(program, "iResolution");

        if (oldProgram) {
            this.gl.deleteProgram(oldProgram);
        }
    }

    renderFrame(time: number): DisplayData {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        if (this.activeProgram) {
            this.gl.useProgram(this.activeProgram);
        }
        if (this.timeUniform) {
            this.gl.uniform1f(this.timeUniform, time);
        }
        if (this.resolutionUniform) {
            this.gl.uniform3f(this.resolutionUniform, this.width, this.height, 0);
        }
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        const buffer = new Uint8Array(this.width * this.height * 4);
        this.gl.readPixels(0, 0, this.width, this.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, buffer);

        const data: DisplayData = [];

        for (let x = 0; x < this.width; x++) {
            data.push([]);
            for (let y = 0; y < this.height; y++) {
                data[x].push(buffer[((this.width - x - 1) * this.height + y) * 4]);
            }
        }

        return data;
    }
}
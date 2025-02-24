/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EventEmitter } from "events";
import ffmpegStatic from "ffmpeg-static";
import * as ffmpeg from "fluent-ffmpeg";
import * as ort from "onnxruntime-node/lib/index";
import { Readable, Writable } from "stream";

ffmpeg.setFfmpegPath(ffmpegStatic!);

interface RVCOptions {
    pitch?: number;
    resampleRate?: number;
    bufferSize?: number;
    modelPath: string;
}

interface ProcessingStats {
    inputSampleCount: number;
    outputSampleCount: number;
    processingTime: number;
}

export interface IRVCProcessorOptions {
    inputStream: Readable;
    outputStream: Writable;
    modelPath: string;
    pitch: number;
    resampleRate: number;
    bufferSize: number;
    onData?: (data: Buffer) => void;
    onEnd?: () => void;
}

const rvcProcessor: RVCProcessor | null = null;

class RVCProcessor extends EventEmitter {
    public modelPath: string;
    public pitch: number;
    public resampleRate: number;
    public bufferSize: number;
    public session: ort.InferenceSession | null;
    public stats: ProcessingStats;

    constructor(options: RVCOptions) {
        super();
        this.modelPath = options.modelPath;
        this.pitch = options.pitch ?? 0;
        this.resampleRate = options.resampleRate ?? 48000;
        this.bufferSize = options.bufferSize ?? 8192;
        this.session = null;
        this.stats = {
            inputSampleCount: 0,
            outputSampleCount: 0,
            processingTime: 0
        };
    }

    async loadModel(): Promise<void> {
        try {
            this.session = await ort.InferenceSession.create(this.modelPath, {
                executionProviders: ["CUDAExecutionProvider", "CPUExecutionProvider"],
                graphOptimizationLevel: "all"
            });
            this.emit("modelLoaded");
        } catch (error: unknown) {
            if (error instanceof Error) {
                this.emit("error", new Error(`Failed to load model: ${error.message}`));
                throw new Error(`Failed to load model: ${error.message}`);
            } else {
                this.emit("error", new Error(`Failed to load model: ${String(error)}`));
                throw new Error(`Failed to load model: ${String(error)}`);
            }
        }
    }

    async unloadModel(): Promise<void> {
        if (this.session) {
            await this.session.endProfiling();
            this.session = null;
        }
    }

    async processAudio(audioBuffer: Float32Array): Promise<Float32Array> {
        if (!this.session) throw new Error("Model not loaded");

        const startTime = performance.now();
        try {
            const normalizedBuffer = this.normalizeAudio(audioBuffer);
            const tensor = new ort.Tensor("float32", normalizedBuffer, [1, normalizedBuffer.length]);
            const results = await this.session.run({ input: tensor });

            this.stats.inputSampleCount += audioBuffer.length;
            this.stats.outputSampleCount += (results.output.data as Float32Array).length;
            this.stats.processingTime += performance.now() - startTime;

            return results.output.data as Float32Array;
        } catch (error: unknown) {
            if (error instanceof Error) {
                this.emit("error", new Error(`Audio processing error: ${error.message}`));
                throw new Error(`Audio processing error: ${error.message}`);
            } else {
                this.emit("error", new Error(`Audio processing error: ${String(error)}`));
                throw new Error(`Audio processing error: ${String(error)}`);
            }
        }
    }

    processStream(
        inputStream: Readable,
        onData?: (data: Buffer) => void,
        onEnd?: () => void
    ): void {
        const pitchFactor = Math.pow(2, this.pitch / 12);
        let totalProcessed = 0;

        const ffmpegProcess = ffmpeg()
            .input(inputStream)
            .inputFormat("f32le")
            .audioFrequency(this.resampleRate)
            .audioFilters([
                `asetrate=${this.resampleRate}`,
                `atempo=${pitchFactor}`,
                "aresample=async=1000" // Better handling of async stream
            ])
            .format("f32le")
            .on("start", () => this.emit("processingStart"))
            .on("data", (chunk: Buffer) => {
                totalProcessed += chunk.length;
                this.emit("progress", {
                    bytesProcessed: totalProcessed,
                    chunk: chunk
                });
                if (onData) onData(chunk);
            })
            .on("end", () => {
                this.emit("processingComplete", this.stats);
                if (onEnd) onEnd();
            })
            .on("error", error => this.emit("error", error));

        // Enable stream buffering
        ffmpegProcess.pipe(null, { end: true });
    }

    private normalizeAudio(buffer: Float32Array): Float32Array {
        const maxValue = Math.max(...buffer.map(Math.abs));
        if (maxValue > 1.0) {
            return buffer.map(sample => sample / maxValue);
        }
        return buffer;
    }

    getStats(): ProcessingStats {
        return { ...this.stats };
    }
}

class RVCModelManager {
    private rvcProcessor: RVCProcessor | null = null;

    constructor(options: IRVCProcessorOptions) {
        this.rvcProcessor = new RVCProcessor(options);
    }

    async loadModel(modelPath: string) {
        if (this.rvcProcessor) {
            this.rvcProcessor.modelPath = modelPath;
            await this.rvcProcessor.loadModel();
        }
    }

    switchModel(newOptions: IRVCProcessorOptions) {
        if (this.rvcProcessor) {
            this.rvcProcessor.unloadModel();
            this.rvcProcessor = new RVCProcessor(newOptions);
            this.loadModel(newOptions.modelPath);
        }
    }

    changePitch(pitch: number) {
        if (this.rvcProcessor) {
            this.rvcProcessor.pitch = pitch;
        }
    }

    changeResampleRate(resampleRate: number) {
        if (this.rvcProcessor) {
            this.rvcProcessor.resampleRate = resampleRate;
        }
    }

    processStream(inputStream: Readable, onData?: (data: Buffer) => void, onEnd?: () => void) {
        if (this.rvcProcessor) {
            this.rvcProcessor.processStream(inputStream, onData, onEnd);
        }
    }

    getStats() {
        return this.rvcProcessor ? this.rvcProcessor.getStats() : null;
    }
}


export default RVCProcessor;

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EventEmitter } from "events";
import ffmpegStatic from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
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

interface ProcessingProgress {
    bytesProcessed: number;
    chunk: Buffer;
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
        if (!options.modelPath) {
            throw new Error("Model path is required");
        }
        this.modelPath = options.modelPath;
        this.pitch = this.validatePitch(options.pitch ?? 0);
        this.resampleRate = this.validateResampleRate(options.resampleRate ?? 48000);
        this.bufferSize = this.validateBufferSize(options.bufferSize ?? 8192);
        this.session = null;
        this.stats = {
            inputSampleCount: 0,
            outputSampleCount: 0,
            processingTime: 0
        };
    }

    private validatePitch(pitch: number): number {
        if (pitch < -24 || pitch > 24) {
            throw new Error("Pitch must be between -24 and 24 semitones");
        }
        return pitch;
    }

    private validateResampleRate(rate: number): number {
        const validRates = [8000, 16000, 22050, 44100, 48000, 96000];
        if (!validRates.includes(rate)) {
            throw new Error(`Invalid resample rate. Valid rates are: ${validRates.join(", ")}`);
        }
        return rate;
    }

    private validateBufferSize(size: number): number {
        if (size < 256 || size > 16384) {
            throw new Error("Buffer size must be between 256 and 16384");
        }
        return size;
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
        outputStream: Writable,
        // onData?: (data: Buffer) => void,
        // onEnd?: () => void
    ): void {
        const pitchFactor = Math.pow(2, this.pitch / 12);
        const totalProcessed = 0;

        const ffmpegProcess: ffmpeg.FfmpegCommand = ffmpeg()
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
            // .on("data", (chunk: Buffer) => {
            //     totalProcessed += chunk.length;
            //     this.emit("progress", {
            //         bytesProcessed: totalProcessed,
            //         chunk: chunk
            //     });
            //     if (onData) onData(chunk);
            // })
            // .on("end", () => {
            //     this.emit("processingComplete", this.stats);
            //     if (onEnd) onEnd();
            // })
            .on("error", (error: Error) => this.emit("error", error));

        // Enable stream buffering
        ffmpegProcess.pipe(outputStream, { end: true });
    }

    private normalizeAudio(buffer: Float32Array): Float32Array {
        // Remove DC offset
        const sum = buffer.reduce((acc, val) => acc + val, 0);
        const dcOffset = sum / buffer.length;
        const dcRemoved = buffer.map(sample => sample - dcOffset);

        // Normalize amplitude
        const maxValue = Math.max(...dcRemoved.map(Math.abs));
        if (maxValue > 1.0) {
            return dcRemoved.map(sample => sample / maxValue);
        }
        return dcRemoved;
    }

    getStats(): ProcessingStats {
        return { ...this.stats };
    }

    public async cleanup(): Promise<void> {
        try {
            await this.unloadModel();
            this.removeAllListeners();
            this.stats = {
                inputSampleCount: 0,
                outputSampleCount: 0,
                processingTime: 0
            };
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(`Cleanup failed: ${error.message}`);
            } else {
                throw new Error(`Cleanup failed: ${String(error)}`);
            }
        }
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

    processStream(inputStream: Readable, outputStream: Writable) {
        if (this.rvcProcessor) {
            this.rvcProcessor.processStream(inputStream, outputStream);
        }
    }

    getStats() {
        return this.rvcProcessor ? this.rvcProcessor.getStats() : null;
    }

    public async cleanup(): Promise<void> {
        if (this.rvcProcessor) {
            await this.rvcProcessor.cleanup();
            this.rvcProcessor = null;
        }
    }

    public isModelLoaded(): boolean {
        return this.rvcProcessor?.session !== null;
    }
}

export default RVCProcessor;

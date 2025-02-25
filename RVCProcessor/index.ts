/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as tf from "@tensorflow/tfjs"; // Import TensorFlow.js
import { spawn } from "child_process";
import { EventEmitter } from "events";

import { IRVCProcessorOptions } from "./interfaces";

interface RVCOptions {
    pitch?: number;
    resampleRate?: number;
    bufferSize?: number;
    modelPath: string; // Path to the .pth model
}

interface ProcessingStats {
    inputSampleCount: number;
    outputSampleCount: number;
    processingTime: number;
}

const rvcProcessor: RVCProcessor | null = null;

class RVCProcessor extends EventEmitter {
    public modelPath: string;
    public pitch: number;
    public resampleRate: number;
    public bufferSize: number;
    public model: tf.LayersModel | null; // Change to TensorFlow.js model
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
        this.model = null;
        this.stats = {
            inputSampleCount: 0,
            outputSampleCount: 0,
            processingTime: 0
        };
    }

    private validatePitch(pitch: number): number {
        if (pitch < -12 || pitch > 12) {
            throw new Error("Pitch must be between -12 and 12 semitones");
        }
        return pitch;
    }

    private validateResampleRate(rate: number): number {
        if (rate % 4000 !== 0 || rate < 0 || rate > 48000) {
            throw new Error("Invalid resample rate. Must be a multiple of 4000 (e.g. 4000, 8000, 12000, 16000, 20000, 24000, 28000, 32000, 44100, 48000)");
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
            this.model = await tf.loadLayersModel(this.modelPath); // Load the model using TensorFlow.js
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
        if (this.model) {
            this.model.dispose(); // Dispose of the TensorFlow.js model
            this.model = null;
        }
    }

    async processAudio(audioBuffer: Float32Array): Promise<Float32Array> {
        if (!this.model) throw new Error("Model not loaded");

        const startTime = performance.now();
        try {
            const normalizedBuffer = this.normalizeAudio(audioBuffer);

            const inputTensor = tf.tensor(normalizedBuffer, [1, normalizedBuffer.length]); // Create a tensor from the audio buffer
            const results = this.model.predict(inputTensor) as tf.Tensor; // Run inference

            this.stats.inputSampleCount += audioBuffer.length;
            this.stats.outputSampleCount += results?.shape[1] ?? 0; // Update output sample count
            this.stats.processingTime += performance.now() - startTime;

            return results.dataSync() as Float32Array; // Return the output as Float32Array
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
        inputStream: ReadableStream,
        outputStream: WritableStream
    ): void {
        const pitchFactor = Math.pow(2, this.pitch / 12);
        const ffmpegProcess = spawn("ffmpeg", [
            "-i", "pipe:0",
            "-f", "f32le",
            "-ar", String(this.resampleRate),
            "-af", `asetrate=${this.resampleRate},atempo=${pitchFactor},aresample=async=1000`,
            "pipe:1"
        ]);

        // Convert Web streams to Node streams
        const { Readable, Writable } = require("stream");
        const nodeReadable = Readable.fromWeb(inputStream);
        const nodeWritable = Writable.fromWeb(outputStream);

        nodeReadable.pipe(ffmpegProcess.stdin);
        ffmpegProcess.stdout.pipe(nodeWritable);

        ffmpegProcess.stdout.on("end", () => {
            outputStream.close();
            this.emit("processingComplete", this.stats);
        });

        ffmpegProcess.on("start", () => this.emit("processingStart"));
        ffmpegProcess.on("error", (error: Error) => this.emit("error", error));
        ffmpegProcess.on("close", () => {
            this.emit("processingComplete", this.stats);
        });
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

    processStream(inputStream: ReadableStream, outputStream: WritableStream) {
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
        return this.rvcProcessor?.model !== null;
    }
}

export default RVCModelManager;
export { RVCProcessor };

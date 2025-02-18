/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

interface IVoiceFilter {
    name: string;
    author: string;
    onnxFileUrl: string;
    iconURL: string;
    id: string;
    styleKey: string;
    available: boolean;
    temporarilyAvailable: boolean;

    custom?: boolean;
    splashGradient?: string;
    baseColor?: string;
    previewSoundURLs?: string[];
    downloadUrl?: string;
}

const fs = require("fs");
export async function downloadCustomVoiceFilter(_: IpcMainInvokeEvent, modulePath: string, voiceFilter: IVoiceFilter) {
    if (!fs.existsSync(modulePath + "/discord_voice_filters")) {
        fs.mkdirSync(modulePath + "/discord_voice_filters");
    }
    if (!voiceFilter.onnxFileUrl ||
        fs.existsSync(modulePath + "/discord_voice_filters/" + voiceFilter.id + ".onnx") ||
        !voiceFilter.onnxFileUrl.endsWith(".onnx")
    ) {
        return {
            success: false,
            voiceFilter: voiceFilter,
            path: null
        };
    }
    const res = await fetch(voiceFilter.onnxFileUrl);
    const blob = await res.arrayBuffer();
    fs.writeFileSync(modulePath + "/discord_voice_filters/" + voiceFilter.id + ".onnx", Buffer.from(blob));
    return {
        success: true,
        voiceFilter: voiceFilter,
        path: modulePath + "/discord_voice_filters/" + voiceFilter.id + ".onnx"
    };
}


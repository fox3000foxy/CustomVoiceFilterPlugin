/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function downloadFile(name: string, data: string): void {
    const file = new File([data], name, { type: "application/json" });
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
}

let voicePlayingAudio: HTMLAudioElement | null;

export function playPreview(url: string, cb: () => void): void {
    if (voicePlayingAudio) {
        voicePlayingAudio.pause();
        voicePlayingAudio.removeEventListener("ended", cb);
        voicePlayingAudio.removeEventListener("pause", cb);
        voicePlayingAudio.currentTime = 0;
        voicePlayingAudio.src = url;
        voicePlayingAudio.play();
    }
    else {
        voicePlayingAudio = new Audio(url);
        voicePlayingAudio.play();
    }
    voicePlayingAudio.addEventListener("ended", cb);
    voicePlayingAudio.addEventListener("pause", cb);
}

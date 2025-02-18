import { IVoiceFilter } from ".";

const fs = require("fs");
export function downloadCustomVoiceFilter(voiceFilter: IVoiceFilter) {
    if (!fs.existsSync(process.cwd() + "/module_data/discord_voice_filters")) {
        fs.mkdirSync(process.cwd() + "/module_data/discord_voice_filters");
    }
    if (!voiceFilter.onnxFileUrl ||
        fs.existsSync(process.cwd() + "/module_data/discord_voice_filters/" + voiceFilter.name + ".onnx") ||
        !voiceFilter.onnxFileUrl.endsWith(".onnx")
    ) {
        return;
    }
    fetch(voiceFilter.onnxFileUrl).then(res => res.blob()).then(blob => {
        fs.writeFileSync(process.cwd() + "/module_data/discord_voice_filters/" + voiceFilter.name + ".onnx", blob);
    });
}


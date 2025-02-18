/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Imports
import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { DataStore } from "@api/index";
import { proxyLazy } from "@utils/lazy";
import { closeModal } from "@utils/modal";
import definePlugin, { PluginNative } from "@utils/types";
import { filters, findAll, findByProps, findStore } from "@webpack";
import { zustandCreate, zustandPersist } from "@webpack/common";

import { openConfirmModal } from "./ConfirmModal";
import { openErrorModal } from "./ErrorModal";
import { downloadFile } from "./utils";
import { openVoiceFiltersModal } from "./VoiceFiltersModal";

export let voices: any = null;
export let VoiceFilterStyles: any = null; // still 'skye'
export let VoiceFilterStore: any = null;

// Variables
export const templateVoicepack = JSON.stringify({
    "name": "Reyna",
    "iconURL": "https://cdn.discordapp.com/emojis/1340353599858806785.webp?size=512",
    "splashGradient": "radial-gradient(circle, #d9a5a2 0%, rgba(0,0,0,0) 100%)",
    "baseColor": "#d9a5a2",
    "previewSoundURLs": [
        "https://cdn.discordapp.com/soundboard-sounds/1340357897451995146"
    ],
    "available": true,
    "styleKey": "",
    "temporarilyAvailable": false,
    "id": "724847846897221642-reyna",
    "author": "724847846897221642",
    "onnxFileUrl": "https://fox3000foxy.com/voices_models/reyna_simple.onnx"
} satisfies IVoiceFilter, null, 2);

const STORAGE_KEY = "vencordVoiceFilters";

function indexedDBStorageFactory<T>() {
    return {
        async getItem(name: string): Promise<T | null> {
            return (await DataStore.get(name)) ?? null;
        },
        async setItem(name: string, value: T): Promise<void> {
            await DataStore.set(name, value);
        },
        async removeItem(name: string): Promise<void> {
            await DataStore.del(name);
        },
    };
}

export interface CustomVoiceFilterStore {
    voiceFilters: IVoiceFilterMap;
    set: (voiceFilters: IVoiceFilterMap) => void;
    updateById: (id: string) => void;
    deleteById: (id: string) => void;
    deleteAll: () => void;
    exportVoiceFilters: () => void;
    exportIndividualVoice: (id: string) => void;
    importVoiceFilters: () => void;
    downloadVoicepack: (url: string) => void;
    downloadVoiceModel: (voiceFilter: IVoiceFilter) => Promise<{ success: boolean, voiceFilter: IVoiceFilter, path: string | null; }>;
    updateVoicesList: () => void;
}

export interface ZustandStore<StoreType> {
    (): StoreType;
    getState: () => StoreType;
    subscribe: (cb: (value: StoreType) => void) => void;
}

export const useVoiceFiltersStore: ZustandStore<CustomVoiceFilterStore> = proxyLazy(() => zustandCreate()(
    zustandPersist(
        (set: any, get: () => CustomVoiceFilterStore) => ({
            voiceFilters: {},
            set: (voiceFilters: IVoiceFilterMap) => set({ voiceFilters }),
            updateById: (id: string) => {
                console.warn("updating voice filter:", id);
                openConfirmModal("Are you sure you want to update this voicepack?", async key => {
                    console.warn("accepted to update voice filter:", id);
                    closeModal(key);
                    const { downloadUrl } = get().voiceFilters[id];
                    const hash = downloadUrl?.includes("?") ? "&" : "?";
                    get().downloadVoicepack(downloadUrl + hash + "v=" + Date.now());
                });
            },
            deleteById: (id: string) => {
                console.warn("deleting voice filter:", id);
                openConfirmModal("Are you sure you want to delete this voicepack?", async key => {
                    console.warn("accepted to delete voice filter:", id);
                    closeModal(key);
                    const { voiceFilters } = get();
                    delete voiceFilters[id];
                    set({ voiceFilters });
                });
            },
            deleteAll: () => {
                openConfirmModal("Are you sure you want to delete all voicepacks?", () => {
                    set({ voiceFilters: {} });
                    get().updateVoicesList();
                });
            },
            exportVoiceFilters: () => {
                const { voiceFilters } = get();
                const exportData = JSON.stringify(voiceFilters, null, 2);
                const exportFileName = findByProps("getCurrentUser").getCurrentUser().username + "_voice_filters_export.json";
                downloadFile(exportFileName, exportData);
            },
            exportIndividualVoice: (id: string) => {
                const { voiceFilters } = get();
                const exportData = JSON.stringify(voiceFilters[id], null, 2);
                const exportFileName = voiceFilters[id].name + "_voice_filter_export.json";
                downloadFile(exportFileName, exportData);
            },
            importVoiceFilters: () => {
                const fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.accept = ".json";
                fileInput.onchange = e => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async e => {
                        try {
                            const data = JSON.parse(e.target?.result as string);
                            set({ voiceFilters: data });
                        } catch (error) {
                            openErrorModal("Invalid voice filters file");
                        }
                    };
                    reader.readAsText(file);
                };
                fileInput.click();
            },
            downloadVoicepack: async (url: string) => {
                try {
                    // Parse input - either URL or JSON string
                    let data: any;
                    if (url.startsWith('{"') || url.startsWith("[{")) {
                        // Input is JSON string
                        data = JSON.parse(url);
                    } else {
                        // Input is URL - ensure HTTPS
                        const secureUrl = url.replace(/^http:/, "https:");
                        if (!secureUrl.startsWith("https://")) {
                            throw new Error("Invalid URL: Must use HTTPS protocol");
                        }
                        const response = await fetch(secureUrl);
                        if (!response.ok) {
                            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
                        }
                        data = await response.json();
                    }

                    // Handle single voice or array of voices
                    const voices = Array.isArray(data) ? data : [data];
                    const { voiceFilters } = get();

                    // Process each voice
                    for (const voice of voices) {
                        // Validate required fields
                        const missingFields = requiredFields.filter(field =>
                            voice[field] === undefined || voice[field] === null
                        );

                        if (missingFields.length > 0) {
                            throw new Error(`Invalid voice data. Missing fields: ${missingFields.join(", ")}`);
                        }

                        // Store voice with download source
                        voiceFilters[voice.id] = {
                            ...voice,
                            downloadUrl: url
                        };
                    }

                    // Save and update UI
                    set({ voiceFilters });

                } catch (error) {
                    openErrorModal(error instanceof Error ? error.message : "Failed to process voice pack");
                }
            },
            downloadVoiceModel: async (voiceFilter: IVoiceFilter) => {
                const Native = VencordNative.pluginHelpers.CustomVoiceFilters as PluginNative<typeof import("./native")>;
                return Native.downloadCustomVoiceFilter(DiscordNative.fileManager.getModulePath(), voiceFilter);
            },
            updateVoicesList: async () => {
                // Move the object declaration to a separate variable first
                const voiceFilterState = {
                    "nativeVoiceFilterModuleState": "uninitialized",
                    "models": {} as Record<string, any>,
                    "modelState": {} as Record<string, any>,
                    "voiceFilters": {} as Record<string, any>,
                    "sortedVoiceFilters": [] as string[],
                    "catalogUpdateTime": 0,
                    "limitedTimeVoices": [] as string[]
                };

                let i = 0;
                for (const [, val] of Object.entries(voices) as [string, IVoiceFilter][]) {
                    if (!Object.values(voiceFilterState.voiceFilters).find(x => x.name === val.name))
                        voiceFilterState.voiceFilters[++i] = { ...val, id: i, available: true, temporarilyAvailable: false };
                }

                const { voiceFilters } = get();
                Object.values(voiceFilters).forEach(voice => {
                    voiceFilterState.voiceFilters[++i] = { ...voice, id: i, available: true, temporarilyAvailable: false, name: "🛠️ " + voice.name };
                });

                voiceFilterState.sortedVoiceFilters = Object.keys(voiceFilterState.voiceFilters);
                console.log(voiceFilterState);

                // Update store methods using voiceFilterState
                VoiceFilterStore.getVoiceFilters = () => voiceFilterState.voiceFilters;
                VoiceFilterStore.getVoiceFilter = id => voiceFilterState.voiceFilters[id];
                VoiceFilterStore.getVoiceFilterModels = () => voiceFilterState.models;
                VoiceFilterStore.getModelState = id => voiceFilterState.modelState[id];
                VoiceFilterStore.getSortedVoiceFilters = () => voiceFilterState.sortedVoiceFilters.map(e => voiceFilterState.voiceFilters[e]);
                VoiceFilterStore.getCatalogUpdateTime = () => voiceFilterState.catalogUpdateTime;
                VoiceFilterStore.getLimitedTimeVoices = () => voiceFilterState.limitedTimeVoices;
            }
        } satisfies CustomVoiceFilterStore),
        {
            name: STORAGE_KEY,
            storage: indexedDBStorageFactory<IVoiceFilterMap>(),
            partialize: ({ voiceFilters }) => ({ voiceFilters }),
        }
    )
));


// Interfaces
export interface IVoiceFilter {
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

export type IVoiceFilterMap = Record<string, IVoiceFilter>;

// Required fields for validation
export const requiredFields = [
    "name",
    "author",
    "onnxFileUrl",
    "iconURL",
    "id",
    "styleKey",
    "available",
    "temporarilyAvailable"
] as const;


// Custom Voice Filter Icon
function CustomVoiceFilterIcon({ className }: { className?: string; }) {
    return (
        <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path d="m19.7.3 4 4a1 1 0 0 1 0 1.4l-4 4a1 1 0 0 1-1.4-1.4L20.58 6H15a1 1 0 1 1 0-2h5.59l-2.3-2.3A1 1 0 0 1 19.71.3Z" fill="currentColor" className=""></path>
            <path d="M12.62 2.05c.41.06.46.61.17.92A3 3 0 0 0 15 8h.51c.28 0 .5.22.5.5V10a4 4 0 1 1-8 0V6a4 4 0 0 1 4.62-3.95Z" fill="currentColor" className=""></path>
            <path d="M17.56 12.27a.63.63 0 0 1 .73-.35c.21.05.43.08.65.08.38 0 .72.35.6.7A8 8 0 0 1 13 17.94V20h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.06A8 8 0 0 1 4 10a1 1 0 0 1 2 0 6 6 0 0 0 11.56 2.27Z" fill="white" className=""></path>
        </svg>
    );
}

// Custom Voice Filter Chat Bar Icon
const CustomVoiceFilterChatBarIcon: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip="Open Custom Voice Filter Modal"
            onClick={openVoiceFiltersModal}
            buttonProps={{
                "aria-haspopup": "dialog"
            }}
        >
            <CustomVoiceFilterIcon className={"chat-button"} />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "CustomVoiceFilters",
    description: "Custom voice filters for your voice channels",
    authors: [
        { name: "fox3000foxy.new", id: 724847846897221642n },
        { name: "davr1", id: 457579346282938368n },
    ],
    renderChatBarButton: CustomVoiceFilterChatBarIcon,
    async start() {
        console.log("CustomVoiceFilters started");

        VoiceFilterStyles = findByProps("skye");
        VoiceFilterStore = findStore("VoiceFilterStore");
        voices = findAll(filters.byProps("skye")).find(m => m.skye?.name);

        useVoiceFiltersStore.subscribe(store => store.updateVoicesList());

        // ============ DEMO ============
        const Native = VencordNative.pluginHelpers.CustomVoiceFilters as PluginNative<typeof import("./native")>;
        console.log("Natives modules:", Native, DiscordNative);
        const modulePath = await DiscordNative.fileManager.getModulePath();
        console.log("Module path:", modulePath);
        const { success, voiceFilter, path } = await Native.downloadCustomVoiceFilter(modulePath, JSON.parse(templateVoicepack));
        console.log("Voice model debug output:", { success, voiceFilter, path });
        if (success) {
            console.log("Voice model downloaded to:", path);
        } else {
            console.error("Failed to download voice model");
        }
        // ============ DEMO ============
    },
    stop() {
        console.log("CustomVoiceFilters stopped");
    },
});

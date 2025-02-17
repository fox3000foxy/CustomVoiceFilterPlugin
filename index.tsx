/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Imports
import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { DataStore } from "@api/index";
import { CodeBlock } from "@components/CodeBlock";
import { Flex } from "@components/Flex";
import { proxyLazy } from "@utils/lazy";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { filters, findAll, findByProps, findStore } from "@webpack";
import { Button, Forms, Text, TextInput, useState, zustandCreate, zustandPersist } from "@webpack/common";
import { JSX } from "react";
let voices: any = null;
let VoiceFilterStyles: any = null; // still 'skye'
let VoiceFilterStore: any = null;

// Variables
const debug = false;
let key: string | undefined;
let voicePlayingAudio: HTMLAudioElement | null;
const templateVoicepack = JSON.stringify({
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
    "onnxFileUrl": "https://cdn.discordapp.com/attachments/1264847846897221642/1264847846897221642/reyna.onnx"
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

interface CustomVoiceFilterStore {
    voiceFilters: IVoiceFilterMap;
    set: (voiceFilters: IVoiceFilterMap) => void;
    updateById: (id: string) => void;
    deleteById: (id: string) => void;
    deleteAll: () => void;
    exportVoiceFilters: () => void;
    importVoiceFilters: () => void;
    downloadVoice: (url: string) => void;
    updateVoicesList: () => void;
}

interface ZustandStore<StoreType> {
    (): StoreType;
    getState: () => StoreType;
    subscribe: (cb: (value: StoreType) => void) => void;
}

const useVoiceFiltersStore: ZustandStore<CustomVoiceFilterStore> = proxyLazy(() => zustandCreate()(
    zustandPersist(
        (set: any, get: () => CustomVoiceFilterStore) => ({
            voiceFilters: {},
            set: (voiceFilters: IVoiceFilterMap) => set({ voiceFilters }),
            updateById: (id: string) => {
                console.warn("updating voice filter:", id, key);
                openConfirmModal("Are you sure you want to update this voicepack?", async () => {
                    console.warn("accepted to update voice filter:", id);
                    closeModal(key as string);
                    const { downloadUrl } = get().voiceFilters[id];
                    const hash = downloadUrl?.includes("?") ? "&" : "?";
                    get().downloadVoice(downloadUrl + hash + "v=" + Date.now());
                });
            },
            deleteById: (id: string) => {
                console.warn("deleting voice filter:", id);
                openConfirmModal("Are you sure you want to delete this voicepack?", async () => {
                    console.warn("accepted to delete voice filter:", id);
                    closeModal(key as string);
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
            downloadVoice: async (url: string) => {
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
                    closeModal(key as string);

                } catch (error) {
                    openErrorModal(error instanceof Error ? error.message : "Failed to process voice pack");
                }
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

type IVoiceFilterMap = Record<string, IVoiceFilter>;

// Required fields for validation
const requiredFields = [
    "name",
    "author",
    "onnxFileUrl",
    "iconURL",
    "id",
    "styleKey",
    "available",
    "temporarilyAvailable"
] as const;

function downloadFile(name: string, data: string): void {
    const file = new File([data], name, { type: "application/json" });
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
}

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
export const CustomVoiceFilterChatBarIcon: ChatBarButtonFactory = () => {
    const button = (
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

    return button;
};


// Open Confirm Modal
function openConfirmModal(message: string, accept: () => void) {
    const key = openModal(modalProps => (
        <ConfirmModal
            modalProps={modalProps}
            message={message}
            accept={accept}
            close={() => closeModal(key)}
        />
    ));
    return key;
}


// Vencord modules
function playPreview(url: string): void {
    if (voicePlayingAudio) {
        voicePlayingAudio.pause();
        voicePlayingAudio.currentTime = 0;
        voicePlayingAudio.src = url;
        voicePlayingAudio.play();
    }
    else {
        voicePlayingAudio = new Audio(url);
        voicePlayingAudio.play();
    }
}


// Voice Filter
function VoiceFilter({ name, previewSoundURLs, styleKey, iconURL, id }: IVoiceFilter): JSX.Element {
    const { updateById, deleteById } = useVoiceFiltersStore();

    return (
        <div className={`${VoiceFilterStyles.filter} ${VoiceFilterStyles[styleKey]}`}>
            <div className={`${VoiceFilterStyles.selector} ${VoiceFilterStyles.selector}`} role="button" tabIndex={0}>
                <div onClick={() => previewSoundURLs && playPreview(previewSoundURLs[0])} className={VoiceFilterStyles.iconTreatmentsWrapper}>
                    <div className={VoiceFilterStyles.profile}>
                        <img className={VoiceFilterStyles.thumbnail} alt="" src={iconURL ?? ""} draggable="false" />
                        <div className={VoiceFilterStyles.insetBorder}></div>
                    </div>
                </div>
                <div className={`text-xs/medium_cf4812 ${VoiceFilterStyles.filterName}`}>
                    {name}
                </div>
            </div>
            <div onClick={() => updateById(id)} className={`${VoiceFilterStyles.hoverButtonCircle} ${VoiceFilterStyles.previewButton}`} aria-label="Play a preview of the Skye voice filter" role="button" tabIndex={0}>
                <svg style={{ zoom: "0.6" }} aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path fill="white" d="M4 12a8 8 0 0 1 14.93-4H15a1 1 0 1 0 0 2h6a1 1 0 0 0 1-1V3a1 1 0 1 0-2 0v3a9.98 9.98 0 0 0-18 6 10 10 0 0 0 16.29 7.78 1 1 0 0 0-1.26-1.56A8 8 0 0 1 4 12Z" className=""></path>
                </svg>
            </div>
            <div onClick={() => deleteById(id)} className={`${VoiceFilterStyles.hoverButtonCircle} ${VoiceFilterStyles.previewButton}`} aria-label="Play a preview of the Skye voice filter" role="button" tabIndex={0} style={{ position: "absolute", left: "65px" }}>
                <svg style={{ zoom: "0.8" }} aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#faa" viewBox="0 0 24 24">
                    <path fill="#f44" d="M14.25 1c.41 0 .75.34.75.75V3h5.25c.41 0 .75.34.75.75v.5c0 .41-.34.75-.75.75H3.75A.75.75 0 0 1 3 4.25v-.5c0-.41.34-.75.75-.75H9V1.75c0-.41.34-.75.75-.75h4.5Z" className=""></path>
                    <path fill="#f44" fillRule="evenodd" d="M5.06 7a1 1 0 0 0-1 1.06l.76 12.13a3 3 0 0 0 3 2.81h8.36a3 3 0 0 0 3-2.81l.75-12.13a1 1 0 0 0-1-1.06H5.07ZM11 12a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm3-1a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Z" clipRule="evenodd" className=""></path>
                </svg>
            </div>
        </div>
    );
}

// Confirm Modal
function ConfirmModal({ modalProps, message, accept, close }: { modalProps: any; message: string; accept: () => void; close: () => void; }): JSX.Element {
    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL}>
            <ModalHeader className="modalHeader">
                <Forms.FormTitle tag="h2" className="modalTitle">
                    Confirm
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent style={{ color: "white" }}>
                <br /><br />
                <span style={{ color: "white", paddingBottom: "10px" }}>{message}</span><br /><br />
            </ModalContent>
            <ModalFooter justify="END">
                <div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
                    <Button color={Button.Colors.RED} onClick={() => { accept(); close(); }} style={{ alignSelf: "flex-end" }}>Accept</Button>
                    <Button color={Button.Colors.PRIMARY} onClick={() => { close(); }} style={{ alignSelf: "flex-end" }}>Cancel</Button>
                </div>
            </ModalFooter>
        </ModalRoot >
    );
}

// Create Voice Filter Modal
// function CreateVoiceFilterModal({ modalProps, close }: { modalProps: any; close: () => void; }): JSX.Element {
//     const [name, setName] = useState("");
//     const [iconUrl, setIconUrl] = useState("");
//     const [styleKey, setStyleKey] = useState("");
//     const [voicepackUrl, setVoicepackUrl] = useState("");
//     const [available, setAvailable] = useState(false);

//     const { downloadVoice } = useVoiceFiltersStore();

//     return (
//         <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
//             <ModalHeader className="modalHeader">
//                 <Forms.FormTitle tag="h2" className="modalTitle">
//                     Create a voice filter
//                 </Forms.FormTitle>
//                 <ModalCloseButton onClick={close} />
//             </ModalHeader>
//             <ModalContent style={{ color: "white" }}>
//                 <br /><br />
//                 <h1 style={{ color: "white", paddingBottom: "10px" }}>Create a voice filter</h1><br /><br />
//                 <span style={{ color: "white", paddingBottom: "10px" }}>Name</span><br /><br />
//                 <TextInput placeholder="Reyna" onChange={setName} style={{ width: "100%" }} /><br /><br />
//                 <span style={{ color: "white", paddingBottom: "10px" }}>Icon URL</span><br /><br />
//                 <TextInput placeholder="https://cdn.discordapp.com/emojis/1340353599858806785.webp?size=512" onChange={setIconUrl} style={{ width: "100%" }} /><br /><br />
//                 <span style={{ color: "white", paddingBottom: "10px" }}>Style Key</span><br /><br />
//                 <TextInput placeholder="skye" onChange={setStyleKey} style={{ width: "100%" }} /><br /><br />
//                 <span style={{ color: "white", paddingBottom: "10px" }}>ONNX File URL</span><br /><br />
//                 <TextInput placeholder="https://cdn.discordapp.com/attachments/1264847846897221642/1264847846897221642/reyna.onnx" onChange={setVoicepackUrl} style={{ width: "100%" }} /><br /><br />
//                 <div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
//                     <span style={{ color: "white", paddingBottom: "10px" }}>Available</span>
//                     <Switch value={available} onChange={setAvailable} />
//                 </div>

//                 <span style={{ color: "white", paddingBottom: "10px" }}>Preview</span><br /><br />
//                 <div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
//                     <Button onClick={() => { playPreview(voicepackUrl); }}>Play</Button>
//                     <Button onClick={() => { downloadVoice(voicepackUrl); }}>Download</Button>
//                 </div>
//             </ModalContent>
//             <ModalFooter justify="END">
//                 <Button color={Button.Colors.TRANSPARENT} onClick={close} style={{ alignSelf: "flex-end" }}>Cancel</Button>
//                 <Button color={Button.Colors.GREEN} onClick={() => {
//                     close();
//                 }} style={{ alignSelf: "flex-end" }}>Create</Button>
//             </ModalFooter>
//         </ModalRoot>
//     );
// }

// Error Modal
function ErrorModal({ modalProps, close, message }: { modalProps: any; close: () => void; message: string; }): JSX.Element {
    return (
        <ModalRoot {...modalProps} size="small">
            <ModalHeader className="modalHeader">
                <Forms.FormTitle tag="h2" className="modalTitle">
                    Error
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent style={{ color: "white" }}>
                <br /><br />
                <span style={{ color: "white", paddingBottom: "10px" }}>{message}</span><br /><br />
            </ModalContent>
            <ModalFooter justify="END">
                <Button onClick={close} style={{ alignSelf: "flex-end" }}>Close</Button>
            </ModalFooter>
        </ModalRoot>
    );
}
// Help Modal
function HelpModal({ modalProps, close }: { modalProps: any; close: () => void; }): JSX.Element {
    return (
        <ModalRoot {...modalProps} size="large">
            <ModalHeader className="modalHeader">
                <Forms.FormTitle tag="h2" className="modalTitle">
                    Help with voicepacks
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent style={{ color: "white" }}>
                <Flex style={{ gap: "1rem" }} flexDirection="column">
                    <Text>To build your own voicepack, you need to have a voicepack file. You can download one from the template or look at this tutorial.</Text>
                    <Text>The voicepack file is a json file that contains the voicepack data. You can find the template <a onClick={() => {
                        downloadFile("voicepack-template.json", templateVoicepack);
                    }}>here</a></Text>
                    <Text>Once you have the voicepack file, you can use the <a onClick={openVoiceFiltersModal}>Voice Filters Management Menu</a> to manage your voicepacks.</Text>
                    <Text>A voicepack may have one or multiple voices. Each voice is an object with the following properties:</Text>
                    <CodeBlock lang="json" content={templateVoicepack} />
                    <i>Style Key must be "" or one of the following: skye, quinn, axel, sebastien, megaphone, robot, tunes, ghost, spacebunny, justus, harper, villain, solara, cave, deepfried</i>
                </Flex>
            </ModalContent>
            <ModalFooter justify="END">
                <Button onClick={close} style={{ alignSelf: "flex-end" }}>Close</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

// Voice Filters Modal
function VoiceFiltersModal({ modalProps, close, accept }: { modalProps: any; close: () => void; accept: () => void; }): JSX.Element {
    const [url, setUrl] = useState("https://fox3000foxy.com/voicepacks/agents.json");
    const { downloadVoice, deleteAll, exportVoiceFilters, importVoiceFilters, voiceFilters } = useVoiceFiltersStore();

    const voiceComponents = Object.values(voiceFilters).map(voice =>
        <VoiceFilter {...voice} key={voice.id} />
    );

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader className="modalHeader">
                <Forms.FormTitle tag="h2" className="modalTitle">
                    Voice Filters Management Menu
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent style={{ color: "white" }}>
                <br /><br />
                <span style={{ color: "white", paddingBottom: "10px" }}>Download a voicepack from a url or paste a voicepack data here:</span><br /><br />
                <TextInput
                    value={url}
                    placeholder="( e.g. https://fox3000foxy.com/voicepacks/agents.json )"
                    onChange={setUrl}
                    onKeyDown={e => { if (e.key === "Enter") downloadVoice(url); }}
                    style={{ width: "100%" }}
                />
                <br />
                <div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
                    <Button onClick={() => { downloadVoice(url); }}>Download</Button>
                    <Button onClick={deleteAll} color={Button.Colors.RED}>Delete all</Button>
                    <Button onClick={exportVoiceFilters} color={Button.Colors.TRANSPARENT}>Export</Button>
                    <Button onClick={importVoiceFilters} color={Button.Colors.TRANSPARENT}>Import</Button>
                </div>
                <br /><br />
                <span style={{ color: "white", paddingBottom: "10px" }}>Voices filters list:</span><br /><br />
                <div style={{ display: "inline-flex", flexWrap: "wrap", gap: "8px" }}>
                    {voiceComponents.length > 0 ? voiceComponents : <i>No voice filters found</i>}
                </div>
            </ModalContent>
            <ModalFooter justify="END">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                    <Button color={Button.Colors.TRANSPARENT} onClick={() => {
                        openHelpModal();
                    }}>Learn how to build your own voicepack</Button>
                    <Button color={Button.Colors.GREEN} onClick={accept}>Close</Button>
                </div>
            </ModalFooter >
        </ModalRoot >
    );
}

// Open Help Modal
function openHelpModal() {
    const key = openModal(modalProps => (
        <HelpModal
            modalProps={modalProps}
            close={() => closeModal(key)}
        />
    ));
    return key;
}
// Open Error Modal
function openErrorModal(message: string) {
    const key = openModal(modalProps => (
        <ErrorModal
            modalProps={modalProps}
            message={message}
            close={() => closeModal(key)}
        />
    ));
    return key;
}

// Open Voice Filters Modal
function openVoiceFiltersModal() {
    const key = openModal(modalProps => (
        <VoiceFiltersModal
            modalProps={modalProps}
            close={() => closeModal(key)}
            accept={() => {
                // console.warn("accepted", url);
                closeModal(key);
            }}
        />
    ));
    return key;
}


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
    },
    stop() {
        console.log("CustomVoiceFilters stopped");
    },
});

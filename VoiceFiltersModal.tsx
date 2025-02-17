/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Forms, Text, TextInput, useState } from "@webpack/common";
import { JSX } from "react";

import { openCreateVoiceModal } from "./CreateVoiceFilterModal";
import { openHelpModal } from "./HelpModal";
import { IVoiceFilter, useVoiceFiltersStore, VoiceFilterStyles } from "./index";
import { playPreview } from "./utils";

export function openVoiceFiltersModal() {
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


export function VoiceFiltersModal({ modalProps, close, accept }: { modalProps: any; close: () => void; accept: () => void; }): JSX.Element {
    const [url, setUrl] = useState("");
    const [defaultVoicepack, setDefaultVoicepack] = useState(false);
    const { downloadVoice, deleteAll, exportVoiceFilters, importVoiceFilters, voiceFilters } = useVoiceFiltersStore();

    const voiceComponents = Object.values(voiceFilters).map(voice =>
        <VoiceFilter {...voice} key={voice.id} />
    );

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Forms.FormTitle tag="h2">
                    Voice Filters Management Menu
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent >
                <Flex style={{ gap: "1rem" }} flexDirection="column">
                    <span style={{ color: "white", paddingBottom: "10px" }}>Download a voicepack from a url or paste a voicepack data here:</span>
                    <TextInput
                        value={url}
                        placeholder="( e.g. https://fox3000foxy.com/voicepacks/agents.json )"
                        onChange={setUrl}
                        onKeyDown={e => { if (e.key === "Enter") downloadVoice(url); }}
                        style={{ width: "100%" }}
                    />
                    <Flex style={{ gap: "0.5rem" }}>
                        <Button onClick={() => { downloadVoice(url); }}>Download</Button>
                        <Button onClick={deleteAll} color={Button.Colors.RED}>Delete all</Button>
                        <Button onClick={exportVoiceFilters} color={Button.Colors.TRANSPARENT}>Export</Button>
                        <Button onClick={importVoiceFilters} color={Button.Colors.TRANSPARENT}>Import</Button>
                        <Button onClick={() => {
                            setDefaultVoicepack(true);
                            downloadVoice("https://fox3000foxy.com/voicepacks/agents.json");
                        }} color={Button.Colors.TRANSPARENT}>Download Default</Button>
                    </Flex>

                    <Text>Voices filters list:</Text>
                    <Flex style={{ gap: "0.5rem", flexWrap: "wrap" }}>
                        {voiceComponents.length > 0 ? voiceComponents : <i style={{ color: "white" }}>No voice filters found</i>}
                    </Flex>
                </Flex>
            </ModalContent>
            <ModalFooter justify="END">
                <Flex style={{ gap: "0.5rem", justifyContent: "space-between", alignItems: "center", }}>
                    <Button color={Button.Colors.TRANSPARENT} onClick={() => {
                        openHelpModal();
                    }}>Learn how to build your own voicepack</Button>
                    <Button color={Button.Colors.TRANSPARENT} onClick={openCreateVoiceModal}>Create Voicepack</Button>
                    <Button color={Button.Colors.RED} onClick={accept}>Close</Button>
                </Flex>
            </ModalFooter >
        </ModalRoot >
    );
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
                <Text variant="text-xs/medium" className={VoiceFilterStyles.filterName}>
                    {name}
                </Text>
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

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Forms, Text, TextInput, useState } from "@webpack/common";
import { JSX } from "react";

import { openErrorModal } from "./ErrorModal";
const requiredFields = ["name", "iconUrl", "voicepackUrl", "previewSoundUrl"];

//  Create Voice Filter Modal
function CreateVoiceFilterModal({ modalProps, close }: { modalProps: any; close: () => void; }): JSX.Element {
    const [name, setName] = useState("");
    const [iconUrl, setIconUrl] = useState("");
    const [styleKey, setStyleKey] = useState("");
    const [voicepackUrl, setVoicepackUrl] = useState("");
    const [previewSoundUrl, setPreviewSoundUrl] = useState("");

    return (
        <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
            <ModalHeader className="modalHeader">
                <Forms.FormTitle tag="h2" className="modalTitle">
                    Create a voice filter
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent style={{ color: "white" }}>
                <br /><br />
                <Text>Name<span style={{ color: "red" }}>*</span></Text><br />
                <TextInput placeholder="Model" onChange={setName} style={{ width: "100%" }} value={name} required /><br />
                <Text>Icon URL<span style={{ color: "red" }}>*</span></Text><br />
                <TextInput placeholder="https://example.com/voicepacks/model/icon.png" onChange={setIconUrl} style={{ width: "100%" }} value={iconUrl} required /><br />
                <Text>Style Key</Text><br />
                <TextInput placeholder="skye" onChange={setStyleKey} style={{ width: "100%" }} value={styleKey} /><br />
                <Text>ONNX File URL<span style={{ color: "red" }}>*</span></Text><br />
                <TextInput placeholder="https://example.com/voicepacks/model/model.onnx" onChange={setVoicepackUrl} style={{ width: "100%" }} value={voicepackUrl} required /><br />
                <Text>Preview Sound URL<span style={{ color: "red" }}>*</span></Text><br />
                <TextInput placeholder="https://example.com/voicepacks/model/preview.mp3" onChange={setPreviewSoundUrl} style={{ width: "100%" }} value={previewSoundUrl} required /><br />
            </ModalContent>
            <ModalFooter justify="END">
                <Button color={Button.Colors.TRANSPARENT} onClick={close} style={{ alignSelf: "flex-end" }}>Cancel</Button>
                <Button color={Button.Colors.GREEN} onClick={() => {
                    if (requiredFields.every(field => {
                        return !!field;
                    })) {
                        close();
                    } else {
                        openErrorModal("Please fill in all required fields");
                    }
                }} style={{ alignSelf: "flex-end" }}>Create</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function openCreateVoiceModal() {
    const key = openModal(modalProps => (
        <CreateVoiceFilterModal modalProps={modalProps} close={() => closeModal(key)} />
    ));
    return key;
}

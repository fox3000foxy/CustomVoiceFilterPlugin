/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Flex, Forms, Select, TextInput, useMemo, useState } from "@webpack/common";
import { SelectOption } from "@webpack/types";
import { JSX } from "react";

import { voices } from ".";
import { openErrorModal } from "./ErrorModal";
const requiredFields = ["name", "iconUrl", "voicepackUrl", "previewSoundUrl"];

interface CreateVoiceFilterModalProps {
    modalProps: ModalProps;
    close: () => void;
}


//  Create Voice Filter Modal
function CreateVoiceFilterModal({ modalProps, close }: CreateVoiceFilterModalProps): JSX.Element {
    const [name, setName] = useState("");
    const [iconUrl, setIconUrl] = useState("");
    const [styleKey, setStyleKey] = useState("");
    const [voicepackUrl, setVoicepackUrl] = useState("");
    const [previewSoundUrl, setPreviewSoundUrl] = useState("");

    const options: SelectOption[] = useMemo(() =>
        [{ value: "", label: "(empty)" }, ...Object.keys(voices).map(name => ({ value: name, label: name }))],
        []);

    return (
        <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Forms.FormTitle tag="h2" className="modalTitle">
                    Create a voice filter
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent style={{ paddingBlock: "0.5rem" }}>
                <Flex style={{ gap: "1rem" }} direction={Flex.Direction.VERTICAL}>
                    <Forms.FormSection>
                        <Forms.FormTitle>Name<span style={{ color: "var(--text-danger)" }}>*</span></Forms.FormTitle>
                        <TextInput placeholder="Model" onChange={setName} style={{ width: "100%" }} value={name} required />
                    </Forms.FormSection>
                    <Forms.FormSection>
                        <Forms.FormTitle>Icon URL<span style={{ color: "var(--text-danger)" }}>*</span></Forms.FormTitle>
                        <TextInput placeholder="https://example.com/voicepacks/model/icon.png" onChange={setIconUrl} style={{ width: "100%" }} value={iconUrl} required />
                    </Forms.FormSection>
                    <Forms.FormSection>
                        <Forms.FormTitle>Style Key</Forms.FormTitle>
                        <Select
                            options={options}
                            placeholder={"Select an option"}
                            maxVisibleItems={5}
                            closeOnSelect={true}
                            select={setStyleKey}
                            isSelected={v => v === styleKey}
                            serialize={v => String(v)}
                        />
                    </Forms.FormSection>
                    <Forms.FormSection>
                        <Forms.FormTitle>ONNX File URL<span style={{ color: "var(--text-danger)" }}>*</span></Forms.FormTitle>
                        <TextInput placeholder="https://example.com/voicepacks/model/model.onnx" onChange={setVoicepackUrl} style={{ width: "100%" }} value={voicepackUrl} required />
                    </Forms.FormSection>
                    <Forms.FormSection>
                        <Forms.FormTitle>Preview Sound URL<span style={{ color: "var(--text-danger)" }}>*</span></Forms.FormTitle>
                        <TextInput placeholder="https://example.com/voicepacks/model/preview.mp3" onChange={setPreviewSoundUrl} style={{ width: "100%" }} value={previewSoundUrl} required />
                    </Forms.FormSection>
                </Flex>
            </ModalContent>
            <ModalFooter>
                <Flex style={{ gap: "0.5rem" }} justify={Flex.Justify.END} align={Flex.Align.CENTER}>
                    <Button color={Button.Colors.TRANSPARENT} onClick={close} >Cancel</Button>
                    <Button color={Button.Colors.GREEN} onClick={() => {
                        if (requiredFields.every(field => field)) {
                            close();
                        } else {
                            openErrorModal("Please fill in all required fields");
                        }
                    }}>Create</Button>
                </Flex>
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

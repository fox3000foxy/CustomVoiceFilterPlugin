/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Card, Forms, Text, useState } from "@webpack/common";

import { openCreateVoiceModal } from "./CreateVoiceFilterModal";
import { openHelpModal } from "./HelpModal";
import { openVoiceFiltersModal } from "./VoiceFiltersModal";

interface WikiHomeModalProps {
    modalProps: ModalProps;
    close: () => void;
    accept: () => void;
}

export function WikiHomeModal({ modalProps, close, accept }: WikiHomeModalProps) {
    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Forms.FormTitle tag="h2" className="modalTitle">
                    Wiki Home
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent>
                <br /><br />
                <Text>Here are some tutorials and guides about the Custom Voice Filter Plugin:</Text>
                <br /><br />
                <CollapsibleCard title="How to install a voicepack" content={
                    <Text>To install a voicepack, you need to paste the voicepack url in the <a onClick={() => openVoiceFiltersModal()}>main menu</a>.</Text>
                } /><br />
                <CollapsibleCard title="How to create a voicepack" content={
                    <>
                        <Text>You have two methods to create a voicepack:</Text>
                        <Text>1. Use the <a onClick={() => openCreateVoiceModal()}>voicepack creator modal</a> (recommended)</Text>
                        <Text>2. Use the <a onClick={() => openHelpModal()}>Help Modal</a> (advanced)</Text>
                    </>
                } /><br />
                <CollapsibleCard title="How does it work?" content={
                    <>
                        <Text>Discord actually uses a Python project named <a href="https://github.com/RVC-Project/Retrieval-based-Voice-Conversion">Retrieval-based Voice Conversion</a> to convert your voice into the voice model you picked.</Text>
                        <Text>This voice cloning technology allows an audio input to be converted into a different voice, with a high degree of accuracy.</Text>
                        <Text>Actually, Discord uses ONNX files to run the model, for a better performance and less CPU usage.</Text>
                    </>
                } /><br />
                <CollapsibleCard title="How to create an ONNX from an existing RVC model" content={
                    <>
                        <Text>RVC models can be converted to ONNX files using the <a href="https://github.com/w-okada/voice-changer/">W-Okada Software</a>.</Text>
                        <Text>MMVCSIO is software that is issued from W-Okada Software, and can be downloaded <a href="https://huggingface.co/datasets/Derur/all-portable-ai-in-one-url/blob/main/HZ/MMVCServerSIO.7z">here</a>.</Text>
                        <Text>Thats the actual software that does exports RVC models to ONNX files.</Text>
                    </>
                } /><br />
            </ModalContent>
            <ModalFooter>
                <Button onClick={close}>Close</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function openWikiHomeModal(): string {
    const key = openModal(modalProps => (
        <WikiHomeModal
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

function CollapsibleCard({ title, content }: { title: string; content: React.ReactNode; }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Card style={{ background: "var(--background-secondary)" }}>
            <Card onClick={() => setIsOpen(!isOpen)} style={{ cursor: "pointer", background: "var(--background-primary)", padding: "10px", marginBottom: isOpen ? "10px" : "0px" }}>
                <Text style={{ fontSize: "18px", fontWeight: "bold" }}>{title}</Text>
            </Card>
            {isOpen && <Text style={{ padding: "10px", paddingTop: "0px" }}>{content}</Text>}
        </Card>
    );
}


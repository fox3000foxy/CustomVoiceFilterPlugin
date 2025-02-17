/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Forms, Text } from "@webpack/common";
import { JSX } from "react";

// Open Confirm Modal
export function openConfirmModal(message: string, accept: (key: string) => void) {
    const key = openModal(modalProps => (
        <ConfirmModal
            modalProps={modalProps}
            message={message}
            accept={() => accept(key)}
            close={() => closeModal(key)}
        />
    ));
    return key;
}

interface ConfirmModalProps {
    modalProps: ModalProps;
    message: string;
    accept: () => void;
    close: () => void;
}

export function ConfirmModal({ modalProps, message, accept, close }: ConfirmModalProps): JSX.Element {
    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL}>
            <ModalHeader className="modalHeader">
                <Forms.FormTitle tag="h2" className="modalTitle">
                    Confirm
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent style={{ color: "white" }}>
                <br /><Text>{message}</Text><br />
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

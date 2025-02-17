/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Forms, Text } from "@webpack/common";
import { JSX } from "react";


// Open Error Modal
export function openErrorModal(message: string) {
    const key = openModal(modalProps => (
        <ErrorModal
            modalProps={modalProps}
            message={message}
            close={() => closeModal(key)}
        />
    ));
    return key;
}

interface ErrorModalProps {
    modalProps: ModalProps;
    message: string;
    close: () => void;
}

export function ErrorModal({ modalProps, close, message }: ErrorModalProps): JSX.Element {
    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL}>
            <ModalHeader className="modalHeader">
                <Forms.FormTitle tag="h2" className="modalTitle">
                    Error
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent style={{ color: "white" }}>
                <br /><Text>{message}</Text><br />
            </ModalContent>
            <ModalFooter justify="END">
                <Button onClick={close} style={{ alignSelf: "flex-end" }}>Close</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

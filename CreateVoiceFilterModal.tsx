/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

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

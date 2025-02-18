/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { PluginNative } from "@utils/types";
import { Button, Flex, Forms, Text, TextInput, useEffect, useState } from "@webpack/common";
import { JSX } from "react";

import { openCreateVoiceModal } from "./CreateVoiceFilterModal";
import { openHelpModal } from "./HelpModal";
import { downloadCustomVoiceModel, IVoiceFilter, useVoiceFiltersStore, VoiceFilterStyles } from "./index";
import { playPreview } from "./utils";

const Native = VencordNative.pluginHelpers.CustomVoiceFilters as PluginNative<typeof import("./native")>;

export function openVoiceFiltersModal(): string {
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

interface VoiceFiltersModalProps {
    modalProps: ModalProps;
    close: () => void;
    accept: () => void;
}

function VoiceFiltersModal({ modalProps, close, accept }: VoiceFiltersModalProps): JSX.Element {
    const [url, setUrl] = useState("");
    const [defaultVoicepack, setDefaultVoicepack] = useState(false);
    const { downloadVoicepack, deleteAll, exportVoiceFilters, importVoiceFilters, voiceFilters } = useVoiceFiltersStore();

    const voiceComponents = Object.values(voiceFilters).map(voice =>
        <VoiceFilter {...voice} key={voice.id} />
    );

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Forms.FormTitle tag="h2" className="modalTitle">
                    Voice Filters Management Menu
                </Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>
            <ModalContent style={{ paddingBlock: "0.5rem" }}>
                <Flex style={{ gap: "1rem" }} direction={Flex.Direction.VERTICAL}>
                    <Text>Download a voicepack from a url or paste a voicepack data here:</Text>
                    <TextInput
                        value={url}
                        placeholder="( e.g. https://fox3000foxy.com/voicepacks/agents.json )"
                        onChange={setUrl}
                        onKeyDown={e => { if (e.key === "Enter") downloadVoicepack(url); }}
                        style={{ width: "100%" }}
                    />
                    <Flex style={{ gap: "0.5rem" }}>
                        <Button onClick={() => downloadVoicepack(url)}>Download</Button>
                        <Button onClick={deleteAll} color={Button.Colors.RED}>Delete all</Button>
                        <Button onClick={exportVoiceFilters} color={Button.Colors.TRANSPARENT}>Export</Button>
                        <Button onClick={importVoiceFilters} color={Button.Colors.TRANSPARENT}>Import</Button>
                        <Button onClick={() => {
                            setDefaultVoicepack(true);
                            downloadVoicepack("https://fox3000foxy.com/voicepacks/agents.json");
                        }} color={Button.Colors.TRANSPARENT}>Download Default</Button>
                    </Flex>

                    <Text>Voices filters list:</Text>
                    <Flex style={{ gap: "0.5rem" }} wrap={Flex.Wrap.WRAP}>
                        {voiceComponents.length > 0 ? voiceComponents : <Text style={{ fontStyle: "italic" }}>No voice filters found</Text>}
                    </Flex>
                </Flex>
            </ModalContent>
            <ModalFooter>
                <Flex style={{ gap: "0.5rem" }} justify={Flex.Justify.END} align={Flex.Align.CENTER}>
                    <Button color={Button.Colors.TRANSPARENT} onClick={openHelpModal}>Learn how to build your own voicepack</Button>
                    <Button color={Button.Colors.TRANSPARENT} onClick={() => openCreateVoiceModal()}>Create Voicepack</Button>
                    <Button color={Button.Colors.RED} onClick={accept}>Close</Button>
                </Flex>
            </ModalFooter >
        </ModalRoot >
    );
}


// Voice Filter
function VoiceFilter(voiceFilter: IVoiceFilter): JSX.Element {
    const { name, previewSoundURLs, styleKey, iconURL, id } = voiceFilter;
    const { updateById, deleteById, exportIndividualVoice, modulePath } = useVoiceFiltersStore();
    const className = `${VoiceFilterStyles.hoverButtonCircle} ${VoiceFilterStyles.previewButton}`;
    const [modelState, setModelState] = useState({ status: "not_downloaded", downloadedBytes: 0 });
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const fetchModelState = async () => {
            const modelState = await Native.getModelState(voiceFilter.id, modulePath);
            setModelState(modelState);
        };
        fetchModelState();
    }, [modulePath]);

    return (
        <div className={`${VoiceFilterStyles.filter} ${VoiceFilterStyles[styleKey]}`} onClick={async () => {
            if (!voiceFilter.available) return;

            // download and preview if downloaded
            if (modelState.status === "not_downloaded") {
                setModelState({ status: "downloading", downloadedBytes: 0 });
                const res = await downloadCustomVoiceModel(voiceFilter);
                if (res.success) setModelState({ status: "downloaded", downloadedBytes: 0 });
            }
        }}>
            <div className={`${VoiceFilterStyles.selector} ${VoiceFilterStyles.selector}`} role="button" tabIndex={0}>
                <div className={VoiceFilterStyles.iconTreatmentsWrapper}>
                    <div className={`${VoiceFilterStyles.profile} ${!voiceFilter.available || modelState.status !== "downloaded" ? VoiceFilterStyles.underDevelopment : ""}`}>
                        <img className={VoiceFilterStyles.thumbnail} alt="" src={iconURL ?? ""} draggable={false} />
                        {voiceFilter.available && modelState.status === "not_downloaded" && <div><DownloadIcon /></div>}
                        {voiceFilter.available && modelState.status === "downloading" && <div><DownloadingIcon /></div>}
                        {voiceFilter.available && modelState.status === "downloaded" && <div onClick={() => {
                            if (modelState.status === "downloaded" && previewSoundURLs) {
                                playPreview(previewSoundURLs[0], () => setIsPlaying(false));
                                setIsPlaying(true);
                            }
                        }}>{isPlaying ? <PauseIcon /> : <PlayIcon />}</div>}
                    </div>
                </div>
                <Text variant="text-xs/medium" className={VoiceFilterStyles.filterName}>
                    {voiceFilter.available ? name : "🚧 " + name}
                </Text>
            </div>

            {voiceFilter.available && modelState.status === "downloaded" ? (
                <>
                    <div onClick={() => updateById(id)} className={className} role="button" tabIndex={-1}>
                        <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                            <path fill="white" d="M4 12a8 8 0 0 1 14.93-4H15a1 1 0 1 0 0 2h6a1 1 0 0 0 1-1V3a1 1 0 1 0-2 0v3a9.98 9.98 0 0 0-18 6 10 10 0 0 0 16.29 7.78 1 1 0 0 0-1.26-1.56A8 8 0 0 1 4 12Z" />
                        </svg>
                    </div>
                    <div onClick={() => deleteById(id)} className={className} role="button" tabIndex={-1} style={{ left: "65px" }}>
                        <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                            <path fill="#f44" d="M14.25 1c.41 0 .75.34.75.75V3h5.25c.41 0 .75.34.75.75v.5c0 .41-.34.75-.75.75H3.75A.75.75 0 0 1 3 4.25v-.5c0-.41.34-.75.75-.75H9V1.75c0-.41.34-.75.75-.75h4.5Z" />
                            <path fill="#f44" fillRule="evenodd" d="M5.06 7a1 1 0 0 0-1 1.06l.76 12.13a3 3 0 0 0 3 2.81h8.36a3 3 0 0 0 3-2.81l.75-12.13a1 1 0 0 0-1-1.06H5.07ZM11 12a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm3-1a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div onClick={() => exportIndividualVoice(id)} className={className} role="button" tabIndex={-1} style={{ top: "65px" }}>
                        <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                            <path fill="white" d="M12 2a1 1 0 0 1 1 1v10.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V3a1 1 0 0 1 1-1ZM3 20a1 1 0 1 0 0 2h18a1 1 0 1 0 0-2H3Z" />
                        </svg>
                    </div>
                    <div onClick={() => openCreateVoiceModal(voiceFilter)} className={className} role="button" tabIndex={-1} style={{ top: "65px", left: "65px" }}>
                        <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                            <path fill="white" d="m13.96 5.46 4.58 4.58a1 1 0 0 0 1.42 0l1.38-1.38a2 2 0 0 0 0-2.82l-3.18-3.18a2 2 0 0 0-2.82 0l-1.38 1.38a1 1 0 0 0 0 1.42ZM2.11 20.16l.73-4.22a3 3 0 0 1 .83-1.61l7.87-7.87a1 1 0 0 1 1.42 0l4.58 4.58a1 1 0 0 1 0 1.42l-7.87 7.87a3 3 0 0 1-1.6.83l-4.23.73a1.5 1.5 0 0 1-1.73-1.73Z" />
                        </svg>
                    </div>
                </>) : <></>}
        </div>
    );
}

function DownloadIcon(): JSX.Element {
    return (
        <svg className={VoiceFilterStyles.thumbnail} style={{ zoom: "0.4", margin: "auto", top: "0", left: "0", bottom: "0", right: "0" }} aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path fill="white" d="M12 2a1 1 0 0 1 1 1v10.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V3a1 1 0 0 1 1-1ZM3 20a1 1 0 1 0 0 2h18a1 1 0 1 0 0-2H3Z" className=""></path>
        </svg>
    );
}

function DownloadingIcon(): JSX.Element {
    return (

        <svg className={VoiceFilterStyles.thumbnail} style={{ zoom: "0.4", margin: "auto", top: "0", left: "0", bottom: "0", right: "0" }} viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
            <path fill="white" stroke="black" strokeWidth="1" d="M1023.849566 529.032144C1022.533495 457.744999 1007.544916 386.64064 979.907438 321.641387 952.343075 256.605575 912.349158 197.674868 863.252422 148.980264 814.192243 100.249102 755.992686 61.717486 693.004095 36.310016 630.052062 10.792874 562.347552-1.380777 495.483865 0.081523 428.620178 1.470709 362.012394 16.495846 301.144139 44.206439 240.202769 71.807359 185.000928 111.874391 139.377154 161.044242 93.753381 210.177537 57.707676 268.450209 33.945294 331.475357 10.073239 394.463948-1.296147 462.1319 0.166154 529.032144 1.482224 595.968946 15.593423 662.503615 41.549256 723.371871 67.468531 784.240126 105.013094 839.405409 151.075558 884.956067 197.101464 930.579841 251.645269 966.552431 310.612534 990.241698 369.543241 1014.040637 432.860849 1025.336908 495.483865 1023.874608 558.143438 1022.485422 620.291206 1008.337666 677.174693 982.381833 734.094737 956.462558 785.677384 918.954552 828.230327 872.892089 870.819826 826.902741 904.416179 772.395492 926.533473 713.5379 939.986637 677.85777 949.089457 640.605667 953.915048 602.841758 955.194561 602.951431 956.510631 602.987988 957.790144 602.987988 994.27454 602.987988 1023.849566 572.425909 1023.849566 534.735116 1023.849566 532.834125 1023.739893 530.933135 1023.593663 529.032144L1023.849566 529.032144 1023.849566 529.032144ZM918.892953 710.284282C894.691881 767.021538 859.596671 818.421398 816.568481 860.82811 773.540291 903.307938 722.652236 936.75806 667.706298 958.729124 612.760359 980.773303 553.902767 991.192193 495.483865 989.729893 437.064963 988.377265 379.304096 975.106889 326.441936 950.832702 273.543218 926.668187 225.616322 891.682649 186.097653 848.764132 146.542426 805.91873 115.35887 755.176905 94.959779 700.486869 74.451015 645.796833 64.799833 587.195144 66.189018 529.032144 67.541646 470.869145 79.934642 413.437296 102.563741 360.867595 125.119725 308.297895 157.765582 260.663459 197.759499 221.364135 237.716858 182.064811 284.985719 151.137157 335.910331 130.884296 386.834944 110.55832 441.305634 101.01681 495.483865 102.47911 549.662096 103.868296 603.036061 116.261292 651.876895 138.780718 700.754287 161.22703 745.025432 193.690099 781.509828 233.428113 818.067339 273.166127 846.764984 320.142529 865.518987 370.665008 884.346105 421.224045 893.156465 475.256046 891.76728 529.032144L891.986625 529.032144C891.840395 530.933135 891.76728 532.797568 891.76728 534.735116 891.76728 569.939999 917.540325 598.893547 950.66143 602.585856 944.227308 639.728286 933.589072 675.956779 918.892953 710.284282Z" />
            <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="3s" repeatCount="indefinite" />
        </svg>

    );
}

function PlayIcon(): JSX.Element {
    return (

        <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" className={`${VoiceFilterStyles.thumbnail} ${VoiceFilterStyles.hoverButtonCircle}`} style={{ margin: "auto", top: "0", left: "0", bottom: "0", right: "0", width: "32px", height: "32px", padding: "24px", transform: "0px 0px" }} fill="none" viewBox="0 0 24 24">
            <path fill="white" d="M9.25 3.35C7.87 2.45 6 3.38 6 4.96v14.08c0 1.58 1.87 2.5 3.25 1.61l10.85-7.04a1.9 1.9 0 0 0 0-3.22L9.25 3.35Z" className=""></path>
        </svg>

    );
}

function PauseIcon(): JSX.Element {
    return (
        <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" className={`${VoiceFilterStyles.thumbnail} ${VoiceFilterStyles.hoverButtonCircle}`} style={{ margin: "auto", top: "0", left: "0", bottom: "0", right: "0", width: "32px", height: "32px", padding: "24px", transform: "0px 0px" }} fill="none" viewBox="0 0 24 24">
            <path fill="white" d="M6 4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H6ZM15 4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-3Z" className=""></path>
        </svg>
    );
}

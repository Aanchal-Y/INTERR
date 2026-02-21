/* eslint-disable lines-around-comment */
import { IStore } from '../../app/types';
import { showWarningNotification } from '../../notifications/actions';
import { NOTIFICATION_TIMEOUT_TYPE } from '../../notifications/constants';
import { timeout } from '../../virtual-background/functions';
import logger from '../../virtual-background/logger';

import JitsiStreamBackgroundEffect, { IBackgroundEffectOptions } from './JitsiStreamBackgroundEffect';
// @ts-ignore
import createTFLiteModule from './vendor/tflite/tflite';
// @ts-ignore
import createTFLiteSIMDModule from './vendor/tflite/tflite-simd';
const models = {
    modelLandscape: 'libs/selfie_segmentation_landscape.tflite'
};
/* eslint-enable lines-around-comment */

let modelBuffer: ArrayBuffer;
let tflite: any;
let wasmCheck;
let isWasmDisabled = false;

const segmentationDimensions = {
    modelLandscape: {
        height: 144,
        width: 256
    }
};

/**
 * Creates a new instance of JitsiStreamBackgroundEffect. This loads the Meet background model that is used to
 * extract person segmentation.
 *
 * @param {Object} virtualBackground - The virtual object that contains the background image source and
 * the isVirtualBackground flag that indicates if virtual image is activated.
 * @param {Function} dispatch - The Redux dispatch function.
 * @returns {Promise<JitsiStreamBackgroundEffect>}
 */
export async function createVirtualBackgroundEffect(virtualBackground: IBackgroundEffectOptions['virtualBackground'],
        dispatch?: IStore['dispatch']) {
    if (!MediaStreamTrack.prototype.getSettings && !MediaStreamTrack.prototype.getConstraints) {
        throw new Error('JitsiStreamBackgroundEffect not supported!');
    }

    if (isWasmDisabled) {
        dispatch?.(showWarningNotification({
            titleKey: 'virtualBackground.backgroundEffectError'
        }, NOTIFICATION_TIMEOUT_TYPE.LONG));

        return;
    }

    // Checks if WebAssembly feature is supported or enabled by/in the browser.
    // Conditional import of wasm-check package is done to prevent
    // the browser from crashing when the user opens the app.

    if (!tflite) {
        try {
            wasmCheck = require('wasm-check');
            const tfliteTimeout = 10000;

            // locateFile tells the Emscripten runtime where to fetch the .wasm
            // binary from. Without this override the module resolves to an
            // empty scriptDirectory and tries to GET /tflite.wasm (or
            // /tflite-simd.wasm) from the server root, which 404s. The files
            // are served from /libs/ so we redirect them there.
            const tfliteConfig = { locateFile: (path: string) => `libs/${path}` };

            if (wasmCheck?.feature?.simd) {
                tflite = await timeout(tfliteTimeout, createTFLiteSIMDModule(tfliteConfig));
            } else {
                tflite = await timeout(tfliteTimeout, createTFLiteModule(tfliteConfig));
            }
        } catch (err: any) {
            if (err?.message === '408') {
                logger.error('Failed to download tflite model!');
                dispatch?.(showWarningNotification({
                    titleKey: 'virtualBackground.backgroundEffectError'
                }, NOTIFICATION_TIMEOUT_TYPE.LONG));
            } else {
                isWasmDisabled = true;
                logger.error('Looks like WebAssembly is disabled or not supported on this browser', err);
                dispatch?.(showWarningNotification({
                    titleKey: 'virtualBackground.webAssemblyWarning',
                    descriptionKey: 'virtualBackground.webAssemblyWarningDescription'
                }, NOTIFICATION_TIMEOUT_TYPE.LONG));
            }

            return;
        }
    }

    if (!modelBuffer) {
        const modelResponse = await fetch(models.modelLandscape);

        if (!modelResponse.ok) {
            throw new Error('Failed to download tflite model!');
        }

        modelBuffer = await modelResponse.arrayBuffer();

        tflite.HEAPU8.set(new Uint8Array(modelBuffer), tflite._getModelBufferMemoryOffset());

        tflite._loadModel(modelBuffer.byteLength);
    }

    const options = {
        ...segmentationDimensions.modelLandscape,
        virtualBackground
    };

    return new JitsiStreamBackgroundEffect(tflite, options);
}

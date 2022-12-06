import { SelfieSegmentation } from "@mediapipe/selfie_segmentation"

const FRAME_RATE = 30
export async function createVideo(videoDeviceId: string,
    width: number, height: number,
    previewVideoElem: HTMLVideoElement) {
    let segmentStream: MediaStream | null = null
    const stream = await navigator.mediaDevices.getUserMedia(
        {
            video:
            {
                height: height, width: width, frameRate: FRAME_RATE,
                deviceId: { exact: videoDeviceId }
            }
        })

    const settings = stream.getVideoTracks()[0].getSettings()
    console.log(`Capture camera with device ${stream.getVideoTracks()[0].label} at ${settings.width}x${settings.height}`)


    let [track] = stream.getVideoTracks();
    const segmentGenerator = new MediaStreamTrackGenerator({ kind: 'video' })
    const processor = new MediaStreamTrackProcessor({ track })
    segmentStream = new MediaStream([segmentGenerator])

    previewVideoElem.srcObject = segmentStream

    processor.readable.pipeThrough(new TransformStream({
        transform: (frame, controller) => segment(frame, controller)
    }))
        .pipeTo(segmentGenerator.writable)
        .catch(err => console.error("generator error", err));

    let segmentCanvas = new OffscreenCanvas(width, height)
    const segmentCtx = segmentCanvas.getContext('2d')

    const selfieSegmentation = new SelfieSegmentation({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
        }
    })
    selfieSegmentation.setOptions({
        modelSelection: 1,
    });

    async function segment(frame: VideoFrame, controller: TransformStreamDefaultController<any>) {
        if (!segmentCtx) return

        const height = frame.codedHeight;
        const width = frame.codedWidth;

        segmentCanvas.height = height;
        segmentCanvas.width = width;

        segmentCtx.drawImage(frame, 0, 0, width, height);

        await selfieSegmentation.onResults(async results => {

            segmentCtx.clearRect(0, 0, width, height);
            segmentCtx.drawImage(results.segmentationMask, 0, 0, width, height);

            // Grab the transparent image
            // segmentCtx.save();
            // Add the original video back in only overwriting the masked pixels
            segmentCtx.globalCompositeOperation = 'source-in';
            segmentCtx.drawImage(results.image, 0, 0, width, height);

            // ToDo: need to get a different controller
            const selfieFrame = new VideoFrame(segmentCanvas as any, frame.timestamp ? { timestamp: frame.timestamp } : undefined);
            controller.enqueue(selfieFrame);
            frame.close();

        });
        await selfieSegmentation.send({ image: segmentCanvas as any });
    }

    return () => {
        console.log('createVideo: cleanup called')
        // previewVideoElem.srcObject = null
        // if (segmentStream) {
        //     segmentStream.getTracks().forEach(track => track.stop())
        // }
        // selfieSegmentation.close()
    }
}
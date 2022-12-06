import fixWebmDuration from "fix-webm-duration"
import { assertNonNull } from "./utils"

export class StreamRecorder {
    #data: Blob[] | null = null
    #recorder: MediaRecorder | null = null
    #recordingStartTime: number | null = null
    #blob: Blob | null = null
    #duration: number | null = null
    #videoResolution: [number, number] | null = null
    #onStop: (() => void) | null = null

    get duration() {
        return this.#duration
    }

    get videoResolution() {
        return this.#videoResolution
    }

    get isRecording() {
        return this.#recorder !== null && this.#recorder.state === 'recording'
    }

    get blob() {
        return this.#blob
    }

    constructor(inputStream: MediaStream, mimeType: string) {
        this.#recorder = new MediaRecorder(inputStream, { mimeType: mimeType })
    }

    public async start(onStart: (startTime: number) => void, onStop: () => void) {
        if (this.isRecording || this.#recorder === null) return

        this.#onStop = onStop

        this.#data = []

        this.#recorder.onstart = e => {
            this.#recordingStartTime = Date.now()
            onStart(this.#recordingStartTime)
        }

        this.#recorder.ondataavailable = e => {
            this.#data!.push(e.data)
        }

        this.#recorder.onstop = async () => {
            this.#recorder = null
            if (this.#data === null || this.#recordingStartTime === null) return
            this.#blob = await this.getSeekableBlobFromData(this.#data, this.calculateDuration())
            this.#data = null
            this.#onStop?.()
        }

        this.#recorder.start(250)
    }

    public stop() {
        if (this.isRecording) {
            assertNonNull(this.#recorder)
            this.#recorder.stream.getTracks().forEach(track => track.stop())
            this.#recorder.stop()
        }
    }

    private calculateDuration() {
        if (this.#duration !== null) return this.#duration
        const now = Date.now()
        assertNonNull(this.#recordingStartTime)
        const res = now - this.#recordingStartTime
        this.#recordingStartTime = null
        this.#duration = res
        return res
    }

    private async getSeekableBlobFromData(recordedData: Blob[], duration: number) {
        const sourceBlob = new Blob(recordedData, {
            type: 'video/webm',
        })
        return await fixWebmDuration(sourceBlob, duration, { logger: (msg) => console.log(msg) })
    }
}

import { useMemo, useRef, useState } from 'react';
import './App.css';
import { DeviceSelector } from './DeviceSelector';
import { createVideo } from './media';

type UnwrapPromise<T> = T extends Promise<(infer R)> ? R : never

enum RecordingState {
  preview = 'preview',
  recording = 'recording',
  review = 'review'
}
function App() {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null)
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.preview)
  const [mediaHandler, setMediaHandler] = useState<UnwrapPromise<ReturnType<typeof createVideo>> | null>(null)

  const mediaStreamTrackApiUnsupported = useMemo(() => {

    return typeof MediaStreamTrackProcessor === 'undefined' ||
      typeof MediaStreamTrackGenerator === 'undefined'
  }, [])

  const outputVideoRef = useRef<HTMLVideoElement | null>(null)



  function handleStart() {

  }
  function handleStop() {

  }
  function handleSave() {

  }

  async function handleChange(deviceId: string) {
    if (mediaHandler) {
      mediaHandler() // cleanup old handler
    }
    if (outputVideoRef.current) {
      const media = await createVideo(deviceId, 1280, 720, outputVideoRef.current)
      setMediaHandler(media)
    }
  }

  async function handleDeviceChange(device: MediaDeviceInfo) {
    if (device.kind === 'videoinput') {
      if (device.deviceId !== selectedVideoId) {
        setSelectedVideoId(device.deviceId)
        handleChange(device.deviceId)

      }
    } else if (device.kind === 'audioinput') {
      if (device.deviceId !== selectedAudioId) {
        setSelectedAudioId(device.deviceId)
      }
    }

  }

  if (mediaStreamTrackApiUnsupported) {
    return <div className="App">
      <span>Your browser does not support the experimental MediaStreamTrack API for Insertable Streams of Media.</span>
    </div>
  }
  return (
    <div className="App">
      <div className='videoContainer'>
        <video className='videoOutput' autoPlay ref={outputVideoRef} />
      </div>
      <div className='controls'>
        <div className='buttons'>
          <button disabled={recordingState !== RecordingState.preview} onClick={() => handleStart()}>Start</button>
          <button disabled={recordingState !== RecordingState.recording} onClick={() => handleStop()}>Stop</button>
          <button disabled={recordingState !== RecordingState.review} onClick={() => handleSave()}>Save</button>
        </div>

        <div className='deviceSelector'>
          <DeviceSelector label='Video Device' predicate={videoPredicate} selectedDeviceId={selectedVideoId}
            onDeviceSelected={(di) => handleDeviceChange(di)} />
          <DeviceSelector label='Audio Device' predicate={audioPredicate} selectedDeviceId={selectedAudioId}
            onDeviceSelected={(di) => handleDeviceChange(di)} includeNone />
        </div>
      </div>
    </div>
  )
}

const videoPredicate = (d: MediaDeviceInfo) => d.kind === 'videoinput'
const audioPredicate = (d: MediaDeviceInfo) => d.kind === 'audioinput'

export default App;

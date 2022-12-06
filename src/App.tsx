import { ActionIcon } from '@mantine/core';
import { IconFileDownload, IconPlayerPlay, IconPlayerRecord, IconPlayerStop } from '@tabler/icons';
import { useMemo, useRef, useState } from 'react';
import './App.css';
import { DeviceSelector } from './DeviceSelector';
import { createVideoStream } from './media';
import { StreamRecorder } from './StreamRecorder';
import { UnwrapPromise } from './utils';


enum RecordingState {
  preview = 'preview',
  recording = 'recording',
  review = 'review'
}
function App() {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null)
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.preview)
  const [mediaHandler, setMediaHandler] = useState<UnwrapPromise<ReturnType<typeof createVideoStream>> | null>(null)
  const [streamRecorder, setStreamRecorder] = useState<StreamRecorder | null>(null)

  const mediaStreamTrackApiUnsupported = useMemo(() => {

    return typeof MediaStreamTrackProcessor === 'undefined' ||
      typeof MediaStreamTrackGenerator === 'undefined'
  }, [])

  const outputVideoRef = useRef<HTMLVideoElement | null>(null)

  async function handleRecord() {
    if (!mediaHandler) return
    const recorder = new StreamRecorder(mediaHandler.stream, 'video/webm;codecs=vp9')
    setStreamRecorder(recorder)
    await recorder.start(() => {
      setRecordingState(RecordingState.recording)
    }, () => {
      setRecordingState(RecordingState.review)
      if (recorder?.blob) {
        const dataUrl = URL.createObjectURL(recorder.blob)
        if (outputVideoRef.current) {
          outputVideoRef.current.autoplay = false
          outputVideoRef.current.src = dataUrl
        }
      }
    })

  }
  async function handleStop() {
    if (!streamRecorder) return
    streamRecorder.stop()
    if (outputVideoRef.current) {
      outputVideoRef.current.srcObject = null
    }
    mediaHandler?.close()
  }

  function handlePlay() {
    if (outputVideoRef.current) {
      outputVideoRef.current.play()
    }
  }

  function handleDownload() {
    if (streamRecorder?.blob) {
      const a = document.createElement('a')
      a.style.cssText = 'display: none'
      const url = window.URL.createObjectURL(streamRecorder.blob)
      a.href = url
      a.download = 'test.webm'
      a.click()
      window.URL.revokeObjectURL(url)
    }
  }

  async function handleChange(deviceId: string) {
    if (mediaHandler) {
      if (outputVideoRef.current) {
        outputVideoRef.current.srcObject = null
      }
      mediaHandler.close() // cleanup old handler
    }
    if (outputVideoRef.current) {
      const media = await createVideoStream(deviceId, 1280, 720)
      if (outputVideoRef.current) {
        outputVideoRef.current.srcObject = media.stream
      }
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
          <ActionIcon variant="default" size='xl' disabled={recordingState !== RecordingState.preview} onClick={() => handleRecord()} title='Record'>
            <IconPlayerRecord size={34} color='red' />
          </ActionIcon>
          <ActionIcon variant="default" size='xl' disabled={recordingState !== RecordingState.recording} onClick={() => handleStop()} title='Stop'>
            <IconPlayerStop size={34} />
          </ActionIcon>
          <ActionIcon variant="default" size='xl' disabled={recordingState !== RecordingState.review} onClick={() => handlePlay()} title='Play'>
            <IconPlayerPlay size={34} />
          </ActionIcon>
          <ActionIcon variant="default" size='xl' disabled={recordingState !== RecordingState.review} onClick={() => handleDownload()} title='Download'>
            <IconFileDownload size={34} />
          </ActionIcon>
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

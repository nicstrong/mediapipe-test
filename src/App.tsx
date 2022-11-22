import React, { useEffect, useRef, useState } from 'react'
import { Results, SelfieSegmentation } from "@mediapipe/selfie_segmentation"
import './App.css'
import { Camera } from '@mediapipe/camera_utils'

function App() {
  const inputVideoRef = useRef<HTMLVideoElement>(null)
  const outputVideoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const canvasStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedDataRef = useRef<Blob[] | null>(null)
  const [recording, setRecording] = useState(false)
  const [hasRecorededData, setHasRecorededData] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!inputVideoRef.current) return;
    if (!outputVideoRef.current) return;
    contextRef.current = canvasRef.current.getContext("2d");

    // render the canvas too a video element to play, this way
    // we can also wrap the stream in a MediaRecorder to do what we want with the video
    const stream = canvasRef.current.captureStream(30)
    outputVideoRef.current.srcObject = stream
    canvasStreamRef.current = stream

    const selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });

    selfieSegmentation.setOptions({
      modelSelection: 1
    })

    selfieSegmentation.onResults(onResults);

    const camera = new Camera(inputVideoRef.current, {
      onFrame: async () => {
        if (inputVideoRef.current) {
          await selfieSegmentation.send({ image: inputVideoRef.current });
        }
      },
      width: 1280,
      height: 720
    });
    camera.start();

  }, [])

  const handleStart = () => {
    if (!canvasStreamRef.current) return
    setRecording(true)
    recordedDataRef.current = []
    setHasRecorededData(false)
    mediaRecorderRef.current = new MediaRecorder(canvasStreamRef.current, { mimeType: 'video/webm;codecs=vp9' })

    mediaRecorderRef.current.ondataavailable = e => {
      if (recordedDataRef.current === null) return // we already stopped
      recordedDataRef.current.push(e.data)
    }

    mediaRecorderRef.current.onstop = async () => {
      setHasRecorededData(true)
      mediaRecorderRef.current = null
    }
    mediaRecorderRef.current.start(200)
  }

  const handleStop = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
        mediaRecorderRef.current.stop()
      }
    } catch (e) {
      console.log('handleStop: error', e)
    }
  }

  const handleSave = () => {
    let sourceBlob: Blob | null = null
    try {
      if (recordedDataRef.current === null) return // we already stopped

      sourceBlob = new Blob(recordedDataRef.current, {
        type: 'video/webm',
      })
      recordedDataRef.current = null
    } catch (e) {
      console.log('mediaRecorder.onStop error:', e)
      return
    }

    const a = document.createElement('a')
    a.style.cssText = 'display: none'
    const url = window.URL.createObjectURL(sourceBlob)
    a.href = url
    a.download = 'test.webm'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const onResults = (results: Results) => {
    if (!contextRef.current || !canvasRef.current) return

    contextRef.current.save();
    contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

    contextRef.current.drawImage(results.segmentationMask, 0, 0, canvasRef.current.width, canvasRef.current.height)

    contextRef.current.globalCompositeOperation = "source-in"
    contextRef.current.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height)

    contextRef.current.restore()
  };

  return (
    <div className="App">
      <video className='videoSource' autoPlay ref={inputVideoRef} />
      <canvas className='canvas' ref={canvasRef} width={1280} height={720} />
      <video className='videoDest' autoPlay ref={outputVideoRef} />

      <div className='controls'>
        <button disabled={recording} onClick={() => handleStart()}>Start</button>
        <button disabled={!recording} onClick={() => handleStop()}>Stop</button>
        <button disabled={!hasRecorededData} onClick={() => handleSave()}>Save</button>
      </div>
    </div>
  )
}

export default App;

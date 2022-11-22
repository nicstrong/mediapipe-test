import React, { useEffect, useRef } from 'react'
import { Results, SelfieSegmentation } from "@mediapipe/selfie_segmentation"
import './App.css'
import { Camera } from '@mediapipe/camera_utils'

function App() {
  const inputVideoRef = useRef<HTMLVideoElement>(null)
  const outputVideoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!inputVideoRef.current) return;
    if (!outputVideoRef.current) return;
    contextRef.current = canvasRef.current.getContext("2d");

    // render the canvas too a video element to play, this way
    // we can also wrap the stream in a MediaRecorder to do what we want with the video
    const stream = canvasRef.current.captureStream()
    outputVideoRef.current.srcObject = stream

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
          await selfieSegmentation.send({image: inputVideoRef.current});
        }
      },
      width: 1280,
      height: 720
    });
    camera.start();

  }, [])

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
    </div>
  )
}

export default App;

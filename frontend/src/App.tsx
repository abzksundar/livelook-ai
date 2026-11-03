import {

  ChangeEvent,

  useEffect,

  useRef,

  useState,

} from 'react';

import {

  createDecartClient,

  models,

} from '@decartai/sdk';

const API_BASE =

  import.meta.env.VITE_API_BASE_URL ??

  'http://localhost:8000';

const DECART_MODEL_NAME =

  'lucy-vton-3.5';

type GarmentSize = 'M' | 'L' | 'XL' | 'XXL' | '3XL' | '4XL' | '5XL' | '6XL' | '7XL';

type SizeMeasurements = {
  chest: number;
  waist: number;
  sleeveLength: number;
  shoulderWidth: number;
  length: number;
};

// Slim-fit measurements from the supplied size chart (in inches).
const SIZE_CHART: Record<GarmentSize, SizeMeasurements> = {
  M:   { chest: 38, waist: 38, sleeveLength: 7.5,  shoulderWidth: 17.5, length: 26.5 },
  L:   { chest: 40, waist: 40, sleeveLength: 8,    shoulderWidth: 18.5, length: 27.5 },
  XL:  { chest: 42, waist: 42, sleeveLength: 8.5,  shoulderWidth: 19.5, length: 28.5 },
  XXL: { chest: 44, waist: 44, sleeveLength: 9,    shoulderWidth: 20.5, length: 29.5 },
  '3XL': { chest: 46, waist: 46, sleeveLength: 9.5, shoulderWidth: 21,   length: 30.5 },
  '4XL': { chest: 48, waist: 48, sleeveLength: 10,  shoulderWidth: 22,   length: 31 },
  '5XL': { chest: 50, waist: 50, sleeveLength: 10.5, shoulderWidth: 22.5, length: 31.5 },
  '6XL': { chest: 52, waist: 52, sleeveLength: 11,  shoulderWidth: 23,   length: 32 },
  '7XL': { chest: 54, waist: 54, sleeveLength: 11.5, shoulderWidth: 23.5, length: 32.5 },
};

const GARMENT_SIZES = Object.keys(SIZE_CHART) as GarmentSize[];

type BodyMeasurements = { chest: number; waist: number };

function buildGarmentPrompt(
  size: GarmentSize,
  bodyMeasurements?: BodyMeasurements,
): string {
  const m = SIZE_CHART[size];
  const bodyText = bodyMeasurements
    ? ` Body (in): chest ${bodyMeasurements.chest}, waist ${bodyMeasurements.waist}. Fit the garment to this body; never alter the person.`
    : '';

  // Keep the prompt comfortably below the model's prompt-length limit.
  return `Use the uploaded reference image as the source of truth for the clothing. If it shows a complete outfit, reproduce the complete visible outfit; if it shows one garment, replace only that garment. Match the reference garment faithfully: color, pattern, texture, material, collar, sleeves, cuffs, buttons, zippers, pockets, seams, graphics, logos and overall design. Do not redesign, recolor, simplify, add or invent clothing details. Remove existing clothing that conflicts with the reference. Preserve the person’s face, identity, body shape, proportions, skin, hair, background and lighting. Keep the same clothing consistently across the realtime video when the person moves, turns, sits or stands. Preserve correct layering, occlusion, folds, shadows and garment boundaries. When a detail is temporarily hidden by pose, restore the same detail when visible again. Keep the reference outfit visually consistent in every frame.`;
}

function parseBodyMeasurement(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 100
    ? Math.round(parsed * 10) / 10
    : null;
}
type Garment = {

  name: string;

  size: GarmentSize;

  file: File;

  previewUrl: string;

  prompt: string;

};

type RealtimeClient = any;

export default function App() {

  // ============================================================

  // VIDEO REFERENCES

  // ============================================================

  const localVideoRef =

    useRef<HTMLVideoElement>(null);

  const aiVideoRef =

    useRef<HTMLVideoElement>(null);

  // ============================================================

  // STREAM / DECART REFERENCES

  // ============================================================

  const cameraStreamRef =

    useRef<MediaStream | null>(null);

  const realtimeRef =

    useRef<RealtimeClient | null>(null);

  const aiStartTimeoutRef =

    useRef<number | null>(null);

  const fileInputRef =

    useRef<HTMLInputElement>(null);

  // ============================================================

  // STATE

  // ============================================================

  const [cameraOn, setCameraOn] =

    useState(false);

  const [aiLive, setAiLive] =

    useState(false);

  const [connecting, setConnecting] =

    useState(false);

  const [garment, setGarment] =

    useState<Garment | null>(null);

  const [status, setStatus] =

    useState(

      'Upload a garment to start',

    );

  const [connectionState, setConnectionState] =

    useState('OFF');

  const [selectedSize, setSelectedSize] =

    useState<GarmentSize>('M');

  const [applyingSize, setApplyingSize] =

    useState(false);

  const [bodyChest, setBodyChest] = useState('');
  const [bodyWaist, setBodyWaist] = useState('');
  const [recommendedSize, setRecommendedSize] = useState<GarmentSize | null>(null);
  const [sizeRecommendationMessage, setSizeRecommendationMessage] = useState('');

  function getEnteredBodyMeasurements(): BodyMeasurements | undefined {
    const chest = parseBodyMeasurement(bodyChest);
    const waist = parseBodyMeasurement(bodyWaist);
    return chest !== null && waist !== null ? { chest, waist } : undefined;
  }

  // ============================================================

  // CLEANUP

  // ============================================================

  useEffect(() => {

    return () => {

      cleanupAll();

    };

  }, []);

  // ============================================================

  // CLEANUP EVERYTHING

  // ============================================================

  function cleanupAll() {

    if (

      aiStartTimeoutRef.current !==

      null

    ) {

      window.clearTimeout(

        aiStartTimeoutRef.current,

      );

      aiStartTimeoutRef.current =

        null;

    }

    try {

      realtimeRef.current?.disconnect();

    } catch {

      // Ignore disconnect errors.

    }

    realtimeRef.current =

      null;

    cameraStreamRef.current

      ?.getTracks()

      .forEach((track) => {

        track.stop();

      });

    cameraStreamRef.current =

      null;

    const local =

      localVideoRef.current;

    if (local) {

      local.pause();

      local.srcObject = null;

    }

    const ai =

      aiVideoRef.current;

    if (ai) {

      ai.pause();

      ai.srcObject = null;

    }

  }

  // ============================================================

  // FETCH DECART CLIENT TOKEN

  // ============================================================

  async function fetchClientToken(): Promise<string> {

    const response =

      await fetch(

        `${API_BASE}/api/decart/token`,

        {

          method: 'POST',

        },

      );

    const payload =

      await response

        .json()

        .catch(() => null);

    if (

      !response.ok ||

      typeof payload?.apiKey !== 'string'

    ) {

      throw new Error(

        payload?.error ??

          `Could not create Decart token (${response.status})`,

      );

    }

    return payload.apiKey;

  }

  // ============================================================

  // START CAMERA

  // ============================================================

  async function startCamera(

    garmentOverride?: Garment | null,

  ) {

    if (cameraStreamRef.current) {

      return;

    }

    const selectedGarment =

      garmentOverride ?? garment;

    try {

      setStatus(

        'Opening camera...',

      );

      const model =

        models.realtime(

          DECART_MODEL_NAME,

        );

      const stream =

        await navigator.mediaDevices.getUserMedia(

          {

            audio: true,

            video: {

              frameRate: model.fps,

              width: model.width,

              height: model.height,

              facingMode: 'user',

            },

          },

        );

      cameraStreamRef.current =

        stream;

      // --------------------------------------------------------

      // LOCAL CAMERA

      // --------------------------------------------------------

      const local =

        localVideoRef.current;

      if (local) {

        local.srcObject =

          stream;

        local.muted = true;

        local.autoplay = true;

        local.playsInline = true;

        await local.play();

      }

      setCameraOn(true);

      setAiLive(false);

      setConnectionState(

        'CAMERA READY',

      );

      if (selectedGarment) {

        await connectRealtime(

          stream,

          selectedGarment,

        );

      } else {

        setStatus(

          'Camera ready — upload a garment',

        );

      }

    } catch (error) {

      console.error(

        '[Camera]',

        error,

      );

      setStatus(

        error instanceof Error

          ? error.message

          : 'Could not access camera',

      );

    }

  }

  // ============================================================

  // CONNECT DECART REALTIME

  // ============================================================

  async function connectRealtime(

    stream: MediaStream,

    selectedGarment: Garment,

  ) {

    if (

      realtimeRef.current

    ) {

      await applyGarment(

        realtimeRef.current,

        selectedGarment,

      );

      return;

    }

    setConnecting(true);

    setAiLive(false);

    setConnectionState(

      'CONNECTING',

    );

    setStatus(

      'Connecting live AI...',

    );

    try {

      // --------------------------------------------------------

      // GET TEMPORARY TOKEN

      // --------------------------------------------------------

      const clientToken =

        await fetchClientToken();

      // --------------------------------------------------------

      // CREATE DECART CLIENT

      // --------------------------------------------------------

      const client =

        createDecartClient({

          apiKey: clientToken,

        });

      const model =

        models.realtime(

          DECART_MODEL_NAME,

        );

      // --------------------------------------------------------

      // CONNECT LIVE WEBRTC

      // --------------------------------------------------------

      const realtimeClient =

        await client.realtime.connect(

          stream,

          {

            model,

            mirror: 'auto',

            // --------------------------------------------------

            // AI TRANSFORMED VIDEO

            // --------------------------------------------------

            onRemoteStream:

              (

                transformedStream: MediaStream,

              ) => {

                console.log(

                  '[Decart] Remote stream received',

                );

                const aiVideo =

                  aiVideoRef.current;

                if (!aiVideo) {

                  return;

                }

                // Keep the original camera

                // visible until AI output

                // is actually playing.

                setAiLive(false);

                aiVideo.srcObject =

                  transformedStream;
                aiVideo.play().catch(() => {});
                setAiLive(true);
                setConnectionState('LIVE');
                setStatus(`Live try-on: ${selectedGarment.name} · Size ${selectedGarment.size}`);

                aiVideo.muted = true;

                aiVideo.autoplay = true;

                aiVideo.playsInline = true;

                aiVideo.onloadedmetadata =

                  () => {

                    console.log(

                      '[Decart] AI metadata loaded',

                    );

                    void aiVideo

                      .play()

                      .catch(

                        (error) => {

                          console.error(

                            '[Decart] AI video play error',

                            error,

                          );

                        },

                      );

                  };

                aiVideo.onplaying =

                  () => {

                    console.log(

                      '[Decart] AI video playing',

                    );

                    if (

                      aiStartTimeoutRef.current !==

                      null

                    ) {

                      window.clearTimeout(

                        aiStartTimeoutRef.current,

                      );

                      aiStartTimeoutRef.current =

                        null;

                    }

                    setAiLive(true);

                    setConnectionState(

                      'LIVE',

                    );

                    setStatus(

                      `Live try-on: ${selectedGarment.name} · Size ${selectedGarment.size}`,

                    );

                  };

                aiVideo.onwaiting =

                  () => {

                    console.log(

                      '[Decart] AI video waiting...',

                    );

                  };

                aiVideo.onstalled =

                  () => {

                    console.warn(

                      '[Decart] AI video stalled',

                    );

                  };

                aiVideo.onerror =

                  () => {

                    console.error(

                      '[Decart] AI video error',

                      aiVideo.error,

                    );

                    setAiLive(false);

                    setStatus(

                      'AI video playback error',

                    );

                  };

                // If no frames arrive,

                // don't hide the local camera.

                if (

                  aiStartTimeoutRef.current !==

                  null

                ) {

                  window.clearTimeout(

                    aiStartTimeoutRef.current,

                  );

                }

                aiStartTimeoutRef.current =

                  window.setTimeout(

                    () => {

                      if (

                        !aiVideo.videoWidth ||

                        !aiVideo.videoHeight

                      ) {

                        console.warn(

                          '[Decart] No decoded AI frames',

                        );

                        

                        setStatus(

                          'AI connected — waiting for video',

                        );

                      }

                    },

                    8000,

                  );

              },

          },

        );

      realtimeRef.current =

        realtimeClient;

      // --------------------------------------------------------

      // CONNECTION STATE

      // --------------------------------------------------------

      realtimeClient.on(

        'connectionChange',

        (state: string) => {

          console.log(

            '[Decart] Connection:',

            state,

          );

          setConnectionState(

            state.toUpperCase(),

          );

          if (

            state ===

              'disconnected' ||

            state === 'failed'

          ) {

            setAiLive(false);

            setStatus(

              `AI connection ${state}`,

            );

          }

        },

      );

      // --------------------------------------------------------

      // APPLY GARMENT

      // --------------------------------------------------------

      await applyGarment(

        realtimeClient,

        selectedGarment,

      );

    } catch (error) {

  console.error('[Decart] Realtime error', error);

  const message =

    error instanceof Error

      ? error.message

      : String(error ?? '');

  const normalizedMessage = message.toLowerCase();

  const isInsufficientCredits =

    normalizedMessage.includes('insufficient credits');

  try {

    realtimeRef.current?.disconnect();

  } catch {

    // Ignore disconnect errors.

  }

  realtimeRef.current = null;

  setAiLive(false);

  setConnecting(false);

  if (isInsufficientCredits) {

    setConnectionState('CREDITS REQUIRED');

    setStatus(

      'Decart credits exhausted. Add credits to continue live try-on.',

    );

    console.warn(

      '[Decart] Insufficient credits. Live try-on stopped without retrying.',

    );

    return;

  }

  setConnectionState('ERROR');

  setStatus(

    message || 'Could not start live AI try-on',

  );

} finally {

      setConnecting(false);

    }

  }

  // ============================================================

  // APPLY GARMENT

  // ============================================================

  async function applyGarment(

    realtimeClient: RealtimeClient,

    selectedGarment: Garment,

  ) {

    setStatus(

      `Applying ${selectedGarment.name}...`,

    );

    console.log(

      '[Decart] Applying garment',

      {

        name:

          selectedGarment.name,

        type:

          selectedGarment.file.type,

        fileSize:

          selectedGarment.file.size,

        selectedSize: selectedGarment.size,

        promptLength: selectedGarment.prompt.length,

      },

    );

    // --------------------------------------------------------

    // Current Decart realtime examples use setImage()

    // for a File/Blob garment reference.

    // --------------------------------------------------------

    await realtimeClient.setImage(

      selectedGarment.file,

      {

        prompt:

          selectedGarment.prompt,

        enhance: false,

      },

    );

    setStatus(

      `Live AI try-on: ${selectedGarment.name} · Size ${selectedGarment.size}`,

    );

  }

  // ============================================================

  // UNIVERSAL GARMENT SIZE SELECTION

  // ============================================================

  async function handleSizeSelect(size: GarmentSize) {
    if (size === selectedSize || applyingSize) {
      return;
    }

    setSelectedSize(size);
    setRecommendedSize(null);
    setSizeRecommendationMessage('');

    if (!garment) {
      setStatus(`Size ${size} selected. Upload a garment to try it on.`);
      return;
    }

    const updatedGarment: Garment = {
      ...garment,
      size,
      prompt: buildGarmentPrompt(size, getEnteredBodyMeasurements()),
    };

    setGarment(updatedGarment);

    const activeSession = realtimeRef.current;
    if (!activeSession) {
      setStatus(`Size ${size} selected. It will be used when try-on starts.`);
      return;
    }

    setApplyingSize(true);
    setStatus(`Applying size ${size}...`);

    try {
      await applyGarment(activeSession, updatedGarment);
      setStatus(`Live try-on: ${updatedGarment.name} · Size ${size}`);
    } catch (error) {
      console.error('[VTO size change]', error);
      setStatus(
        error instanceof Error
          ? `Could not apply size ${size}: ${error.message}`
          : `Could not apply size ${size}`,
      );
    } finally {
      setApplyingSize(false);
    }
  }

  // ============================================================
  // BODY-MEASUREMENT SIZE RECOMMENDATION
  // ============================================================

  async function handleRecommendSize() {
    const chest = parseBodyMeasurement(bodyChest);
    const waist = parseBodyMeasurement(bodyWaist);

    if (chest === null || waist === null) {
      setRecommendedSize(null);
      setSizeRecommendationMessage('Enter valid chest and waist measurements in inches.');
      setStatus('Enter your body chest and waist measurements to recommend a size.');
      return;
    }

    // The supplied chart lists garment circumference. Allow roughly 2 inches
    // of ease between body circumference and a slim-fit garment circumference.
    const easeInches = 2;
    const requiredChest = chest + easeInches;
    const requiredWaist = waist + easeInches;
    const fitSize = GARMENT_SIZES.find((size) =>
      SIZE_CHART[size].chest >= requiredChest &&
      SIZE_CHART[size].waist >= requiredWaist
    );
    const targetSize = fitSize ?? GARMENT_SIZES[GARMENT_SIZES.length - 1];
    const targetMeasurements = SIZE_CHART[targetSize];

    setRecommendedSize(targetSize);
    setSelectedSize(targetSize);
    setSizeRecommendationMessage(
      fitSize
        ? `Recommended ${targetSize}: garment chest ${targetMeasurements.chest} in and waist ${targetMeasurements.waist} in. Includes approximately ${easeInches} in ease.`
        : `Your measurements exceed the chart's ${easeInches} in ease range. ${targetSize} is the largest listed size and may still be tight.`
    );

    if (!garment) {
      setStatus(`Recommended size ${targetSize}. Upload a garment to preview this fit.`);
      return;
    }

    const updatedGarment: Garment = {
      ...garment,
      size: targetSize,
      prompt: buildGarmentPrompt(targetSize, { chest, waist }),
    };
    setGarment(updatedGarment);

    const activeSession = realtimeRef.current;
    if (!activeSession) {
      setStatus(`Recommended size ${targetSize} will be used when try-on starts.`);
      return;
    }

    setApplyingSize(true);
    setStatus(`Applying recommended size ${targetSize}...`);
    try {
      await applyGarment(activeSession, updatedGarment);
      setStatus(`Live try-on: ${updatedGarment.name} · Recommended size ${targetSize}`);
    } catch (error) {
      console.error('[VTO body-size recommendation]', error);
      setStatus(
        error instanceof Error
          ? `Could not apply size ${targetSize}: ${error.message}`
          : `Could not apply size ${targetSize}`,
      );
    } finally {
      setApplyingSize(false);
    }
  }

  // ============================================================

  // GARMENT UPLOAD

  // ============================================================

  async function handleGarmentUpload(

    event: ChangeEvent<HTMLInputElement>,

  ) {

    const file =

      event.target.files?.[0];

    // Reset input so the same file

    // can be selected again later.

    event.target.value = '';

    if (!file) {

      return;

    }

    if (

      !file.type.startsWith('image/')

    ) {

      setStatus(

        'Please upload a shirt image',

      );

      return;

    }

    try {

      // --------------------------------------------------------

      // CREATE PREVIEW

      // --------------------------------------------------------

      const previewUrl =

        URL.createObjectURL(file);

      const newGarment: Garment = {

        name: file.name,

        size: selectedSize,

        file,

        previewUrl,

        prompt: buildGarmentPrompt(selectedSize, getEnteredBodyMeasurements()),

      };

      // Revoke previous preview.

      if (garment) {

        URL.revokeObjectURL(

          garment.previewUrl,

        );

      }

      setGarment(

        newGarment,

      );

      // --------------------------------------------------------

      // CAMERA NOT RUNNING

      // Automatically start it.

      // --------------------------------------------------------

      if (

        !cameraStreamRef.current

      ) {

        setStatus(

          'Garment selected — opening camera...',

        );

        await startCamera(

          newGarment,

        );

        return;

      }

      // --------------------------------------------------------

      // EXISTING SESSION

      // Switch garment instantly.

      // --------------------------------------------------------

      if (

        realtimeRef.current

      ) {

        await applyGarment(

          realtimeRef.current,

          newGarment,

        );

        return;

      }

      // --------------------------------------------------------

      // CAMERA RUNNING BUT AI NOT CONNECTED

      // --------------------------------------------------------

      await connectRealtime(

        cameraStreamRef.current,

        newGarment,

      );

    } catch (error) {

      console.error(

        '[Garment upload]',

        error,

      );

      setStatus(

        error instanceof Error

          ? error.message

          : 'Could not process garment',

      );

    }

  }

  // ============================================================

  // OPEN FILE PICKER

  // ============================================================

  function openGarmentPicker() {

    fileInputRef.current?.click();

  }

  // ============================================================

  // STOP EVERYTHING

  // ============================================================

  function stopCamera() {

    try {

      realtimeRef.current?.disconnect();

    } catch {

      // Ignore.

    }

    realtimeRef.current =

      null;

    cameraStreamRef.current

      ?.getTracks()

      .forEach((track) =>

        track.stop(),

      );

    cameraStreamRef.current =

      null;

    if (localVideoRef.current) {

      localVideoRef.current.pause();

      localVideoRef.current.srcObject =

        null;

    }

    if (aiVideoRef.current) {

      aiVideoRef.current.pause();

      aiVideoRef.current.srcObject =

        null;

    }

    if (aiStartTimeoutRef.current) {

      window.clearTimeout(

        aiStartTimeoutRef.current,

      );

      aiStartTimeoutRef.current =

        null;

    }

    setCameraOn(false);

    setAiLive(false);

    setConnecting(false);

    setConnectionState(

      'OFF',

    );

    setStatus(

      garment

        ? 'Camera stopped — garment ready'

        : 'Upload a garment to start',

    );

  }

  // ============================================================

  // UI

  // ============================================================

  return (

    <div className="app-shell">

      {/* ======================================================

          HEADER

      ====================================================== */}

      <header className="topbar">

        <div>

          <div className="eyebrow">

            LIVELOOK.AI

          </div>

          <h1>

            LIVE VIRTUAL TRY-ON

          </h1>

          <p>

            Upload a garment and

            wear it live through

            AI video.

          </p>

        </div>

        <div

          className={`status-pill ${

            aiLive

              ? 'live'

              : ''

          }`}

        >

          <span className="dot" />

          {status}

        </div>

      </header>

      {/* ======================================================

          MAIN

      ====================================================== */}

      <main className="vto-layout">

        {/* ====================================================

            MAIN VIDEO

        ==================================================== */}

        <section className="video-panel">

          <div className="video-toolbar">

            <div>

              <span className="toolbar-label">

                LIVE VIRTUAL TRY-ON

              </span>

              <span className="toolbar-state">

                {aiLive

                  ? 'AI LIVE'

                  : cameraOn

                    ? 'CAMERA'

                    : 'OFF'}

              </span>

            </div>

            <span className="connection-state">

              {connectionState}

            </span>

          </div>

          <div className="video-stage">

            {/* ------------------------------------------------

                LOCAL CAMERA

            ------------------------------------------------- */}

            <video

              ref={localVideoRef}

              className={`local-video ${

                aiLive

                  ? 'local-pip'

                  : 'local-full'

              }`}

              muted

              autoPlay

              playsInline

            />

            {/* ------------------------------------------------

                AI VIDEO

            ------------------------------------------------- */}

            <video

              ref={aiVideoRef}

              className={`ai-video ${

                aiLive

                  ? 'ai-visible'

                  : ''

              }`}

              muted

              autoPlay

              playsInline

            />

            {/* ------------------------------------------------

                EMPTY STATE

            ------------------------------------------------- */}

            {!cameraOn && (

              <div className="video-empty">

                <div className="empty-icon">

                  +

                </div>

                <strong>

                  Upload a garment

                </strong>

                <span>

                  Your camera will open

                  automatically and the

                  AI live try-on will start.

                </span>

              </div>

            )}

            {/* ------------------------------------------------

                CAMERA BUT NO AI

            ------------------------------------------------- */}

            {cameraOn &&

              !aiLive &&

              !connecting && (

                <div className="video-message">

                  <strong>

                    {garment

                      ? 'AI try-on ready'

                      : 'Upload a garment'}

                  </strong>

                  <span>

                    {garment

                      ? 'Waiting for transformed video'

                      : 'Choose a shirt to start'}

                  </span>

                </div>

              )}

            {/* ------------------------------------------------

                CONNECTING

            ------------------------------------------------- */}

            {connecting && (

              <div className="video-message">

                <div className="loading-ring" />

                <strong>

                  Starting AI try-on...

                </strong>

                <span>

                  Keep your full upper body

                  inside the camera frame.

                </span>

              </div>

            )}

            {/* ------------------------------------------------

                GARMENT NAME

            ------------------------------------------------- */}

            {aiLive &&

              garment && (

                <div className="garment-live-label">

                  Wearing:

                  <strong>

                    {garment.name}

                  </strong>

                </div>

              )}

            {/* ------------------------------------------------

                CAMERA PIP LABEL

            ------------------------------------------------- */}

            {aiLive && (

              <div className="camera-pip-label">

                Camera

              </div>

            )}

          </div>

          {/* ==================================================

              CONTROLS

          ================================================== */}

          <div className="video-controls">

            <button

              className="upload-primary"

              onClick={

                openGarmentPicker

              }

              disabled={connecting}

            >

              {garment

                ? 'Change Garment'

                : 'Upload Garment'}

            </button>

            {!cameraOn ? (

              <button

                className="control-secondary"

                onClick={() =>

                  void startCamera()

                }

              >

                Start Camera

              </button>

            ) : (

              <button

                className="control-secondary"

                onClick={

                  stopCamera

                }

              >

                Stop

              </button>

            )}

            <input

              ref={fileInputRef}

              type="file"

              accept="image/png,image/jpeg,image/webp,image/svg+xml"

              hidden

              onChange={

                handleGarmentUpload

              }

            />

          </div>

        </section>

        {/* ====================================================

            RIGHT CONTROL PANEL

        ==================================================== */}

        <aside className="control-panel">

          {/* ==================================================

              GARMENT

          ================================================== */}

          <div className="control-card">

            <div className="card-title">

              GARMENT

            </div>

            {garment ? (

              <>

                <div className="garment-preview">

                  <img

                    src={

                      garment.previewUrl

                    }

                    alt={

                      garment.name

                    }

                  />

                </div>

                <div className="garment-file-name">

                  {garment.name}

                </div>

                <button

                  className="replace-button"

                  onClick={

                    openGarmentPicker

                  }

                >

                  Replace Garment

                </button>

              </>

            ) : (

              <button

                className="empty-upload"

                onClick={

                  openGarmentPicker

              }

              >

                <span>

                  +

                </span>

                Upload shirt image

              </button>

            )}

            <div
              style={{
                marginTop: 18,
                paddingTop: 16,
                borderTop: '1px solid #2d2d33',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span
                  style={{
                    color: '#f4f4f5',
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                  }}
                >
                  SELECT SIZE
                </span>
                <span
                  style={{
                    border: '1px solid #55555e',
                    borderRadius: 999,
                    padding: '4px 9px',
                    color: '#f4f4f5',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {selectedSize}
                </span>
              </div>

              <div style={{ marginTop: 14, padding: 10, border: '1px solid #33333b', borderRadius: 10, background: '#151518' }}>
                <div style={{ color: '#f4f4f5', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em' }}>
                  FIND YOUR SIZE
                </div>
                <p style={{ margin: '5px 0 10px', color: '#9ca3af', fontSize: 11, lineHeight: 1.45 }}>
                  Enter your body circumference in inches using a measuring tape. The chart shows garment measurements; recommendation includes about 2 inches of ease.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#d4d4d8', fontSize: 11, fontWeight: 700 }}>
                    Chest (in)
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="0.5"
                      inputMode="decimal"
                      value={bodyChest}
                      onChange={(event) => {
                        setBodyChest(event.target.value);
                        setRecommendedSize(null);
                        setSizeRecommendationMessage('');
                      }}
                      placeholder="e.g. 38"
                      aria-label="Body chest circumference in inches"
                      style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #3a3a42', borderRadius: 8, background: '#0f0f12', color: '#f4f4f5', padding: '10px 9px', fontSize: 13 }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#d4d4d8', fontSize: 11, fontWeight: 700 }}>
                    Waist (in)
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="0.5"
                      inputMode="decimal"
                      value={bodyWaist}
                      onChange={(event) => {
                        setBodyWaist(event.target.value);
                        setRecommendedSize(null);
                        setSizeRecommendationMessage('');
                      }}
                      placeholder="e.g. 34"
                      aria-label="Body waist circumference in inches"
                      style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #3a3a42', borderRadius: 8, background: '#0f0f12', color: '#f4f4f5', padding: '10px 9px', fontSize: 13 }}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRecommendSize()}
                  disabled={connecting || applyingSize}
                  style={{ width: '100%', marginTop: 10, minHeight: 40, border: '1px solid #f4f4f5', borderRadius: 9, background: '#f4f4f5', color: '#111113', fontSize: 12, fontWeight: 800, cursor: connecting || applyingSize ? 'not-allowed' : 'pointer', opacity: connecting || applyingSize ? 0.65 : 1 }}
                >
                  {applyingSize ? 'Applying recommended size...' : 'Recommend My Size'}
                </button>
                {recommendedSize && sizeRecommendationMessage && (
                  <p aria-live="polite" style={{ margin: '9px 0 0', color: '#d4d4d8', fontSize: 11, lineHeight: 1.5 }}>
                    <strong style={{ color: '#ffffff' }}>Recommended: {recommendedSize}.</strong>{' '}
                    {sizeRecommendationMessage.replace(`Recommended ${recommendedSize}: `, '')}
                  </p>
                )}
                {!recommendedSize && sizeRecommendationMessage && (
                  <p aria-live="polite" style={{ margin: '9px 0 0', color: '#fca5a5', fontSize: 11, lineHeight: 1.5 }}>
                    {sizeRecommendationMessage}
                  </p>
                )}
              </div>

              <div
                role="group"
                aria-label="Select a garment size"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 8,
                  marginTop: 12,
                }}
              >
                {GARMENT_SIZES.map((size) => {
                  const active = selectedSize === size;
                  const disabled = connecting || applyingSize;

                  return (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={active}
                      disabled={disabled}
                      onClick={() => void handleSizeSelect(size)}
                      style={{
                        minHeight: 40,
                        padding: '8px 4px',
                        borderRadius: 10,
                        border: active ? '1px solid #f4f4f5' : '1px solid #3a3a42',
                        background: active ? '#f4f4f5' : '#18181b',
                        color: active ? '#111113' : '#f4f4f5',
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.65 : 1,
                      }}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>

              <p
                style={{
                  margin: '10px 0 0',
                  color: '#9ca3af',
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                Each selected size sends its own measurements to the AI prompt. Real-world fit is an approximate visual preview, not a body measurement guarantee.
              </p>

              {applyingSize && (
                <p style={{ margin: '8px 0 0', color: '#f4f4f5', fontSize: 12 }}>
                  Applying {selectedSize} fit...
                </p>
              )}
            </div>

          </div>

          {/* ==================================================

              STATUS

          ================================================== */}

          <div className="control-card">

            <div className="card-title">

              LIVE STATUS

            </div>

            <div className="status-row">

              <span>

                Camera

              </span>

              <b

                className={

                  cameraOn

                    ? 'status-on'

                    : ''

                }

              >

                {cameraOn

                  ? 'ON'

                  : 'OFF'}

              </b>

            </div>

            <div className="status-row">

              <span>

                AI VTO

              </span>

              <b

                className={

                  aiLive

                    ? 'status-on'

                    : ''

                }

              >

                {aiLive

                  ? 'LIVE'

                  : 'OFF'}

              </b>

            </div>

            <div className="status-row">

              <span>

                Connection

              </span>

              <b>

                {connectionState}

              </b>

            </div>

          </div>

          {/* ==================================================

              PIPELINE

          ================================================== */}

          <div className="control-card">

            <div className="card-title">

              PIPELINE

            </div>

            <div className="pipeline-item">

              <span>

                01

              </span>

              <div>

                <strong>

                  Webcam

                </strong>

                <small>

                  Live camera

                </small>

              </div>

            </div>

            <div className="pipeline-item">

              <span>

                02

              </span>

              <div>

                <strong>

                  Garment

                </strong>

                <small>

                  Uploaded shirt

                </small>

              </div>

            </div>

            <div className="pipeline-item">

              <span>

                03

              </span>

              <div>

                <strong>

                  Lucy VTON 3.5

                </strong>

                <small>

                  Realtime VTO

                </small>

              </div>

            </div>

            <div className="pipeline-item">

              <span>

                04

              </span>

              <div>

                <strong>

                  AI Video

                </strong>

                <small>

                  Live transformed stream

                </small>

              </div>

            </div>

          </div>

          {/* ==================================================

              TIP

          ================================================== */}

          <div className="control-card tip-card">

            <div className="card-title">

              BEST RESULT

            </div>

            <p>

              Upload a clear garment-only

              image with the shirt fully

              visible. A clean or white

              background gives the AI a

              clearer garment reference.

            </p>

          </div>

        </aside>

      </main>

    </div>

  );

}

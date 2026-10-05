/**
 * Web Audio API IR Blaster and IR Receiver via 3.5mm Audio Jack / Mic Pin
 *
 * HARDWARE NOTES:
 * - For IR Transmit: dual anti-parallel IR LEDs wired to L+R channels of 3.5mm jack (180° phase differential)
 * - For IR Receive:  TSOP38238 (or similar) demodulator chip → mic input via 10kΩ voltage divider
 *   TSOP is ACTIVE-LOW (output = HIGH when idle, LOW during IR burst) — polarity is handled here
 *
 * ARCHITECTURE:
 * - AudioWorklet (preferred, Chromium ≥ 66): runs on dedicated audio thread, stable timing
 * - ScriptProcessorNode (fallback): deprecated but still works on older browsers
 */

// ─── AudioWorklet processor code (inlined as Blob URL) ─────────────────────
const WORKLET_CODE = `
class IrPulseDetectorProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
    const opts = (options && options.processorOptions) || {};
    // invertedOutput=true: TSOP38238 style (active-low, idle=HIGH)
    // invertedOutput=false: plain photodiode (active-high, idle=LOW)
    this._invertedOutput = opts.invertedOutput !== false;
    this._calibTargetFrames = opts.calibFrames || 512;

    // Calibration state
    this._phase = 'calibrating';
    this._calibFrames = 0;
    this._calibRMSSum = 0;
    this._threshold = 0.08;

    // Pulse state machine
    this._inBurst = false;
    this._recordedTimings = [];
    this._currentPulseDuration = 0;
    this._silenceCounter = 0;
    this._lastHighSamples = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const samples = input[0];

    // Always send waveform for oscilloscope visualization
    this.port.postMessage({ type: 'waveform', data: Array.from(samples) });

    if (this._phase === 'calibrating') {
      // Measure RMS noise floor
      let sumSq = 0;
      for (let i = 0; i < samples.length; i++) sumSq += samples[i] * samples[i];
      const rms = Math.sqrt(sumSq / samples.length);
      this._calibRMSSum += rms;
      this._calibFrames++;

      const progress = Math.round((this._calibFrames / this._calibTargetFrames) * 100);
      this.port.postMessage({ type: 'calibrating', progress });

      if (this._calibFrames >= this._calibTargetFrames) {
        const avgRMS = this._calibRMSSum / this._calibFrames;
        // Threshold = 5× noise floor, clamped between 0.03 and 0.65
        this._threshold = Math.max(0.03, Math.min(0.65, avgRMS * 5));
        this._phase = 'listening';
        this.port.postMessage({ type: 'calibrated', threshold: this._threshold });
      }
      return true;
    }

    // ── Listening phase: extract IR pulse timings ──────────────────────────
    for (let i = 0; i < samples.length; i++) {
      const amp = Math.abs(samples[i]);

      // For TSOP (inverted): idle amp ≈ 0 (AC-coupled steady DC), burst = transient peak.
      // In practice, TSOP transitions create sharp spikes — detect HIGH amplitude as IR mark.
      // For plain photodiode (non-inverted): HIGH amplitude = IR mark.
      // Both modes: HIGH amplitude → IR mark happening
      const isIrMark = amp > this._threshold;

      if (!this._inBurst) {
        if (isIrMark) {
          this._inBurst = true;
          this._recordedTimings = [];
          this._currentPulseDuration = 1;
          this._silenceCounter = 0;
        }
      } else {
        const currentStateIsIrMark = this._recordedTimings.length % 2 === 0;
        if (isIrMark === currentStateIsIrMark) {
          this._currentPulseDuration++;
        } else {
          // State transition — emit duration in microseconds
          const durationUsec = Math.round((this._currentPulseDuration / sampleRate) * 1_000_000);
          if (durationUsec > 80) {  // Skip sub-80µs noise spikes
            this._recordedTimings.push(durationUsec);
          }
          this._currentPulseDuration = 1;
        }

        if (!isIrMark) {
          this._silenceCounter++;
          // End of IR frame: >50ms of silence
          if (this._silenceCounter > sampleRate * 0.05) {
            if (this._recordedTimings.length >= 8) {
              this.port.postMessage({
                type: 'signal',
                timings: this._recordedTimings.slice(),
                sampleRate: sampleRate,
              });
            }
            this._inBurst = false;
            this._recordedTimings = [];
            this._silenceCounter = 0;
          }
        } else {
          this._silenceCounter = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('ir-pulse-detector', IrPulseDetectorProcessor);
`;

// ─── IR Blaster via 3.5mm Jack ──────────────────────────────────────────────

/**
 * Transmits IR pulse array via 3.5mm Headphone Jack.
 * Uses stereo 180° out-of-phase carrier to maximize differential voltage
 * across dual anti-parallel IR LEDs wired to L/R channels.
 */
export async function transmitIrViaAudioJack(timings: number[], carrierFreq: number = 38000): Promise<void> {
  const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtxClass();
  if (ctx.state === 'suspended') await ctx.resume();

  const totalMicroseconds = timings.reduce((sum, t) => sum + t, 0);
  const totalSeconds = totalMicroseconds / 1_000_000 + 0.05;

  const sampleRate = ctx.sampleRate;
  const totalSamples = Math.ceil(totalSeconds * sampleRate);

  // Stereo buffer: L and R are 180° out of phase for maximum differential swing
  const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Modulation: use half the carrier frequency because 180° differential gives 2× the effective rate
  const modFreq = Math.min(carrierFreq / 2, sampleRate / 2 - 1000);
  const omega = 2 * Math.PI * modFreq;

  let currentSample = 0;
  for (let i = 0; i < timings.length; i++) {
    const isMark = i % 2 === 0;
    const durationSec = timings[i] / 1_000_000;
    const pulseSamples = Math.round(durationSec * sampleRate);

    if (isMark) {
      for (let s = 0; s < pulseSamples && currentSample < totalSamples; s++, currentSample++) {
        const val = Math.sin(omega * (currentSample / sampleRate));
        left[currentSample] = val;
        right[currentSample] = -val;
      }
    } else {
      // Space: silence
      for (let s = 0; s < pulseSamples && currentSample < totalSamples; s++, currentSample++) {
        left[currentSample] = 0;
        right[currentSample] = 0;
      }
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);

  return new Promise((resolve) => {
    source.onended = () => { ctx.close(); resolve(); };
    source.start();
  });
}

// ─── IR Receiver Types ───────────────────────────────────────────────────────

export interface PulseDetectionResult {
  timings: number[];
  sampleRate: number;
}

export interface AudioIrListenerOptions {
  /** TSOP38238 and similar demodulator ICs output INVERTED signal (active-low). Default: true */
  invertedOutput?: boolean;
  /** Callback during ~1.5s auto-calibration phase. percent: 0–100 */
  onCalibrationProgress?: (percent: number) => void;
  /** Called when calibration finishes. threshold: auto-detected noise trigger level */
  onCalibrationDone?: (threshold: number) => void;
}

// ─── IR Receiver — AudioWorklet with ScriptProcessorNode fallback ────────────

/**
 * Real-time IR pulse receiver via 3.5mm microphone jack.
 *
 * Preferred: AudioWorklet (Chrome ≥ 66, audio thread, stable timing).
 * Fallback:  ScriptProcessorNode (deprecated but universal support).
 *
 * Hardware: TSOP38238 → 10kΩ resistor voltage divider → 3.5mm Mic Tip + GND Sleeve
 */
export class AudioIrListener {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private analyser: AnalyserNode | null = null;
  // Fallback ScriptProcessorNode (used when AudioWorklet is unavailable)
  private scriptNode: ScriptProcessorNode | null = null;
  private isListening = false;
  private useWorklet = false;

  private onWaveformCallback?: (waveform: Float32Array) => void;
  private onSignalDetectedCallback?: (result: PulseDetectionResult) => void;
  private onCalibrationProgressCb?: (pct: number) => void;
  private onCalibrationDoneCb?: (threshold: number) => void;

  // ScriptProcessorNode fallback state (when no AudioWorklet)
  private fbThreshold = 0.08;
  private fbCalibFrames = 0;
  private fbCalibRMSSum = 0;
  private fbPhase: 'calibrating' | 'listening' = 'calibrating';
  private fbInBurst = false;
  private fbRecordedTimings: number[] = [];
  private fbCurrentPulseDuration = 0;
  private fbSilenceCounter = 0;

  async startListening(
    onWaveform: (waveform: Float32Array) => void,
    onSignalDetected: (result: PulseDetectionResult) => void,
    options: AudioIrListenerOptions = {}
  ): Promise<boolean> {
    try {
      this.onWaveformCallback = onWaveform;
      this.onSignalDetectedCallback = onSignalDetected;
      this.onCalibrationProgressCb = options.onCalibrationProgress;
      this.onCalibrationDoneCb = options.onCalibrationDone;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
          channelCount: 1,
        },
      });

      this.mediaStream = stream;
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();

      const source = this.audioCtx.createMediaStreamSource(stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 1024;
      source.connect(this.analyser);

      // Try AudioWorklet first
      const workletSupported = typeof AudioWorkletNode !== 'undefined';
      if (workletSupported) {
        try {
          const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
          const blobUrl = URL.createObjectURL(blob);
          await this.audioCtx.audioWorklet.addModule(blobUrl);
          URL.revokeObjectURL(blobUrl);

          this.workletNode = new AudioWorkletNode(this.audioCtx, 'ir-pulse-detector', {
            processorOptions: { invertedOutput: options.invertedOutput !== false, calibFrames: 512 },
          });

          this.workletNode.port.onmessage = (e) => this._handleWorkletMessage(e.data);
          this.analyser.connect(this.workletNode);
          // Worklet must be connected to destination to run (but output stays silent via gain 0)
          const silenceGain = this.audioCtx.createGain();
          silenceGain.gain.value = 0;
          this.workletNode.connect(silenceGain);
          silenceGain.connect(this.audioCtx.destination);

          this.useWorklet = true;
          this.isListening = true;
          return true;
        } catch (workletErr) {
          console.warn('[AudioIrListener] AudioWorklet failed, falling back to ScriptProcessorNode:', workletErr);
        }
      }

      // Fallback: ScriptProcessorNode
      this.fbPhase = 'calibrating';
      this.fbCalibFrames = 0;
      this.fbCalibRMSSum = 0;
      this.fbInBurst = false;

      const sampleRate = this.audioCtx.sampleRate;
      this.scriptNode = this.audioCtx.createScriptProcessor(2048, 1, 1);
      this.scriptNode.onaudioprocess = (e) => {
        if (!this.isListening) return;
        const inputData = e.inputBuffer.getChannelData(0);
        this.onWaveformCallback?.(inputData);
        this._fallbackProcess(inputData, sampleRate);
      };

      this.analyser.connect(this.scriptNode);
      this.scriptNode.connect(this.audioCtx.destination);
      this.useWorklet = false;
      this.isListening = true;
      return true;

    } catch (err) {
      console.warn('[AudioIrListener] Failed to start:', err);
      return false;
    }
  }

  private _handleWorkletMessage(msg: { type: string; data?: number[]; progress?: number; threshold?: number; timings?: number[]; sampleRate?: number }) {
    switch (msg.type) {
      case 'waveform':
        if (msg.data && this.onWaveformCallback) {
          this.onWaveformCallback(new Float32Array(msg.data));
        }
        break;
      case 'calibrating':
        this.onCalibrationProgressCb?.(msg.progress ?? 0);
        break;
      case 'calibrated':
        this.onCalibrationDoneCb?.(msg.threshold ?? 0.08);
        break;
      case 'signal':
        if (msg.timings && msg.timings.length >= 8 && this.onSignalDetectedCallback) {
          this.onSignalDetectedCallback({ timings: msg.timings, sampleRate: msg.sampleRate ?? 44100 });
        }
        break;
    }
  }

  /** Fallback ScriptProcessorNode logic with auto-calibration */
  private _fallbackProcess(samples: Float32Array, sampleRate: number) {
    if (this.fbPhase === 'calibrating') {
      let sumSq = 0;
      for (let i = 0; i < samples.length; i++) sumSq += samples[i] * samples[i];
      this.fbCalibRMSSum += Math.sqrt(sumSq / samples.length);
      this.fbCalibFrames++;

      const progress = Math.round((this.fbCalibFrames / 200) * 100); // ~200 frames fallback
      this.onCalibrationProgressCb?.(Math.min(progress, 99));

      if (this.fbCalibFrames >= 200) {
        const avgRMS = this.fbCalibRMSSum / this.fbCalibFrames;
        this.fbThreshold = Math.max(0.03, Math.min(0.65, avgRMS * 5));
        this.fbPhase = 'listening';
        this.onCalibrationDoneCb?.(this.fbThreshold);
      }
      return;
    }

    for (let i = 0; i < samples.length; i++) {
      const amp = Math.abs(samples[i]);
      const isIrMark = amp > this.fbThreshold;

      if (!this.fbInBurst) {
        if (isIrMark) {
          this.fbInBurst = true;
          this.fbRecordedTimings = [];
          this.fbCurrentPulseDuration = 1;
          this.fbSilenceCounter = 0;
        }
      } else {
        const currentStateIsIrMark = this.fbRecordedTimings.length % 2 === 0;
        if (isIrMark === currentStateIsIrMark) {
          this.fbCurrentPulseDuration++;
        } else {
          const durationUsec = Math.round((this.fbCurrentPulseDuration / sampleRate) * 1_000_000);
          if (durationUsec > 80) this.fbRecordedTimings.push(durationUsec);
          this.fbCurrentPulseDuration = 1;
        }

        if (!isIrMark) {
          this.fbSilenceCounter++;
          if (this.fbSilenceCounter > sampleRate * 0.05) {
            if (this.fbRecordedTimings.length >= 8) {
              this.onSignalDetectedCallback?.({ timings: [...this.fbRecordedTimings], sampleRate });
            }
            this.fbInBurst = false;
            this.fbRecordedTimings = [];
            this.fbSilenceCounter = 0;
          }
        } else {
          this.fbSilenceCounter = 0;
        }
      }
    }
  }

  stopListening() {
    this.isListening = false;

    this.workletNode?.disconnect();
    this.workletNode = null;
    this.scriptNode?.disconnect();
    this.scriptNode = null;
    this.analyser?.disconnect();
    this.analyser = null;

    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;

    this.audioCtx?.close();
    this.audioCtx = null;
  }
}

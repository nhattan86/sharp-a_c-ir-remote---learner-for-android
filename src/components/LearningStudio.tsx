import React, { useState, useEffect, useRef } from 'react';
import { IrButtonConfig, IrSignalAnalysis } from '../types/remote';
import {
  AudioIrListener,
  transmitIrViaAudioJack,
  PulseDetectionResult,
} from '../utils/audioIr';
import {
  SerialIrReceiver,
  SerialPulseResult,
  isWebSerialSupported,
  ARDUINO_IR_RECEIVER_SKETCH,
} from '../utils/serialIr';
import {
  analyzeTimings,
  encodeStateToSharpTimings,
  SHARP_HDR_MARK,
  SHARP_BIT_MARK,
  SHARP_ONE_SPACE,
  SHARP_ZERO_SPACE,
} from '../utils/sharpProtocol';
import { sounds } from '../utils/soundEffects';
import {
  Radio,
  Mic,
  Camera,
  Cpu,
  Code2,
  CheckCircle,
  Play,
  X,
  Volume2,
  Copy,
  Terminal,
  RotateCcw,
  Pencil,
  Usb,
  ChevronDown,
  ChevronUp,
  FileCode,
  Info,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Language } from '../utils/i18n';

interface LearningStudioProps {
  button: IrButtonConfig;
  allButtons: IrButtonConfig[];
  onSelectButton: (buttonId: string) => void;
  onSaveCode: (buttonId: string, timings: number[], method: IrButtonConfig['learnedMethod']) => void;
  onResetButtonToDefault?: (buttonId: string) => void;
  onSaveCustomLabel?: (buttonId: string, label: string) => void;
  lang?: Language;
  onClose: () => void;
  isEmbedded?: boolean;
}

type TabType = 'protocol' | 'serial' | 'audio' | 'manual' | 'camera';

export const LearningStudio: React.FC<LearningStudioProps> = ({
  button,
  allButtons,
  onSelectButton,
  onSaveCode,
  onResetButtonToDefault,
  onSaveCustomLabel,
  lang = 'vi',
  onClose,
  isEmbedded = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('protocol');

  // Close on Escape key when opened as modal
  useEffect(() => {
    if (isEmbedded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEmbedded, onClose]);

  // Audio / Mic learning state
  const [isAudioListening, setIsAudioListening] = useState(false);
  const [audioCapturedTimings, setAudioCapturedTimings] = useState<number[] | null>(null);
  const [audioCalibrationPct, setAudioCalibrationPct] = useState<number | null>(null);
  const [audioThreshold, setAudioThreshold] = useState<number | null>(null);
  const [audioInvertedPolarity, setAudioInvertedPolarity] = useState<boolean>(true);
  const audioListenerRef = useRef<AudioIrListener | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Web Serial API state
  const [isSerialConnected, setIsSerialConnected] = useState(false);
  const [serialLogs, setSerialLogs] = useState<string[]>([]);
  const [serialCaptured, setSerialCaptured] = useState<SerialPulseResult | null>(null);
  const [serialBaudRate, setSerialBaudRate] = useState<number>(115200);
  const [showArduinoSketch, setShowArduinoSketch] = useState(false);
  const [showHardwareGuide, setShowHardwareGuide] = useState(false);
  const serialReceiverRef = useRef<SerialIrReceiver | null>(null);
  const serialTerminalBottomRef = useRef<HTMLDivElement | null>(null);

  // Camera IR presence test state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraAnimIdRef = useRef<number | null>(null);
  const [cameraLuxHistory, setCameraLuxHistory] = useState<number[]>([]);
  const [cameraDetected, setCameraDetected] = useState(false);

  // Manual code input
  const [manualInput, setManualInput] = useState(button.rawTimings.join(', '));
  const [manualInputFormat, setManualInputFormat] = useState<'timings' | 'pronto'>('timings');
  const [manualPreview, setManualPreview] = useState<IrSignalAnalysis | null>(null);

  // Feedback & Copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Label edit state
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(button.customLabel || '');

  // Current analysis of active button timings
  const analysis: IrSignalAnalysis = analyzeTimings(button.rawTimings);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAudioLearning();
      stopCameraLearning();
      stopSerialLearning();
    };
  }, []);

  // Update state when active button changes
  useEffect(() => {
    setManualInput(button.rawTimings.join(', '));
    setAudioCapturedTimings(null);
    setSerialCaptured(null);
    setTestResult(null);
    setManualPreview(null);
    setCameraDetected(false);
    setIsEditingLabel(false);
    setLabelDraft(button.customLabel || '');
  }, [button.id]);

  // Auto-scroll serial log
  useEffect(() => {
    if (activeTab === 'serial' && isSerialConnected) {
      serialTerminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [serialLogs, activeTab, isSerialConnected]);

  // Live-preview manual input as the user types
  useEffect(() => {
    if (activeTab !== 'manual') return;
    try {
      let parsed: number[] = [];
      if (manualInputFormat === 'pronto') {
        const tokens = manualInput.trim().split(/\s+/);
        if (tokens.length >= 4) {
          const freqCode = parseInt(tokens[1], 16);
          const freq = Math.round(1000000 / (freqCode * 0.241246));
          const timeBase = 1000000 / freq;
          for (let i = 4; i < tokens.length; i++) {
            const val = parseInt(tokens[i], 16);
            if (!isNaN(val)) parsed.push(Math.round(val * timeBase));
          }
        }
      } else {
        parsed = manualInput
          .replace(/[\[\]]/g, '')
          .split(/[\s,]+/)
          .map((v) => parseInt(v.trim(), 10))
          .filter((v) => !isNaN(v) && v > 0);
      }
      if (parsed.length >= 8) {
        setManualPreview(analyzeTimings(parsed));
      } else {
        setManualPreview(null);
      }
    } catch {
      setManualPreview(null);
    }
  }, [manualInput, manualInputFormat, activeTab]);

  // Handle copy helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // -------------------------------------------------------------
  // TAB 1: SHARP PROTOCOL ENGINE (AUTO-GEN PRESET)
  // -------------------------------------------------------------
  const generatePresetForButton = () => {
    const timings = encodeStateToSharpTimings(
      {
        power: button.id !== 'power',
        mode: 'cool',
        temp: 24,
        fanSpeed: 5,
        swing: false,
        jet: button.id === 'powerful_jet',
        babyMode: button.id === 'baby_mode',
        gentleBreeze: button.id === 'breeze_gentle',
        eco: button.id === 'eco' ? 1 : 0,
        sleep: button.id === 'sleep',
        timerType: button.id === 'timer_on' ? 'on' : button.id === 'timer_off' ? 'off' : 'none',
        timerHours: 2,
      },
      button.id
    );
    onSaveCode(button.id, timings, 'preset');
    sounds.playAcDoubleBeep();
    setTestResult(lang === 'en'
      ? 'Loaded Sharp 104-bit standard code for this button!'
      : 'Đã nạp mã Sharp chuẩn 104-bit (IRremoteESP8266) cho nút này!');
  };

  // -------------------------------------------------------------
  // TAB 2: WEB SERIAL API (ARDUINO / ESP32 HARDWARE RECEIVER)
  // -------------------------------------------------------------
  const startSerialLearning = async () => {
    stopSerialLearning();
    setSerialCaptured(null);
    setSerialLogs([]);

    const receiver = new SerialIrReceiver();
    serialReceiverRef.current = receiver;

    try {
      const ok = await receiver.connect({
        baudRate: serialBaudRate,
        onLog: (line) => {
          setSerialLogs((prev) => [...prev.slice(-50), line]);
        },
        onSignalDetected: (res) => {
          sounds.playAcBeep();
          setSerialCaptured(res);
        },
        onConnect: () => {
          setIsSerialConnected(true);
          setTestResult(lang === 'en' ? 'Connected to USB Serial port.' : 'Đã kết nối cổng USB Serial.');
        },
        onDisconnect: () => {
          setIsSerialConnected(false);
        },
        onError: (err) => {
          console.warn('Serial error:', err);
          setTestResult(lang === 'en' ? `Serial error: ${err.message}` : `Lỗi Serial: ${err.message}`);
        },
      });

      if (ok) {
        setIsSerialConnected(true);
      }
    } catch (err: any) {
      alert(err.message || (lang === 'en' ? 'Serial port connection failed.' : 'Không thể kết nối cổng Serial.'));
    }
  };

  const stopSerialLearning = async () => {
    if (serialReceiverRef.current) {
      await serialReceiverRef.current.disconnect();
      serialReceiverRef.current = null;
    }
    setIsSerialConnected(false);
  };

  const applySerialCaptured = () => {
    if (serialCaptured && serialCaptured.timings.length >= 8) {
      onSaveCode(button.id, serialCaptured.timings, 'usb-serial');
      sounds.playAcDoubleBeep();
      setTestResult(
        lang === 'en'
          ? `Saved ${serialCaptured.timings.length} pulses from USB Serial!`
          : `Đã lưu ${serialCaptured.timings.length} xung từ USB Serial thành công!`
      );
    }
  };

  // -------------------------------------------------------------
  // TAB 3: AUDIO / 3.5mm PHOTODIODE LEARNING (AudioWorklet)
  // -------------------------------------------------------------
  const startAudioLearning = async () => {
    stopAudioLearning();
    setAudioCapturedTimings(null);
    setAudioCalibrationPct(0);
    setAudioThreshold(null);

    const listener = new AudioIrListener();
    audioListenerRef.current = listener;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    const ok = await listener.startListening(
      (waveform) => {
        if (!ctx || !canvas) return;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#22d3ee';
        ctx.beginPath();
        const sliceWidth = canvas.width / waveform.length;
        let x = 0;
        for (let i = 0; i < waveform.length; i++) {
          const v = waveform[i];
          const y = ((v + 1) / 2) * canvas.height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      },
      (result: PulseDetectionResult) => {
        sounds.playAcBeep();
        setAudioCapturedTimings(result.timings);
      },
      {
        invertedOutput: audioInvertedPolarity,
        onCalibrationProgress: (pct) => setAudioCalibrationPct(pct),
        onCalibrationDone: (thresh) => {
          setAudioCalibrationPct(null);
          setAudioThreshold(thresh);
        },
      }
    );

    if (ok) {
      setIsAudioListening(true);
    } else {
      alert(lang === 'en'
        ? 'Unable to access microphone/audio input. Please grant microphone permission.'
        : 'Không thể mở Microphone/Audio Jack. Vui lòng cấp quyền micro trong trình duyệt.');
    }
  };

  const stopAudioLearning = () => {
    if (audioListenerRef.current) {
      audioListenerRef.current.stopListening();
      audioListenerRef.current = null;
    }
    setIsAudioListening(false);
    setAudioCalibrationPct(null);
  };

  const applyAudioCaptured = () => {
    if (audioCapturedTimings && audioCapturedTimings.length > 0) {
      onSaveCode(button.id, audioCapturedTimings, 'audio-photodiode');
      stopAudioLearning();
      sounds.playAcDoubleBeep();
      setTestResult(lang === 'en' ? 'Saved IR code from 3.5mm jack!' : 'Đã lưu mã IR thu từ Jack 3.5mm thành công!');
    }
  };

  // -------------------------------------------------------------
  // TAB 4: MANUAL TIMINGS / PRONTO HEX
  // -------------------------------------------------------------
  const applyManualInput = () => {
    try {
      let parsedTimings: number[] = [];
      if (manualInputFormat === 'pronto') {
        const hexTokens = manualInput.trim().split(/\s+/);
        if (hexTokens.length < 4) {
          alert(lang === 'en' ? 'Invalid Pronto Hex format.' : 'Pronto Hex không hợp lệ.');
          return;
        }
        const freqCode = parseInt(hexTokens[1], 16);
        const freq = Math.round(1000000 / (freqCode * 0.241246));
        const timeBase = 1000000 / freq;
        for (let i = 4; i < hexTokens.length; i++) {
          const val = parseInt(hexTokens[i], 16);
          parsedTimings.push(Math.round(val * timeBase));
        }
      } else {
        parsedTimings = manualInput
          .replace(/[\[\]]/g, '')
          .split(/[\s,]+/)
          .map((v) => parseInt(v.trim(), 10))
          .filter((v) => !isNaN(v) && v > 0);
      }
      if (parsedTimings.length < 8) {
        alert(lang === 'en' ? 'Pulse train too short (minimum 8 pulses required).' : 'Chuỗi xung quá ngắn (tối thiểu 8 xung).');
        return;
      }
      onSaveCode(button.id, parsedTimings, 'manual');
      sounds.playAcBeep();
      setTestResult(lang === 'en' ? 'Manual code saved!' : 'Đã lưu mã nhập thủ công thành công!');
    } catch {
      alert(lang === 'en' ? 'Could not parse input. Please check syntax.' : 'Không thể đọc định dạng mã vừa nhập. Vui lòng kiểm tra lại.');
    }
  };

  // -------------------------------------------------------------
  // TAB 5: CAMERA IR PRESENCE TESTER (TEST ONLY)
  // -------------------------------------------------------------
  const startCameraLearning = async () => {
    stopCameraLearning();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
        trackCameraLuminance();
      }
    } catch {
      alert(lang === 'en' ? 'Unable to access camera.' : 'Không thể mở Camera để quét xung hồng ngoại.');
    }
  };

  const trackCameraLuminance = () => {
    const video = videoRef.current;
    const canvas = cameraCanvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let baseline = 0;
    let frames = 0;

    const loop = () => {
      if (!video || video.paused || video.ended) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const cx = Math.floor(canvas.width / 2) - 25;
      const cy = Math.floor(canvas.height / 2) - 25;
      const imgData = ctx.getImageData(cx, cy, 50, 50);
      const data = imgData.data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += data[i] * 0.4 + data[i + 1] * 0.2 + data[i + 2] * 0.4;
      }
      const avgBrightness = sum / (data.length / 4);
      if (frames < 30) {
        baseline = baseline === 0 ? avgBrightness : baseline * 0.9 + avgBrightness * 0.1;
        frames++;
      } else {
        const delta = avgBrightness - baseline;
        if (delta > 28) {
          setCameraDetected(true);
          sounds.playAcBeep();
        }
      }
      setCameraLuxHistory((prev) => [...prev.slice(-30), Math.round(avgBrightness)]);
      cameraAnimIdRef.current = requestAnimationFrame(loop);
    };
    cameraAnimIdRef.current = requestAnimationFrame(loop);
  };

  const stopCameraLearning = () => {
    if (cameraAnimIdRef.current) {
      cancelAnimationFrame(cameraAnimIdRef.current);
      cameraAnimIdRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Test Transmit via Audio Jack
  const testTransmitAudio = async () => {
    sounds.playKeyClick();
    setTestResult(lang === 'en' ? 'Transmitting via 3.5mm jack…' : 'Đang phát xung hồng ngoại qua cổng tai nghe 3.5mm...');
    try {
      await transmitIrViaAudioJack(button.rawTimings, button.carrierFreq);
      sounds.playAcBeep();
      setTestResult(lang === 'en' ? 'IR signal sent (38kHz, 104-bit).' : 'Đã phát xong tín hiệu IR (38 kHz, 104-bit).');
    } catch {
      setTestResult(lang === 'en' ? 'Audio IR transmit error.' : 'Lỗi khi phát âm thanh IR.');
    }
  };

  // Label save handler
  const commitLabel = () => {
    onSaveCustomLabel?.(button.id, labelDraft.trim());
    setIsEditingLabel(false);
  };

  const tabs: { id: TabType; label: string; Icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'protocol', label: lang === 'en' ? 'Sharp Factory' : 'Mã chuẩn Sharp', Icon: Cpu },
    { id: 'serial',   label: lang === 'en' ? 'USB Serial'     : 'USB Serial (Arduino)', Icon: Usb, badge: lang === 'en' ? 'Accurate' : 'Chuẩn nhất' },
    { id: 'audio',    label: lang === 'en' ? 'Jack 3.5mm'     : 'Jack 3.5mm / Mic', Icon: Mic },
    { id: 'manual',   label: lang === 'en' ? 'Manual Hex'     : 'Nhập thủ công', Icon: Code2 },
    { id: 'camera',   label: lang === 'en' ? 'Camera Test'    : 'Soi đèn IR (Test)', Icon: Camera },
  ];

  // ---------------------------------------------------------------
  // RENDER BODY
  // ---------------------------------------------------------------
  const contentBody = (
    <div className="space-y-4">
      {/* ── Button Switcher Bar ── */}
      <div>
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
          {lang === 'en' ? 'Select button to learn / configure:' : 'Chọn nút cần học lệnh / gán mã IR:'}
        </label>
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {allButtons.map((b) => (
            <button
              key={b.id}
              onClick={() => onSelectButton(b.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                b.id === button.id
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  b.learnedMethod !== 'preset' ? 'bg-emerald-400' : 'bg-slate-500'
                }`}
              />
              <span>{b.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Active button header with label editor & reset ── */}
      <div className="flex items-start justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-white truncate">{button.name}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">{button.functionDesc}</div>

          {/* Custom label */}
          {isEditingLabel ? (
            <div className="flex items-center gap-1.5 mt-1.5">
              <input
                autoFocus
                type="text"
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitLabel();
                  if (e.key === 'Escape') setIsEditingLabel(false);
                }}
                placeholder={lang === 'en' ? 'e.g. Night mode 26°C…' : 'VD: Ngủ đêm 26°C…'}
                className="flex-1 min-w-0 px-2 py-0.5 bg-slate-800 border border-indigo-500 rounded text-xs text-slate-100 focus:outline-none"
                maxLength={40}
              />
              <button onClick={commitLabel} className="p-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded cursor-pointer transition-colors">
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setIsEditingLabel(false)} className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded cursor-pointer transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsEditingLabel(true);
                setLabelDraft(button.customLabel || '');
              }}
              className="flex items-center gap-1 mt-1 cursor-pointer group/lbl"
              title={lang === 'en' ? 'Set custom label' : 'Đặt tên cho mã'}
            >
              <span className={`text-[11px] ${button.customLabel ? 'text-indigo-300 font-medium' : 'text-slate-500 italic'}`}>
                {button.customLabel || (lang === 'en' ? 'Add a label…' : 'Thêm nhãn cho mã…')}
              </span>
              <Pencil className="w-2.5 h-2.5 text-slate-600 group-hover/lbl:text-indigo-400 transition-colors" />
            </button>
          )}
        </div>

        {/* Reset this button to default */}
        {onResetButtonToDefault && (
          <button
            onClick={() => {
              if (confirm(lang === 'en' ? `Reset "${button.name}" to factory Sharp default?` : `Khôi phục nút "${button.name}" về mã gốc Sharp?`)) {
                onResetButtonToDefault(button.id);
                setTestResult(lang === 'en' ? 'Reset to factory default!' : 'Đã khôi phục mã gốc Sharp!');
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-900/40 border border-slate-700 hover:border-amber-600/40 text-slate-300 hover:text-amber-300 text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
            title={lang === 'en' ? 'Reset this button to Sharp factory default' : 'Khôi phục mã gốc Sharp cho nút này'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'en' ? 'Reset' : 'Khôi phục'}</span>
          </button>
        )}
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex border-b border-slate-800 gap-0.5 overflow-x-auto scrollbar-thin">
        {tabs.map(({ id, label, Icon, badge }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
            {badge && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-300 font-bold">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Body ── */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 min-h-[220px]">

        {/* TAB 1: SHARP PROTOCOL ENGINE */}
        {activeTab === 'protocol' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-400 leading-relaxed">
              {lang === 'en'
                ? 'Generates a verified Sharp AC 104-bit code from the library of standard commands. Timing constants match the IRremoteESP8266 standard for AY-ZP40KR / CRMC-A907 remotes.'
                : 'Sinh mã Sharp A/C 104-bit đã xác minh theo chuẩn IRremoteESP8266 (AY-ZP40KR / CRMC-A907). Timing constants: Mark=470µs, Zero=500µs, One=1400µs.'}
            </div>

            {/* Protocol info box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-900 rounded-lg border border-slate-800 text-center text-[11px] font-mono">
              <div>
                <div className="text-slate-500">Header</div>
                <div className="text-emerald-400 font-bold">{SHARP_HDR_MARK}µs</div>
              </div>
              <div>
                <div className="text-slate-500">Bit Mark</div>
                <div className="text-cyan-400 font-bold">{SHARP_BIT_MARK}µs</div>
              </div>
              <div>
                <div className="text-slate-500">One Space</div>
                <div className="text-amber-400 font-bold">{SHARP_ONE_SPACE}µs</div>
              </div>
              <div>
                <div className="text-slate-500">Zero Space</div>
                <div className="text-purple-400 font-bold">{SHARP_ZERO_SPACE}µs</div>
              </div>
            </div>

            {/* What this button will send */}
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">
                {lang === 'en' ? 'This preset will send:' : 'Lệnh sẽ được gửi:'}
              </div>
              <div className="text-xs text-slate-200 font-mono">
                {button.id === 'power'         && (lang === 'en' ? 'POWER OFF — toggle (Power=OFF frame)' : 'TẮT nguồn — Power OFF frame')}
                {button.id === 'powerful_jet'  && (lang === 'en' ? 'Jet Cool — Power ON · Cool · 16°C · Fan HIGH' : 'Jet Cool — BẬT · Cool · 16°C · Quạt cao')}
                {button.id === 'temp_up'       && (lang === 'en' ? 'Temp UP — Cool · 25°C · Fan AUTO' : 'Tăng nhiệt — Cool · 25°C · Quạt AUTO')}
                {button.id === 'temp_down'     && (lang === 'en' ? 'Temp DOWN — Cool · 23°C · Fan AUTO' : 'Giảm nhiệt — Cool · 23°C · Quạt AUTO')}
                {button.id === 'mode'          && (lang === 'en' ? 'MODE cycle — Dry · 24°C · Fan AUTO' : 'Chuyển chế độ — Dry · 24°C · Quạt AUTO')}
                {button.id === 'breeze_gentle' && (lang === 'en' ? 'Gentle Breeze ON — ceiling airflow' : 'Gió nhẹ BẬT — thổi hướng trần')}
                {button.id === 'baby_mode'     && (lang === 'en' ? 'Baby Mode ON — soft cooling' : 'Chế độ trẻ nhỏ BẬT')}
                {button.id === 'fan_speed'     && (lang === 'en' ? 'Fan cycle — Speed 2 · Cool · 24°C' : 'Chu kỳ quạt — Tốc độ 2 · Cool · 24°C')}
                {button.id === 'swing'         && (lang === 'en' ? 'Swing ON — auto louvre sweep' : 'Swing BẬT — cánh gió tự đảo')}
                {button.id === 'timer_on'      && (lang === 'en' ? 'Timer ON — power on in 2h' : 'Hẹn giờ BẬT — bật sau 2 giờ')}
                {button.id === 'timer_off'     && (lang === 'en' ? 'Timer OFF — power off in 4h' : 'Hẹn giờ TẮT — tắt sau 4 giờ')}
                {button.id === 'eco'           && (lang === 'en' ? 'ECO 1 — -2~4% power save' : 'ECO 1 — tiết kiệm 2-4% điện')}
                {button.id === 'sleep'         && (lang === 'en' ? 'Sleep ON — quiet night mode' : 'Ngủ đêm BẬT — êm ái ban đêm')}
                {button.id === 'timer_cancel'  && (lang === 'en' ? 'Cancel Timer — clear any timer' : 'Hủy hẹn giờ — xóa lịch hẹn')}
                {button.id === 'reset'         && (lang === 'en' ? 'RESET — factory defaults (24°C, Cool, Auto fan)' : 'RESET — khôi phục gốc (24°C, Cool, Quạt AUTO)')}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <button
                onClick={generatePresetForButton}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Cpu className="w-4 h-4" />
                {lang === 'en' ? 'Load Sharp preset for this button' : 'Nạp mã Sharp chuẩn cho nút này'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: USB SERIAL IR (ARDUINO / ESP32 HARDWARE RECEIVER) */}
        {activeTab === 'serial' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-800/60 text-xs text-indigo-300">
              <Info className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">
                  {lang === 'en' ? 'Hardware IR Learning via Web Serial API' : 'Phương pháp học mã hồng ngoại chuẩn xác nhất:'}
                </span>
                <span className="text-slate-300 block text-[11px] leading-relaxed">
                  {lang === 'en'
                    ? 'Connect an Arduino, ESP32, or USB-UART module with a TSOP38238 receiver via USB or USB-OTG. The microcontroller samples microsecond pulses with hardware interrupts and streams them directly into this browser tab.'
                    : 'Cắm vi điều khiển (Arduino Nano/Uno, ESP32) có gắn mắt nhận TSOP38238 qua cổng USB máy tính hoặc cáp USB-OTG trên điện thoại. Vi điều khiển sẽ đo xung vi giây bằng ngắt phần cứng chính xác tuyệt đối.'}
                </span>
              </div>
            </div>

            {!isWebSerialSupported() && (
              <div className="p-3 bg-amber-950/50 border border-amber-800/80 rounded-lg text-xs text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <div className="font-bold">
                    {lang === 'en' ? 'Web Serial API is not supported in this browser' : 'Trình duyệt hiện tại chưa hỗ trợ Web Serial API'}
                  </div>
                  <div className="text-[11px] text-amber-200/80 mt-0.5">
                    {lang === 'en'
                      ? 'Please open this web app in Google Chrome, Microsoft Edge, or Chrome for Android (enable chrome://flags/#enable-web-serial if needed).'
                      : 'Vui lòng mở trên Google Chrome, Microsoft Edge trên máy tính, hoặc Chrome Android (bật chrome://flags/#enable-web-serial nếu cần).'}
                  </div>
                </div>
              </div>
            )}

            {/* Serial Controls */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {!isSerialConnected ? (
                  <button
                    onClick={startSerialLearning}
                    disabled={!isWebSerialSupported()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Usb className="w-4 h-4" />
                    {lang === 'en' ? 'Connect USB Device' : 'Kết nối thiết bị USB'}
                  </button>
                ) : (
                  <button
                    onClick={stopSerialLearning}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    {lang === 'en' ? 'Disconnect' : 'Ngắt kết nối'}
                  </button>
                )}

                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <span className="text-[11px]">Baud:</span>
                  <select
                    value={serialBaudRate}
                    onChange={(e) => setSerialBaudRate(Number(e.target.value))}
                    disabled={isSerialConnected}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none"
                  >
                    <option value={115200}>115200</option>
                    <option value={57600}>57600</option>
                    <option value={9600}>9600</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowHardwareGuide((v) => !v)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Info className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{lang === 'en' ? 'Wiring Guide' : 'Sơ đồ nối dây'}</span>
                  {showHardwareGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => setShowArduinoSketch((v) => !v)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'en' ? 'Arduino Code' : 'Mã Arduino'}</span>
                  {showArduinoSketch ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Collapsible Hardware Guide */}
            {showHardwareGuide && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-2">
                <div className="font-semibold text-slate-200">
                  {lang === 'en' ? 'TSOP38238 / VS1838B Pinout to Arduino:' : 'Sơ đồ chân TSOP38238 / VS1838B nối Arduino:'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-400 block">Pin 1 (OUT):</span>
                    <strong className="text-cyan-400">Arduino D2 (hoặc ESP32 D15)</strong>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-400 block">Pin 2 (GND):</span>
                    <strong className="text-slate-200">GND</strong>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-400 block">Pin 3 (VCC):</span>
                    <strong className="text-rose-400">5V (hoặc 3.3V)</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Collapsible Arduino Sketch */}
            {showArduinoSketch && (
              <div className="space-y-2 p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-300">
                    {lang === 'en' ? 'Arduino Sketch (IRremote):' : 'Mã nạp Arduino (thư viện IRremote):'}
                  </span>
                  <button
                    onClick={() => copyToClipboard(ARDUINO_IR_RECEIVER_SKETCH, 'arduino')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedKey === 'arduino' ? (lang === 'en' ? 'Copied!' : 'Đã sao chép!') : (lang === 'en' ? 'Copy Code' : 'Sao chép')}
                  </button>
                </div>
                <pre className="p-2.5 bg-slate-950 rounded border border-slate-800 text-[10px] font-mono text-slate-300 max-h-40 overflow-y-auto leading-relaxed scrollbar-thin">
                  {ARDUINO_IR_RECEIVER_SKETCH}
                </pre>
              </div>
            )}

            {/* Live Serial Terminal */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{lang === 'en' ? 'Serial Output Monitor:' : 'Nhật ký cổng nối tiếp (Serial Terminal):'}</span>
                <span>{isSerialConnected ? (lang === 'en' ? 'Status: OPEN' : 'Trạng thái: ĐANG MỞ') : (lang === 'en' ? 'Status: CLOSED' : 'Trạng thái: ĐÃ ĐÓNG')}</span>
              </div>
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg h-28 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-0.5 scrollbar-thin">
                {serialLogs.length === 0 ? (
                  <div className="text-slate-600 italic">
                    {isSerialConnected
                      ? (lang === 'en' ? 'Listening for IR pulses from Arduino… Press any remote button.' : 'Đang chờ nhận xung IR từ Arduino… Hãy bấm nút trên remote thật.')
                      : (lang === 'en' ? 'Click "Connect USB Device" above to start.' : 'Bấm "Kết nối thiết bị USB" ở trên để bắt đầu.')}
                  </div>
                ) : (
                  serialLogs.map((log, i) => (
                    <div key={i} className="leading-snug break-all text-slate-400">
                      <span className="text-indigo-400 select-none mr-1.5">&gt;</span>
                      {log}
                    </div>
                  ))
                )}
                <div ref={serialTerminalBottomRef} />
              </div>
            </div>

            {/* Signal Captured Card */}
            {serialCaptured && (
              <div className="p-3 bg-slate-900 border border-emerald-800/80 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'en' ? 'IR Signal Captured from USB Serial!' : 'Đã bắt được mã IR từ USB Serial!'}</span>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400">
                    {serialCaptured.timings.length} {lang === 'en' ? 'pulses' : 'xung'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  Leader: {serialCaptured.timings[0]}µs / {serialCaptured.timings[1]}µs
                  {analyzeTimings(serialCaptured.timings).validSharpProtocol && (
                    <span className="ml-2 text-emerald-400 font-semibold">— Sharp A/C Protocol OK</span>
                  )}
                </div>

                <button
                  onClick={applySerialCaptured}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {lang === 'en'
                      ? `Assign ${serialCaptured.timings.length} pulses to [${button.name}]`
                      : `Gán ${serialCaptured.timings.length} xung này cho nút [${button.name}]`}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUDIO / 3.5MM JACK (AudioWorklet) */}
        {activeTab === 'audio' && (
          <div className="space-y-3">
            {/* Step guide */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { step: '1', text: lang === 'en' ? 'Plug IR receiver into 3.5mm jack' : 'Cắm đầu thu IR vào jack 3.5mm', active: !isAudioListening && !audioCapturedTimings },
                { step: '2', text: lang === 'en' ? 'Tap "Start" then aim remote & press button' : 'Bấm "Bắt đầu" rồi chĩa remote bấm nút', active: isAudioListening },
                { step: '3', text: lang === 'en' ? 'Review signal then tap "Save"' : 'Xem tín hiệu rồi bấm "Lưu mã"', active: !!audioCapturedTimings },
              ].map(({ step, text, active }) => (
                <div key={step} className={`p-2 rounded-lg border text-[11px] transition-colors ${active ? 'bg-indigo-950/60 border-indigo-600 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                  <div className={`text-lg font-black mb-0.5 ${active ? 'text-indigo-400' : 'text-slate-600'}`}>{step}</div>
                  {text}
                </div>
              ))}
            </div>

            {/* Oscilloscope Canvas */}
            <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
              <canvas ref={canvasRef} width={500} height={100} className="w-full h-24 block" />
              <div className="absolute top-2 left-2 text-[10px] font-mono text-cyan-400 bg-slate-900/80 px-2 py-0.5 rounded">
                {isAudioListening
                  ? (audioCalibrationPct !== null && audioCalibrationPct < 100
                      ? (lang === 'en' ? `CALIBRATING (${audioCalibrationPct}%)…` : `ĐANG HIỆU CHUẨN (${audioCalibrationPct}%)…`)
                      : (lang === 'en' ? 'LISTENING (AudioWorklet)…' : 'ĐANG LẮNG NGHE (AudioWorklet)…'))
                  : (lang === 'en' ? 'IDLE' : 'CHƯA BẬT THU')}
              </div>
              {isAudioListening && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>

            {/* Calibration & Polarity options */}
            <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex-wrap gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={audioInvertedPolarity}
                  onChange={(e) => setAudioInvertedPolarity(e.target.checked)}
                  disabled={isAudioListening}
                  className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span>{lang === 'en' ? 'TSOP Active-Low Inverted (Recommended)' : 'Đảo cực TSOP38238 (Active-Low chuẩn)'}</span>
              </label>

              {audioThreshold !== null && (
                <span className="text-[11px] font-mono text-emerald-400">
                  {lang === 'en' ? 'Noise Floor Threshold:' : 'Ngưỡng cắt nhiễu:'} {audioThreshold.toFixed(3)}
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {!isAudioListening ? (
                <button
                  onClick={startAudioLearning}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Mic className="w-4 h-4" />
                  {lang === 'en' ? 'Start Listening' : 'Bắt đầu thu'}
                </button>
              ) : (
                <button
                  onClick={stopAudioLearning}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                  {lang === 'en' ? 'Stop' : 'Dừng thu'}
                </button>
              )}

              {audioCapturedTimings && (
                <button
                  onClick={applyAudioCaptured}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  {lang === 'en' ? `Save ${audioCapturedTimings.length} pulses` : `Lưu ${audioCapturedTimings.length} xung vừa bắt`}
                </button>
              )}
            </div>

            {audioCapturedTimings && (
              <div className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1">
                <div>
                  <span className="text-emerald-400 font-bold">{lang === 'en' ? 'Signal captured: ' : 'Đã bắt được tín hiệu: '}</span>
                  {audioCapturedTimings.length} {lang === 'en' ? 'pulses' : 'xung'}
                </div>
                <div className="text-slate-400 text-[11px]">
                  Leader: {audioCapturedTimings[0]}µs / {audioCapturedTimings[1]}µs
                  {analyzeTimings(audioCapturedTimings).validSharpProtocol && (
                    <span className="ml-2 text-emerald-400 font-semibold">— Sharp A/C OK</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MANUAL INPUT */}
        {activeTab === 'manual' && (
          <div className="space-y-3">
            {/* Format toggle */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">{lang === 'en' ? 'Format:' : 'Định dạng:'}</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setManualInputFormat('timings')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    manualInputFormat === 'timings' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Microseconds
                </button>
                <button
                  onClick={() => setManualInputFormat('pronto')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    manualInputFormat === 'pronto' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Pronto Hex
                </button>
              </div>
            </div>

            <textarea
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              rows={4}
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              placeholder={
                manualInputFormat === 'pronto'
                  ? '0000 006D 0000 006A 0090 0048 0012 0036…'
                  : '3800, 1900, 470, 1400, 470, 500…'
              }
              spellCheck={false}
            />

            {/* Live preview */}
            {manualPreview && (
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1 text-[11px]">
                <div className="font-semibold text-slate-300">{lang === 'en' ? 'Preview:' : 'Xem trước:'}</div>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  <span className="text-slate-400">{lang === 'en' ? 'Pulses:' : 'Số xung:'} <strong className="text-cyan-400">{manualPreview.totalPulses}</strong></span>
                  <span className="text-slate-400">{lang === 'en' ? 'Duration:' : 'Thời gian:'} <strong className="text-amber-400">{manualPreview.durationMs}ms</strong></span>
                  <span className={manualPreview.validSharpProtocol ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                    {manualPreview.validSharpProtocol ? 'Sharp A/C OK' : (lang === 'en' ? 'Non-Sharp' : 'Không phải Sharp')}
                  </span>
                </div>
                <div className="text-slate-500">
                  {lang === 'en' ? 'Leader:' : 'Mào đầu:'} {manualPreview.preambleMark}µs / {manualPreview.preambleSpace}µs
                </div>
              </div>
            )}

            <button
              onClick={applyManualInput}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              {lang === 'en' ? 'Save this code' : 'Lưu mã vừa nhập'}
            </button>
          </div>
        )}

        {/* TAB 5: CAMERA IR PRESENCE TESTER (TEST ONLY) */}
        {activeTab === 'camera' && (
          <div className="space-y-3">
            {/* Technical honest notice */}
            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg text-xs text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{lang === 'en' ? 'Technical Notice: Tester Only (Cannot Decode IR Pulses)' : 'Lưu ý kỹ thuật: Chỉ dùng kiểm tra phát quang (Không giải mã được mã IR)'}</span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                {lang === 'en'
                  ? 'Phone cameras record at 30 frames/sec (33,000µs per frame). A Sharp IR signal sends pulses every 470µs at 38,000Hz, making optical pulse decoding physically impossible with standard camera sensors. Use this tab to verify whether your physical remote control battery is alive and emitting infrared light.'
                  : 'Cảm biến camera điện thoại chỉ quét 30 khung hình/giây (33.000µs/khung). Tín hiệu hồng ngoại Sharp truyền chuỗi xung vi giây (470µs) ở tần số 38.000Hz, nên camera không thể giải mã các bit 0/1. Chức năng này giúp bạn soi đèn LED của remote xem pin còn hoạt động hay không (đèn IR sẽ chớp tím/hồng).'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              {/* Camera View */}
              <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
                />
                <canvas ref={cameraCanvasRef} width={160} height={120} className="hidden" />
                {!isCameraActive && (
                  <span className="text-xs text-slate-500">{lang === 'en' ? 'Camera off' : 'Camera đang tắt'}</span>
                )}
                {/* IR crosshair overlay */}
                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-12 h-12 border-2 border-dashed border-cyan-400/50 rounded-full" />
                  </div>
                )}
                {cameraDetected && (
                  <div className="absolute inset-0 bg-violet-600/30 flex items-center justify-center animate-pulse pointer-events-none">
                    <span className="bg-slate-900/90 text-violet-300 text-xs px-2.5 py-1 rounded font-bold border border-violet-500/50 shadow-lg">
                      {lang === 'en' ? 'IR LIGHT DETECTED!' : 'ĐÃ PHÁT HIỆN TIA HỒNG NGOẠI!'}
                    </span>
                  </div>
                )}
              </div>

              {/* Strobe Chart & Controls */}
              <div className="space-y-2">
                <div className="text-[11px] text-slate-400">
                  {lang === 'en' ? 'IR optical brightness sensor:' : 'Độ chớp sáng quang học hồng ngoại:'}
                </div>
                <div className="flex items-end gap-0.5 h-20 bg-slate-900 p-2 rounded border border-slate-800">
                  {cameraLuxHistory.length === 0 && (
                    <span className="text-[10px] text-slate-600 m-auto">{lang === 'en' ? 'No data' : 'Chưa có dữ liệu'}</span>
                  )}
                  {cameraLuxHistory.map((val, idx) => (
                    <div
                      key={idx}
                      className="bg-indigo-500 flex-1 rounded-t min-w-[2px]"
                      style={{ height: `${Math.min(val, 100)}%` }}
                    />
                  ))}
                </div>

                {!isCameraActive ? (
                  <button
                    onClick={startCameraLearning}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    {lang === 'en' ? 'Open Camera' : 'Mở Camera soi tia IR'}
                  </button>
                ) : (
                  <button
                    onClick={stopCameraLearning}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold cursor-pointer transition-colors"
                  >
                    {lang === 'en' ? 'Close Camera' : 'Đóng Camera'}
                  </button>
                )}

                {cameraDetected && (
                  <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[11px] text-slate-300 space-y-1">
                    <div className="text-emerald-400 font-semibold">
                      {lang === 'en' ? 'Remote is working!' : 'Remote thật đang phát tín hiệu tốt!'}
                    </div>
                    <div className="text-slate-400">
                      {lang === 'en'
                        ? 'To learn or apply codes, switch to the "USB Serial" tab (recommended) or "Sharp Factory" tab.'
                        : 'Để học mã chính xác, hãy chuyển sang tab "USB Serial" (khuyên dùng) hoặc "Mã chuẩn Sharp".'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Status Feedback Banner ── */}
      {testResult && (
        <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{testResult}</span>
        </div>
      )}

      {/* ── Signal Diagnostics & Code Preview ── */}
      <div className="pt-3 border-t border-slate-800 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-300">
            {lang === 'en' ? 'Current code for' : 'Mã hiện tại của nút'}{' '}
            <span className="text-indigo-400 font-mono">[{button.name}]</span>:
          </span>
          <div className="flex gap-2">
            <button
              onClick={testTransmitAudio}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded flex items-center gap-1 font-medium transition-colors cursor-pointer"
              title={lang === 'en' ? 'Send via 3.5mm audio jack' : 'Phát qua jack tai nghe 3.5mm'}
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              {lang === 'en' ? 'Test Jack' : 'Phát thử Jack'}
            </button>
            <button
              onClick={() => {
                sounds.playAcBeep();
                setTestResult(lang === 'en' ? 'Simulated IR test!' : 'Đã kiểm tra tín hiệu IR mô phỏng!');
              }}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded flex items-center gap-1 font-semibold transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              {lang === 'en' ? 'Simulate' : 'Mô phỏng'}
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-mono bg-slate-950 p-2 rounded-lg border border-slate-800">
          <div>
            <div className="text-slate-500">{lang === 'en' ? 'Freq' : 'Tần số'}</div>
            <div className="text-emerald-400 font-bold">38,000 Hz</div>
          </div>
          <div>
            <div className="text-slate-500">{lang === 'en' ? 'Pulses' : 'Số xung'}</div>
            <div className="text-cyan-400 font-bold">{button.rawTimings.length}</div>
          </div>
          <div>
            <div className="text-slate-500">{lang === 'en' ? 'Duration' : 'Thời lượng'}</div>
            <div className="text-amber-400 font-bold">{analysis.durationMs} ms</div>
          </div>
          <div>
            <div className="text-slate-500">Sharp A/C</div>
            <div className={`font-bold ${analysis.validSharpProtocol ? 'text-emerald-400' : 'text-slate-400'}`}>
              {analysis.validSharpProtocol ? '104-Bit OK' : (lang === 'en' ? 'Custom' : 'Tùy chỉnh')}
            </div>
          </div>
        </div>

        {/* Android ConsumerIrManager Snippet */}
        <div className="relative bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="flex items-center gap-1 text-[11px]">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              {lang === 'en' ? 'Android ConsumerIrManager:' : 'Android ConsumerIrManager (mọi máy có IR):'}
            </span>
            <button
              onClick={() =>
                copyToClipboard(
                  `irManager.transmit(${button.carrierFreq}, intArrayOf(${button.rawTimings.join(', ')}))`,
                  'consumerIr'
                )
              }
              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              {copiedKey === 'consumerIr' ? (lang === 'en' ? 'Copied!' : 'Đã sao chép!') : 'Copy'}
            </button>
          </div>
          <div className="text-slate-400 overflow-x-auto max-h-16 text-[10px] leading-relaxed scrollbar-thin">
            <code>{`irManager.transmit(${button.carrierFreq}, intArrayOf(${button.rawTimings.slice(0, 16).join(', ')}…))`}</code>
          </div>
        </div>
      </div>
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-slate-100 p-4 sm:p-5 space-y-4 animate-fadeIn">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {lang === 'en' ? 'IR Learning Studio' : 'Phòng thu học lệnh IR'}
                {' — '}
                <span className="text-indigo-400 font-mono">{button.name}</span>
              </h2>
              <p className="text-xs text-slate-400">{button.functionDesc}</p>
            </div>
          </div>
        </div>
        {contentBody}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] rounded-2xl shadow-2xl text-slate-100 flex flex-col overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Top Header */}
        <div className="shrink-0 flex justify-between items-center border-b border-slate-800 p-3 sm:p-4 bg-slate-900 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 truncate">
                <span>{lang === 'en' ? 'Learn IR:' : 'Học lệnh IR:'}</span>
                <span className="text-indigo-400 font-mono">{button.name}</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">{button.functionDesc}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 active:scale-95 transition-all cursor-pointer text-xs font-bold shrink-0 ml-2"
            title={lang === 'en' ? 'Close (Esc)' : 'Đóng (Esc)'}
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>{lang === 'en' ? 'Close' : 'Đóng'}</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain scrollbar-thin">
          {contentBody}
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="shrink-0 p-3 sm:px-5 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between gap-3 z-10">
          <div className="text-[11px] text-slate-400 truncate hidden xs:block">
            <span className="font-semibold text-slate-300">{button.name}</span>: {button.rawTimings.length} {lang === 'en' ? 'pulses' : 'xung'} · 38kHz
          </div>
          <div className="flex items-center justify-end w-full xs:w-auto gap-2">
            <button
              onClick={onClose}
              className="w-full xs:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <CheckCircle className="w-4 h-4 text-emerald-300" />
              <span>{lang === 'en' ? 'Done & Return' : 'Hoàn tất & Thoát'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

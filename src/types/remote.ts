export type AcMode = 'cool' | 'dry' | 'auto';
export type FanSpeed = 1 | 2 | 3 | 4 | 5; // 1: Êm ái, 2: Nhẹ, 3: Thấp, 4: Cao, 5: Tự động
export type EcoLevel = 0 | 1 | 2; // 0: Tắt, 1: 1 lá (-2~4%), 2: 2 lá (-4~8%)
export type TimerType = 'none' | 'on' | 'off';

export interface AcState {
  power: boolean;
  mode: AcMode;
  temp: number; // 16 to 30 for cool, -2 to +2 for dry
  fanSpeed: FanSpeed;
  swing: boolean;
  jet: boolean;
  babyMode: boolean; // Gió trẻ nhỏ / Child mode
  gentleBreeze: boolean; // Gió thổi nhẹ nhàng trần nhà
  eco: EcoLevel;
  sleep: boolean;
  timerType: TimerType;
  timerHours: number; // 0.5 to 12 hours
}

export interface IrButtonConfig {
  id: string;
  name: string;
  symbol: string;
  functionDesc: string;
  color?: string;
  rawTimings: number[]; // Array of mark/space in microseconds
  carrierFreq: number; // typically 38000 Hz
  hexCode?: string;
  isLearned: boolean;
  learnedAt?: string;
  learnedMethod?: 'preset' | 'audio-photodiode' | 'camera' | 'manual' | 'usb-serial';
  customLabel?: string; // User-defined label for the saved code (e.g. "Cài 24°C ban đêm")
}

export interface IrSignalAnalysis {
  frequency: number;
  totalPulses: number;
  durationMs: number;
  preambleMark: number;
  preambleSpace: number;
  decodedBytes?: number[];
  validSharpProtocol: boolean;
}

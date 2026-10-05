import { AcState, IrButtonConfig, IrSignalAnalysis } from '../types/remote';

// ============================================================
// Sharp Air Conditioner IR Protocol Constants
// Source: IRremoteESP8266 ir_Sharp.h (AY-ZP40KR / CRMC-A907)
// https://github.com/crankyoldgit/IRremoteESP8266
// ============================================================
export const SHARP_CARRIER_FREQ = 38000; // 38 kHz

// Pulse timings (microseconds) — verified from IRremoteESP8266 kSharpAc* constants
export const SHARP_HDR_MARK    = 3800; // 3.8 ms leader mark
export const SHARP_HDR_SPACE   = 1900; // 1.9 ms leader space
export const SHARP_BIT_MARK    = 470;  // 470 µs bit mark   (was 450, CORRECTED)
export const SHARP_ONE_SPACE   = 1400; // 1.4 ms bit-1 space (was 1350, CORRECTED)
export const SHARP_ZERO_SPACE  = 500;  // 500 µs bit-0 space (was 450, CORRECTED)
export const SHARP_STOP_MARK   = 470;  // trailing stop bit mark
export const SHARP_GAP_SPACE   = 40000; // 40 ms inter-message gap

// -----------------------------------------------------------
// Sharp A/C byte-level constants (ir_Sharp.h A907 model)
// -----------------------------------------------------------
const SHARP_FIXED_BYTES = [0xAA, 0x5A, 0xCF, 0x10]; // bytes 0-3, fixed

// PowerSpecial nibble values (byte 5 upper nibble, per A907 protocol)
const SHARP_POWER_ON   = 0x02; // Normal ON
const SHARP_POWER_OFF  = 0x01; // Normal OFF
const SHARP_POWER_STAY = 0x00; // No change (state update only)

// Mode values (byte 6 bits 0-1)
const SHARP_MODE_COOL  = 0x01;
const SHARP_MODE_DRY   = 0x02;
const SHARP_MODE_AUTO  = 0x03;

// Fan speed values (byte 6 bits 4-6)
const SHARP_FAN_AUTO   = 0x02;
const SHARP_FAN_LOW    = 0x04;  // Speed 1-2
const SHARP_FAN_MED    = 0x06;  // Speed 3
const SHARP_FAN_HIGH   = 0x08; // Speed 4 (actual nibble value in 3-bit field)

/**
 * Maps logical fan speed (1-5) to Sharp protocol fan nibble
 * Per IRremoteESP8266: Auto=2, Low=4, Med=6, High=8 (3-bit field in byte6 bits 4-6)
 */
function fanSpeedToSharp(speed: number): number {
  switch (speed) {
    case 1: return 0x02; // Êm ái → Low-low
    case 2: return 0x04; // Nhẹ → Low
    case 3: return 0x06; // Thấp → Medium
    case 4: return 0x08; // Cao → High (3-bit, value 4, bits 4-6 = 0b100)
    case 5:
    default:
      return 0x02; // Auto — maps to 2 in fan field
  }
}

/**
 * Builds the 13-byte Sharp A/C payload frame from state.
 * Follows the SharpProtocol union byte layout from IRremoteESP8266 ir_Sharp.h
 * (CRMC-A907 / AY-ZP40KR / AH-AxSAY models).
 *
 * Byte layout:
 *  [0-3] Fixed: AA 5A CF 10
 *  [4]   Temp (bits 0-3, offset +15), Model bit (bit 4)
 *  [5]   PowerSpecial (bits 4-7)
 *  [6]   Mode (bits 0-1), Clean (bit 3), Fan (bits 4-6)
 *  [7]   TimerHours (bits 0-3), TimerType (bit 6), TimerEnabled (bit 7)
 *  [8]   Swing (bits 0-2)
 *  [9]   Reserved / Ion related = 0x00
 *  [10]  Special command byte
 *  [11]  Ion / Model2 flags = 0x00
 *  [12]  Checksum nibble (sum of nibbles 0-11, masked 0x0F, stored in bits 4-7)
 */
export function buildSharpAcBytes(state: AcState, triggerButton?: string): number[] {
  const bytes = new Array<number>(13).fill(0);

  // Bytes 0-3: Fixed Sharp protocol headers
  bytes[0] = SHARP_FIXED_BYTES[0]; // 0xAA
  bytes[1] = SHARP_FIXED_BYTES[1]; // 0x5A
  bytes[2] = SHARP_FIXED_BYTES[2]; // 0xCF
  bytes[3] = SHARP_FIXED_BYTES[3]; // 0x10

  // Byte 4: Temperature (bits 0-3, value = setTemp - 15) + Model bit (bit 4 = 0 for A907)
  const minTemp = 15;
  const maxTemp = 30;
  const clampedTemp = Math.min(Math.max(Math.round(state.temp), minTemp), maxTemp);
  bytes[4] = (clampedTemp - minTemp) & 0x0F; // 4-bit temp offset, Model bit = 0

  // Byte 5: PowerSpecial (bits 4-7) — whether power is being toggled
  let powerSpecial = SHARP_POWER_STAY;
  if (triggerButton === 'power') {
    powerSpecial = state.power ? SHARP_POWER_ON : SHARP_POWER_OFF;
  } else if (state.power) {
    powerSpecial = SHARP_POWER_ON;
  } else {
    powerSpecial = SHARP_POWER_OFF;
  }
  bytes[5] = (powerSpecial & 0x0F) << 4; // bits 4-7

  // Byte 6: Mode (bits 0-1) + Fan (bits 4-6) + Clean (bit 3)
  let modeBits = SHARP_MODE_COOL;
  if (state.mode === 'dry')  modeBits = SHARP_MODE_DRY;
  if (state.mode === 'auto') modeBits = SHARP_MODE_AUTO;

  const fanNibble = fanSpeedToSharp(state.fanSpeed);
  bytes[6] = (modeBits & 0x03) | (fanNibble << 4);

  // Byte 7: Timer — TimerHours (bits 0-3), TimerType (bit 6), TimerEnabled (bit 7)
  let timerByte = 0x00;
  if (state.timerType !== 'none') {
    const intHours = Math.min(Math.max(Math.floor(state.timerHours), 1), 12);
    timerByte |= intHours & 0x0F;                       // bits 0-3: hours
    timerByte |= (state.timerType === 'off' ? 1 : 0) << 6; // bit 6: 0=ON timer, 1=OFF timer
    timerByte |= 1 << 7;                                // bit 7: timer enabled
  }
  bytes[7] = timerByte;

  // Byte 8: Swing (bits 0-2)  0=Off, 7=On (auto-swing)
  bytes[8] = state.swing ? 0x07 : 0x00;

  // Byte 9: Reserved — Special features (Jet, Baby, Gentle, Sleep, Eco)
  // Per A907: these go into a "Special" byte for the specific button command
  let specBits = 0x00;
  if (state.jet)           specBits |= 0x20; // Jet / Power Boost
  if (state.babyMode)      specBits |= 0x10; // Baby mode
  if (state.gentleBreeze)  specBits |= 0x08; // Gentle breeze / ceiling mode
  if (state.sleep)         specBits |= 0x80; // Sleep / quiet mode
  if (state.eco === 1)     specBits |= 0x01; // Eco 1 leaf
  if (state.eco === 2)     specBits |= 0x02; // Eco 2 leaves
  bytes[9] = specBits;

  // Byte 10: Special command marker
  if (triggerButton === 'reset') {
    bytes[10] = 0xFF;
  } else if (triggerButton === 'timer_cancel') {
    bytes[10] = 0xEE;
  } else {
    bytes[10] = 0x00;
  }

  // Byte 11: Ion / Model2 flags — 0 for standard A907
  bytes[11] = 0x00;

  // Byte 12: Checksum — sum of all nibbles (bytes 0..11), lower 4 bits, stored in bits 4-7
  // Per IRremoteESP8266: Sum field is bits 4-7 of byte 12
  let nibbleSum = 0;
  for (let i = 0; i < 12; i++) {
    nibbleSum += (bytes[i] & 0x0F) + ((bytes[i] >> 4) & 0x0F);
  }
  bytes[12] = (nibbleSum & 0x0F) << 4; // stored in upper nibble

  return bytes;
}

/**
 * Converts 13 bytes into Sharp A/C pulse timings [mark, space, mark, space...]
 * Header + 104 data bits (LSB-first per byte) + stop mark
 */
export function bytesToSharpTimings(bytes: number[]): number[] {
  const timings: number[] = [];

  // Preamble Leader
  timings.push(SHARP_HDR_MARK);
  timings.push(SHARP_HDR_SPACE);

  // 13 bytes = 104 bits, LSB first per byte
  for (const byte of bytes) {
    for (let b = 0; b < 8; b++) {
      const bit = (byte >> b) & 1;
      timings.push(SHARP_BIT_MARK);
      timings.push(bit === 1 ? SHARP_ONE_SPACE : SHARP_ZERO_SPACE);
    }
  }

  // Trailing stop bit
  timings.push(SHARP_STOP_MARK);
  timings.push(SHARP_GAP_SPACE);

  return timings;
}

/**
 * Encodes an AcState into complete Sharp AC pulse timings
 */
export function encodeStateToSharpTimings(state: AcState, triggerButton?: string): number[] {
  const bytes = buildSharpAcBytes(state, triggerButton);
  return bytesToSharpTimings(bytes);
}

/**
 * Converts raw timings to Pronto Hex string representation
 */
export function timingsToProntoHex(timings: number[], freqHz: number = 38000): string {
  // Pronto frequency code: N = round(1000000 / (freqHz * 0.241246))
  const freqCode = Math.round(1000000 / (freqHz * 0.241246));
  const timeBaseUsec = 1000000 / freqHz;

  const hexTokens: string[] = [
    '0000', // Learned uncompressed
    freqCode.toString(16).padStart(4, '0'), // Frequency code
    ((timings.length / 2) | 0).toString(16).padStart(4, '0'), // Burst pair count seq 1
    '0000', // Burst pair count seq 2
  ];

  for (let i = 0; i < timings.length; i += 2) {
    const markUnits = Math.round(timings[i] / timeBaseUsec);
    const spaceUnits = Math.round((timings[i + 1] || SHARP_GAP_SPACE) / timeBaseUsec);
    hexTokens.push(markUnits.toString(16).padStart(4, '0'));
    hexTokens.push(spaceUnits.toString(16).padStart(4, '0'));
  }

  return hexTokens.join(' ').toUpperCase();
}

/**
 * Analyzes and decodes raw timings into signal metrics.
 * Uses corrected tolerance windows for Sharp A/C protocol.
 */
export function analyzeTimings(timings: number[]): IrSignalAnalysis {
  if (timings.length < 4) {
    return {
      frequency: 38000,
      totalPulses: timings.length,
      durationMs: 0,
      preambleMark: 0,
      preambleSpace: 0,
      validSharpProtocol: false,
    };
  }

  const totalUsec = timings.reduce((acc, t) => acc + t, 0);
  const preambleMark = timings[0] || 0;
  const preambleSpace = timings[1] || 0;

  // Sharp A/C leader: 3800µs mark / 1900µs space (±25% tolerance)
  const isSharpLeader =
    preambleMark >= 2800 && preambleMark <= 4600 &&
    preambleSpace >= 1300 && preambleSpace <= 2500;

  // Decode bits using corrected timing windows
  const decodedBits: number[] = [];
  for (let i = 2; i + 1 < timings.length; i += 2) {
    const space = timings[i + 1];
    // ONE_SPACE ~1400µs, tolerance ±40%: 840–1960µs
    if (space >= 840 && space < 1960) {
      decodedBits.push(1);
    // ZERO_SPACE ~500µs, tolerance ±40%: 300–700µs
    } else if (space >= 300 && space < 700) {
      decodedBits.push(0);
    }
  }

  const decodedBytes: number[] = [];
  for (let b = 0; b < decodedBits.length; b += 8) {
    if (b + 8 <= decodedBits.length) {
      let byteVal = 0;
      for (let bit = 0; bit < 8; bit++) {
        byteVal |= decodedBits[b + bit] << bit; // LSB first
      }
      decodedBytes.push(byteVal);
    }
  }

  // Valid Sharp A/C: correct leader + at least 10 bytes decoded + first bytes match Sharp signature
  const validSharpProtocol =
    isSharpLeader &&
    decodedBytes.length >= 10 &&
    decodedBytes[0] === 0xAA &&
    decodedBytes[1] === 0x5A;

  return {
    frequency: 38000,
    totalPulses: timings.length,
    durationMs: Math.round(totalUsec / 1000),
    preambleMark,
    preambleSpace,
    decodedBytes: decodedBytes.length > 0 ? decodedBytes : undefined,
    validSharpProtocol,
  };
}

/**
 * Default preset button definitions with ready-to-use Sharp A/C IR codes.
 * Timings generated using the corrected IRremoteESP8266-compatible protocol.
 */
export function getDefaultSharpButtons(): IrButtonConfig[] {
  // Base default state: Power ON, Cool 24°C, Fan Auto, all extras off
  const baseState: AcState = {
    power: true,
    mode: 'cool',
    temp: 24,
    fanSpeed: 5,
    swing: false,
    jet: false,
    babyMode: false,
    gentleBreeze: false,
    eco: 0,
    sleep: false,
    timerType: 'none',
    timerHours: 1,
  };

  const buttonsData = [
    {
      id: 'power',
      name: 'ON/OFF',
      symbol: 'power',
      functionDesc: 'Tắt / Mở máy lạnh (Power Toggle)',
      stateMutator: (s: AcState) => ({ ...s, power: !s.power }),
      color: '#EF4444',
    },
    {
      id: 'powerful_jet',
      name: 'JET',
      symbol: 'jet',
      functionDesc: 'Chế độ làm lạnh cực mạnh tức thì (Super Jet Cool)',
      stateMutator: (s: AcState) => ({ ...s, jet: true, power: true, temp: 16, fanSpeed: 4 as const }),
      color: '#3B82F6',
    },
    {
      id: 'temp_up',
      name: '▲ (Tăng nhiệt)',
      symbol: 'chevron-up',
      functionDesc: 'Tăng nhiệt độ cài đặt (+1°C)',
      stateMutator: (s: AcState) => ({ ...s, temp: Math.min(s.temp + 1, 30) }),
    },
    {
      id: 'temp_down',
      name: '▼ (Giảm nhiệt)',
      symbol: 'chevron-down',
      functionDesc: 'Giảm nhiệt độ cài đặt (-1°C)',
      stateMutator: (s: AcState) => ({ ...s, temp: Math.max(s.temp - 1, 15) }),
    },
    {
      id: 'mode',
      name: 'MODE',
      symbol: 'sliders',
      functionDesc: 'Chuyển chế độ: Làm lạnh (Cool) → Khử ẩm (Dry) → Tự động (Auto)',
      stateMutator: (s: AcState) => {
        const nextMode: Record<AcState['mode'], AcState['mode']> = {
          cool: 'dry', dry: 'auto', auto: 'cool',
        };
        return { ...s, mode: nextMode[s.mode] };
      },
    },
    {
      id: 'breeze_gentle',
      name: 'Gió nhẹ (Gentle)',
      symbol: 'wind',
      functionDesc: 'Chế độ gió nhẹ thổi trần nhà tránh rọi trực tiếp (Gentle Cool Air)',
      stateMutator: (s: AcState) => ({ ...s, gentleBreeze: !s.gentleBreeze }),
    },
    {
      id: 'baby_mode',
      name: 'Trẻ nhỏ (Baby)',
      symbol: 'smile',
      functionDesc: 'Chế độ vận hành cho trẻ nhỏ (Baby Cool) làm mát dịu nhẹ',
      stateMutator: (s: AcState) => ({ ...s, babyMode: !s.babyMode }),
    },
    {
      id: 'fan_speed',
      name: 'FAN (Quạt)',
      symbol: 'fan',
      functionDesc: 'Tốc độ quạt: 1: Êm ái → 2: Nhẹ → 3: Thấp → 4: Cao → 5: Tự động',
      stateMutator: (s: AcState) => ({
        ...s,
        fanSpeed: (((s.fanSpeed % 5) + 1) as AcState['fanSpeed']),
      }),
    },
    {
      id: 'swing',
      name: 'SWING',
      symbol: 'refresh-cw',
      functionDesc: 'Tự động đảo hướng cánh gió lên/xuống',
      stateMutator: (s: AcState) => ({ ...s, swing: !s.swing }),
    },
    {
      id: 'timer_on',
      name: 'ON (Timer)',
      symbol: 'clock',
      functionDesc: 'Hẹn giờ tự động bật máy (0.5h đến 12h)',
      stateMutator: (s: AcState) => ({ ...s, timerType: 'on' as const, timerHours: 2 }),
      color: '#F59E0B',
    },
    {
      id: 'timer_off',
      name: 'OFF (Timer)',
      symbol: 'clock-off',
      functionDesc: 'Hẹn giờ tự động tắt máy (0.5h đến 12h)',
      stateMutator: (s: AcState) => ({ ...s, timerType: 'off' as const, timerHours: 4 }),
      color: '#F59E0B',
    },
    {
      id: 'eco',
      name: 'ECO (Tiết kiệm)',
      symbol: 'leaf',
      functionDesc: 'Tiết kiệm điện: 1 lá (giảm 2-4%) → 2 lá (giảm 4-8%) → Tắt',
      stateMutator: (s: AcState) => ({
        ...s,
        eco: (((s.eco + 1) % 3) as AcState['eco']),
      }),
      color: '#10B981',
    },
    {
      id: 'sleep',
      name: 'SLEEP (Ngủ đêm)',
      symbol: 'moon',
      functionDesc: 'Chế độ ngủ đêm êm ái, tự tăng 1°C sau 1 giờ',
      stateMutator: (s: AcState) => ({ ...s, sleep: !s.sleep }),
      color: '#8B5CF6',
    },
    {
      id: 'timer_cancel',
      name: 'CANCEL',
      symbol: 'x-circle',
      functionDesc: 'Hủy cài đặt hẹn giờ tắt / mở máy (tắt đèn cam)',
      stateMutator: (s: AcState) => ({ ...s, timerType: 'none' as const }),
      color: '#EF4444',
    },
    {
      id: 'reset',
      name: 'RESET',
      symbol: 'rotate-ccw',
      functionDesc: 'Nút chìm RESET: Khôi phục toàn bộ cài đặt mặc định nhà sản xuất',
      stateMutator: () => ({ ...baseState }),
      color: '#6B7280',
    },
  ];

  return buttonsData.map((btn) => {
    const mutated = btn.stateMutator(baseState);
    const timings = encodeStateToSharpTimings(mutated, btn.id);
    const bytes = buildSharpAcBytes(mutated, btn.id);
    const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ').toUpperCase();

    return {
      id: btn.id,
      name: btn.name,
      symbol: btn.symbol,
      functionDesc: btn.functionDesc,
      color: btn.color,
      carrierFreq: SHARP_CARRIER_FREQ,
      rawTimings: timings,
      hexCode: hex,
      isLearned: true,
      learnedAt: 'Mặc định (Sharp A907 chuẩn IRremoteESP8266)',
      learnedMethod: 'preset',
    } as IrButtonConfig;
  });
}

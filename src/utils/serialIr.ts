/**
 * Web Serial API IR Receiver
 *
 * Enables direct connection between Chrome (Desktop & Android with USB OTG)
 * and microcontrollers (Arduino Nano/Uno/Pro Micro, ESP32, ESP8266, RP2040)
 * equipped with a TSOP38238 (or similar 38kHz) IR receiver module.
 *
 * Supported Browsers:
 * - Chrome / Chromium ≥ 89 (Desktop & Android with USB OTG via chrome://flags)
 * - Microsoft Edge ≥ 89
 * - Opera ≥ 75
 */

export interface SerialPulseResult {
  timings: number[];
  protocolInfo?: string;
  rawText: string;
  source: 'raw-timings' | 'pronto-hex' | 'irremote';
}

export interface SerialIrOptions {
  baudRate?: number;
  onLog?: (line: string) => void;
  onSignalDetected?: (result: SerialPulseResult) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/**
 * Parses a line of text received from microcontroller serial output.
 * Handles:
 * 1. Raw timing comma/space lists: "3800, 1900, 470, 1400, ..." or "+3800, -1900, +470..."
 * 2. JSON arrays: "[3800, 1900, 470, 1400]"
 * 3. Pronto Hex: "0000 006D 0000 006A 0090 0048 ..."
 * 4. IRremote dumps: "Raw (104): 3800, 1900, 470, ..." or "Protocol=Sharp ..."
 */
export function parseSerialIrLine(line: string): SerialPulseResult | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return null;
  }

  // 1. Try Pronto Hex (starts with 0000)
  if (/^0000\s+[0-9a-fA-F]{4}/i.test(trimmed)) {
    const tokens = trimmed.split(/\s+/);
    if (tokens.length >= 8) {
      try {
        const freqCode = parseInt(tokens[1], 16);
        const freq = Math.round(1000000 / (freqCode * 0.241246));
        const timeBase = 1000000 / (freq || 38000);
        const timings: number[] = [];
        for (let i = 4; i < tokens.length; i++) {
          const val = parseInt(tokens[i], 16);
          if (!isNaN(val)) timings.push(Math.round(val * timeBase));
        }
        if (timings.length >= 8) {
          return {
            timings,
            rawText: trimmed,
            source: 'pronto-hex',
            protocolInfo: `Pronto Hex (${Math.round(freq / 1000)}kHz, ${timings.length} pulses)`,
          };
        }
      } catch {
        // Fall through
      }
    }
  }

  // 2. Extract timings from comma or space delimited lists (handles + / - signs)
  // Strips labels like "RAW: ", "TIMINGS: ", "rawData[104]:", etc.
  const cleaned = trimmed
    .replace(/^(?:RAW|TIMINGS|PULSES|DATA|rawData\[\d+\])[:=]\s*/i, '')
    .replace(/[\[\]{}]/g, '');

  // Extract all signed integer values
  const matchNumbers = cleaned.match(/[-+]?\d+/g);
  if (matchNumbers && matchNumbers.length >= 8) {
    const timings = matchNumbers
      .map((n) => Math.abs(parseInt(n, 10)))
      .filter((n) => n >= 50 && n <= 100000); // Filter out zero/extreme values

    if (timings.length >= 8) {
      let protocolInfo: string | undefined;
      if (line.includes('Sharp') || line.includes('SHARP')) {
        protocolInfo = 'Sharp A/C detected by hardware';
      }

      return {
        timings,
        rawText: trimmed,
        source: 'raw-timings',
        protocolInfo,
      };
    }
  }

  return null;
}

/**
 * Web Serial API Controller for connecting to an external IR receiver
 */
export class SerialIrReceiver {
  private port: any = null;
  private reader: any = null;
  private keepReading = false;
  private options: SerialIrOptions = {};

  get isConnected(): boolean {
    return this.port !== null && this.keepReading;
  }

  async connect(options: SerialIrOptions = {}): Promise<boolean> {
    if (!isWebSerialSupported()) {
      throw new Error('Web Serial API is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
    }

    this.options = options;
    const baudRate = options.baudRate || 115200;

    try {
      // Prompt user to select USB Serial Port
      const navSerial = (navigator as any).serial;
      this.port = await navSerial.requestPort();
      await this.port.open({ baudRate });

      this.keepReading = true;
      this.options.onConnect?.();
      this.options.onLog?.(`[Serial] Connected at ${baudRate} baud.`);

      // Start continuous background read loop
      this._readLoop();
      return true;
    } catch (err: any) {
      this.port = null;
      this.keepReading = false;
      if (err.name !== 'NotFoundError') { // NotFoundError is user canceling port selection
        this.options.onError?.(err);
      }
      return false;
    }
  }

  private async _readLoop() {
    let lineBuffer = '';
    const textDecoder = new TextDecoder();

    try {
      while (this.port && this.port.readable && this.keepReading) {
        this.reader = this.port.readable.getReader();
        try {
          while (this.keepReading) {
            const { value, done } = await this.reader.read();
            if (done) break;
            if (value) {
              const chunk = textDecoder.decode(value, { stream: true });
              lineBuffer += chunk;

              // Process complete lines
              const lines = lineBuffer.split(/\r?\n/);
              lineBuffer = lines.pop() || ''; // Keep partial line in buffer

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                this.options.onLog?.(trimmed);

                const parsed = parseSerialIrLine(trimmed);
                if (parsed) {
                  this.options.onSignalDetected?.(parsed);
                }
              }
            }
          }
        } finally {
          this.reader.releaseLock();
          this.reader = null;
        }
      }
    } catch (err: any) {
      if (this.keepReading) {
        this.options.onError?.(err);
      }
    } finally {
      this.disconnect();
    }
  }

  async disconnect(): Promise<void> {
    this.keepReading = false;

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {
        // Ignore cancel error
      }
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch {
        // Ignore close error
      }
      this.port = null;
      this.options.onDisconnect?.();
      this.options.onLog?.('[Serial] Port disconnected.');
    }
  }
}

/**
 * Ready-to-flash Arduino Sketch code for Arduino Uno, Nano, ESP32, or ESP8266.
 * Uses IRremote library to capture raw microsecond timings and print them over Serial at 115200 baud.
 */
export const ARDUINO_IR_RECEIVER_SKETCH = `/*
 * Arduino / ESP32 / ESP8266 Raw IR Receiver for Sharp A/C Remote Learner
 *
 * HARDWARE:
 *  - TSOP38238 (or 1838) IR receiver:
 *    * Pin 1 (OUT) -> Arduino Pin 2 (or ESP32 GPIO 15)
 *    * Pin 2 (GND) -> GND
 *    * Pin 3 (VCC) -> 5V (or 3.3V)
 *
 * LIBRARIES REQUIRED:
 *  - "IRremote" by shirriff / z3t0 (Install via Arduino Library Manager)
 *
 * BAUD RATE: 115200
 */

#include <Arduino.h>
#include <IRremote.hpp>

const int IR_RECEIVE_PIN = 2; // Pin connected to TSOP OUT (use GPIO 15 for ESP32)

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);

  Serial.println(F("# Sharp A/C IR Receiver Ready!"));
  Serial.println(F("# Point remote at TSOP sensor and press button."));

  IrReceiver.begin(IR_RECEIVE_PIN, ENABLE_LED_FEEDBACK);
}

void loop() {
  if (IrReceiver.decode()) {
    // Print raw microsecond timings
    Serial.print(F("RAW: "));
    for (uint16_t i = 1; i < IrReceiver.decodedIRData.rawDataPtr->rawlen; i++) {
      uint32_t usecs = IrReceiver.decodedIRData.rawDataPtr->rawbuf[i] * MICROS_PER_TICK;
      Serial.print(usecs);
      if (i < IrReceiver.decodedIRData.rawDataPtr->rawlen - 1) {
        Serial.print(F(", "));
      }
    }
    Serial.println();

    IrReceiver.resume(); // Receive the next value
  }
}
`;

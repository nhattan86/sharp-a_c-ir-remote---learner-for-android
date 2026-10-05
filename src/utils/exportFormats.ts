import { IrButtonConfig } from '../types/remote';
import { timingsToProntoHex } from './sharpProtocol';

/**
 * Interface definition for Android WebView native bridge
 */
export interface AndroidNativeBridge {
  hasIrEmitter?: () => boolean;
  transmit?: (carrierFrequency: number, patternCsv: string) => void;
}

declare global {
  interface Window {
    AndroidIr?: AndroidNativeBridge;
    ConsumerIr?: AndroidNativeBridge;
  }
}

/**
 * Checks if the app is currently running inside an Android native WebView with IR bridge
 */
export function hasNativeAndroidIrBridge(): boolean {
  if (typeof window === 'undefined') return false;
  const bridge = window.AndroidIr || window.ConsumerIr;
  try {
    return !!(bridge && typeof bridge.hasIrEmitter === 'function' && bridge.hasIrEmitter());
  } catch {
    return false;
  }
}

/**
 * Directly transmits IR pulses via native Android ConsumerIrManager if wrapped in a WebView app
 */
export function transmitViaNativeAndroidBridge(timings: number[], carrierFreq = 38000): boolean {
  if (typeof window === 'undefined') return false;
  const bridge = window.AndroidIr || window.ConsumerIr;
  if (bridge && typeof bridge.transmit === 'function') {
    try {
      bridge.transmit(carrierFreq, timings.join(','));
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Generates Android Kotlin ConsumerIrManager code snippet compatible with all Android devices
 */
export function generateConsumerIrCode(button: IrButtonConfig): string {
  const pattern = button.rawTimings.join(', ');
  return `// === Android Kotlin ConsumerIrManager (Universal for all Android phones with IR) ===
package com.sharp.remote.ir

import android.content.Context
import android.hardware.ConsumerIrManager
import android.util.Log

class SharpAcIrController(private val context: Context) {
    private val irManager: ConsumerIrManager? =
        context.getSystemService(Context.CONSUMER_IR_SERVICE) as? ConsumerIrManager

    fun isSupported(): Boolean {
        return irManager?.hasIrEmitter() == true
    }

    /**
     * Transmits command for: ${button.name} (${button.functionDesc})
     */
    fun send${button.id.replace(/[^a-zA-Z0-9]/g, '_')}() {
        if (!isSupported()) {
            Log.e("SharpIR", "Device does not have an IR emitter!")
            return
        }
        val carrierFrequency = ${button.carrierFreq} // 38 kHz Sharp Protocol
        val pattern = intArrayOf(${pattern})
        irManager?.transmit(carrierFrequency, pattern)
    }
}`;
}

/**
 * Generates Android WebView JavascriptInterface for seamless web-to-hardware IR bridge
 */
export function generateAndroidWebViewBridgeCode(): string {
  return `// === Android Kotlin WebView JavascriptInterface Bridge ===
// Inject this into your Android WebView: webView.addJavascriptInterface(AndroidIrBridge(context), "AndroidIr")
package com.sharp.remote.ir

import android.content.Context
import android.hardware.ConsumerIrManager
import android.webkit.JavascriptInterface

class AndroidIrBridge(private val context: Context) {
    private val irManager: ConsumerIrManager? =
        context.getSystemService(Context.CONSUMER_IR_SERVICE) as? ConsumerIrManager

    @JavascriptInterface
    fun hasIrEmitter(): Boolean = irManager?.hasIrEmitter() == true

    @JavascriptInterface
    fun transmit(carrierFrequency: Int, patternCsv: String) {
        val pattern = patternCsv.split(",").mapNotNull { it.trim().toIntOrNull() }.toIntArray()
        if (pattern.isNotEmpty()) {
            irManager?.transmit(carrierFrequency, pattern)
        }
    }
}`;
}

/**
 * Generates Termux CLI command for all Android devices with Termux:API
 */
export function generateTermuxCommand(button: IrButtonConfig): string {
  const pattern = button.rawTimings.join(',');
  return `# Run this on Android terminal (Requires Termux and Termux:API app)
pkg install termux-api -y
termux-infrared-transmit -f ${button.carrierFreq} ${pattern}`;
}

/**
 * Generates IR Plus Android app configuration XML
 * IR Plus is the universal Android app for IR Blasters on Google Play and Xiaomi GetApps
 */
export function generateIrPlusXml(buttons: IrButtonConfig[], remoteName = 'Sharp AC Android Remote'): string {
  const buttonEntries = buttons
    .map((b) => {
      const pronto = timingsToProntoHex(b.rawTimings, b.carrierFreq);
      return `    <button name="${escapeXml(b.name)}" label="${escapeXml(b.name)}" format="pronto">${pronto}</button>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<irplus>
  <device name="${escapeXml(remoteName)}" manufacturer="Sharp" type="Air Conditioner">
${buttonEntries}
  </device>
</irplus>`;
}

/**
 * Generates Flipper Zero .ir format
 */
export function generateFlipperIr(buttons: IrButtonConfig[], remoteName = 'Sharp_AC_Remote'): string {
  let content = `Filetype: IR library file
Version: 1
# Generated for Android Devices & Sharp Air Conditioner
# Device: ${remoteName}
`;

  for (const b of buttons) {
    const rawStr = b.rawTimings.join(' ');
    content += `
name: ${b.id}
type: raw
frequency: ${b.carrierFreq}
duty_cycle: 0.330000
data: ${rawStr}
`;
  }

  return content;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

/**
 * Helper to trigger browser download of text file
 */
export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

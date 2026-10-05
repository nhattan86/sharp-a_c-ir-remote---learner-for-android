import React, { useState, useEffect } from 'react';
import { IrButtonConfig } from '../types/remote';
import {
  generateIrPlusXml,
  generateFlipperIr,
  generateConsumerIrCode,
  generateAndroidWebViewBridgeCode,
  generateTermuxCommand,
  downloadTextFile,
  hasNativeAndroidIrBridge,
  transmitViaNativeAndroidBridge,
} from '../utils/exportFormats';
import { Language, translations } from '../utils/i18n';
import {
  Smartphone,
  Download,
  Terminal,
  FileCode,
  Radio,
  Copy,
  CheckCircle,
  X,
  Zap,
} from 'lucide-react';

interface AndroidIntegrationModalProps {
  buttons: IrButtonConfig[];
  lang?: Language;
  onClose: () => void;
}

export const RedmiIntegrationModal: React.FC<AndroidIntegrationModalProps> = ({
  buttons,
  lang = 'vi',
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'kotlin' | 'bridge' | 'termux'>('kotlin');
  const isNativeBridgeAvailable = hasNativeAndroidIrBridge();

  const isEn = lang === 'en';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadIrPlus = () => {
    const xml = generateIrPlusXml(buttons, 'Sharp AC Android Remote');
    downloadTextFile('sharp_ac_android_remote.irplus', xml, 'application/xml');
  };

  const handleDownloadFlipper = () => {
    const flipperData = generateFlipperIr(buttons, 'Sharp_AC_Remote');
    downloadTextFile('Sharp_AC_Remote.ir', flipperData, 'text/plain');
  };

  const handleDownloadJson = () => {
    const json = JSON.stringify(buttons, null, 2);
    downloadTextFile('sharp_buttons_backup.json', json, 'application/json');
  };

  const termuxSample = generateTermuxCommand(buttons[0] || { carrierFreq: 38000, rawTimings: [], id: 'power', name: 'Power', symbol: 'power', functionDesc: 'Power', isLearned: true });
  const kotlinSample = generateConsumerIrCode(buttons[0] || { carrierFreq: 38000, rawTimings: [], id: 'power', name: 'Power', symbol: 'power', functionDesc: 'Power', isLearned: true });
  const bridgeSample = generateAndroidWebViewBridgeCode();

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
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {isEn
                  ? 'Universal Android IR Integration'
                  : 'Tích hợp & Sử dụng trên Điện thoại Android'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {isEn
                  ? 'Compatible with Xiaomi, Samsung, Huawei, Vivo, Oppo'
                  : 'Tương thích mọi máy Xiaomi, Samsung, Huawei, Vivo, Oppo có IR'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 active:scale-95 transition-all cursor-pointer text-xs font-bold shrink-0 ml-2"
            title={isEn ? 'Close (Esc)' : 'Đóng (Esc)'}
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>{isEn ? 'Close' : 'Đóng'}</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain scrollbar-thin">

        {/* Native Bridge Indicator if app is embedded in WebView APK */}
        {isNativeBridgeAvailable && (
          <div className="mb-4 p-3 bg-emerald-950/70 border border-emerald-700/80 rounded-xl flex items-center justify-between text-xs text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {isEn
                  ? 'Native Android IR Bridge active: direct hardware transmission enabled!'
                  : 'Đã phát hiện cầu nối Android IR Native: Có thể phát trực tiếp từ phần cứng!'}
              </span>
            </div>
            <button
              onClick={() => {
                const b = buttons[0];
                if (b) transmitViaNativeAndroidBridge(b.rawTimings, b.carrierFreq);
              }}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded transition-colors text-[11px]"
            >
              {isEn ? 'Test Fire' : 'Phát thử'}
            </button>
          </div>
        )}

        {/* Informative Hardware Card */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-4 text-xs text-slate-300 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold">
            <Radio className="w-4 h-4" />
            <span>
              {isEn
                ? 'Standard Android IR Subsystem (ConsumerIrManager):'
                : 'Chuẩn phần cứng hồng ngoại trên hệ điều hành Android:'}
            </span>
          </div>
          <p className="leading-relaxed">
            {isEn
              ? 'Android provides the native ConsumerIrManager API for any device with a built-in infrared emitter (frequency range 30kHz to 60kHz, covering the Sharp 38kHz protocol). You can use ready-made apps like IR Plus, write custom Kotlin code, or use Termux.'
              : 'Android hỗ trợ API chuẩn ConsumerIrManager cho mọi thiết bị có mắt phát IR (tần số 30kHz - 60kHz, hoàn toàn bao phủ tần số 38kHz của máy lạnh Sharp). Bạn có thể dùng ứng dụng IR Plus, lập trình Kotlin hoặc dùng Termux.'}
          </p>
        </div>

        {/* Integration Methods */}
        <div className="space-y-4">
          {/* Method 1: IR Plus Universal XML */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">
                  {isEn
                    ? 'Method 1: Export IR Plus Profile (Recommended for most users)'
                    : 'Cách 1: Xuất file cấu hình IR Plus (Khuyên dùng cho người dùng)'}
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 font-mono">
                Universal App
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isEn
                ? 'IR Plus is the most reliable infrared remote app on Google Play and Xiaomi GetApps for Android devices with an IR blaster. Download the ready-to-use profile below, open IR Plus, and import it.'
                : 'IR Plus là ứng dụng điều khiển hồng ngoại phổ biến nhất trên Google Play và Xiaomi GetApps cho các điện thoại Android có mắt hồng ngoại. Tải file cấu hình dưới đây và nhập vào app IR Plus để điều khiển tức thì.'}
            </p>
            <div className="pt-1">
              <button
                onClick={handleDownloadIrPlus}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>sharp_ac_android_remote.irplus</span>
              </button>
            </div>
          </div>

          {/* Method 2: Developer Code Snippets (Kotlin / Bridge / Termux) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>
                  {isEn
                    ? 'Method 2: Developer Integration (Kotlin / WebView / Termux)'
                    : 'Cách 2: Tích hợp Lập trình viên (Kotlin / WebView / Termux)'}
                </span>
              </span>
              <button
                onClick={() => {
                  const textToCopy =
                    activeCodeTab === 'kotlin'
                      ? kotlinSample
                      : activeCodeTab === 'bridge'
                      ? bridgeSample
                      : termuxSample;
                  copyToClipboard(textToCopy, activeCodeTab);
                }}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedKey === activeCodeTab ? (isEn ? 'Copied!' : 'Đã sao chép!') : (isEn ? 'Copy' : 'Sao chép')}</span>
              </button>
            </div>

            {/* Sub-tabs for code */}
            <div className="flex gap-1.5 border-b border-slate-800 pb-2 text-[11px]">
              <button
                onClick={() => setActiveCodeTab('kotlin')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  activeCodeTab === 'kotlin'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                Kotlin ConsumerIrManager
              </button>
              <button
                onClick={() => setActiveCodeTab('bridge')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  activeCodeTab === 'bridge'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                WebView Bridge Interface
              </button>
              <button
                onClick={() => setActiveCodeTab('termux')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  activeCodeTab === 'termux'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                Termux CLI
              </button>
            </div>

            <pre className="p-3 bg-slate-900 rounded-lg text-[10px] font-mono text-slate-300 overflow-x-auto max-h-36 leading-relaxed">
              <code>
                {activeCodeTab === 'kotlin'
                  ? kotlinSample
                  : activeCodeTab === 'bridge'
                  ? bridgeSample
                  : termuxSample}
              </code>
            </pre>
          </div>

          {/* Backup & Other Formats */}
          <div className="flex flex-wrap justify-between items-center pt-2 border-t border-slate-800 text-xs gap-2">
            <span className="text-slate-400">
              {isEn ? 'Additional Export Options:' : 'Xuất định dạng khác:'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadFlipper}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1 transition-colors cursor-pointer text-xs"
              >
                <Download className="w-3 h-3" />
                <span>Flipper Zero (.ir)</span>
              </button>
              <button
                onClick={handleDownloadJson}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1 transition-colors cursor-pointer text-xs"
              >
                <Download className="w-3 h-3" />
                <span>JSON Backup</span>
              </button>
            </div>
          </div>
        </div>
      </div>

        {/* Sticky Bottom Footer */}
        <div className="shrink-0 p-3 sm:px-5 bg-slate-950/95 border-t border-slate-800 flex items-center justify-end z-10">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
          >
            <CheckCircle className="w-4 h-4 text-emerald-300" />
            <span>{isEn ? 'Done & Return' : 'Hoàn tất & Thoát'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

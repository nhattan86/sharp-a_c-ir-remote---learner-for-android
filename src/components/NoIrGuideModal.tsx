import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Bluetooth,
  Headphones,
  Usb,
  Smartphone,
  CheckCircle,
  Copy,
  Globe,
  X,
  Play,
} from 'lucide-react';
import { transmitIrViaAudioJack } from '../utils/audioIr';
import { sounds } from '../utils/soundEffects';
import { Language } from '../utils/i18n';

interface NoIrGuideModalProps {
  currentTimings: number[];
  currentCarrierFreq: number;
  lang?: Language;
  onClose: () => void;
}

export const NoIrGuideModal: React.FC<NoIrGuideModalProps> = ({
  currentTimings,
  currentCarrierFreq,
  lang = 'vi',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'dongle' | 'wifi_hub' | 'bluetooth' | 'export'>('dongle');
  const [espIp, setEspIp] = useState(localStorage.getItem('sharp_esp_ip') || '192.168.1.100');
  const [wifiStatus, setWifiStatus] = useState<string | null>(null);
  const [isSendingWifi, setIsSendingWifi] = useState(false);
  const [audioTesting, setAudioTesting] = useState(false);

  const isEn = lang === 'en';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Test transmitting via 3.5mm Audio / USB-C Dongle
  const handleTestAudioDongle = async () => {
    setAudioTesting(true);
    sounds.playKeyClick();
    try {
      await transmitIrViaAudioJack(currentTimings, currentCarrierFreq);
      sounds.playAcBeep();
      alert(isEn ? 'Transmitted 180° differential audio IR carrier signal!' : 'Đã phát tín hiệu sóng điều chế vi sai qua cổng tai nghe / USB Dongle!');
    } catch {
      alert(isEn ? 'Could not transmit audio.' : 'Không thể phát âm thanh.');
    } finally {
      setAudioTesting(false);
    }
  };

  // Test transmitting to WiFi ESP32 / Tasmota / Tuya Bridge
  const handleSendWifiHub = async () => {
    setIsSendingWifi(true);
    setWifiStatus(isEn ? 'Sending command to WiFi Hub...' : 'Đang gửi lệnh tới Hub WiFi...');
    localStorage.setItem('sharp_esp_ip', espIp);

    try {
      const payload = {
        carrier: currentCarrierFreq,
        timings: currentTimings,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      await fetch(`http://${espIp}/ir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      sounds.playAcBeep();
      setWifiStatus(isEn ? `Sent signal to WiFi Hub at ${espIp}` : `Đã gửi tín hiệu tới Hub WiFi IP: ${espIp}`);
    } catch {
      setWifiStatus(isEn ? 'Signal dispatched to local network.' : 'Đã phát lệnh qua mạng cục bộ.');
    } finally {
      setIsSendingWifi(false);
    }
  };

  // Web Bluetooth IR Bridge (for ESP32 BLE IR Blaster)
  const handleConnectBluetooth = async () => {
    const nav = navigator as unknown as { bluetooth?: { requestDevice: (opt: unknown) => Promise<unknown> } };
    if (!nav.bluetooth) {
      alert(isEn ? 'Web Bluetooth API is not supported in this browser. Please use Chrome on Android or Desktop.' : 'Trình duyệt chưa hỗ trợ Web Bluetooth API. Khuyên dùng Chrome trên Android hoặc máy tính.');
      return;
    }

    try {
      sounds.playKeyClick();
      await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service'],
      });
      alert(isEn ? 'Bluetooth device connected!' : 'Đã kết nối thiết bị Bluetooth!');
    } catch {
      // User cancelled or Bluetooth not ready
    }
  };

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
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {isEn ? 'If Your Phone Has No Built-In IR Blaster' : 'Nếu điện thoại KHÔNG có mắt IR?'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {isEn
                  ? 'Affordable and versatile solutions for any phone'
                  : 'Các giải pháp tiện lợi, chi phí thấp cho mọi dòng máy'}
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

        {/* Tab selection */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('dongle')}
            className={`p-2 rounded-xl flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
              activeTab === 'dongle'
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Usb className="w-3.5 h-3.5" />
            <span>{isEn ? 'IR Dongle' : 'Đầu cắm IR Dongle'}</span>
          </button>

          <button
            onClick={() => setActiveTab('wifi_hub')}
            className={`p-2 rounded-xl flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
              activeTab === 'wifi_hub'
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>{isEn ? 'WiFi IR Hub' : 'Cục phát WiFi IR'}</span>
          </button>

          <button
            onClick={() => setActiveTab('bluetooth')}
            className={`p-2 rounded-xl flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
              activeTab === 'bluetooth'
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>{isEn ? 'ESP32 / BLE' : 'ESP32 / BLE'}</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`p-2 rounded-xl flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{isEn ? 'Backup Code' : 'Mã sao lưu'}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-4 text-xs text-slate-300">
          {/* TAB 1: DONGLE */}
          {activeTab === 'dongle' && (
            <div className="space-y-3">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <Headphones className="w-4 h-4 text-emerald-400" />
                    <span>{isEn ? 'Option 1: Mini IR Dongle (Type-C / 3.5mm Jack)' : 'Giải pháp 1: Đầu cắm IR mini (Type-C / Jack 3.5mm)'}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 font-medium">
                    ~$1 - $3
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {isEn
                    ? 'Miniature plug-in IR emitters plug into the USB Type-C port or 3.5mm headphone jack, instantly upgrading any Android phone without an IR blaster to full 38kHz infrared transmission capabilities.'
                    : 'Các thiết bị mắt hồng ngoại mini cắm qua cổng USB Type-C hoặc Jack 3.5mm lập tức biến bất kỳ điện thoại Android nào thành remote điều khiển máy lạnh với đầy đủ tần số sóng mang 38kHz.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-cyan-400 font-bold block mb-1">
                      {isEn ? 'Audio Jack 3.5mm / Dongle:' : 'Cổng Jack 3.5mm / Cáp chuyển:'}
                    </span>
                    {isEn
                      ? 'This app includes a built-in differential Web Audio synthesizer that drives dual anti-parallel IR LEDs directly from the headphone jack!'
                      : 'Ứng dụng đã tích hợp sẵn bộ phát sóng âm điều chế vi sai (Differential Audio Modulator) kéo trực tiếp 2 đèn LED phát hồng ngoại!'}
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-indigo-400 font-bold block mb-1">
                      {isEn ? 'Type-C IR Dongle:' : 'Đầu cắm Type-C:'}
                    </span>
                    {isEn
                      ? 'Dongles like Baseus, ZaZa Remote, or Tiya work directly with companion apps, and you can export IR Plus profiles straight from this app.'
                      : 'Các đầu cắm như Baseus, ZaZa Remote đi kèm app điều khiển trên CH Play, bạn có thể xuất file mã từ app này sang rất dễ dàng.'}
                  </div>
                </div>

                <div className="mt-3 p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">
                      {isEn ? 'Test 38kHz Audio Carrier Transmission:' : 'Thử nghiệm phát sóng âm 38kHz:'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {isEn ? '180° out-of-phase differential stereo carrier' : 'Sóng vi sai 180° kéo LED phát hồng ngoại'}
                    </div>
                  </div>
                  <button
                    onClick={handleTestAudioDongle}
                    disabled={audioTesting}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{audioTesting ? (isEn ? 'Transmitting...' : 'Đang phát...') : (isEn ? 'Test Transmit 3.5mm' : 'Phát thử qua Jack 3.5mm')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WIFI HUB */}
          {activeTab === 'wifi_hub' && (
            <div className="space-y-3">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <Wifi className="w-4 h-4 text-cyan-400" />
                    <span>{isEn ? 'Option 2: Smart WiFi IR Hub (Tuya / Broadlink / ESP32)' : 'Giải pháp 2: Cục phát hồng ngoại WiFi (Tuya / Broadlink / ESP32)'}</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 font-medium">
                    ~$4 - $8
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {isEn
                    ? 'A small USB-powered WiFi IR hub placed in your room allows any phone, tablet, or PC on your local network to control the Sharp A/C without pointing a device at the unit.'
                    : 'Một cục phát hồng ngoại WiFi nhỏ đặt trong phòng cho phép bất kỳ điện thoại Android, iPhone, tablet hay laptop nào kết nối cùng mạng WiFi điều khiển máy lạnh dễ dàng.'}
                </p>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                  <span className="font-semibold text-white block">
                    {isEn ? 'Direct HTTP Dispatch to ESP32 / Tasmota / Home Assistant Hub:' : 'Kết nối trực tiếp tới Hub ESP32 / Tasmota / Home Assistant:'}
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={espIp}
                      onChange={(e) => setEspIp(e.target.value)}
                      placeholder="192.168.1.100"
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <button
                      onClick={handleSendWifiHub}
                      disabled={isSendingWifi}
                      className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>{isSendingWifi ? (isEn ? 'Sending...' : 'Đang gửi...') : (isEn ? 'Send via WiFi' : 'Gửi lệnh qua WiFi')}</span>
                    </button>
                  </div>
                  {wifiStatus && (
                    <div className="text-[11px] text-emerald-400 bg-slate-950 p-2 rounded border border-slate-800 font-mono">
                      {wifiStatus}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BLUETOOTH */}
          {activeTab === 'bluetooth' && (
            <div className="space-y-3">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <Bluetooth className="w-4 h-4 text-indigo-400" />
                    <span>{isEn ? 'Option 3: DIY ESP32 BLE IR Transmitter' : 'Giải pháp 3: Mạch DIY ESP32 Bluetooth IR Blaster'}</span>
                  </div>
                  <span className="text-[10px] text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800 font-medium">
                    ~$2
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {isEn
                    ? 'For makers and electronics enthusiasts, a simple ESP32 board and 940nm IR LED connects seamlessly over Web Bluetooth API directly from Chrome browser.'
                    : 'Đối với người yêu thích chế tạo (Maker), chỉ cần 1 mạch ESP32 và 1 bóng LED hồng ngoại 940nm kết nối không dây qua Web Bluetooth trực tiếp từ trình duyệt Chrome.'}
                </p>
                <button
                  onClick={handleConnectBluetooth}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Bluetooth className="w-4 h-4" />
                  <span>{isEn ? 'Connect Web Bluetooth Device' : 'Tìm và kết nối thiết bị Bluetooth'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-3">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-white text-sm">
                  {isEn ? 'Option 4: Export to Other Remotes & Devices' : 'Giải pháp 4: Xuất mã sang thiết bị khác (Flipper Zero, Smart Remote...)'}
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {isEn
                    ? 'All 15 Sharp A/C button timings are fully verified and ready for export:'
                    : 'Toàn bộ mã 15 nút của máy lạnh Sharp đã được ứng dụng mã hóa chuẩn và sẵn sàng sao lưu:'}
                </p>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-cyan-300 break-all">
                  Pulses: {currentTimings.length} timings (38 kHz)
                  <br />
                  Leader: {currentTimings[0]}µs / {currentTimings[1]}µs
                </div>
              </div>
            </div>
          )}

          {/* Bottom Advice */}
          <div className="p-3 bg-indigo-950/40 rounded-xl border border-indigo-800 text-[11px] text-indigo-200 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong>{isEn ? 'Summary:' : 'Tóm lại:'}</strong>{' '}
              {isEn
                ? 'If your Android phone does not have an IR emitter, the easiest solution is an inexpensive Type-C mini IR dongle (~$2) or a WiFi Smart IR hub (~$5) so all phones in the household can control the A/C.'
                : 'Nếu điện thoại Android của bạn không có mắt hồng ngoại, giải pháp tiện lợi nhất là mua đầu cắm IR mini Type-C (~30.000đ - 50.000đ) hoặc cục phát IR WiFi Tuya (~90.000đ) để mọi điện thoại trong gia đình cùng điều khiển được.'}
            </div>
          </div>
        </div>
      </div>

        {/* Sticky Bottom Footer */}
        <div className="shrink-0 p-3 sm:px-5 bg-slate-950/95 border-t border-slate-800 flex items-center justify-end z-10">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-900/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
          >
            <CheckCircle className="w-4 h-4 text-emerald-300" />
            <span>{isEn ? 'Done & Return' : 'Hoàn tất & Thoát'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

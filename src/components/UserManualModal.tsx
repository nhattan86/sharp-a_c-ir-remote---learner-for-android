import React, { useEffect } from 'react';
import { X, BookOpen, CheckCircle } from 'lucide-react';
import { Language } from '../utils/i18n';

interface UserManualModalProps {
  lang?: Language;
  onClose: () => void;
}

export const UserManualModal: React.FC<UserManualModalProps> = ({ lang = 'vi', onClose }) => {
  const isEn = lang === 'en';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {isEn ? 'Sharp Air Conditioner User Manual' : 'Hướng dẫn sử dụng remote Sharp'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {isEn
                  ? 'Detailed button functions and operation modes'
                  : 'Ý nghĩa các nút và cách vận hành các chế độ máy lạnh Sharp'}
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

        {/* Section 1: Button Table */}
        <div className="space-y-4 text-xs text-slate-300">
          <div>
            <h3 className="text-sm font-bold text-white mb-2 pb-1 border-b border-slate-800">
              {isEn ? '1. Key Functions Summary' : '1. Ý nghĩa các nút trên remote máy lạnh Sharp'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="font-bold text-rose-400">(1) ON/OFF:</span> {isEn ? 'Power on or off the air conditioner.' : 'Bật hoặc tắt máy lạnh.'}
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="font-bold text-blue-400">(2) JET:</span> {isEn ? 'Super Jet cooling at 16°C and maximum fan speed.' : 'Chế độ làm lạnh cực nhanh công suất tối đa.'}
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="font-bold text-pink-400">(3) Baby Mode:</span> {isEn ? 'Gentle comfort cooling protecting infants and elderly.' : 'Vận hành dịu mát bảo vệ sức khỏe trẻ nhỏ.'}
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="font-bold text-indigo-400">(4) Thermostat (▲/▼):</span> {isEn ? 'Adjust room temperature (16°C to 30°C).' : 'Điều chỉnh nhiệt độ phòng (16°C đến 30°C).'}
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="font-bold text-slate-200">(5) FAN:</span> {isEn ? '5-speed fan control (Quiet, Soft, Low, High, Auto).' : 'Chỉnh 5 cấp tốc độ quạt (Êm ái, Nhẹ, Thấp, Cao, Tự động).'}
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="font-bold text-cyan-400">(6) Gentle Cool Air:</span> {isEn ? 'Ceiling deflection air stream avoiding direct draft.' : 'Chế độ gió thổi nhẹ nhàng hướng trần nhà.'}
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="font-bold text-blue-400">(7) SWING:</span> {isEn ? 'Automatic vertical louvre oscillation.' : 'Tự động đảo hướng cánh gió lên/xuống.'}
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="font-bold text-amber-400">(8) ON Timer:</span> {isEn ? 'Schedule automatic turn-on delay (0.5h to 12h).' : 'Hẹn giờ tự động mở máy lạnh (0.5h - 12h).'}
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="font-bold text-amber-400">(9) OFF Timer:</span> {isEn ? 'Schedule automatic turn-off delay (0.5h to 12h).' : 'Hẹn giờ tự động tắt máy (0.5h - 12h).'}
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="font-bold text-emerald-400">(10) ECO:</span> {isEn ? 'Energy saving operation (1 leaf: -3%, 2 leaves: -6%).' : 'Vận hành tiết kiệm điện (1 lá: 2-4%, 2 lá: 4-8%).'}
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="font-bold text-purple-400">(11) SLEEP:</span> {isEn ? 'Night comfort mode, gradual 1°C increase after 1 hour.' : 'Chế độ ngủ đêm êm dịu, chống rét buốt.'}
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="font-bold text-indigo-400">(12) MODE:</span> {isEn ? 'Cycle operation: Auto, Cool, Dry.' : 'Chọn chế độ làm lạnh: Auto, Cool, Dry.'}
              </div>
            </div>
          </div>

          {/* Section 2: Detailed Operation */}
          <div>
            <h3 className="text-sm font-bold text-white mb-2 pb-1 border-b border-slate-800">
              {isEn ? '2. Operating Modes Guide' : '2. Hướng dẫn sử dụng các chế độ vận hành cơ bản'}
            </h3>

            <div className="space-y-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <h4 className="font-bold text-cyan-300">
                  {isEn ? 'Cool, Dry, and Auto Modes' : 'Chế độ làm lạnh (Cool) & Hút ẩm (Dry) & Tự động (Auto)'}
                </h4>
                <p>
                  • <strong>Auto:</strong> {isEn ? 'A/C automatically adjusts temperature and fan speed for optimal room conditions.' : 'Máy tự điều chỉnh nhiệt độ và tốc độ quạt tối ưu cho căn phòng.'}
                </p>
                <p>
                  • <strong>Cool:</strong> {isEn ? 'Standard cooling mode. Adjust between 16°C and 30°C using ▲ or ▼.' : 'Nhấn MODE chọn Cool. Chỉnh nhiệt độ từ 16°C – 30°C bằng nút ▲ hoặc ▼.'}
                </p>
                <p>
                  • <strong>Dry:</strong> {isEn ? 'Dehumidification for humid or rainy days, adjustable within ±2.0°C.' : 'Nhấn MODE chọn Dry để hút ẩm mùa mưa nồm, nhiệt độ chỉnh trong khoảng ±2.0°C.'}
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <h4 className="font-bold text-blue-400">
                  {isEn ? 'Super JET Mode' : 'Chế độ làm lạnh cực nhanh (JET)'}
                </h4>
                <p>
                  {isEn
                    ? 'Press JET to immediately deliver maximum cooling power. Temperature is locked at 16°C and fan at maximum speed.'
                    : 'Nhấn nút JET để máy lạnh chạy hết công suất đem lại không khí mát lạnh tức thì. Khi JET kích hoạt, nhiệt độ được khóa ở 16°C và quạt ở mức cao nhất.'}
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <h4 className="font-bold text-amber-400">
                  {isEn ? 'Timer Settings & Cancellation' : 'Cách cài đặt hẹn giờ TẮT / MỞ'}
                </h4>
                <p>
                  {isEn
                    ? 'Press ON or OFF timer button to set countdown hours. The orange timer LED on the indoor unit illuminates. Press CANCEL to clear timer and extinguish the orange LED.'
                    : 'Nhấn ON hoặc OFF để cài thời gian đếm ngược (0.5h đến 12h). Đèn hẹn giờ màu cam trên dàn lạnh sẽ sáng lên. Để hủy hẹn giờ, nhấn nút CANCEL (đèn cam sẽ tắt).'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Sticky Bottom Footer */}
        <div className="shrink-0 p-3 sm:px-5 bg-slate-950/95 border-t border-slate-800 flex items-center justify-end z-10">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-900/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
          >
            <CheckCircle className="w-4 h-4 text-emerald-300" />
            <span>{isEn ? 'Done & Return' : 'Hoàn tất & Thoát'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect } from 'react';
import { X, Smartphone, Wind, Radio, Eye, CheckCircle } from 'lucide-react';
import { Language } from '../utils/i18n';

interface InterfaceTourModalProps {
  lang?: Language;
  onClose: () => void;
}

export const InterfaceTourModal: React.FC<InterfaceTourModalProps> = ({ lang = 'vi', onClose }) => {
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
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {isEn ? 'Application Interface Overview' : 'Tổng quan Giao diện Ứng dụng'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {isEn
                  ? 'Synchronized design based on genuine Sharp remote'
                  : 'Thiết kế đồng bộ theo remote Sharp thực tế'}
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
          {/* Section 1: Dàn lạnh Sharp */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Wind className="w-4 h-4" />
              <span>
                {isEn
                  ? '1. Wall-Mounted Smart Indoor Unit (Real-time Feedback)'
                  : '1. Dàn lạnh Sharp Inverter trên tường (Mô phỏng phản hồi tức thì)'}
              </span>
            </div>
            <p className="leading-relaxed text-slate-300">
              {isEn
                ? 'Located at the top of the interface, the simulated indoor unit responds instantly whenever a button is pressed on the remote:'
                : 'Nằm ở khu vực phía trên màn hình, dàn lạnh này nhận lệnh trực tiếp khi bạn bấm bất kỳ nút nào trên remote:'}
            </p>
            <ul className="space-y-1.5 pl-2 text-[11px]">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span>
                  <strong>{isEn ? 'Digital LED Display:' : 'Đèn LED nhiệt độ điện tử:'}</strong>{' '}
                  {isEn
                    ? 'Large 7-segment temperature number (e.g., 24°C) or % icon in dehumidify mode.'
                    : 'Hiển thị số nhiệt độ lớn (vd: 24°C) hoặc biểu tượng % khi chạy hút ẩm.'}
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span>
                  <strong>{isEn ? 'Orange Timer Indicator:' : 'Đèn hẹn giờ màu cam:'}</strong>{' '}
                  {isEn
                    ? 'Glows bright orange when ON or OFF timer is active, turns off when cancelled.'
                    : 'Sáng rõ màu cam khi kích hoạt hẹn giờ bật/tắt máy (theo đúng tài liệu Sharp).'}
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-400 font-bold">•</span>
                <span>
                  <strong>{isEn ? 'Motorized Air Louvre:' : 'Cánh đảo gió (Louvre) vẫy tự động:'}</strong>{' '}
                  {isEn
                    ? 'Oscillates up and down when SWING is active, deflecting upwards towards ceiling in Gentle Breeze mode.'
                    : 'Cánh vẫy lên xuống khi bật SWING, hoặc hướng lên trần nhà khi bật Gió nhẹ (Gentle).'}
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-indigo-400 font-bold">•</span>
                <span>
                  <strong>{isEn ? 'Infrared Receiver Eye:' : 'Mắt thần hồng ngoại IR:'}</strong>{' '}
                  {isEn
                    ? 'Flashes amber whenever an IR frame is received from the controller.'
                    : 'Chớp sáng vàng khi nhận tín hiệu truyền từ remote.'}
                </span>
              </li>
            </ul>
          </div>

          {/* Section 2: Remote Sharp chuẩn */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <Smartphone className="w-4 h-4" />
              <span>
                {isEn ? '2. Genuine Sharp Remote Control (Physical Simulation)' : '2. Thân Remote Sharp màu trắng cao cấp'}
              </span>
            </div>
            <p className="leading-relaxed text-slate-300">
              {isEn
                ? 'Accurate ergonomic layout with tactile click sounds and haptic vibration feedback:'
                : 'Vỏ ngoài cong tròn góc, phím cao su có độ nảy xúc giác và tiếng click cơ học:'}
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-rose-400 font-bold">ON/OFF:</span> {isEn ? 'Red circular power toggle' : 'Vòng tròn viền đỏ góc phải trên'}
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-blue-400 font-bold">JET:</span> {isEn ? 'Instant max cooling mode (16°C)' : 'Làm lạnh cực nhanh tức thì (16°C)'}
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-200 font-bold">▲ / ▼:</span> {isEn ? 'Target temperature adjust' : 'Tăng giảm nhiệt độ'}
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-indigo-400 font-bold">MODE:</span> {isEn ? 'Cycle Cool, Dry, Auto' : 'Đổi chế độ Cool, Dry, Auto'}
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-emerald-400 font-bold">ECO:</span> {isEn ? 'Energy saver 1 or 2 leaves' : 'Tiết kiệm điện 1 hoặc 2 lá'}
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="text-amber-400 font-bold">ON/OFF Timer:</span> {isEn ? 'Schedule delay 0.5h-12h' : 'Hẹn giờ tắt/bật từ 0.5h-12h'}
              </div>
            </div>
          </div>

          {/* Section 3: Bảng điều khiển IR & Học lệnh */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Radio className="w-4 h-4" />
              <span>{isEn ? '3. Infrared Telemetry & Learning Studio' : '3. Trung tâm Tín hiệu hồng ngoại & Học lệnh'}</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              {isEn
                ? 'Displays real-time 13-byte hexadecimal payloads and timing statistics with export options for Android ConsumerIrManager, IR Plus, Termux, and Flipper Zero.'
                : 'Hiển thị chuỗi mã hex 13 byte theo thời gian thực mỗi khi bạn bấm nút, kèm theo công cụ học lệnh từ remote thật và xuất mã cho mọi thiết bị Android.'}
            </p>
          </div>

        </div>

        {/* Sticky Bottom Footer */}
        <div className="shrink-0 p-3 sm:px-5 bg-slate-950/95 border-t border-slate-800 flex items-center justify-end z-10">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
          >
            <CheckCircle className="w-4 h-4 text-emerald-300" />
            <span>{isEn ? 'Start Exploring & Close' : 'Trải nghiệm ngay & Đóng'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

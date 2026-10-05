import React from 'react';
import { AcState, IrButtonConfig } from '../types/remote';
import {
  Power,
  Zap,
  ChevronUp,
  ChevronDown,
  Fan,
  Wind,
  RefreshCw,
  Clock,
  Leaf,
  Moon,
  RotateCcw,
  Sparkles,
  Sliders,
  Smile,
  XCircle,
} from 'lucide-react';

import { Language, translations } from '../utils/i18n';

interface SharpRemoteProps {
  state: AcState;
  buttons: IrButtonConfig[];
  onButtonPress: (buttonId: string) => void;
  onOpenLearning: (buttonId: string) => void;
  isTransmitting: boolean;
  activeButtonId?: string | null;
  lang?: Language;
  showLearnBadges?: boolean;
}

export const SharpRemote: React.FC<SharpRemoteProps> = ({
  state,
  buttons,
  onButtonPress,
  onOpenLearning,
  isTransmitting,
  activeButtonId,
  lang = 'vi',
  showLearnBadges = false,
}) => {
  const t = translations[lang];
  const isEn = lang === 'en';
  const getButton = (id: string) => buttons.find((b) => b.id === id);

  const renderLearnBadge = (btnId: string) => {
    if (!showLearnBadges) return null;
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenLearning(btnId);
        }}
        className="text-[8px] text-indigo-600 hover:underline mt-0.5 cursor-pointer font-medium"
      >
        {t.btnLearnIr}
      </button>
    );
  };

  return (
    <div className="relative mx-auto w-full max-w-[325px] sm:max-w-[340px] select-none">
      {/* Remote Outer Body matching Sharp photo */}
      <div className="relative bg-[#ECECEE] rounded-[32px] sm:rounded-[36px] p-4 sm:p-5 shadow-2xl border-2 border-[#D8D8DC] ring-1 ring-white/60">
        {/* IR Blaster Emitter LED on top rim */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-3.5 bg-gradient-to-t from-slate-700 to-slate-900 rounded-t-full flex items-center justify-center">
          <div
            className={`w-3.5 h-1.5 rounded-full transition-all duration-200 ${
              isTransmitting
                ? 'bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-ping'
                : 'bg-slate-950'
            }`}
          />
        </div>

        {/* ======================================================== */}
        {/* LCD DISPLAY SCREEN (High authenticity grey/green LCD panel) */}
        {/* ======================================================== */}
        <div className="relative bg-[#C2CCD0] rounded-xl p-3 shadow-inner border-2 border-[#A8B4B8] mb-5 font-mono text-slate-800">
          {/* LCD Screen Grid Backing */}
          <div className="absolute inset-0 bg-[radial-gradient(#00000008_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none rounded-xl" />

          {/* Top Status Bar: Mode + Eco + Jet + Baby */}
          <div className="flex justify-between items-center text-[10px] tracking-tight border-b border-slate-600/30 pb-1 font-semibold">
            {/* Modes */}
            <div className="flex gap-2">
              <span className={state.mode === 'auto' ? 'text-slate-900 font-extrabold underline' : 'text-slate-400'}>
                AUTO
              </span>
              <span className={state.mode === 'cool' ? 'text-slate-900 font-extrabold underline' : 'text-slate-400'}>
                COOL
              </span>
              <span className={state.mode === 'dry' ? 'text-slate-900 font-extrabold underline' : 'text-slate-400'}>
                DRY
              </span>
            </div>

            {/* Special Indicators */}
            <div className="flex items-center gap-1.5">
              {state.jet && (
                <span className="font-extrabold text-blue-900 bg-blue-300/60 px-1 rounded text-[9px]">
                  JET
                </span>
              )}
              {state.babyMode && (
                <span className="font-extrabold text-pink-900 bg-pink-200 px-1 rounded text-[9px]">
                  BABY
                </span>
              )}
              {state.eco > 0 && (
                <span className="font-extrabold text-emerald-900 bg-emerald-200 px-1 rounded text-[9px] flex items-center">
                  ECO {state.eco === 1 ? '🍃' : '🍃🍃'}
                </span>
              )}
            </div>
          </div>

          {/* Middle Main Zone: Big 7-Segment Temperature + Fan + Swing */}
          <div className="flex justify-between items-center py-2">
            {/* Big Temperature */}
            <div className="flex items-baseline">
              {state.power ? (
                <>
                  <span className="text-4xl font-extrabold tracking-tight tabular-nums text-slate-900 font-mono">
                    {state.mode === 'dry' ? '±0' : state.temp}
                  </span>
                  <span className="text-base font-bold ml-1 text-slate-800">
                    {state.mode === 'dry' ? '°' : '°C'}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-slate-400 tracking-wider">OFF</span>
              )}
            </div>

            {/* Fan Speed Graphic & Swing */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-[10px]">
                <Fan className="w-3.5 h-3.5 text-slate-700" />
                <span className="font-bold">
                  {state.fanSpeed === 5
                    ? 'AUTO'
                    : `SPD ${state.fanSpeed}`}
                </span>
              </div>

              {/* Fan Bars */}
              <div className="flex items-end gap-1 h-3.5">
                {[1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className={`w-1 rounded-sm ${
                      state.fanSpeed >= bar || state.fanSpeed === 5
                        ? 'bg-slate-800'
                        : 'bg-slate-400/40'
                    }`}
                    style={{ height: `${bar * 3.5}px` }}
                  />
                ))}
              </div>

              {/* Swing & Gentle Wind status */}
              <div className="text-[9px] flex items-center gap-1 font-semibold text-slate-700">
                {state.swing && <span>SWING ⟳</span>}
                {state.gentleBreeze && <span>GENTLE ↗</span>}
                {state.sleep && <span>SLEEP ☾</span>}
              </div>
            </div>
          </div>

          {/* Bottom Screen Zone: Timer Hours */}
          <div className="flex justify-between items-center border-t border-slate-600/30 pt-1 text-[10px] font-semibold text-slate-700">
            <span>SHARP INVERTER</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-700" />
              <span>
                {state.timerType === 'none'
                  ? 'TIMER --'
                  : `${state.timerType.toUpperCase()} ${state.timerHours}h`}
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ROW 1: BUTTON 3 (Baby Mode), BUTTON 2 (JET), BUTTON 1 (POWER) */}
        {/* ======================================================== */}
        <div className="grid grid-cols-3 gap-3 mb-4 items-center">
          {/* Button 3: Baby Mode (Vận hành trẻ nhỏ) */}
          <div className="relative group flex flex-col items-center">
            <button
              onClick={() => onButtonPress('baby_mode')}
              title="Vận hành cho trẻ nhỏ (Baby Mode)"
              className={`w-14 h-12 rounded-xl bg-white border border-slate-300 shadow-sm flex flex-col items-center justify-center transition-all active:scale-95 active:bg-slate-100 ${
                state.babyMode ? 'ring-2 ring-pink-400 bg-pink-50' : ''
              } ${activeButtonId === 'baby_mode' ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <Smile className="w-5 h-5 text-slate-700" />
              <span className="text-[9px] font-medium text-slate-600 mt-0.5">Baby</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenLearning('baby_mode');
              }}
              className="text-[9px] text-indigo-600 hover:underline mt-1 cursor-pointer"
            >
              {t.btnLearnIr}
            </button>
          </div>

          {/* Button 2: JET (Làm lạnh cực nhanh) */}
          <div className="relative group flex flex-col items-center">
            <button
              onClick={() => onButtonPress('powerful_jet')}
              title="Chế độ làm lạnh cực nhanh (Super JET)"
              className={`w-14 h-12 rounded-xl bg-white border border-slate-300 shadow-sm flex flex-col items-center justify-center transition-all active:scale-95 active:bg-slate-100 ${
                state.jet ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              } ${activeButtonId === 'powerful_jet' ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <Zap className="w-5 h-5 text-blue-600" />
              <span className="text-[9px] font-bold text-blue-700 mt-0.5">JET</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenLearning('powerful_jet');
              }}
              className="text-[9px] text-indigo-600 hover:underline mt-1 cursor-pointer"
            >
              {t.btnLearnIr}
            </button>
          </div>

          {/* Button 1: POWER ON/OFF (Red circular button) */}
          <div className="relative group flex flex-col items-center">
            <button
              onClick={() => onButtonPress('power')}
              title="Bật/Tắt máy lạnh"
              className={`w-14 h-14 rounded-full bg-rose-50 border-2 border-rose-500 shadow-md flex flex-col items-center justify-center transition-all active:scale-95 ${
                state.power ? 'bg-rose-500 text-white shadow-rose-300' : 'text-rose-600'
              } ${activeButtonId === 'power' ? 'ring-4 ring-rose-300' : ''}`}
            >
              <Power className={`w-6 h-6 ${state.power ? 'text-white' : 'text-rose-600'}`} />
              <span className={`text-[8px] font-bold uppercase ${state.power ? 'text-white' : 'text-rose-600'}`}>
                ON/OFF
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenLearning('power');
              }}
              className="text-[9px] text-indigo-600 hover:underline mt-1 cursor-pointer"
            >
              {t.btnLearnIr}
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* D-PAD CLUSTER: UP (4), DOWN (4), GENTLE BREEZE (6), FAN (5), MODE (12) */}
        {/* ======================================================== */}
        <div className="relative my-6 flex flex-col items-center">
          {/* Temperature UP (Arc 4) */}
          <div className="flex flex-col items-center -mb-1 z-10">
            <button
              onClick={() => onButtonPress('temp_up')}
              title="Tăng nhiệt độ"
              className={`w-28 h-9 rounded-t-full bg-slate-200 border border-slate-300 hover:bg-slate-300 shadow-sm flex items-center justify-center transition-all active:scale-95 ${
                activeButtonId === 'temp_up' ? 'ring-2 ring-indigo-500' : ''
              }`}
            >
              <ChevronUp className="w-5 h-5 text-slate-800" />
            </button>
          </div>

          {/* Middle Row: GENTLE COOL AIR (6) + MODE (12) + FAN (5) */}
          <div className="flex items-center justify-center gap-2 z-20">
            {/* Button 6: Gentle Cool Air (Gió nhẹ thổi trần) */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => onButtonPress('breeze_gentle')}
                title="Gió nhẹ thổi trần nhà (Gentle Cool Air)"
                className={`w-14 h-14 rounded-l-full bg-slate-200 border border-slate-300 hover:bg-slate-300 shadow-sm flex flex-col items-center justify-center transition-all active:scale-95 ${
                  state.gentleBreeze ? 'ring-2 ring-cyan-500 bg-cyan-100' : ''
                } ${activeButtonId === 'breeze_gentle' ? 'ring-2 ring-indigo-500' : ''}`}
              >
                <Wind className="w-4 h-4 text-slate-700" />
                <span className="text-[8px] font-semibold text-slate-700">Gentle</span>
              </button>
            </div>

            {/* Button 12: Circular MODE button */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => onButtonPress('mode')}
                title="Chọn chế độ vận hành (Cool, Dry, Auto)"
                className={`w-16 h-16 rounded-full bg-white border-2 border-slate-400 shadow-md flex flex-col items-center justify-center transition-all active:scale-95 hover:bg-slate-50 ${
                  activeButtonId === 'mode' ? 'ring-4 ring-indigo-400' : ''
                }`}
              >
                <span className="text-[11px] font-extrabold tracking-wider text-slate-800">
                  MODE
                </span>
                <Sliders className="w-3.5 h-3.5 text-slate-500 mt-0.5" />
              </button>
            </div>

            {/* Button 5: FAN (Quạt gió) */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => onButtonPress('fan_speed')}
                title="Điều chỉnh tốc độ quạt (1 Êm ái, 2 Nhẹ, 3 Thấp, 4 Cao, 5 Tự động)"
                className={`w-14 h-14 rounded-r-full bg-slate-200 border border-slate-300 hover:bg-slate-300 shadow-sm flex flex-col items-center justify-center transition-all active:scale-95 ${
                  activeButtonId === 'fan_speed' ? 'ring-2 ring-indigo-500' : ''
                }`}
              >
                <Fan className="w-4 h-4 text-slate-700" />
                <span className="text-[8px] font-semibold text-slate-700">FAN</span>
              </button>
            </div>
          </div>

          {/* Temperature DOWN (Arc 4) */}
          <div className="flex flex-col items-center -mt-1 z-10">
            <button
              onClick={() => onButtonPress('temp_down')}
              title="Giảm nhiệt độ"
              className={`w-28 h-9 rounded-b-full bg-slate-200 border border-slate-300 hover:bg-slate-300 shadow-sm flex items-center justify-center transition-all active:scale-95 ${
                activeButtonId === 'temp_down' ? 'ring-2 ring-indigo-500' : ''
              }`}
            >
              <ChevronDown className="w-5 h-5 text-slate-800" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* LOWER BUTTONS GRID: SWING, ON TIMER, OFF TIMER, ECO, SLEEP */}
        {/* ======================================================== */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Button 7: SWING (Đảo gió) */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => onButtonPress('swing')}
              title="Điều chỉnh hướng đảo gió tự động (SWING)"
              className={`w-full py-2.5 rounded-xl bg-white border border-slate-300 shadow-sm flex flex-col items-center justify-center transition-all active:scale-95 ${
                state.swing ? 'ring-2 ring-blue-400 bg-blue-50' : ''
              } ${activeButtonId === 'swing' ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <RefreshCw className="w-4 h-4 text-slate-700" />
              <span className="text-[9px] font-semibold text-slate-700 mt-0.5">SWING</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenLearning('swing');
              }}
              className="text-[8px] text-indigo-600 hover:underline mt-0.5 cursor-pointer"
            >
              {t.btnLearnIr}
            </button>
          </div>

          {/* Button 8: ON TIMER */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => onButtonPress('timer_on')}
              title="Hẹn giờ bật máy"
              className={`w-full py-2.5 rounded-xl bg-white border border-amber-300 shadow-sm flex flex-col items-center justify-center transition-all active:scale-95 ${
                state.timerType === 'on' ? 'ring-2 ring-amber-500 bg-amber-50' : ''
              } ${activeButtonId === 'timer_on' ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <Clock className="w-4 h-4 text-amber-700" />
              <span className="text-[9px] font-bold text-amber-800 mt-0.5">◷ ON</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenLearning('timer_on');
              }}
              className="text-[8px] text-indigo-600 hover:underline mt-0.5 cursor-pointer"
            >
              {t.btnLearnIr}
            </button>
          </div>

          {/* Button 10: ECO (Tiết kiệm điện) */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => onButtonPress('eco')}
              title="Chế độ tiết kiệm điện ECO (1 lá / 2 lá)"
              className={`w-full py-2.5 rounded-xl bg-[#DCFCE7] border border-emerald-400 shadow-sm flex flex-col items-center justify-center transition-all active:scale-95 ${
                state.eco > 0 ? 'ring-2 ring-emerald-600' : ''
              } ${activeButtonId === 'eco' ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <Leaf className="w-4 h-4 text-emerald-700" />
              <span className="text-[9px] font-bold text-emerald-800 mt-0.5">
                ECO {state.eco > 0 ? `(${state.eco})` : ''}
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenLearning('eco');
              }}
              className="text-[8px] text-indigo-600 hover:underline mt-0.5 cursor-pointer"
            >
              {t.btnLearnIr}
            </button>
          </div>

          {/* Placeholder for symmetry / Blank spacing */}
          <div className="flex flex-col items-center justify-center text-[10px] text-slate-400 font-medium">
            <span>SHARP</span>
          </div>

          {/* Button 9: OFF TIMER */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => onButtonPress('timer_off')}
              title="Hẹn giờ tắt máy"
              className={`w-full py-2.5 rounded-xl bg-white border border-amber-300 shadow-sm flex flex-col items-center justify-center transition-all active:scale-95 ${
                state.timerType === 'off' ? 'ring-2 ring-amber-500 bg-amber-50' : ''
              } ${activeButtonId === 'timer_off' ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <Clock className="w-4 h-4 text-amber-700" />
              <span className="text-[9px] font-bold text-amber-800 mt-0.5">◷ OFF</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenLearning('timer_off');
              }}
              className="text-[8px] text-indigo-600 hover:underline mt-0.5 cursor-pointer"
            >
              {t.btnLearnIr}
            </button>
          </div>

          {/* Button 11: SLEEP */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => onButtonPress('sleep')}
              title="Chế độ ngủ đêm SLEEP"
              className={`w-full py-2.5 rounded-xl bg-white border border-purple-300 shadow-sm flex flex-col items-center justify-center transition-all active:scale-95 ${
                state.sleep ? 'ring-2 ring-purple-500 bg-purple-50' : ''
              } ${activeButtonId === 'sleep' ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <Moon className="w-4 h-4 text-purple-600" />
              <span className="text-[9px] font-bold text-purple-700 mt-0.5">SLEEP</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenLearning('sleep');
              }}
              className="text-[8px] text-indigo-600 hover:underline mt-0.5 cursor-pointer"
            >
              {t.btnLearnIr}
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BOTTOM ROW: CANCEL TIMER (Red dot) & RESET (recessed pin) */}
        {/* ======================================================== */}
        <div className="flex justify-around items-center border-t border-slate-300/80 pt-3 pb-2 text-[10px]">
          {/* CANCEL TIMER */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => onButtonPress('timer_cancel')}
              title="Hủy hẹn giờ"
              className="flex items-center gap-1 text-slate-700 hover:text-rose-600 active:scale-95 font-semibold"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>CANCEL</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenLearning('timer_cancel');
              }}
              className="text-[8px] text-indigo-600 hover:underline mt-0.5 cursor-pointer"
            >
              {t.btnLearnIr}
            </button>
          </div>

          {/* RESET PINHOLE BUTTON */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => onButtonPress('reset')}
              title="Khôi phục cài đặt gốc"
              className="flex items-center gap-1 text-slate-600 hover:text-slate-900 active:scale-95 font-semibold"
            >
              <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-500 bg-slate-300" />
              <span>RESET</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenLearning('reset');
              }}
              className="text-[8px] text-indigo-600 hover:underline mt-0.5 cursor-pointer"
            >
              Học IR
            </button>
          </div>
        </div>

        {/* Sharp Brand Footprint at bottom */}
        <div className="text-center pt-3 pb-1 border-t border-slate-200">
          <span className="font-black tracking-widest text-slate-800 text-sm">SHARP</span>
          <div className="text-[9px] tracking-wider text-slate-500 font-semibold">
            AIR CONDITIONER
          </div>
        </div>
      </div>
    </div>
  );
};

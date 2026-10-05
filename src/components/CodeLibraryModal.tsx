import React, { useRef, useEffect, useState } from 'react';
import { IrButtonConfig } from '../types/remote';
import { downloadTextFile } from '../utils/exportFormats';
import { Language } from '../utils/i18n';
import {
  Layers,
  Play,
  RotateCcw,
  Download,
  Upload,
  CheckCircle,
  X,
  Pencil,
} from 'lucide-react';

interface CodeLibraryModalProps {
  buttons: IrButtonConfig[];
  lang?: Language;
  onSelectButtonToLearn: (buttonId: string) => void;
  onTestFire: (button: IrButtonConfig) => void;
  onResetAllToDefault: () => void;
  onResetButtonToDefault: (buttonId: string) => void;
  onSaveCustomLabel: (buttonId: string, label: string) => void;
  onImportButtons: (imported: IrButtonConfig[]) => void;
  onClose: () => void;
}

export const CodeLibraryModal: React.FC<CodeLibraryModalProps> = ({
  buttons,
  lang = 'vi',
  onSelectButtonToLearn,
  onTestFire,
  onResetAllToDefault,
  onResetButtonToDefault,
  onSaveCustomLabel,
  onImportButtons,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isEn = lang === 'en';

  // Inline label editing state
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingLabelId) {
          setEditingLabelId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, editingLabelId]);

  const handleExportJson = () => {
    const data = JSON.stringify(buttons, null, 2);
    downloadTextFile('sharp_remote_codes.json', data, 'application/json');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onImportButtons(parsed);
          alert(isEn ? `Loaded ${parsed.length} buttons from backup!` : `Đã nạp thành công ${parsed.length} nút từ file backup!`);
        } else {
          alert(isEn ? 'Invalid JSON format for IR codes.' : 'File JSON không đúng cấu trúc mã IR.');
        }
      } catch {
        alert(isEn ? 'Error reading JSON file.' : 'Lỗi khi đọc file JSON.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  const startEditLabel = (btn: IrButtonConfig) => {
    setEditingLabelId(btn.id);
    setLabelDraft(btn.customLabel || '');
  };

  const commitLabel = (buttonId: string) => {
    onSaveCustomLabel(buttonId, labelDraft.trim());
    setEditingLabelId(null);
  };

  const methodLabel = (btn: IrButtonConfig) => {
    if (btn.learnedMethod === 'usb-serial') return isEn ? 'USB Serial' : 'USB Serial';
    if (btn.learnedMethod === 'audio-photodiode') return isEn ? '3.5mm Mic' : 'Jack 3.5mm';
    if (btn.learnedMethod === 'manual') return isEn ? 'Manual' : 'Thủ công';
    if (btn.learnedMethod === 'camera') return isEn ? 'Camera' : 'Camera';
    return isEn ? 'Sharp Default' : 'Mặc định Sharp';
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative bg-slate-900 border border-slate-700 w-full max-w-3xl max-h-[92vh] sm:max-h-[88vh] rounded-2xl shadow-2xl text-slate-100 flex flex-col overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Top Header */}
        <div className="shrink-0 flex justify-between items-center border-b border-slate-800 p-3 sm:p-4 bg-slate-900 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {isEn ? '15-Key Sharp A/C IR Code Library' : 'Thư viện mã hồng ngoại (15 nút Sharp)'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {isEn
                  ? 'Manage, rename, reset per-button, backup & test fire'
                  : 'Quản lý, đặt tên, khôi phục từng nút, sao lưu và kiểm tra mã'}
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

        {/* Global Actions Toolbar */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950 border-b border-slate-800">
          <button
            onClick={() => {
              if (confirm(isEn ? 'Reset ALL 15 buttons to Sharp factory defaults?' : 'Khôi phục toàn bộ 15 nút về mã chuẩn Sharp gốc?')) {
                onResetAllToDefault();
              }
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-rose-900/40 border border-slate-700 hover:border-rose-600/60 text-slate-200 hover:text-rose-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>{isEn ? 'Restore All 15 Defaults' : 'Khôi phục toàn bộ 15 mã gốc'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isEn ? 'Export JSON' : 'Xuất JSON'}</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isEn ? 'Import JSON' : 'Nhập JSON'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Table of Buttons */}
        <div className="overflow-y-auto flex-1 scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800 z-10">
              <tr>
                <th className="py-2.5 px-3 font-semibold">{isEn ? 'Button' : 'Nút'}</th>
                <th className="py-2.5 px-3 font-semibold">{isEn ? 'Label / Name' : 'Nhãn / Tên mã'}</th>
                <th className="py-2.5 px-3 font-semibold hidden sm:table-cell">{isEn ? 'Pulses' : 'Số xung'}</th>
                <th className="py-2.5 px-3 font-semibold hidden sm:table-cell">{isEn ? 'Source' : 'Nguồn'}</th>
                <th className="py-2.5 px-3 font-semibold text-right">{isEn ? 'Actions' : 'Thao tác'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {buttons.map((b) => (
                <tr key={b.id} className="hover:bg-slate-900/50 transition-colors group">
                  {/* Button name */}
                  <td className="py-2.5 px-3 font-bold text-white font-sans">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${b.learnedMethod === 'preset' ? 'bg-slate-500' : 'bg-emerald-400'}`}
                      />
                      <span className="truncate max-w-[90px]">{b.name}</span>
                    </div>
                  </td>

                  {/* Inline label editor */}
                  <td className="py-2 px-3">
                    {editingLabelId === b.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          type="text"
                          value={labelDraft}
                          onChange={(e) => setLabelDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitLabel(b.id);
                            if (e.key === 'Escape') setEditingLabelId(null);
                          }}
                          placeholder={isEn ? 'e.g. Night 26°C…' : 'VD: Ban đêm 26°C…'}
                          className="flex-1 min-w-0 px-2 py-1 bg-slate-800 border border-indigo-500 rounded text-xs text-slate-100 focus:outline-none font-sans"
                          maxLength={40}
                        />
                        <button
                          onClick={() => commitLabel(b.id)}
                          className="p-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors cursor-pointer shrink-0"
                          title={isEn ? 'Save' : 'Lưu'}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingLabelId(null)}
                          className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors cursor-pointer shrink-0"
                          title={isEn ? 'Cancel' : 'Hủy'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditLabel(b)}
                        className="flex items-center gap-1.5 text-left group/label cursor-pointer w-full"
                        title={isEn ? 'Click to rename' : 'Nhấn để đặt tên'}
                      >
                        <span className={`text-xs truncate max-w-[120px] font-sans ${b.customLabel ? 'text-indigo-300 font-medium' : 'text-slate-500 italic'}`}>
                          {b.customLabel || (isEn ? 'Click to label…' : 'Nhấn để đặt tên…')}
                        </span>
                        <Pencil className="w-3 h-3 text-slate-600 group-hover/label:text-indigo-400 transition-colors shrink-0" />
                      </button>
                    )}
                  </td>

                  {/* Pulse count */}
                  <td className="py-2.5 px-3 text-cyan-400 font-mono hidden sm:table-cell">
                    {b.rawTimings.length}
                  </td>

                  {/* Source method */}
                  <td className="py-2.5 px-3 text-[11px] text-slate-400 font-sans hidden sm:table-cell">
                    {methodLabel(b)}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Test fire */}
                      <button
                        onClick={() => onTestFire(b)}
                        title={isEn ? 'Test Fire via audio jack' : 'Phát thử qua Jack 3.5mm'}
                        className="p-1.5 bg-slate-800 hover:bg-emerald-700 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>

                      {/* Reset this button only */}
                      <button
                        onClick={() => {
                          if (confirm(isEn ? `Reset "${b.name}" to factory Sharp default?` : `Khôi phục nút "${b.name}" về mã gốc Sharp?`)) {
                            onResetButtonToDefault(b.id);
                          }
                        }}
                        title={isEn ? 'Reset this button to default' : 'Khôi phục mã gốc nút này'}
                        className="p-1.5 bg-slate-800 hover:bg-amber-900/50 border border-transparent hover:border-amber-600/40 text-slate-300 hover:text-amber-300 rounded transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      {/* Open learning studio */}
                      <button
                        onClick={() => {
                          onClose();
                          onSelectButtonToLearn(b.id);
                        }}
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-sans font-medium transition-colors cursor-pointer"
                      >
                        {isEn ? 'Learn IR' : 'Học IR'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sticky Bottom Footer */}
        <div className="shrink-0 p-3 sm:px-5 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between gap-3 z-10">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            {isEn
              ? 'Green dot = learned/custom · Grey dot = factory default'
              : 'Chấm xanh = đã học / tùy chỉnh · Chấm xám = mã gốc Sharp'}
          </p>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
          >
            <CheckCircle className="w-4 h-4 text-emerald-300" />
            <span>{isEn ? 'Done & Return' : 'Hoàn tất & Thoát'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

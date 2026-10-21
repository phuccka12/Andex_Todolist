'use client';

import React from 'react';
import { X, Settings, Bell, HelpCircle, Check, Database, Volume2, ShieldCheck, Sparkles } from 'lucide-react';
import { soundEngine } from '../lib/audio';
import { notify } from '../lib/notificationService';


interface QuickDialogsProps {
  settingsOpen: boolean;
  notificationsOpen: boolean;
  helpOpen: boolean;
  onCloseAll: () => void;
  onResetSeedData: () => Promise<void>;
}

export const QuickDialogs: React.FC<QuickDialogsProps> = ({
  settingsOpen,
  notificationsOpen,
  helpOpen,
  onCloseAll,
  onResetSeedData,
}) => {
  if (!settingsOpen && !notificationsOpen && !helpOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] max-w-md w-full p-6 space-y-4 shadow-2xl relative border border-[#EEF2F8] animate-in zoom-in-95 duration-200">
        <button
          onClick={onCloseAll}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>

        {/* SETTINGS DIALOG */}
        {settingsOpen && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#EEF2F8]">
              <div className="w-9 h-9 rounded-2xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#1E2433]">Cài Đặt Hệ Thống</h3>
                <p className="text-[10px] text-[#8F9CAE]">Tùy biến môi trường CBP Workspace</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFD] border border-[#EEF2F8]">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-[#3B82F6]" />
                  <div>
                    <p className="text-xs font-bold text-[#1E2433]">Âm thanh ngũ âm (Pentatonic Chimes)</p>
                    <p className="text-[10px] text-[#8F9CAE]">Phản hồi âm thanh khi hoàn thành task</p>
                  </div>
                </div>
                <button
                  onClick={() => soundEngine.playPentatonicChime(4)}
                  className="px-2.5 py-1 bg-[#3B82F6] text-white text-[11px] font-bold rounded-lg"
                >
                  Thử âm
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFD] border border-[#EEF2F8]">
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-[#10B981]" />
                  <div>
                    <p className="text-xs font-bold text-[#1E2433]">Đồng bộ dữ liệu trực tuyến</p>
                    <p className="text-[10px] text-emerald-600 font-bold">● Tự động sao lưu và bảo mật an toàn</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const confirmed = await notify.confirm('Khôi phục lại toàn bộ dữ liệu mẫu khởi tạo của hệ thống?', {
                      title: 'Khôi Phục Dữ Liệu',
                      confirmText: 'Khôi phục ngay',
                      type: 'warning',
                    });
                    if (confirmed) {
                      await onResetSeedData();
                      onCloseAll();
                      await notify.success('Đã khôi phục dữ liệu mẫu ban đầu.');
                    }
                  }}
                  className="px-2.5 py-1 bg-[#F1F4FA] hover:bg-slate-200 text-[#1E2433] text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Khôi phục
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS DIALOG */}
        {notificationsOpen && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#EEF2F8]">
              <div className="w-9 h-9 rounded-2xl bg-[#FFF1F2] text-[#F43F5E] flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#1E2433]">Thông Báo Hoạt Động</h3>
                <p className="text-[10px] text-[#8F9CAE]">Nhật ký công việc thời gian thực</p>
              </div>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {[
                { title: 'Dữ liệu cá nhân đã được đồng bộ an toàn', time: 'Vừa xong', tag: 'Lưu trữ', color: 'text-emerald-600 bg-emerald-50' },
                { title: 'Lịch Biểu Kéo Thả Sẵn Sàng', time: '2 phút trước', tag: 'Thời khóa biểu', color: 'text-blue-600 bg-blue-50' },
                { title: 'Bưu thiếp 06:30 Bình Minh sẵn sàng', time: '10 phút trước', tag: 'Bưu thiếp', color: 'text-amber-600 bg-amber-50' },
                { title: 'Đã hoàn thành phân rã mục tiêu', time: 'Hôm nay', tag: 'Mục tiêu', color: 'text-purple-600 bg-purple-50' },
              ].map((n, i) => (
                <div key={i} className="p-2.5 rounded-xl border border-[#EEF2F8] bg-[#F8FAFD] space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={`font-bold px-1.5 py-0.2 rounded ${n.color}`}>{n.tag}</span>
                    <span className="text-[#8F9CAE]">{n.time}</span>
                  </div>
                  <p className="text-xs font-bold text-[#1E2433]">{n.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HELP DIALOG */}
        {helpOpen && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#EEF2F8]">
              <div className="w-9 h-9 rounded-2xl bg-[#ECE9FE] text-[#7B61FF] flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#1E2433]">Hướng Dẫn Sử Dụng & Thao Tác</h3>
                <p className="text-[10px] text-[#8F9CAE]">Các cử chỉ tương tác nổi bật trên CBP Workspace</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-[#475569] leading-relaxed">
              <div className="p-3 bg-[#F8FAFD] rounded-xl border border-[#EEF2F8] space-y-1">
                <p className="font-bold text-[#1E2433]">Kéo thả Thời Khóa Biểu (Drag & Drop)</p>
                <p className="text-[11px]">Nhấn giữ chuột vào bất kỳ thẻ task nào trên Timetable hoặc Kanban, kéo thả vào ô giờ/ngày mong muốn để tự động đổi lịch.</p>
              </div>

              <div className="p-3 bg-[#F8FAFD] rounded-xl border border-[#EEF2F8] space-y-1">
                <p className="font-bold text-[#1E2433]">Xem Lịch Tháng & Đặt Lịch (Date-Fns)</p>
                <p className="text-[11px]">Bấm vào nút "Month" góc phải trên Timetable để mở lịch tháng, dùng nút Tháng trước/sau để điều hướng và bấm vào ngày để lên lịch.</p>
              </div>

              <div className="p-3 bg-[#F8FAFD] rounded-xl border border-[#EEF2F8] space-y-1">
                <p className="font-bold text-[#1E2433]">Kho Lưu Trữ Đã Xong (Archive)</p>
                <p className="text-[11px]">Bấm vào nút "Kho Đã Xong" hoặc tab "Đã Hoàn Thành" trên thanh Sidebar để xem lại, tìm kiếm hoặc khôi phục các task đã làm xong.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

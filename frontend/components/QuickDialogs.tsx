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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFDF7] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-[6px_6px_0px_#0F172A] relative border-2 border-[#0F172A] animate-in zoom-in-95 duration-200">
        <button
          onClick={onCloseAll}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#0F172A] hover:bg-[#FFE4E6] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* SETTINGS DIALOG */}
        {settingsOpen && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-[#0F172A]/15">
              <div className="w-10 h-10 rounded-2xl bg-[#FFE4E6] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#E11D48] flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#0F172A]">Cài Đặt Hệ Thống</h3>
                <p className="text-[10px] font-bold text-slate-600">Tùy biến môi trường CBP Workspace</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-[#E11D48]" />
                  <div>
                    <p className="text-xs font-black text-[#0F172A]">Âm thanh ngũ âm (Pentatonic Chimes)</p>
                    <p className="text-[10px] font-semibold text-slate-600">Phản hồi âm thanh khi hoàn thành task</p>
                  </div>
                </div>
                <button
                  onClick={() => soundEngine.playPentatonicChime(4)}
                  className="px-3 py-1.5 bg-[#E11D48] hover:bg-[#BE123C] text-white border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[11px] font-black rounded-xl transition-all cursor-pointer"
                >
                  Thử âm
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A]">
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-[#E11D48]" />
                  <div>
                    <p className="text-xs font-black text-[#0F172A]">Làm sạch bảng & Dữ liệu</p>
                    <p className="text-[10px] font-semibold text-slate-600">Xóa toàn bộ việc thử nghiệm để bắt đầu mới</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const confirmed = await notify.confirm('Bạn có muốn xóa sạch toàn bộ các công việc thử nghiệm trên bảng để bắt đầu với bảng trống mới?', {
                      title: 'Làm Sạch Bảng Việc',
                      confirmText: 'Xóa sạch ngay',
                      cancelText: 'Hủy',
                      type: 'warning',
                    });
                    if (confirmed) {
                      await onResetSeedData();
                      onCloseAll();
                      await notify.success('Đã dọn sạch toàn bộ công việc trên bảng.');
                    }
                  }}
                  className="px-3 py-1.5 bg-[#FFE4E6] hover:bg-[#FECDD3] text-[#E11D48] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[11px] font-black rounded-xl transition-all cursor-pointer"
                >
                  Xóa sạch
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS DIALOG */}
        {notificationsOpen && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-[#0F172A]/15">
              <div className="w-10 h-10 rounded-2xl bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#E11D48] flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#0F172A]">Thông Báo Hoạt Động</h3>
                <p className="text-[10px] font-bold text-slate-600">Nhật ký công việc thời gian thực</p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1 pb-1">
              {[
                { title: 'Dữ liệu cá nhân đã được đồng bộ an toàn', time: 'Vừa xong', tag: 'Lưu trữ', color: 'text-[#0F172A] bg-[#DCFCE7]' },
                { title: 'Lịch Biểu Kéo Thả Sẵn Sàng', time: '2 phút trước', tag: 'Thời khóa biểu', color: 'text-[#0F172A] bg-[#FEF9C3]' },
                { title: 'Bưu thiếp 06:30 Bình Minh sẵn sàng', time: '10 phút trước', tag: 'Bưu thiếp', color: 'text-[#E11D48] bg-[#FFE4E6]' },
                { title: 'Đã hoàn thành phân rã mục tiêu', time: 'Hôm nay', tag: 'Mục tiêu', color: 'text-[#0F172A] bg-[#FFF1F2]' },
              ].map((n, i) => (
                <div key={i} className="p-3 rounded-2xl border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] bg-white space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={`font-black px-2 py-0.5 rounded-full border border-[#0F172A] ${n.color}`}>{n.tag}</span>
                    <span className="font-bold text-slate-500">{n.time}</span>
                  </div>
                  <p className="text-xs font-black text-[#0F172A]">{n.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HELP DIALOG */}
        {helpOpen && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-[#0F172A]/15">
              <div className="w-10 h-10 rounded-2xl bg-[#FEF9C3] border-2 border-[#0F172A] shadow-[2px_2px_0px_#0F172A] text-[#E11D48] flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#0F172A]">Hướng Dẫn Sử Dụng & Thao Tác</h3>
                <p className="text-[10px] font-bold text-slate-600">Các cử chỉ tương tác nổi bật trên CBP Workspace</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-[#0F172A] leading-relaxed">
              <div className="p-3.5 bg-white rounded-2xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-1">
                <p className="font-black text-[#0F172A]">Kéo thả Thời Khóa Biểu (Drag & Drop)</p>
                <p className="text-[11px] font-semibold text-slate-600">Nhấn giữ chuột vào bất kỳ thẻ task nào trên Timetable hoặc Kanban, kéo thả vào ô giờ/ngày mong muốn để tự động đổi lịch.</p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-1">
                <p className="font-black text-[#0F172A]">Xem Lịch Tháng & Đặt Lịch (Date-Fns)</p>
                <p className="text-[11px] font-semibold text-slate-600">Bấm vào nút "Month" góc phải trên Timetable để mở lịch tháng, dùng nút Tháng trước/sau để điều hướng và bấm vào ngày để lên lịch.</p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border-2 border-[#0F172A] shadow-[3px_3px_0px_#0F172A] space-y-1">
                <p className="font-black text-[#0F172A]">Kho Lưu Trữ Đã Xong (Archive)</p>
                <p className="text-[11px] font-semibold text-slate-600">Bấm vào nút "Kho Đã Xong" hoặc tab "Đã Hoàn Thành" trên thanh Sidebar để xem lại, tìm kiếm hoặc khôi phục các task đã làm xong.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

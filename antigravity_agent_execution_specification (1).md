# CHRONO-ATELIER × WEIHU — ANTIGRAVITY AGENT EXECUTION BLUEPRINT

> **System Role:** Senior Product Architect & UI/UX Design System Director
>
> **Target Agent Runtime:** Google Antigravity Agent Engine
>
> **UI Aesthetic Profile:** "Weihu Soft-Pastel Bento & Claymorphic Glass" (Tham chiếu chuẩn từ hình ảnh UI Weihu)
>
> **Mục tiêu:** Xây dựng hệ thống điều hành thời khóa biểu cá nhân, quản lý công việc đúng giờ, tích hợp Gamification, Mascot động viên, Dispatcher bưu thiếp Email, Nhạc nền thiền định và Nét vẽ nghệ thuật tích lũy.

## 1. PHÂN TÍCH BẢN SẮC THỊ GIÁC (VISUAL DESIGN TOKENS)

Antigravity Agent phải tuân thủ nghiêm ngặt bảng token thiết kế này, không được tự ý chuyển sang giao diện phẳng xám văn phòng (Jira/Trello):

### 1.1. Bảng Màu Thẻ Đa Sắc Pastel (Card Chromatic Matrix)

Mỗi thẻ công việc trên bảng được phân nhóm theo màu pastel dịu, chữ và biểu tượng đi kèm phải dùng mã màu tương phản cấp độ cao (High-contrast Monochromatic Tint):

| **Tên thẻ màu** | **Nền thẻ (Card BG)** | **Màu chữ & Accent (Card Text/Icon)** | **Nhãn Tag Pill (White Frosted)** | **Mục đích sử dụng** | 
| **Pastel Lavender** | `#ECEBFE` | `#5E48E8` (Tím hoàng gia) | `bg-white/80 text-[#5E48E8]` | Việc cốt lõi (Deep Work / #1) | 
| **Pastel Periwinkle** | `#EBEBFF` | `#4338CA` (Xanh tím biển) | `bg-white/80 text-[#4338CA]` | Nghiên cứu, ý tưởng, website | 
| **Pastel Peach** | `#FEF0E6` | `#C46A2B` (Cam gốm nung) | `bg-white/80 text-[#C46A2B]` | Task đang chạy (In Progress) | 
| **Pastel Mint** | `#E6F9EE` | `#15803D` (Xanh lá rừng sâu) | `bg-white/80 text-[#15803D]` | Đang kiểm thử, tối ưu code | 
| **Pastel Magenta** | `#FDE8F3` | `#BE185D` (Hồng dâu chín) | `bg-white/80 text-[#BE185D]` | Ca chuẩn bị / In Review | 
| **Pastel Sky Blue** | `#E2F4FD` | `#0369A1` (Xanh thiên thanh) | `bg-white/80 text-[#0369A1]` | Đã hoàn thành (Done) | 
| **Pastel Cream** | `#FEF8E7` | `#B45309` (Vàng mật ong) | `bg-white/80 text-[#B45309]` | Ca họp, trao đổi ngắn | 
| **Pastel Rose** | `#FEE4E2` | `#B42318` (Đỏ san hô dịu) | `bg-white/80 text-[#B42318]` | Việc gấp / Task cần chú ý | 

### 1.2. Hình Học & Bán Kính Bo Góc (Geometry & Shadows)

* **Toàn bộ bề mặt:** Bo góc cực đại `rounded-[28px]` hoặc `rounded-3xl` (24px–28px).

* **Nền Canvas tổng thể:** `#F4F5F9` (Xám khói sáng ấm, không dùng nền trắng tinh 100% để tạo độ tương phản cho thẻ).

* **Đổ bóng mịn (Clay Shadow):** `box-shadow: 0 4px 20px -2px rgba(112, 144, 176, 0.12), 0 2px 6px -1px rgba(112, 144, 176, 0.08)`.

* **Nút bấm chính (CTA):** Viên thuốc đen tương phản cao (`bg-[#0F172A] text-white rounded-full px-5 py-2 text-xs font-bold`) kèm icon `+`.

## 2. BẢN ĐỒ BỐ CỤC KHÔNG GIAN (WEIHU ASCII WIREFRAME)

```
+-------------------------------------------------------------------------------------------------------------------------+
| [LOGO: weihu]  |  Welcome, Brooklyn Simmons   [🔍 Find something...  ⌘ K]   [🔥 14 Ngày]  [?]  [🔔]                      |
+----------------+--------------------------------------------------------------------------------------------------------+
| SIDEBAR (Left) |  Tháng 9 (September)         [Board - Daily Tasks v]   (Avatars)  [Filters]  [+ Create task]            |
|                |  Hôm nay: Thứ Tư, 30/09/2026                                                                           |
| [Tasks: 16]    |  ----------------------------------------------------------------------------------------------------  |
| [Activities]   |                                                                                                        |
|                |  [Todo list (3)]       [In Progress (2)]       [In Review (4)]          [Done (2)]                     |
| MAIN:          |  +------------------+  +--------------------+  +---------------------+  +----------------------------+ |
| - Dashboard    |  | #website #client |  | #dribbble #product |  | #development #client|  | #mobileapp #client         | |
| - Schedule     |  | Inspirations for |  | Weihu product task |  | Qrypto landing page |  | Affitto product service    | |
| - Note         |  | upcoming project |  | [🖼 Image Preview]  |  | create in webflow   |  | [✔] Branding               | |
| - Products     |  | Note: Mise...    |  | Note: Finish before|  | (Avatars + 💬12 📎8) |  | [✔] Mobile app design      | |
| - Report       |  | Progress 40%     |  | Progress 90%       |  +---------------------+  | [✔] Dashboard development  | |
|                |  | ●●●●○○○○○○       |  | ●●●●●●●●●○         |  | #product #client    |  | (Avatars + 💬7 📎2)        | |
| RECORDS:       |  +------------------+  +--------------------+  | Natverk video app   |  +----------------------------+ |
| - Team         |  | #mobileapp       |  | #products #client  |  +---------------------+  | #products #client          | |
| - Ambient Sound|  | Ginko app design |  | CRM shop page      |  | #website #client    |  | Moli app redesign          | |
| - Postcard Mail|  | - [x] Flow       |  | Progress 40%       |  | Redesign Grab web   |  | (Avatars + 💬12 📎8)       | |
|                |  | - [x] Wireframe  |  | ●●●●○○○○○○         |  | Note: 3:12 AM       |  +----------------------------+ |
| USER CARD:     |  | - [ ] Onboarding |  +--------------------+  +---------------------+                                 |
| Brooklyn S.    |  | Progress 15%     |                                                                                  |
| simmons@...    |  | ●●○○○○○○○○       |                                                                                  |
+----------------+--+------------------+----------------------------------------------------------------------------------+
| FOOTER: Live Clock 10:45:00 • Âm thanh Ngũ Cung thiền định • Bưu thiếp Email tự động lúc 06:30 sáng                     |
+-------------------------------------------------------------------------------------------------------------------------+

```

## 3. ĐẶC TẢ CHI TIẾT CÁC MODULE CHỨC NĂNG

### Module 1: Time-Boxed Daily & Monthly Scheduler (Thời khóa biểu theo khung giờ & Kế hoạch tháng)

* **Khung giờ theo ca (Time-Box):** Mỗi thẻ mang một khung giờ bắt đầu và kết thúc cụ thể (ví dụ: `10:30 - 12:00`).

* **Lưới Tháng (Monthly View):** Cho phép chọn tháng trên dropdown header để xem lịch tổng quan, lập mục tiêu tháng và lên lịch lặp lại (recurring) theo từng thứ trong tuần.

* **Hàng chấm tiến độ độc bản (Dotted Progress Indicator):**

  * Gồm 10 chấm tròn bo tròn: `●●●●○○○○○○`.

  * Tỷ lệ % hoàn thành tự động tính toán dựa trên số tiêu chí DoD đã tick hoặc tiến độ thời gian trôi qua của ca làm việc.

### Module 2: Interactive DoD Checklist & Micro-Delights (Tiêu chí nghiệm thu & Ăn mừng)

* **Tick trực tiếp trên thẻ:** Danh sách checklist (ví dụ: `Create user flow`, `Make wireframe`) nằm ngay trên bề mặt thẻ, người dùng bấm tick là gạch ngang chữ (`line-through`) và tô màu icon tick.

* **Pháo hoa giấy mờ & Âm giai Ngũ Cung:** Khi tick hoàn thành hoặc kéo thả thẻ vào cột **Done**, hệ thống kích hoạt hiệu ứng Canvas Confetti nhẹ nhàng và phát ra một nốt nhạc ngũ cung (Pentatonic Chime) thư giãn qua Web Audio API.

### Module 3: Virtual Companion & Mascot Động Viên

* **Linh vật hiện diện tại Avatar Stack & Footer:** Mascot (ví dụ: Mèo Nala 🐾) nằm trong danh sách nhóm cộng tác ở header.

* **Tương tác chạm:** Người dùng bấm vào thẻ người dùng góc dưới bên trái hoặc mascot ở header để nhận được câu thoại ngắn truyền cảm hứng và lời nhắc uống nước/nghỉ ngơi theo thời gian thực.

### Module 4: Artisan Email Dispatcher (Bưu thiếp Email tự động)

* **Không gửi email rác hệ thống:** Định dạng email như một **tấm bưu thiếp cá nhân hóa** với font chữ thanh lịch và bố cục tối giản.

* **Lịch gửi định kỳ:**

  * **06:30 Sáng:** Gửi bản đồ 3–4 ca quan trọng trong ngày kèm dự báo thời tiết và lời chúc đầu ngày.

  * **22:00 Đêm:** Gửi tổng kết số ca đã hoàn thành, số ngày giữ chuỗi Streak và một bài thơ Haiku thư giãn trước khi ngủ.

* **Modal Preview:** Có nút mở modal trên web để người dùng xem trước và gửi thử nghiệm mẫu email vào hòm thư cá nhân.

### Module 5: Zen Soundscape (Bộ âm thanh tập trung tích hợp)

* Tích hợp trực tiếp tại thanh Sidebar mục **Records & Companion**:

* Nút bật/tắt tiếng mưa rào êm dịu (*Paul Kellet Pink Noise Filter*) giúp cách ly tạp âm xung quanh và tăng khả năng tập trung sâu trong lúc làm việc.

### Module 6: Generative Art Integration (Nét vẽ tạo sinh tích lũy)

* Dữ liệu các task hoàn thành được nạp vào thuật toán tạo sinh ngầm (Generative Engine). Càng hoàn thành nhiều ca đúng giờ, bức tranh đại diện cho tháng càng hiện rõ nét cọ nước (Watercolor Wash), sẵn sàng xuất thành hình ảnh vào ngày cuối tháng.

## 4. SCHEMA CẤU TRÚC DỮ LIỆU ĐIỀU HÀNH (JSON DATA SCHEMA)

Antigravity Agent sử dụng cấu trúc JSON này để quản lý trạng thái của từng Task trên Board:

```
{
  "id": "task_2026_09_01",
  "title": "Ginko mobile app design",
  "category": "mobile_app",
  "tags": ["#mobile app", "#client"],
  "color_theme": "purple", 
  "column": "todo",
  "time_box": {
    "start": "10:30",
    "end": "12:00",
    "duration_minutes": 90
  },
  "note": "We have a meeting 2:34 AM",
  "progress_percentage": 50,
  "definition_of_done": [
    { "id": "dod_1", "text": "Create user flow", "completed": true },
    { "id": "dod_2", "text": "Make wireframe", "completed": true },
    { "id": "dod_3", "text": "Design onboarding screens", "completed": false },
    { "id": "dod_4", "text": "Make prototype", "completed": false }
  ],
  "collaborators": [
    { "name": "Brooklyn Simmons", "avatar": "avatar_url_1" },
    { "name": "Nala Mascot", "avatar": "🐾" }
  ],
  "stats": {
    "comments_count": 7,
    "attachments_count": 2
  },
  "punctuality_status": "on_track"
}

```

## 5. BẢN HƯỚNG DẪN THỰC THI CHO AGENT (STEP-BY-STEP IMPLEMENTATION INSTRUCTIONS)

1. **Khởi tạo Layout Chuẩn Weihu:** Dựng giao diện 2 cột gồm Sidebar cố định bên trái bo tròn (`rounded-[28px]`, rộng 256px) và Main Board bên phải với 4 cột Kanban (`Todo list`, `In Progress`, `In Review`, `Done`).

2. **Triển khai Hệ màu Pastel Tương Phản:** Áp dụng chính xác các cặp màu nền và chữ trong bảng mã mục 1.1 cho từng thẻ.

3. **Lập trình Dotted Progress:** Viết component render chuỗi 10 chấm tròn, tự động cập nhật số chấm sáng dựa theo số lượng checklist con được tick.

4. **Tích hợp Web Audio Synth:** Lập trình bộ phát âm thanh nốt ngũ cung khi tick checklist và bộ lọc Pink Noise tạo tiếng mưa nền trong Sidebar.

5. **Tích hợp Modal Bưu thiếp Email & Tạo ca mới:** Cung cấp modal trực quan để người dùng thêm nhanh ca làm việc và gửi thử mẫu email bưu thiếp bình minh.
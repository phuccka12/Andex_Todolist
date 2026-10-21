# CHRONO-ATELIER — BẢN THIẾT KẾ & ĐẶC TẢ TƯƠNG TÁC THỜI KHÓA BIỂU TRUNG TÂM
> **Hệ thống điều hành nhịp sống nghệ thuật & Thời khóa biểu tương tác trực tiếp**  
> *Phiên bản đặc tả: V2.6 Architecture & UX Blueprint*

---

## 1. TRIẾT LÝ THIẾT KẾ: "CENTER-STAGE TIMETABLE"

Khác với các ứng dụng to-do list thông thường chỉ liệt kê các dòng chữ vô hồn khiến người dùng dễ trì hoãn, **Chrono-Atelier** đặt **Thời khóa biểu dạng lưới thời gian (Time-Grid)** làm **trung tâm sân khấu thị giác**. 

* **Thời gian có hình hài và không gian:** Mỗi nhiệm vụ không chỉ là một cái tên, mà là một **khối không gian vật lý (Timebox Tile)** có chiều cao tương ứng với độ dài thời gian, chiếm lĩnh một khoảng xác định trên dòng chảy 24 giờ.
* **Tương tác trực tiếp không qua trung gian (Direct Tactile Manipulation):** Người dùng có thể click chuột, kéo thả, co giãn khối thời gian ngay trên mặt lưới giống như đang sắp xếp các phím đàn piano hoặc các khối lego thời gian.

---

## 2. BẢN ĐỒ BỐ CỤC KHÔNG GIAN (STITCH WIREFRAME SCHEMATIC)

Toàn bộ màn hình được thiết kế theo tỷ lệ **Golden Ratio (3 : 6 : 3)**, trong đó **Cột giữa (Cột 2) chiếm trọn tiêu điểm** của người dùng.

```
+-----------------------------------------------------------------------------------------------------------------------+
|  [LOGO: Chrono-Atelier]   |   DẢI LỤA CỰC QUANG TIẾN ĐỘ NGÀY (44.2%)   |   [🔥 Streak: 14 Ngày]   [Âm thanh Mưa/Lò sưởi] |
+-----------------------------------------------------------------------------------------------------------------------+
|                                    |                                                 |                                |
|   CỘT TRÁI: LIVING DIORAMA         |        CỘT GIỮA: THỜI KHÓA BIỂU TRUNG TÂM       |     CỘT PHẢI: PHÒNG THƠ & HỌA  |
|   (Bối cảnh & Tầm nhìn tháng)      |        (SÂN KHẤU TƯƠNG TÁC TRỰC TIẾP)           |     (Tích lũy & Trợ lý AI)     |
|                                    |                                                 |                                |
|  +------------------------------+  |  [Thứ Tư, 30/09]  [Hôm nay]  [+ Thêm Ca Nhanh]  |  +--------------------------+  |
|  | CĂN PHÒNG ISOMETRIC 2.5D     |  |  ---------------------------------------------  |  | GENERATIVE FOCUS CANVAS  |  |
|  | * Bàn làm việc & Laptop      |  |  08:00                                          |  | * Nét cọ nước tạo sinh   |  |
|  | * Đèn bàn đổi màu            |  |  08:30 +-------------------------------------+  |  | * Tác phẩm tích lũy tháng|  |
|  | * Mèo Nala đeo tai nghe      |  |        | [✓] Deep Work: Kiến trúc Model      |  |  +--------------------------+  |
|  | * Cửa kính mưa theo thời tiết|  |  10:00 +-------------------------------------+  |                                |
|  +------------------------------+  |  10:30                                          |  +--------------------------+  |
|  | Bong bóng thoại Mascot Nala  |  |  ====== [KIM THỜI GIAN THẬT: 10:41] ==========  |  | THƠ HAIKU ZEN ĐẦU NGÀY   |  |
|  +------------------------------+  |  11:00 +-------------------------------------+  |  | "Mưa rơi ngoài khung kính|  |
|                                    |        | [>] ĐANG DIỄN RA: Code Pipeline     |  |  |  Nét code đọng trang hồ..."|
|  +------------------------------+  |        |     (Viền vàng dạ quang, đếm ngược) |  |  +--------------------------+  |
|  | LƯỚI QUY HOẠCH THÁNG         |  |        |     - [x] DoD: Viết hàm transform   |  |                                |
|  | * Heatmap 30 ngày            |  |        |     - [ ] DoD: Benchmark < 200ms    |  |  +--------------------------+  |
|  | * Tiến độ: 24/28 ca Deep Work|  |  12:00 +-------------------------------------+  |  | AI ATELIER ASSISTANT     |  |
|  +------------------------------+  |  13:00                                          |  | [Prompt: Chiều nay rảnh...|  |
|                                    |  14:00 + - - - - - - - - - - - - - - - - - - +  |  |  -> Tự động điền 2 slot] |  |
|                                    |        | [ ] SẮP TỚI: Review PR & Họp Sync   |  |  +--------------------------+  |
|                                    |  15:30 + - - - - - - - - - - - - - - - - - - +  |                                |
+-----------------------------------------------------------------------------------------------------------------------+
|  FOOTER: Tự động dispatch email bưu thiếp lúc 06:30 | Đang đồng bộ thời gian thực theo múi giờ địa phương             |
+-----------------------------------------------------------------------------------------------------------------------+
```

---

## 3. ĐẶC TẢ TƯƠNG TÁC CHI TIẾT: THỜI KHÓA BIỂU TRUNG TÂM

Thời khóa biểu trung tâm không phải là một danh sách tĩnh, mà là một **mặt điều khiển cảm ứng (Tactile Control Grid)**:

### 3.1. Các Thao Tác Trực Tiếp Bằng Chuột / Cảm Ứng (Direct Actions)
1. **Click & Drag để tạo slot mới (Quick-Draw Slot):**
   * Người dùng click chuột vào một khoảng trống (ví dụ từ mốc `15:30`) rồi kéo dài xuống `17:00`.
   * Một khối mờ xuất hiện kèm tooltip thời lượng (`90 phút`). Thả chuột -> Mở popup nhỏ để nhập tên ca và phân loại (#1 Deep Work, #3 Việc vừa, #5 Việc nhỏ).
2. **Kéo mép để co giãn thời lượng (Edge-Resizing):**
   * Di chuột vào cạnh dưới của khối thời gian, con trỏ đổi thành mũi tên 2 chiều `↕`.
   * Kéo xuống để gia hạn thêm 15–30 phút; đẩy lên để kết thúc sớm.
3. **Kéo-thả dời ca (Drag & Drop Reordering):**
   * Bấm giữ thân khối thời gian và kéo lên/xuống dọc theo trục 24h để dời lịch khi có việc phát sinh ngoài dự kiến.
4. **Tương tác trực tiếp trên Tiêu chí Hoàn thành (Inline DoD Checklist):**
   * Ngay trên mặt thẻ của ca làm việc, danh sách các tiêu chí phụ (Definition of Done) hiển thị sẵn dạng checkbox. Người dùng tick thẳng trên thẻ mà không cần mở modal con.
5. **Nút "Hard-Stop / Hoàn thành ngay":**
   * Mỗi ca đang chạy đều có 1 nút hoàn thành nhanh. Khi bấm:
     * Kích hoạt âm giai ngũ cung (Pentatonic cascade: Đô - Mi - Sol).
     * Bắn pháo hoa giấy mờ (Amber confetti).
     * Gửi tín hiệu sang Cột phải: Canvas tự động vẽ 1 nét màu nước loang.

---

### 3.2. Cơ Chế Kim Giờ Sống (Real-time Live Needle)
* Một đường kẻ ngang màu đỏ/hổ phách phát sáng chạy ngang qua thời khóa biểu trung tâm.
* **Vị trí của kim giờ dịch chuyển từng phút** theo đồng hồ hệ thống.
* **Hiệu ứng va chạm (Collision Detection):**
  * Khi kim giờ chạm vào vạch bắt đầu của một ca: Thẻ ca đó lập tức chuyển từ trạng thái `Upcoming` sang `Active Now` (phát sáng viền neon, kích hoạt đồng hồ đếm ngược từng giây, nhân vật bên cột trái vẫy tay nhắc nhở).
  * Khi kim giờ vượt quá thời gian kết thúc mà người dùng chưa tick hoàn thành: Thẻ chuyển sang trạng thái cảnh báo `Overdue / Spillover` (đổi màu viền cam cảnh báo, hỏi người dùng: *Cần thêm 15 phút hay dời vào ca bù giờ?*).

---

### 3.3. Các Trạng Thái Thị Giác Của Khối Thời Gian (Slot Visual States)

| Trạng thái | Biểu hiện thị giác trên Thời khóa biểu | Ý nghĩa tương tác |
| :--- | :--- | :--- |
| **Past (Đã qua)** | Nền kính tối mờ (opacity 60%), chữ gạch ngang, nhãn `Đã xong (+EXP)` màu xanh ngọc. | Không gây xao nhãng; lưu lại bằng chứng của sự nỗ lực. |
| **Active (Đang chạy)** | **Viền hổ phách phát sáng 1.5px**, nền chuyển sắc vàng ấm nhẹ, có sóng hào quang tỏa chậm (breathing glow), đồng hồ đếm ngược chạy từng giây. | Tâm điểm của sự chú ý; chỉ làm duy nhất việc này. |
| **Upcoming (Sắp tới)** | Viền kính mỏng bán trong suốt, hiển thị đếm ngược: *"Bắt đầu sau X phút"*, có nút gửi thư nháp thử nghiệm. | Cho phép chuẩn bị tinh thần và tài liệu trước. |
| **Buffer Slot (Đệm)** | Khung viền nét đứt (dashed border), màu xám khói, nằm ở cuối ngày (16:30 - 17:30). | Dành riêng để giải quyết việc bị tràn giờ, chống vỡ trận lịch. |

---

## 4. MA TRẬN LIÊN KẾT: THỜI KHÓA BIỂU VÀ CÁC MODULE NGOẠI VI

Thời khóa biểu trung tâm đóng vai trò là **"nhạc trưởng"** điều khiển toàn bộ các thành phần còn lại:

```
                      +-----------------------------+
                      | THỜI KHÓA BIỂU TRUNG TÂM   |
                      | (Time-Boxed Matrix)         |
                      +--------------+--------------+
                                     |
       +-----------------------------+-----------------------------+
       |                             |                             |
       v                             v                             v
[CỘT TRÁI: DIORAMA]         [CỘT PHẢI: CANVAS & THƠ]      [HỆ THỐNG EMAIL TỰ ĐỘNG]
- Đúng giờ: Đèn bàn sáng     - Tick xong task: Vẽ thêm     - 06:30: Trích xuất lịch ngày
  ấm áp, mèo ngủ yên tĩnh.     1 dải màu nước loang.        gửi bưu thiếp "Bình Minh".
- Quá giờ: Mèo Nala sốt      - Cuối ngày: Xuất bức tranh   - Trước ca 15p: Gửi mẩu giấy
  ruột, hiện thoại nhắc nhở.   tổng hợp của cả tháng.       nhắc nhở "Pre-flight Nudge".
```

1. **Liên kết sang Living Diorama (Cột trái):**
   * Nếu thời khóa biểu đang ở ca Deep Work: Mascot trong căn phòng Diorama tự động đeo tai nghe và tập trung gõ máy tính.
   * Nếu thời khóa biểu trống lịch: Mascot ngồi duỗi chân uống trà, radio phát nhạc thư giãn.
2. **Liên kết sang Generative Canvas & Haiku (Cột phải):**
   * Số giờ tập trung tích lũy từ thời khóa biểu sẽ nạp trực tiếp vào thông số của bức tranh tạo sinh. 
   * Khi đóng ca cuối cùng trong ngày trên thời khóa biểu, bài thơ Haiku tự động sinh ra dựa trên chủ đề các công việc bạn đã hoàn thành hôm đó.
3. **Liên kết sang Bộ Não AI (AI Assistant):**
   * Khi bạn gõ vào ô chat: *"Sắp xếp cho tôi 2 tiếng học thuật toán chiều nay"*, AI sẽ quét các khoảng trống trên thời khóa biểu trung tâm và tự động "thả" một khối thời gian vừa vặn vào khung `14:00 - 16:00`.

---

## 5. ĐẶC TẢ DỮ LIỆU ĐIỀU KHIỂN (JSON DATA SCHEMA)

Mỗi khối thời gian trên thời khóa biểu được định nghĩa bởi một cấu trúc dữ liệu chuẩn mực để hỗ trợ lưu trữ cục bộ (Local Storage) hoặc đồng bộ Cloud:

```json
{
  "id": "slot_20260930_02",
  "title": "Luyện Code Pipeline & Tối Ưu Thuật Toán",
  "category": "deep_work",
  "priority": "#1 Cốt Lõi",
  "time_start": "10:30",
  "time_end": "12:00",
  "duration_minutes": 90,
  "status": "in_progress",
  "sound_timbre": "E5_bell",
  "definition_of_done": [
    { "text": "Viết xong hàm transform và batch loader", "completed": true },
    { "text": "Xử lý memory leak & benchmark < 200ms", "completed": false }
  ],
  "associated_canvas_stroke": {
    "color_palette": "amber_sunlight",
    "stroke_intensity": 0.85
  },
  "email_reminder_sent": true
}
```

---

## 6. LỘ TRÌNH TRIỂN KHAI TRẢI NGHIỆM NGƯỜI DÙNG (USER JOURNEY)

* **06:30 Sáng:** Bạn mở hòm thư, đọc bức bưu thiếp gửi từ Mascot Nala phác thảo 3 chặng dừng chân trong ngày.
* **08:30 Sáng:** Bạn mở trang web. Thời khóa biểu trung tâm đã nạp sẵn khung giờ. Vạch kim thời gian bắt đầu quét qua ca đầu tiên.
* **Trong ngày:** Bạn thực hiện các ca làm việc. Mỗi lần tick hoàn thành, chuông thiền ngân lên, bức tranh bên phải hiện thêm một nét vẽ, ngọn lửa streak duy trì rực sáng.
* **22:00 Đêm (Nghi thức Shutdown):** Bạn hoàn tất ca cuối. Đèn căn phòng Diorama chớp nhẹ rồi chuyển sang ánh trăng dịu, Mascot đi ngủ, âm thanh nền nhỏ dần rồi khép lại một ngày trọn vẹn và kỷ luật.
```markdown
# Astro Collector — Web Game (STEM demo)

Mô tả:
- Game top-down điều khiển tàu vũ trụ, thu thập "sample" và tránh/tiêu diệt asteroid.
- Hoàn toàn chạy trên trình duyệt (HTML/CSS/JS).

Chạy:
1. Lưu 3 file (`index.html`, `styles.css`, `game.js`) vào cùng thư mục.
2. Mở `index.html` bằng trình duyệt (Chrome/Edge/Firefox).
   - Nếu module import bị chặn local, chạy server nhẹ:
     - Python 3: `python -m http.server 8000`
     - Node: `npx http-server .`
3. Nhấn Start.

Controls:
- Bàn phím: WASD hoặc phím mũi tên để di chuyển.
- Chuột/Touch: Kéo trên canvas để di chuyển tàu.
- Pause: nút góc phải.

Mở rộng mà bạn có thể yêu cầu:
- Thêm levels/challenges, leaderboard (localStorage), power-ups, âm thanh/nhạc nền, hoặc chuyển thành Progressive Web App (PWA) để cài lên điện thoại.
```

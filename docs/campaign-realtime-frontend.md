# Campaign Jobs Realtime API (Frontend)

## Mục tiêu

- Frontend theo dõi trạng thái `campaign-jobs` realtime qua Socket.IO.
- Không cần reload trang để biết job đang queue/running/finished/stopped.

## Socket Event

- Event name: `campaign:status`
- Server emit cho mọi client mỗi khi trạng thái queue/job thay đổi.
- Client mới connect sẽ nhận ngay snapshot trạng thái mới nhất.

### Payload mẫu

```json
{
  "event": "job:running",
  "processing": true,
  "current_job_id": 12,
  "queue": [13, 14],
  "timestamp": "2026-04-26T12:00:00.000Z",
  "job_id": 12
}
```

### Trường dữ liệu

- `event`: loại sự kiện trạng thái.
- `processing`: manager đang xử lý queue hay không.
- `current_job_id`: id job đang chạy, `null` nếu không có.
- `queue`: danh sách job id đang chờ.
- `timestamp`: thời điểm emit.
- `job_id`: id job liên quan ở một số event.
- `status`: trạng thái cuối của job (`finished|failed|stopped`) ở event hoàn tất.
- `summary`: thống kê kết quả ở event hoàn tất.

### Các `event` hiện có

- `manager:status`
- `queue:processing`
- `queue:idle`
- `job:queued`
- `job:dequeued`
- `job:running`
- `job:stopping`
- `job:removed_from_queue`
- `job:not_found`
- `job:completed`

## HTTP API cho Campaign Jobs

- `GET /campaign-jobs`
- `GET /campaign-jobs/:id`
- `POST /campaign-jobs`
- `PUT /campaign-jobs/:id`
- `POST /campaign-jobs/:id/videos`
- `PATCH /campaign-jobs/:id/status`
- `POST /campaign-jobs/:id/finish`
- `DELETE /campaign-jobs/:id`

## HTTP API cho Queue Manager

- `GET /campaign-jobs/manager/status`
- `POST /campaign-jobs/:id/start`
- `POST /campaign-jobs/:id/stop`

## Flow frontend đề xuất

1. Kết nối Socket.IO.
2. Lắng nghe `campaign:status` và update store/UI.
3. Gọi `GET /campaign-jobs` để load danh sách ban đầu.
4. Khi user bấm start: gọi `POST /campaign-jobs/:id/start`.
5. UI cập nhật theo event realtime:
   - Queue panel: từ `queue`.
   - Running badge: từ `current_job_id`.
   - Job state: từ `event`, `status`, `summary`.

## Mẫu client Socket.IO

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:3098", {
  transports: ["websocket"]
});

socket.on("campaign:status", (data) => {
  console.log("campaign status:", data);
  // cập nhật state/store tại đây
});
```

## Lưu ý

- Queue manager chỉ chạy một campaign tại một thời điểm để tránh chạy đồng thời gây tràn bộ nhớ.
- Trong từng campaign, worker vẫn chạy song song theo thuật toán trong `worker_manager.js`.


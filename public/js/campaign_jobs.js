(function () {
  const campaignsPane = document.getElementById('campaigns-tab-pane');
  if (!campaignsPane) return;

  const API_BASE = 'http://localhost:3098';
  const JOBS_URL = `${API_BASE}/campaign-jobs`;
  const MANAGER_STATUS_URL = `${API_BASE}/campaign-jobs/manager/status`;
  const AVAILABLE_CAMPAIGN_VIDEOS_URL = `${API_BASE}/videos/available-for-campaign`;
  const UPLOAD_EXCEL_URL = `${API_BASE}/videos/upload-excel`;
  const TEMPLATE_URL = `${API_BASE}/videos/excel-template`;

  const campaignJobsTableBody = document.getElementById('campaignJobsTableBody');
  const campaignReloadBtn = document.getElementById('campaignReloadBtn');
  const campaignCreateBtn = document.getElementById('campaignCreateBtn');
  const campaignSocketStatus = document.getElementById('campaignSocketStatus');
  const campaignManagerProcessing = document.getElementById('campaignManagerProcessing');
  const campaignCurrentJob = document.getElementById('campaignCurrentJob');
  const campaignQueueList = document.getElementById('campaignQueueList');
  const campaignLastEvent = document.getElementById('campaignLastEvent');
  const campaignLastStatus = document.getElementById('campaignLastStatus');
  const campaignLastSummary = document.getElementById('campaignLastSummary');
  const campaignProgressBar = document.getElementById('campaignProgressBar');
  const campaignProgressPercent = document.getElementById('campaignProgressPercent');
  const campaignProgressJobId = document.getElementById('campaignProgressJobId');
  const campaignProgressTotal = document.getElementById('campaignProgressTotal');
  const campaignProgressSuccess = document.getElementById('campaignProgressSuccess');
  const campaignProgressFailed = document.getElementById('campaignProgressFailed');
  const campaignProgressPending = document.getElementById('campaignProgressPending');
  const campaignProgressProcessed = document.getElementById('campaignProgressProcessed');
  const campaignProgressUploadedVideos = document.getElementById('campaignProgressUploadedVideos');
  const campaignRealtimeLogPanel = document.getElementById('campaignRealtimeLogPanel');
  const campaignClearLogBtn = document.getElementById('campaignClearLogBtn');
  const campaignCreateModalElement = document.getElementById('campaignCreateModal');
  const campaignCreateModal = campaignCreateModalElement ? new bootstrap.Modal(campaignCreateModalElement) : null;
  const campaignNameInput = document.getElementById('campaignNameInput');
  const campaignDelayMinInput = document.getElementById('campaignDelayMinInput');
  const campaignDelayMaxInput = document.getElementById('campaignDelayMaxInput');
  const campaignModalUploadExcelBtn = document.getElementById('campaignModalUploadExcelBtn');
  const campaignModalUploadExcelInput = document.getElementById('campaignModalUploadExcelInput');
  const campaignModalDownloadTemplateBtn = document.getElementById('campaignModalDownloadTemplateBtn');
  const campaignModalRefreshVideosBtn = document.getElementById('campaignModalRefreshVideosBtn');
  const campaignModalMessage = document.getElementById('campaignModalMessage');
  const campaignModalSearchKeyword = document.getElementById('campaignModalSearchKeyword');
  const campaignModalStatusFilter = document.getElementById('campaignModalStatusFilter');
  const campaignModalUploadFilter = document.getElementById('campaignModalUploadFilter');
  const campaignModalShowOnlyPath = document.getElementById('campaignModalShowOnlyPath');
  const campaignModalVideosTable = document.getElementById('campaignModalVideosTable');
  const campaignModalVideosTableBody = document.getElementById('campaignModalVideosTableBody');
  const campaignModalSelectAllVideos = document.getElementById('campaignModalSelectAllVideos');
  const campaignModalSelectedCount = document.getElementById('campaignModalSelectedCount');
  const campaignModalCreateAndStartBtn = document.getElementById('campaignModalCreateAndStartBtn');

  const state = {
    jobs: [],
    manager: {
      processing: false,
      current_job_id: null,
      queue: [],
      event: '-',
      timestamp: null,
      status: '-',
      summary: null,
      progress: null
    },
    modalVideos: [],
    modalFilteredVideos: [],
    videoUploadLogByHash: {}
  };
  let isReloadingJobsAfterFinish = false;
  const REQUIRED_VIDEO_FIELDS = ['id_hash', 'links', 'caption', 'hashtag'];

  function text(v) {
    return String(v ?? '').trim();
  }

  function escapeHtml(v) {
    return text(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(v) {
    if (!v) return '-';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return text(v) || '-';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  function notify(title, message, icon) {
    if (window.Swal) {
      return window.Swal.fire({ title, text: message, icon });
    }
    if (icon === 'error') {
      window.alert(`${title}: ${message}`);
    }
    return Promise.resolve();
  }

  function parseJobs(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && Array.isArray(payload.jobs)) return payload.jobs;
    if (payload && Array.isArray(payload.campaign_jobs)) return payload.campaign_jobs;
    return [];
  }

  function getJobId(job) {
    return job?.id ?? job?._id ?? job?.job_id ?? null;
  }

  function getJobName(job) {
    return text(job?.name || job?.title || job?.campaign_name || `Campaign ${getJobId(job) ?? '-'}`);
  }

  function getJobStatus(job) {
    return text(job?.status || job?.state || 'unknown');
  }


  function parseJobResults(job) {
    const raw = job?.results;
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function renderJobResultSummary(job) {
    const result = parseJobResults(job);
    if (!result) return '<span class="text-muted">-</span>';
    const total = Number(result.total || 0);
    const success = Number(result.success || 0);
    const failed = Number(result.failed || 0);
    const processed = Number(result.processed || 0);
    const pending = Number(result.pending || 0);
    const percent = Math.max(0, Math.min(100, Number(result.percent || 0)));
    return `
      <div class="text-center">
        
        <div class="progress" style="height: 12px; background-color: #edf0f3;">
          <div class="progress-bar ${percent >= 100 ? 'bg-success' : 'bg-primary'}" role="progressbar" style="width: ${percent}%; font-size: 11px; font-weight: 700; line-height: 14px; text-align: center;" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">${percent}%</div>
        </div>
        <div class="d-flex flex-wrap gap-2 mt-2">
          <span class="badge rounded-pill bg-light text-dark border px-2 py-1">
            <i class="fas fa-layer-group me-1"></i>Tổng: ${total}
          </span>
          <span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2 py-1">
            <i class="fas fa-circle-check me-1"></i>Thành công: ${success}
          </span>
          <span class="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">
            <i class="fas fa-circle-xmark me-1"></i>Lỗi: ${failed}
          </span>
          <span class="badge rounded-pill bg-info-subtle text-info border border-info-subtle px-2 py-1">
            <i class="fas fa-gears me-1"></i>Đã xử lý: ${processed}
          </span>
          <span class="badge rounded-pill bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">
            <i class="fas fa-hourglass-half me-1"></i>Chờ xử lý: ${pending}
          </span>
        </div>
      </div>
    `;
  }

  function statusBadge(status) {
    const s = text(status).toLowerCase();
    if (['running', 'processing'].includes(s)) return '<span class="badge bg-primary">running</span>';
    if (['queued', 'queue'].includes(s)) return '<span class="badge bg-warning text-dark">queued</span>';
    if (['finished', 'success', 'completed'].includes(s)) return '<span class="badge bg-success">finished</span>';
    if (['stopped', 'stop'].includes(s)) return '<span class="badge bg-secondary">stopped</span>';
    if (['failed', 'error'].includes(s)) return '<span class="badge bg-danger">failed</span>';
    return `<span class="badge bg-light text-dark border">${escapeHtml(status || 'unknown')}</span>`;
  }

  function truncateText(value, maxLength) {
    const normalized = text(value);
    if (normalized.length <= maxLength) return normalized || '-';
    return `${normalized.slice(0, maxLength)}...`;
  }

  function getMissingVideoFields(video) {
    return REQUIRED_VIDEO_FIELDS.filter((field) => !text(video?.[field]));
  }

  function isUploadedVideo(video) {
    const status = text(video?.status_upload).toLowerCase();
    return ['success', 'uploaded', 'done', 'thanh cong', 'thành công'].includes(status);
  }

  function setCampaignModalMessage(message, type) {
    if (!campaignModalMessage) return;
    if (!message) {
      campaignModalMessage.className = 'alert d-none';
      campaignModalMessage.textContent = '';
      return;
    }
    campaignModalMessage.className = `alert alert-${type || 'info'}`;
    campaignModalMessage.textContent = message;
  }

  function ensureCampaignViewOffcanvas() {
    let panel = document.getElementById('campaignVideosOffcanvas');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'offcanvas offcanvas-end';
    panel.id = 'campaignVideosOffcanvas';
    panel.tabIndex = -1;
    panel.setAttribute('aria-labelledby', 'campaignVideosOffcanvasLabel');
    panel.style.width = 'min(92vw, 1200px)';
    panel.innerHTML = `
      <div class="offcanvas-header">
        <h5 class="offcanvas-title" id="campaignVideosOffcanvasLabel">Campaign Videos</h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div class="offcanvas-body p-4">
        <div class="table-responsive">
          <table class="table table-striped table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>#</th>
                <th>Account Upload</th>
                <th>Name File</th>
                <th>Status Upload</th>
                <th>Date Uploaded</th>
                <th>Links</th>
                <th>Link Post</th>
              </tr>
            </thead>
            <tbody id="campaignVideosOffcanvasBody">
              <tr>
                <td colspan="7" class="text-center text-muted py-4">No data</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
    return panel;
  }

  function extractCampaignVideos(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.video_uploads)) return payload.video_uploads;
    if (Array.isArray(payload?.videos)) return payload.videos;
    if (Array.isArray(payload?.data?.video_uploads)) return payload.data.video_uploads;
    if (Array.isArray(payload?.data?.videos)) return payload.data.videos;
    if (Array.isArray(payload?.job?.video_uploads)) return payload.job.video_uploads;
    if (Array.isArray(payload?.job?.videos)) return payload.job.videos;
    if (Array.isArray(payload?.campaign?.video_uploads)) return payload.campaign.video_uploads;
    if (Array.isArray(payload?.campaign?.videos)) return payload.campaign.videos;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  }

  function renderCampaignVideosOffcanvas(campaignId, campaignName, videos) {
    const panel = ensureCampaignViewOffcanvas();
    const title = panel.querySelector('#campaignVideosOffcanvasLabel');
    const body = panel.querySelector('#campaignVideosOffcanvasBody');
    if (title) {
      title.textContent = `Campaign #${campaignId} - ${campaignName} - Video Uploads (${videos.length})`;
    }
    if (body) {
      if (!videos.length) {
        body.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Campaign chưa có video upload.</td></tr>';
      } else {
        body.innerHTML = videos.map((video, idx) => `
          ${(() => {
            const currentStatusRaw = text(state.videoUploadLogByHash[text(video?.id_hash)]?.status_upload || state.videoUploadLogByHash[text(video?.id_hash)]?.message || video?.status_upload);
            const statusClass = getUploadStatusClass(currentStatusRaw);
            return `
          <tr data-id-hash="${escapeHtml(text(video?.id_hash))}">
            <td>${idx + 1}</td>
            <td>${escapeHtml(text(video?.account_upload) || '-')}</td>
            <td>${escapeHtml(text(video?.name_file) || '-')}</td>
            <td class="campaign-status-upload-cell ${statusClass}">${escapeHtml(currentStatusRaw || '-')}</td>
            <td class="campaign-date-uploaded-cell">${escapeHtml(formatDate(state.videoUploadLogByHash[text(video?.id_hash)]?.timestamp || video?.date_uploaded) || '-')}</td>
            <td class="text-truncate" style="max-width: 280px;" title="${escapeHtml(text(video?.links))}">${escapeHtml(text(video?.links) || '-')}</td>
            <td class="campaign-link-post-cell" style="max-width: 280px;">${renderLinkPostButton(state.videoUploadLogByHash[text(video?.id_hash)]?.post_link || video?.link_post)}</td>
          </tr>
        `;
          })()}
        `).join('');
      }
    }
    const instance = bootstrap.Offcanvas.getOrCreateInstance(panel);
    instance.show();
  }

  function safeSelectorValue(value) {
    const v = text(value);
    if (!v) return '';
    if (window.CSS && typeof window.CSS.escape === 'function') {
      return window.CSS.escape(v);
    }
    return v.replace(/"/g, '\\"');
  }

  function applyVideoUploadLogToOffcanvas(logPayload) {
    const idHash = text(logPayload?.id_hash);
    if (!idHash) return;

    state.videoUploadLogByHash[idHash] = {
      post_link: text(logPayload?.post_link),
      timestamp: text(logPayload?.timestamp),
      message: text(logPayload?.message),
      status_upload: text(logPayload?.status_upload || logPayload?.status || logPayload?.message)
    };

    const selectorId = safeSelectorValue(idHash);
    if (!selectorId) return;
    const row = document.querySelector(`#campaignVideosOffcanvasBody tr[data-id-hash="${selectorId}"]`);
    if (!row) return;

    const statusCell = row.querySelector('.campaign-status-upload-cell');
    const dateCell = row.querySelector('.campaign-date-uploaded-cell');
    const linkPostCell = row.querySelector('.campaign-link-post-cell');
    const statusText = text(logPayload?.status_upload || logPayload?.status || logPayload?.message) || '-';
    const ts = formatDate(logPayload?.timestamp) || '-';
    const postLink = text(logPayload?.post_link) || '-';

    if (statusCell) {
      statusCell.textContent = statusText;
      statusCell.classList.remove('text-success', 'text-danger');
      const statusClass = getUploadStatusClass(statusText);
      if (statusClass) {
        statusCell.classList.add(statusClass);
      }
    }
    if (dateCell) {
      dateCell.textContent = ts;
    }
    if (linkPostCell) {
      linkPostCell.innerHTML = renderLinkPostButton(postLink);
    }
  }

  function getUploadStatusClass(rawStatus) {
    const status = text(rawStatus).toUpperCase();
    if (status === 'VIDEO_UPLOADED') return 'text-success';
    const redStatuses = ['FILE_NOT_FOUND', 'FAILED', 'UPLOAD_RATE_LIMIT', 'ACCOUNT_BANNED', 'ACCOUNT_NOT_FOUND_OR_OFFLINE'];
    if (redStatuses.includes(status)) return 'text-danger';
    return '';
  }

  function renderLinkPostButton(linkValue) {
    const raw = text(linkValue);
    if (!raw) {
      return '<span class="text-muted">-</span>';
    }
    try {
      const parsed = new URL(raw);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return `<span class="text-muted text-truncate d-inline-block" style="max-width: 260px;" title="${escapeHtml(raw)}">${escapeHtml(raw)}</span>`;
      }
      const safeHref = escapeHtml(parsed.toString());
      return `
        <a class="btn btn-sm btn-outline-primary"
           href="${safeHref}"
           target="_blank"
           rel="noopener noreferrer"
           title="${safeHref}">
          <i class="fas fa-external-link-alt me-1"></i>Mở
        </a>
      `;
    } catch (error) {
      return `<span class="text-muted text-truncate d-inline-block" style="max-width: 260px;" title="${escapeHtml(raw)}">${escapeHtml(raw)}</span>`;
    }
  }

  function appendCampaignLog(message, level) {
    if (!campaignRealtimeLogPanel) return;
    if (campaignRealtimeLogPanel.textContent.includes('Chưa có log campaign.')) {
      campaignRealtimeLogPanel.textContent = '';
    }
    const row = document.createElement('div');
    const now = new Date();
    const timeText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const css = level === 'error' ? 'text-danger' : (level === 'success' ? 'text-success' : 'text-secondary');
    row.className = `${css} mb-1`;
    row.textContent = `[${timeText}] ${message}`;
    campaignRealtimeLogPanel.prepend(row);
    while (campaignRealtimeLogPanel.childElementCount > 300) {
      campaignRealtimeLogPanel.removeChild(campaignRealtimeLogPanel.lastChild);
    }
  }

  function normalizeProgress(progress, fallbackJobId) {
    if (!progress || typeof progress !== 'object') return null;
    const uploadedVideos = Array.isArray(progress.uploaded_videos) ? progress.uploaded_videos : [];
    return {
      job_id: progress.job_id ?? fallbackJobId ?? null,
      total: Number(progress.total || 0),
      processed: Number(progress.processed || 0),
      success: Number(progress.success || 0),
      failed: Number(progress.failed || 0),
      pending: Number(progress.pending || 0),
      percent: Math.max(0, Math.min(100, Number(progress.percent || 0))),
      uploaded_videos: uploadedVideos
    };
  }

  function renderManagerStatus() {
    const manager = state.manager;
    if (campaignManagerProcessing) {
      campaignManagerProcessing.textContent = manager.processing ? 'Running' : 'Idle';
      campaignManagerProcessing.classList.remove('text-success', 'text-secondary');
      campaignManagerProcessing.classList.add(manager.processing ? 'text-success' : 'text-secondary');
    }
    if (campaignCurrentJob) {
      campaignCurrentJob.textContent = manager.current_job_id ?? '-';
    }
    if (campaignQueueList) {
      const queue = Array.isArray(manager.queue) ? manager.queue : [];
      if (!queue.length) {
        campaignQueueList.innerHTML = '<span class="badge bg-light text-dark border">empty</span>';
      } else {
        campaignQueueList.innerHTML = queue.map((id) => `<span class="badge bg-warning text-dark">#${escapeHtml(text(id))}</span>`).join('');
      }
    }
    if (campaignLastEvent) {
      const eventText = manager.event || '-';
      const tsText = manager.timestamp ? formatDate(manager.timestamp) : '-';
      campaignLastEvent.textContent = `${eventText} @ ${tsText}`;
    }
    if (campaignLastStatus) {
      const statusText = text(manager.status || '-');
      campaignLastStatus.textContent = statusText;
      campaignLastStatus.classList.remove('text-success', 'text-danger', 'text-warning', 'text-secondary');
      const s = statusText.toLowerCase();
      if (['finished', 'success', 'completed'].includes(s)) campaignLastStatus.classList.add('text-success');
      else if (['failed', 'error'].includes(s)) campaignLastStatus.classList.add('text-danger');
      else if (['stopped'].includes(s)) campaignLastStatus.classList.add('text-warning');
      else campaignLastStatus.classList.add('text-secondary');
    }
    if (campaignLastSummary) {
      const summary = manager.summary;
      if (!summary) {
        campaignLastSummary.textContent = '-';
      } else if (typeof summary === 'string') {
        campaignLastSummary.textContent = summary;
      } else {
        const total = Number(summary.total || 0);
        const success = Number(summary.success || 0);
        const failed = Number(summary.failed || 0);
        const processed = Number(summary.processed || 0);
        const percent = Number(summary.percent || 0);
        campaignLastSummary.textContent = `total=${total}, success=${success}, failed=${failed}, processed=${processed}, percent=${percent}%`;
      }
    }
    const progress = manager.progress;
    if (campaignProgressBar) {
      const percent = Number(progress?.percent || 0);
      campaignProgressBar.style.width = `${percent}%`;
      campaignProgressBar.setAttribute('aria-valuenow', String(percent));
      campaignProgressBar.textContent = `${percent}%`;
      campaignProgressBar.classList.remove('bg-primary', 'bg-success');
      campaignProgressBar.classList.add(percent >= 100 ? 'bg-success' : 'bg-primary');
    }
    if (campaignProgressPercent) {
      campaignProgressPercent.textContent = `${Number(progress?.percent || 0)}%`;
    }
    if (campaignProgressJobId) {
      campaignProgressJobId.textContent = `${progress?.job_id ?? '-'}`;
    }
    if (campaignProgressTotal) {
      campaignProgressTotal.textContent = `${Number(progress?.total || 0)}`;
    }
    if (campaignProgressSuccess) {
      campaignProgressSuccess.textContent = `${Number(progress?.success || 0)}`;
    }
    if (campaignProgressFailed) {
      campaignProgressFailed.textContent = `${Number(progress?.failed || 0)}`;
    }
    if (campaignProgressPending) {
      campaignProgressPending.textContent = `${Number(progress?.pending || 0)}`;
    }
    if (campaignProgressProcessed) {
      campaignProgressProcessed.textContent = `${Number(progress?.processed || 0)}`;
    }
    if (campaignProgressUploadedVideos) {
      const uploaded = Array.isArray(progress?.uploaded_videos) ? progress.uploaded_videos.length : 0;
      campaignProgressUploadedVideos.textContent = `${uploaded}`;
    }
  }

  function renderJobs() {
    if (!campaignJobsTableBody) return;
    const queueSet = new Set((state.manager.queue || []).map((x) => Number(x)));
    const currentId = state.manager.current_job_id != null ? Number(state.manager.current_job_id) : null;

    if (!state.jobs.length) {
      campaignJobsTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Không có campaign jobs</td></tr>';
      return;
    }

    campaignJobsTableBody.innerHTML = state.jobs.map((job) => {
      const id = getJobId(job);
      const name = getJobName(job);
      const status = getJobStatus(job);
      const videos = job?.video_uploads?.length || 0;
      const createdAt = job?.create_at;
      const idNum = Number(id);
      const queued = queueSet.has(idNum);
      const running = currentId != null && currentId === idNum;
      const queueBadge = queued ? '<span class="badge bg-warning text-dark ms-1">in queue</span>' : '';
      const runningBadge = running ? '<span class="badge bg-primary ms-1">running</span>' : '';

      return `
        <tr data-id="${escapeHtml(id)}">
          <td><code>${escapeHtml(id ?? '-')}</code></td>
          <td>${escapeHtml(name)}</td>
          <td>${statusBadge(status)} ${queueBadge} ${runningBadge}</td>
          <td>${Number(videos || 0).toLocaleString('vi-VN')}</td>
          <td>${renderJobResultSummary(job)}</td>
          <td>${escapeHtml(formatDate(createdAt))}</td>
          <td>
            <div class="d-flex flex-wrap gap-1">
              <button type="button" class="btn btn-sm btn-outline-success campaign-start-btn" data-id="${escapeHtml(id)}">Start</button>
              <button type="button" class="btn btn-sm btn-outline-warning campaign-stop-btn" data-id="${escapeHtml(id)}">Stop</button>
              <button type="button" class="btn btn-sm btn-outline-primary campaign-view-btn" data-id="${escapeHtml(id)}">View</button>
              <button type="button" class="btn btn-sm btn-outline-danger campaign-delete-btn" data-id="${escapeHtml(id)}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function loadManagerStatus() {
    try {
      const response = await fetch(MANAGER_STATUS_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      state.manager.processing = !!payload.processing;
      state.manager.current_job_id = payload.current_job_id ?? null;
      state.manager.queue = Array.isArray(payload.queue) ? payload.queue : [];
      state.manager.event = payload.event || 'manager:status';
      state.manager.timestamp = payload.timestamp || new Date().toISOString();
      state.manager.status = payload.status || state.manager.status || '-';
      state.manager.summary = payload.summary || state.manager.summary || null;
      state.manager.progress = normalizeProgress(payload.progress, payload.current_job_id) || state.manager.progress;
      renderManagerStatus();
      renderJobs();
    } catch (error) {
      appendCampaignLog('Không lấy được trạng thái queue manager.', 'error');
    }
  }

  async function loadJobs() {
    if (!campaignJobsTableBody) return;
    campaignJobsTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Đang tải danh sách chiến dịch...</td></tr>';
    try {
      const response = await fetch(JOBS_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      state.jobs = parseJobs(payload);
      renderJobs();
    } catch (error) {
      campaignJobsTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Không tải được campaign jobs</td></tr>';
      appendCampaignLog('Không tải được campaign jobs.', 'error');
    }
  }

  async function actionWithReload(url, method, successMessage) {
    const response = await fetch(url, { method: method || 'POST', headers: { 'Content-Type': 'application/json' } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
    }
    appendCampaignLog(payload?.message || successMessage, 'success');
    await Promise.all([loadManagerStatus(), loadJobs()]);
    return payload;
  }

  function getSelectedModalVideoIds() {
    if (!campaignModalVideosTableBody) return [];
    return Array.from(campaignModalVideosTableBody.querySelectorAll('.campaign-modal-video-checkbox:checked'))
      .map((el) => text(el.getAttribute('data-id')))
      .filter(Boolean);
  }

  function updateCampaignModalSelectedState() {
    if (!campaignModalVideosTableBody) return;
    const all = Array.from(campaignModalVideosTableBody.querySelectorAll('.campaign-modal-video-checkbox'));
    const selected = all.filter((x) => x.checked);
    if (campaignModalSelectedCount) campaignModalSelectedCount.textContent = String(selected.length);
    if (campaignModalSelectAllVideos) {
      campaignModalSelectAllVideos.checked = all.length > 0 && selected.length === all.length;
      campaignModalSelectAllVideos.indeterminate = selected.length > 0 && selected.length < all.length;
    }
  }

  function renderCampaignModalVideos(videos) {
    if (!campaignModalVideosTableBody) return;
    if (!videos.length) {
      campaignModalVideosTableBody.innerHTML = '<tr><td colspan="12" class="text-center py-4 text-muted">Không có dữ liệu phù hợp</td></tr>';
      updateCampaignModalSelectedState();
      return;
    }
    const pathOnly = !!campaignModalShowOnlyPath?.checked;
    if (campaignModalVideosTable) {
      campaignModalVideosTable.classList.toggle('path-only', pathOnly);
    }
    campaignModalVideosTableBody.innerHTML = videos.map((video, index) => {
      const missing = getMissingVideoFields(video);
      const infoBadge = missing.length > 0
        ? '<span class="badge bg-warning text-dark">Cần update</span>'
        : '<span class="badge bg-success">Đủ thông tin</span>';
      const uploadStatus = text(video.status_upload) || '-';
      const uploadBadge = isUploadedVideo(video)
        ? '<span class="badge bg-success">Đã upload</span>'
        : '<span class="badge bg-secondary">Chưa upload</span>';
      return `
        <tr>
          <td class="text-center"><input type="checkbox" class="campaign-modal-video-checkbox" data-id="${escapeHtml(text(video.id_hash))}"></td>
          <td>${index + 1}</td>
          <td>${infoBadge}</td>
          <td><code title="${escapeHtml(text(video.path_video))}">${escapeHtml(truncateText(video.path_video, 30))}</code></td>
          <td>${escapeHtml(text(video.id_hash) || '-')}</td>
          <td>${escapeHtml(text(video.name_file) || '-')}</td>
          <td class="text-truncate" style="max-width: 230px;" title="${escapeHtml(text(video.links))}">${escapeHtml(text(video.links) || '-')}</td>
          <td>${escapeHtml(text(video.account_upload) || '-')}</td>
          <td>${escapeHtml(uploadStatus)} ${uploadBadge}</td>
          <td class="text-truncate" style="max-width: 220px;" title="${escapeHtml(text(video.caption))}">${escapeHtml(text(video.caption) || '-')}</td>
          <td class="text-truncate" style="max-width: 220px;" title="${escapeHtml(text(video.hashtag))}">${escapeHtml(text(video.hashtag) || '-')}</td>
          <td>${missing.length ? missing.map((f) => `<span class="badge bg-light text-dark border me-1">${escapeHtml(f)}</span>`).join('') : '-'}</td>
        </tr>
      `;
    }).join('');
    updateCampaignModalSelectedState();
  }

  function applyCampaignModalFilters() {
    const keyword = text(campaignModalSearchKeyword?.value).toLowerCase();
    const infoFilter = text(campaignModalStatusFilter?.value || 'all');
    const uploadFilter = text(campaignModalUploadFilter?.value || 'all');
    state.modalFilteredVideos = state.modalVideos.filter((video) => {
      const missing = getMissingVideoFields(video);
      const isMissing = missing.length > 0;
      if (infoFilter === 'missing' && !isMissing) return false;
      if (infoFilter === 'completed' && isMissing) return false;
      const uploaded = isUploadedVideo(video);
      if (uploadFilter === 'uploaded' && !uploaded) return false;
      if (uploadFilter === 'not_uploaded' && uploaded) return false;
      if (!keyword) return true;
      const searchable = [
        video.path_video, video.id_hash, video.name_file, video.links, video.caption, video.hashtag, video.account_upload
      ].map((v) => text(v).toLowerCase()).join(' ');
      return searchable.includes(keyword);
    });
    renderCampaignModalVideos(state.modalFilteredVideos);
  }

  async function loadCampaignModalVideos() {
    if (!campaignModalVideosTableBody) return;
    campaignModalVideosTableBody.innerHTML = '<tr><td colspan="12" class="text-center py-4 text-muted">Đang tải dữ liệu...</td></tr>';
    try {
      const response = await fetch(AVAILABLE_CAMPAIGN_VIDEOS_URL, { method: 'GET' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (Array.isArray(payload)) {
        state.modalVideos = payload;
      } else if (Array.isArray(payload.videos)) {
        state.modalVideos = payload.videos;
      } else if (Array.isArray(payload.video)) {
        state.modalVideos = payload.video;
      } else if (Array.isArray(payload.data)) {
        state.modalVideos = payload.data;
      } else {
        state.modalVideos = [];
      }
      setCampaignModalMessage('', 'info');
      applyCampaignModalFilters();
    } catch (error) {
      state.modalVideos = [];
      state.modalFilteredVideos = [];
      renderCampaignModalVideos([]);
      setCampaignModalMessage('Không tải được danh sách video available for campaign từ local service.', 'danger');
    }
  }

  async function uploadExcelForCampaignModal(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(UPLOAD_EXCEL_URL, { method: 'POST', body: formData });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json().catch(() => ({}));
    return payload;
  }

  async function createCampaignJobAndStart() {
    const name = text(campaignNameInput?.value);
    const delayMin = Number(campaignDelayMinInput?.value);
    const delayMax = Number(campaignDelayMaxInput?.value);
    const selectedIds = getSelectedModalVideoIds();

    if (!name) {
      await notify('Thiếu dữ liệu', 'Vui lòng nhập tên chiến dịch.', 'warning');
      return;
    }
    if (Number.isNaN(delayMin) || Number.isNaN(delayMax)) {
      await notify('Dữ liệu không hợp lệ', 'delay_min và delay_max phải là số.', 'warning');
      return;
    }
    if (!selectedIds.length) {
      await notify('Thiếu dữ liệu', 'Vui lòng chọn ít nhất 1 video.', 'warning');
      return;
    }
    if (campaignModalCreateAndStartBtn) campaignModalCreateAndStartBtn.disabled = true;
    setCampaignModalMessage('Đang tạo chiến dịch và đưa vào queue...', 'info');
    try {
      const createResponse = await fetch(JOBS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          delay_min: delayMin,
          delay_max: delayMax,
          video_uploads: selectedIds
        })
      });
      const createdPayload = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok) {
        throw new Error(createdPayload?.message || createdPayload?.error || `HTTP ${createResponse.status}`);
      }
      const created = createdPayload?.data || createdPayload?.job || createdPayload;
      const campaignId = getJobId(created);
      if (!campaignId) {
        throw new Error('Không lấy được campaign id sau khi tạo.');
      }

      const startResponse = await fetch(`${JOBS_URL}/${encodeURIComponent(campaignId)}/start`, { method: 'POST' });
      if (!startResponse.ok) {
        const errPayload = await startResponse.json().catch(() => ({}));
        throw new Error(errPayload?.message || errPayload?.error || `HTTP ${startResponse.status}`);
      }

      setCampaignModalMessage(`Đã tạo campaign #${campaignId}, thêm ${selectedIds.length} videos và start thành công.`, 'success');
      appendCampaignLog(`Created + started campaign ${campaignId} with ${selectedIds.length} videos.`, 'success');
      await Promise.all([loadManagerStatus(), loadJobs()]);
      if (campaignCreateModal) {
        setTimeout(() => campaignCreateModal.hide(), 600);
      }
    } catch (error) {
      setCampaignModalMessage(error.message || 'Tạo chiến dịch thất bại.', 'danger');
      appendCampaignLog(error.message || 'Tạo chiến dịch thất bại.', 'error');
    } finally {
      if (campaignModalCreateAndStartBtn) campaignModalCreateAndStartBtn.disabled = false;
    }
  }

  async function createCampaignJob() {
    const defaultName = `Campaign ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`;
    if (campaignNameInput) campaignNameInput.value = defaultName;
    if (campaignDelayMinInput) campaignDelayMinInput.value = '10';
    if (campaignDelayMaxInput) campaignDelayMaxInput.value = '30';
    setCampaignModalMessage('', 'info');
    if (campaignCreateModal) campaignCreateModal.show();
    await loadCampaignModalVideos();
  }

  function connectCampaignSocket() {
    if (!window.io) {
      appendCampaignLog('Thiếu Socket.IO client cho campaign realtime.', 'error');
      return;
    }
    const socket = window.io(API_BASE, { transports: ['websocket', 'polling'], timeout: 8000 });
    socket.on('connect', function () {
      if (campaignSocketStatus) {
        campaignSocketStatus.classList.remove('bg-secondary', 'bg-danger');
        campaignSocketStatus.classList.add('bg-success');
        campaignSocketStatus.textContent = 'connected';
      }
      appendCampaignLog(`Connected campaign socket: ${socket.id}`, 'success');
    });

    socket.on('disconnect', function () {
      if (campaignSocketStatus) {
        campaignSocketStatus.classList.remove('bg-success');
        campaignSocketStatus.classList.add('bg-danger');
        campaignSocketStatus.textContent = 'disconnected';
      }
      appendCampaignLog('Campaign socket disconnected.', 'error');
    });

    socket.on('connect_error', function (err) {
      if (campaignSocketStatus) {
        campaignSocketStatus.classList.remove('bg-success');
        campaignSocketStatus.classList.add('bg-danger');
        campaignSocketStatus.textContent = 'error';
      }
      appendCampaignLog(`Campaign socket error: ${err?.message || 'connect_error'}`, 'error');
    });

    socket.on('campaign:status', function (payload) {
      if (!payload || typeof payload !== 'object') return;
      state.manager.processing = !!payload.processing;
      state.manager.current_job_id = payload.current_job_id ?? state.manager.current_job_id;
      state.manager.queue = Array.isArray(payload.queue) ? payload.queue : state.manager.queue;
      state.manager.event = payload.event || 'campaign:status';
      state.manager.timestamp = payload.timestamp || new Date().toISOString();
      state.manager.status = payload.status || state.manager.status || '-';
      state.manager.summary = payload.summary || state.manager.summary || null;
      state.manager.progress = normalizeProgress(payload.progress, payload.job_id ?? payload.current_job_id) || state.manager.progress;
      renderManagerStatus();
      renderJobs();
      appendCampaignLog(`event=${state.manager.event} job=${payload.job_id ?? '-'} status=${payload.status ?? '-'}`, 'info');

      const statusValue = text(payload.status).toLowerCase();
      const isFinished = ['finished', 'success', 'completed'].includes(statusValue);
      if (isFinished && !isReloadingJobsAfterFinish) {
        isReloadingJobsAfterFinish = true;
        loadJobs()
          .catch(() => {})
          .finally(() => {
            isReloadingJobsAfterFinish = false;
          });
      }
    });

    socket.on('video_upload:log', function (payload) {
      if (!payload || typeof payload !== 'object') return;
      applyVideoUploadLogToOffcanvas(payload);
      appendCampaignLog(`video_upload:log id_hash=${payload.id_hash ?? '-'} message=${payload.message ?? '-'}`, 'info');
    });
  }

  if (campaignReloadBtn) {
    campaignReloadBtn.addEventListener('click', function () {
      Promise.all([loadManagerStatus(), loadJobs()]);
    });
  }

  if (campaignCreateBtn) {
    campaignCreateBtn.addEventListener('click', function () {
      createCampaignJob();
    });
  }

  if (campaignClearLogBtn) {
    campaignClearLogBtn.addEventListener('click', function () {
      if (campaignRealtimeLogPanel) {
        campaignRealtimeLogPanel.textContent = 'Chưa có log campaign.';
      }
    });
  }

  if (campaignModalRefreshVideosBtn) {
    campaignModalRefreshVideosBtn.addEventListener('click', function () {
      loadCampaignModalVideos();
    });
  }

  if (campaignModalUploadExcelBtn && campaignModalUploadExcelInput) {
    campaignModalUploadExcelBtn.addEventListener('click', function () {
      campaignModalUploadExcelInput.click();
    });
    campaignModalUploadExcelInput.addEventListener('change', async function () {
      const file = campaignModalUploadExcelInput.files && campaignModalUploadExcelInput.files[0];
      if (!file) return;
      campaignModalUploadExcelBtn.disabled = true;
      setCampaignModalMessage(`Đang upload file excel: ${file.name}`, 'info');
      try {
        const result = await uploadExcelForCampaignModal(file);
        setCampaignModalMessage(result?.message || 'Upload excel thành công.', 'success');
        await loadCampaignModalVideos();
      } catch (error) {
        setCampaignModalMessage(error.message || 'Upload excel thất bại.', 'danger');
      } finally {
        campaignModalUploadExcelBtn.disabled = false;
        campaignModalUploadExcelInput.value = '';
      }
    });
  }

  if (campaignModalDownloadTemplateBtn) {
    campaignModalDownloadTemplateBtn.addEventListener('click', function () {
      const link = document.createElement('a');
      link.href = TEMPLATE_URL;
      link.setAttribute('download', '');
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  if (campaignModalSearchKeyword) {
    campaignModalSearchKeyword.addEventListener('input', applyCampaignModalFilters);
  }
  if (campaignModalStatusFilter) {
    campaignModalStatusFilter.addEventListener('change', applyCampaignModalFilters);
  }
  if (campaignModalUploadFilter) {
    campaignModalUploadFilter.addEventListener('change', applyCampaignModalFilters);
  }
  if (campaignModalShowOnlyPath) {
    campaignModalShowOnlyPath.addEventListener('change', applyCampaignModalFilters);
  }
  if (campaignModalSelectAllVideos && campaignModalVideosTableBody) {
    campaignModalSelectAllVideos.addEventListener('change', function () {
      const checked = !!campaignModalSelectAllVideos.checked;
      campaignModalVideosTableBody.querySelectorAll('.campaign-modal-video-checkbox').forEach((el) => {
        el.checked = checked;
      });
      updateCampaignModalSelectedState();
    });
    campaignModalVideosTableBody.addEventListener('change', function (event) {
      if (event.target && event.target.classList.contains('campaign-modal-video-checkbox')) {
        updateCampaignModalSelectedState();
      }
    });
  }

  if (campaignModalCreateAndStartBtn) {
    campaignModalCreateAndStartBtn.addEventListener('click', function () {
      createCampaignJobAndStart();
    });
  }

  if (campaignJobsTableBody) {
    campaignJobsTableBody.addEventListener('click', async function (event) {
      const startBtn = event.target.closest('.campaign-start-btn');
      const stopBtn = event.target.closest('.campaign-stop-btn');
      const deleteBtn = event.target.closest('.campaign-delete-btn');
      const viewBtn = event.target.closest('.campaign-view-btn');

      try {
        if (startBtn) {
          const id = text(startBtn.getAttribute('data-id'));
          if (!id) return;
          await actionWithReload(`${JOBS_URL}/${encodeURIComponent(id)}/start`, 'POST', `Đã start job ${id}`);
          return;
        }
        if (stopBtn) {
          const id = text(stopBtn.getAttribute('data-id'));
          if (!id) return;
          await actionWithReload(`${JOBS_URL}/${encodeURIComponent(id)}/stop`, 'POST', `Đã stop job ${id}`);
          return;
        }
       
        if (deleteBtn) {
          const id = text(deleteBtn.getAttribute('data-id'));
          if (!id) return;
          let ok = true;
          if (window.Swal) {
            const c = await window.Swal.fire({
              title: 'Xóa chiến dịch?',
              text: `Bạn muốn xóa campaign ${id}?`,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Xóa',
              cancelButtonText: 'Hủy'
            });
            ok = !!c.isConfirmed;
          } else {
            ok = window.confirm(`Xóa campaign ${id}?`);
          }
          if (!ok) return;
          await actionWithReload(`${JOBS_URL}/${encodeURIComponent(id)}`, 'DELETE', `Đã xóa job ${id}`);
          return;
        }
        if (viewBtn) {
          const id = text(viewBtn.getAttribute('data-id'));
          if (!id) return;
          const response = await fetch(`${JOBS_URL}/${encodeURIComponent(id)}/videos`);
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
          const videos = extractCampaignVideos(payload);
          renderCampaignVideosOffcanvas(id,payload.name, videos);
          return;
        }
      } catch (error) {
        await notify('Lỗi', error.message || 'Campaign action thất bại', 'error');
        appendCampaignLog(error.message || 'Campaign action thất bại', 'error');
      }
    });
  }

  Promise.all([loadManagerStatus(), loadJobs()]);
  connectCampaignSocket();
})();

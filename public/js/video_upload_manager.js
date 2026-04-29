(function () {
    const API_URL = 'http://localhost:3098/videos_local';
    const VIDEO_DELETE_BASE_URL = 'http://localhost:3098/videos';
    const UPLOAD_EXCEL_URL = 'http://localhost:3098/videos/upload-excel';
    const TEMPLATE_URL = 'http://localhost:3098/videos/excel-template';
    const LOCAL_SETTINGS_URL = 'http://localhost:3098/settings';
    const GENERATE_TOKEN_URL = '/shopee-accounts/video-upload-manager/generate-token';
    const ACCOUNTS_API_URL = '/shopee-accounts/api-upload-video/get-account';
    const REQUIRED_FIELDS = ['id_hash', 'links', 'caption', 'hashtag'];

    const localServiceError = document.getElementById('localServiceError');
    const uploadExcelMessage = document.getElementById('uploadExcelMessage');
    const localSettingsMessage = document.getElementById('localSettingsMessage');
    const localSettingsForm = document.getElementById('localSettingsForm');
    const reloadLocalSettingsBtn = document.getElementById('reloadLocalSettingsBtn');
    const saveLocalSettingsBtn = document.getElementById('saveLocalSettingsBtn');
    const deleteSelectedVideosBtn = document.getElementById('deleteSelectedVideosBtn');
    const selectAllVideos = document.getElementById('selectAllVideos');
    const uploadExcelBtn = document.getElementById('uploadExcelBtn');
    const uploadExcelInput = document.getElementById('uploadExcelInput');
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    const refreshVideosBtn = document.getElementById('refreshVideosBtn');
    const statusFilter = document.getElementById('statusFilter');
    const uploadFilter = document.getElementById('uploadFilter');
    const searchKeyword = document.getElementById('searchKeyword');
    const showOnlyPath = document.getElementById('showOnlyPath');
    const table = document.getElementById('videosTable');
    const videosTableBody = document.getElementById('videosTableBody');
    const clearActivityLogsBtn = document.getElementById('clearActivityLogsBtn');
    const activityLogContainer = document.getElementById('activityLogContainer');
    const realtimeLogPanel = document.getElementById('realtimeLogPanel');
    const realtimeSocketStatus = document.getElementById('realtimeSocketStatus');
    const accountsTableBody = document.getElementById('accountsTableBody');
    const accountSearchInput = document.getElementById('accountSearchInput');
    const accountSearchBtn = document.getElementById('accountSearchBtn');
    const accountPrevPageBtn = document.getElementById('accountPrevPageBtn');
    const accountNextPageBtn = document.getElementById('accountNextPageBtn');
    const accountPaginationInfo = document.getElementById('accountPaginationInfo');
    const accountPagingSummary = document.getElementById('accountPagingSummary');
    const selectAllAccounts = document.getElementById('selectAllAccounts');
    const addAccountByCookieBtn = document.getElementById('addAccountByCookieBtn');
    const updateCookieByInputBtn = document.getElementById('updateCookieByInputBtn');
    const deleteSelectedAccountsBtn = document.getElementById('deleteSelectedAccountsBtn');
    const enableUploadSelectedBtn = document.getElementById('enableUploadSelectedBtn');
    const disableUploadSelectedBtn = document.getElementById('disableUploadSelectedBtn');
    const setMaxDailyVideosBtn = document.getElementById('setMaxDailyVideosBtn');
    const addAccountModalElement = document.getElementById('addAccountModal');
    const addAccountModal = addAccountModalElement ? new bootstrap.Modal(addAccountModalElement) : null;
    const addAccountUsernameInput = document.getElementById('addAccountUsernameInput');
    const addAccountCookieInput = document.getElementById('addAccountCookieInput');
    const addAccountFeedback = document.getElementById('addAccountFeedback');
    const submitAddAccountBtn = document.getElementById('submitAddAccountBtn');
    const accountLogsModalElement = document.getElementById('accountLogsModal');
    const accountLogsModal = accountLogsModalElement ? new bootstrap.Modal(accountLogsModalElement) : null;
    const accountLogsModalTitle = document.getElementById('accountLogsModalTitle');
    const refreshAccountLogsBtn = document.getElementById('refreshAccountLogsBtn');
    const apiLogsTableBody = document.querySelector('#apiLogsTable tbody');

    const totalCount = document.getElementById('totalCount');
    const missingCount = document.getElementById('missingCount');
    const completedCount = document.getElementById('completedCount');
    const uploadedCount = document.getElementById('uploadedCount');

    let allVideos = [];
    let localSettingsData = {};
    let accountCurrentPage = 1;
    let accountTotalPages = 1;
    let accountTotalItems = 0;
    const accountLimit = 40;
    let currentLogsUsername = '';
    let sharedLocalSocket = null;

    function normalizeValue(value) {
        return String(value || '').trim();
    }

    function normalizeProxyValue(value) {
        let normalized = normalizeValue(value).replace(/\r/g, '').trim();
        normalized = normalized.replace(/^`+|`+$/g, '').trim();
        normalized = normalized.replace(/^"+|"+$/g, '').trim();
        normalized = normalized.replace(/^'+|'+$/g, '').trim();
        return normalized;
    }

    function escapeHtml(value) {
        return normalizeValue(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function truncateText(value, maxLength) {
        const normalized = normalizeValue(value);
        if (normalized.length <= maxLength) {
            return normalized || '-';
        }
        return `${normalized.slice(0, maxLength)}...`;
    }

    function addActivityLog(message, type) {
        if (!activityLogContainer) {
            return;
        }
        if (activityLogContainer.textContent === 'Chưa có log.') {
            activityLogContainer.textContent = '';
        }
        const row = document.createElement('div');
        const now = new Date();
        const timeText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        const colorClass = type === 'error' ? 'text-danger' : (type === 'success' ? 'text-success' : 'text-secondary');
        row.className = `${colorClass} mb-1`;
        row.textContent = `[${timeText}] ${message}`;
        activityLogContainer.prepend(row);

        while (activityLogContainer.childElementCount > 300) {
            activityLogContainer.removeChild(activityLogContainer.lastChild);
        }
    }

    function setAddAccountFeedback(message, type) {
        if (!addAccountFeedback) {
            return;
        }
        if (!message) {
            addAccountFeedback.className = 'alert d-none mb-3';
            addAccountFeedback.textContent = '';
            return;
        }
        const alertType = type || 'danger';
        addAccountFeedback.className = `alert alert-${alertType} mb-3`;
        addAccountFeedback.textContent = message;
    }


    function formatAccountDateTime(rawValue) {
        if (rawValue === null || rawValue === undefined || rawValue === '') {
            return { text: '-', css: '' };
        }
        let dateValue = null;
        const numeric = Number(rawValue);
        if (!Number.isNaN(numeric)) {
            dateValue = new Date(numeric > 9999999999 ? numeric : numeric * 1000);
        } else {
            dateValue = new Date(rawValue);
        }
        if (!dateValue || Number.isNaN(dateValue.getTime())) {
            return { text: String(rawValue), css: '' };
        }
        const diffMs = Date.now() - dateValue.getTime();
        const css = diffMs <= 60 * 60 * 1000
            ? 'text-success fw-bold'
            : (diffMs > 24 * 60 * 60 * 1000 ? 'text-danger fw-bold' : '');
        const text = `${String(dateValue.getHours()).padStart(2, '0')}:${String(dateValue.getMinutes()).padStart(2, '0')}:${String(dateValue.getSeconds()).padStart(2, '0')} ${String(dateValue.getDate()).padStart(2, '0')}/${String(dateValue.getMonth() + 1).padStart(2, '0')}/${dateValue.getFullYear()}`;
        return { text, css };
    }

    function formatAccountDaily(rawValue, maxDaily, lastUploadRaw) {
        const dailyValue = Number(rawValue || 0);
        const maxDailyValue = Number(maxDaily || 0);
        let dateValue = null;
        const numeric = Number(lastUploadRaw);
        if (lastUploadRaw !== null && lastUploadRaw !== undefined && lastUploadRaw !== '') {
            if (!Number.isNaN(numeric)) {
                dateValue = new Date(numeric > 9999999999 ? numeric : numeric * 1000);
            } else {
                dateValue = new Date(lastUploadRaw);
            }
        }
        const validDate = dateValue && !Number.isNaN(dateValue.getTime());
        const now = new Date();
        const isOldDay = validDate && (
            dateValue.getFullYear() !== now.getFullYear()
            || dateValue.getMonth() !== now.getMonth()
            || dateValue.getDate() !== now.getDate()
        );
        const reachedMax = maxDailyValue > 0 && dailyValue >= maxDailyValue;
        const dateText = validDate
            ? `${String(dateValue.getDate()).padStart(2, '0')}/${String(dateValue.getMonth() + 1).padStart(2, '0')}/${dateValue.getFullYear()}`
            : '---';
        const css = isOldDay ? 'text-danger fw-bold' : (reachedMax ? 'text-success fw-bold' : '');
        return { text: `${dailyValue.toLocaleString('vi-VN')} (${dateText})`, css };
    }

    function renderAccountRows(accounts) {
        if (!accountsTableBody) {
            return;
        }
        if (!Array.isArray(accounts) || !accounts.length) {
            accountsTableBody.innerHTML = '<tr><td colspan="13" class="text-center text-muted py-4">Không có dữ liệu</td></tr>';
            if (selectAllAccounts) {
                selectAllAccounts.checked = false;
                selectAllAccounts.indeterminate = false;
            }
            return;
        }

        const html = accounts.map((account, index) => {
            const safeId = escapeHtml(account._id || '');
            const cookieDate = formatAccountDateTime(account.time_update_cookie);
            const dailyInfo = formatAccountDaily(account.dalyVideosUploaded, account.maxDalyVideosUploaded, account.last_upload_time);
            const statusText = normalizeValue(account.last_status_upload) || '----';
            const statusClass = statusText.toLowerCase().includes('thành công') ? 'text-success fw-bold' : '';
            const rowNumber = (accountCurrentPage - 1) * accountLimit + index + 1;
            return `
          <tr>
            <td class="text-center"><input class="form-check-input account-checkbox" type="checkbox" value="${safeId}"></td>
            <td class="text-center">${rowNumber}</td>
            <td>${escapeHtml(normalizeValue(account.username) || '-')}</td>
            <td><code>${escapeHtml(normalizeValue(account.user_id) || '-')}</code></td>
            <td>${account.cookie_live ? '<span class="badge bg-success">Đã có</span>' : '<span class="badge bg-secondary">Trống</span>'}</td>
            <td class="${cookieDate.css}">${cookieDate.text}</td>
            <td>
              <div class="form-check form-switch mt-1">
                <input class="form-check-input toggle-is-upload-api-account" type="checkbox" data-id="${safeId}" ${account.is_upload_api ? 'checked' : ''}>
                <span class="badge ${account.is_upload_api ? 'bg-success' : 'bg-danger'}">${account.is_upload_api ? 'allow upload' : 'disable'}</span>
              </div>
            </td>
            <td>${Number(account.totalVideosUploaded || 0).toLocaleString('vi-VN')}</td>
            <td class="${dailyInfo.css}">${dailyInfo.text}</td>
            <td>${Number(account.maxDalyVideosUploaded || 0).toLocaleString('vi-VN')}</td>
            <td>${Number(account.number_error_upload || 0).toLocaleString('vi-VN')}</td>
            <td class="${statusClass}">${escapeHtml(statusText)}</td>
            <td>
              <button
                type="button"
                class="btn btn-sm btn-outline-primary view-account-logs-btn"
                data-username="${escapeHtml(normalizeValue(account.username))}"
              >
                <i class="fas fa-list me-1"></i>Logs
              </button>
            </td>
          </tr>
        `;
        }).join('');

        accountsTableBody.innerHTML = html;
        if (selectAllAccounts) {
            selectAllAccounts.checked = false;
            selectAllAccounts.indeterminate = false;
        }
        updateAccountSelectedState();
    }

    function updateAccountPaginationUI() {
        if (accountPaginationInfo) {
            accountPaginationInfo.textContent = `Trang ${accountCurrentPage} / ${accountTotalPages}`;
        }
        if (accountPagingSummary) {
            accountPagingSummary.textContent = `Tổng ${accountTotalItems.toLocaleString('vi-VN')} tài khoản - ${accountLimit} tài khoản/trang`;
        }
        if (accountPrevPageBtn) {
            accountPrevPageBtn.disabled = accountCurrentPage <= 1;
        }
        if (accountNextPageBtn) {
            accountNextPageBtn.disabled = accountCurrentPage >= accountTotalPages;
        }
    }

    function getSelectedAccountIds() {
        if (!accountsTableBody) return [];
        return Array.from(accountsTableBody.querySelectorAll('.account-checkbox:checked'))
            .map((el) => normalizeValue(el.value))
            .filter(Boolean);
    }

    function updateAccountSelectedState() {
        if (!accountsTableBody) return;
        const all = Array.from(accountsTableBody.querySelectorAll('.account-checkbox'));
        const checked = all.filter((el) => el.checked);
        const hasSelection = checked.length > 0;

        if (deleteSelectedAccountsBtn) deleteSelectedAccountsBtn.disabled = !hasSelection;
        if (enableUploadSelectedBtn) enableUploadSelectedBtn.disabled = !hasSelection;
        if (disableUploadSelectedBtn) disableUploadSelectedBtn.disabled = !hasSelection;
        if (setMaxDailyVideosBtn) setMaxDailyVideosBtn.disabled = !hasSelection;

        if (selectAllAccounts) {
            selectAllAccounts.checked = all.length > 0 && checked.length === all.length;
            selectAllAccounts.indeterminate = checked.length > 0 && checked.length < all.length;
        }
    }

    async function loadAccounts() {
        if (!accountsTableBody) {
            return;
        }
        const keyword = accountSearchInput ? normalizeValue(accountSearchInput.value) : '';
        accountsTableBody.innerHTML = '<tr><td colspan="13" class="text-center text-muted py-4">Đang tải dữ liệu...</td></tr>';

        try {
            const params = new URLSearchParams();
            params.set('page', String(accountCurrentPage));
            params.set('limit', String(accountLimit));
            if (keyword) params.set('search', keyword);

            const response = await fetch(`${ACCOUNTS_API_URL}?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const result = await response.json();
            if (!result || !result.success) {
                throw new Error(result && result.message ? result.message : 'Load accounts failed');
            }
            const paging = result.pagination || {};
            accountCurrentPage = Number(paging.page || accountCurrentPage) || 1;
            accountTotalPages = Math.max(Number(paging.totalPages || 1) || 1, 1);
            accountTotalItems = Number(paging.total || 0) || 0;

            renderAccountRows(Array.isArray(result.accounts) ? result.accounts : []);
            updateAccountPaginationUI();
            addActivityLog(`Đã tải danh sách tài khoản trang ${accountCurrentPage}.`, 'success');
        } catch (error) {
            accountsTableBody.innerHTML = '<tr><td colspan="13" class="text-center text-danger py-4">Không tải được danh sách tài khoản</td></tr>';
            updateAccountSelectedState();
            addActivityLog('Không tải được danh sách tài khoản upload video.', 'error');
        }
    }

    function formatLogTime(value) {
        if (!value) return '-';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }

    function getStatusBadge(status) {
        const value = normalizeValue(status).toLowerCase();
        if (['success', 'ok', 'uploaded', 'done'].includes(value)) {
            return '<span class="badge bg-success">success</span>';
        }
        if (['error', 'failed', 'fail'].includes(value)) {
            return '<span class="badge bg-danger">error</span>';
        }
        if (['warning', 'warn'].includes(value)) {
            return '<span class="badge bg-warning text-dark">warning</span>';
        }
        return `<span class="badge bg-secondary">${escapeHtml(normalizeValue(status) || '-')}</span>`;
    }

    function renderPostLinkButton(linkValue) {
        const raw = normalizeValue(linkValue);
        if (!raw) {
            return '<span class="text-muted">-</span>';
        }
        try {
            const parsed = new URL(raw);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return `<span class="text-muted text-truncate d-inline-block" style="max-width: 220px;" title="${escapeHtml(raw)}">${escapeHtml(raw)}</span>`;
            }
            const href = escapeHtml(parsed.toString());
            return `
              <a class="btn btn-sm btn-outline-primary"
                 href="${href}"
                 target="_blank"
                 rel="noopener noreferrer"
                 title="${href}">
                <i class="fas fa-external-link-alt me-1"></i>Mở
              </a>
            `;
        } catch (error) {
            return `<span class="text-muted text-truncate d-inline-block" style="max-width: 220px;" title="${escapeHtml(raw)}">${escapeHtml(raw)}</span>`;
        }
    }

    async function loadAccountLogs(username) {
        if (!apiLogsTableBody) {
            return;
        }
        const normalizedUsername = normalizeValue(username);
        if (!normalizedUsername) {
            apiLogsTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Thiếu username account</td></tr>';
            return;
        }
        const params = new URLSearchParams();
        params.set('limit', '300');
        params.set('username', normalizedUsername);
        apiLogsTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Đang tải logs...</td></tr>';

        try {
            const response = await fetch(`/shopee-accounts/upload-video/logs?${params.toString()}`);
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result && result.message ? result.message : 'Load logs failed');
            }
            const logs = Array.isArray(result.data) ? result.data : [];
            if (!logs.length) {
                apiLogsTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Chưa có log</td></tr>';
                return;
            }
            apiLogsTableBody.innerHTML = logs.map((log) => {
                const usernameText = escapeHtml(normalizeValue(log.account && log.account.username) || normalizedUsername);
                const messageText = escapeHtml(normalizeValue(log.message) || '-');
                const jobIdText = escapeHtml(normalizeValue(log.job_id) || '-');
                const postLinkCell = renderPostLinkButton(log.post_link);
                const sourceText = escapeHtml(normalizeValue(log.source) || '-');
                return `
                  <tr>
                    <td>${formatLogTime(log.createdAt)}</td>
                    <td>${usernameText}</td>
                    <td>${getStatusBadge(log.status)}</td>
                    <td style="width: 45%; white-space: normal; word-break: break-word;">${messageText}</td>
                    <td>${jobIdText}</td>
                    <td>${postLinkCell}</td>
                    <td>${sourceText}</td>
                  </tr>
                `;
            }).join('');
        } catch (error) {
            apiLogsTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-3">Không tải được log</td></tr>';
            addActivityLog(`Không tải được logs cho ${normalizedUsername}.`, 'error');
        }
    }

    function mapServerLevel(level) {
        const normalized = normalizeValue(level).toLowerCase();
        if (normalized === 'error') return 'error';
        if (normalized === 'warn' || normalized === 'warning') return 'info';
        if (normalized === 'success') return 'success';
        return 'info';
    }

    function statusClassByValue(status) {
        const value = normalizeValue(status).toLowerCase();
        if (['success', 'ok', 'uploaded', 'done', 'video_uploaded'].includes(value)) {
            return 'text-success';
        }
        if (['warning', 'warn'].includes(value)) {
            return 'text-warning';
        }
        if (['error', 'failed', 'fail', 'cookie_expired', 'account_banned', 'upload_rate_limit'].includes(value)) {
            return 'text-danger';
        }
        return 'text-info';
    }

    function formatRealtimeTime(value) {
        const date = value ? new Date(value) : new Date();
        if (Number.isNaN(date.getTime())) {
            return '--:--:--';
        }
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    }

    function appendRealtimeLog(logItem) {
        if (!realtimeLogPanel) {
            return;
        }
        const wrapper = document.createElement('div');
        wrapper.className = `small ${statusClassByValue(logItem && (logItem.status || logItem.level))} mb-1`;
        const username = normalizeValue(logItem && (logItem.username || (logItem.account && logItem.account.username))) || '-';
        const message = normalizeValue(logItem && logItem.message) || '-';
        const timeText = formatRealtimeTime(logItem && (logItem.timestamp || logItem.time || logItem.createdAt));
        wrapper.textContent = `[${timeText}] [${username}] ${message}`;
        realtimeLogPanel.prepend(wrapper);
        while (realtimeLogPanel.children.length > 300) {
            realtimeLogPanel.removeChild(realtimeLogPanel.lastChild);
        }
    }

    function getSharedLocalSocket() {
        if (sharedLocalSocket) {
            return sharedLocalSocket;
        }
        if (!window.io) {
            return null;
        }
        sharedLocalSocket = window.io('http://localhost:3098', {
            transports: ['websocket', 'polling'],
            timeout: 8000
        });
        return sharedLocalSocket;
    }

    function connectRealtimeUploadLogs() {
        if (!realtimeLogPanel) {
            return;
        }
        function updateSocketBadge(text, badgeClass) {
            if (!realtimeSocketStatus) return;
            realtimeSocketStatus.textContent = text;
            realtimeSocketStatus.classList.remove('bg-secondary', 'bg-success', 'bg-danger');
            realtimeSocketStatus.classList.add(badgeClass);
        }

        const socket = getSharedLocalSocket();
        if (!socket) {
            updateSocketBadge('no socket.io', 'bg-danger');
            addActivityLog('Không tải được thư viện Socket.IO client.', 'error');
            return;
        }

        if (socket.connected) {
            updateSocketBadge('connected', 'bg-success');
        }

        socket.on('connect', function () {
            updateSocketBadge('connected', 'bg-success');
            addActivityLog('Đã kết nối realtime upload logs từ local socket.', 'success');
        });

        socket.on('upload:log-history', function (items) {
            if (!Array.isArray(items) || !items.length) {
                return;
            }
            items.slice(-200).forEach((entry) => {
                if (!entry) return;
                const msg = normalizeValue(entry.message || '');
                if (!msg) return;
                appendRealtimeLog(entry);
            });
        });

        socket.on('upload:log', function (entry) {
            if (!entry) return;
            const msg = normalizeValue(entry.message || '');
            if (!msg) return;
            appendRealtimeLog(entry);
        });

        socket.on('disconnect', function () {
            updateSocketBadge('disconnected', 'bg-danger');
        });

        socket.on('connect_error', function () {
            updateSocketBadge('error', 'bg-danger');
        });
    }

    function connectLocalLogSocket() {
        const socket = getSharedLocalSocket();
        if (!socket) {
            addActivityLog('Không tải được thư viện Socket.IO client.', 'error');
            return;
        }

        socket.on('connect', function () {
            addActivityLog(`Đã kết nối log socket local (id: ${socket.id}).`, 'success');
        });

        socket.on('server:connected', function (payload) {
            const message = payload && payload.message
                ? payload.message
                : 'Connected to log socket server';
            addActivityLog(`[local] ${message}`, 'success');
        });

        socket.on('server:log-history', function (items) {
            if (!Array.isArray(items) || !items.length) {
                addActivityLog('Không có log history từ local server.', 'info');
                return;
            }
            addActivityLog(`Nhận ${items.length} log history từ local server.`, 'info');
            items.slice(-200).forEach((entry) => {
                if (!entry) return;
                const msg = normalizeValue(entry.message || entry.msg || '');
                if (!msg) return;
                addActivityLog(`[local-history] ${msg}`, mapServerLevel(entry.level));
            });
        });

        socket.on('server:log', function (entry) {
            if (!entry) return;
            const msg = normalizeValue(entry.message || '');
            if (!msg) return;
            addActivityLog(`[local] ${msg}`, mapServerLevel(entry.level));
        });

        socket.on('disconnect', function (reason) {
            addActivityLog(`Ngắt kết nối log socket local: ${reason || 'unknown'}.`, 'error');
        });

        socket.on('connect_error', function (error) {
            addActivityLog(`Không kết nối được log socket local: ${error && error.message ? error.message : 'connect_error'}.`, 'error');
        });
    }

    function getMissingFields(video) {
        return REQUIRED_FIELDS.filter((field) => !normalizeValue(video[field]));
    }

    function isUploaded(video) {
        const status = normalizeValue(video.status_upload).toLowerCase();
        return ['success', 'uploaded', 'done', 'thanh cong', 'thành công'].includes(status);
    }

    function shouldKeepByUploadFilter(video, filterValue) {
        if (filterValue === 'all') return true;
        const uploaded = isUploaded(video);
        if (filterValue === 'uploaded') return uploaded;
        if (filterValue === 'not_uploaded') return !uploaded;
        return true;
    }

    function renderStats(videos) {
        const missing = videos.filter((v) => getMissingFields(v).length > 0).length;
        const uploaded = videos.filter((v) => isUploaded(v)).length;
        totalCount.textContent = videos.length.toLocaleString('vi-VN');
        missingCount.textContent = missing.toLocaleString('vi-VN');
        completedCount.textContent = (videos.length - missing).toLocaleString('vi-VN');
        uploadedCount.textContent = uploaded.toLocaleString('vi-VN');
    }

    function renderTable(videos) {
        const pathOnly = !!showOnlyPath.checked;
        table.classList.toggle('path-only', pathOnly);

        if (!videos.length) {
            videosTableBody.innerHTML = '<tr><td colspan="12" class="text-center py-4 text-muted">Không có dữ liệu phù hợp</td></tr>';
            return;
        }

        videosTableBody.innerHTML = videos.map((video, index) => {
            const missingFields = getMissingFields(video);
            const hasMissing = missingFields.length > 0;
            const infoBadge = hasMissing
                ? '<span class="badge bg-warning text-dark">Cần update</span>'
                : '<span class="badge bg-success">Đủ thông tin</span>';
            const uploadStatus = normalizeValue(video.status_upload) || '-';
            const uploadBadge = isUploaded(video)
                ? '<span class="badge bg-success">Đã upload</span>'
                : '<span class="badge bg-secondary">Chưa upload</span>';

            return `
          <tr>
            <td class="text-center">
              <input type="checkbox" class="video-checkbox" data-id="${escapeHtml(normalizeValue(video.id_hash))}">
            </td>
            <td>${index + 1}</td>
            <td>${infoBadge}</td>
            <td>
              <code title="${escapeHtml(normalizeValue(video.path_video))}">${escapeHtml(truncateText(video.path_video, 30))}</code>
              <button
                type="button"
                class="btn btn-link btn-sm p-0 ms-1 copy-path-btn"
                data-path="${escapeHtml(normalizeValue(video.path_video))}"
                title="Copy path_video"
              >
                <i class="fas fa-copy"></i>
              </button>
            </td>
            <td>${normalizeValue(video.id_hash) || '-'}</td>
            <td>${normalizeValue(video.name_file) || '-'}</td>
            <td class="text-truncate" style="max-width: 230px;" title="${normalizeValue(video.links)}">${normalizeValue(video.links) || '-'}</td>
            <td>${normalizeValue(video.account_upload) || '-'}</td>
            <td>${uploadStatus} ${uploadBadge}</td>
            <td class="text-truncate" style="max-width: 220px;" title="${normalizeValue(video.caption)}">${normalizeValue(video.caption) || '-'}</td>
            <td class="text-truncate" style="max-width: 220px;" title="${normalizeValue(video.hashtag)}">${normalizeValue(video.hashtag) || '-'}</td>
            <td>${missingFields.length ? missingFields.map((f) => `<span class="badge bg-light text-dark border me-1">${f}</span>`).join('') : '-'}</td>
          </tr>
        `;
        }).join('');
        updateSelectionState();
    }

    function applyFiltersAndRender() {
        const keyword = normalizeValue(searchKeyword.value).toLowerCase();
        const infoFilter = statusFilter.value;
        const upFilter = uploadFilter.value;

        let filtered = allVideos.filter((video) => {
            const missingFields = getMissingFields(video);
            const isMissing = missingFields.length > 0;

            if (infoFilter === 'missing' && !isMissing) return false;
            if (infoFilter === 'completed' && isMissing) return false;
            if (!shouldKeepByUploadFilter(video, upFilter)) return false;

            if (!keyword) return true;
            const searchableText = [
                video.path_video,
                video.id_hash,
                video.name_file,
                video.links,
                video.caption,
                video.hashtag,
                video.account_upload
            ].map((v) => normalizeValue(v).toLowerCase()).join(' ');
            return searchableText.includes(keyword);
        });

        renderTable(filtered);
    }

    function setLocalServiceError(show) {
        if (!localServiceError) return;
        if (show) localServiceError.classList.remove('d-none');
        else localServiceError.classList.add('d-none');
    }

    function setUploadMessage(message, type) {
        if (!uploadExcelMessage) {
            return;
        }
        if (!message) {
            uploadExcelMessage.className = 'alert d-none';
            uploadExcelMessage.textContent = '';
            return;
        }
        uploadExcelMessage.className = `alert alert-${type || 'info'}`;
        uploadExcelMessage.textContent = message;
    }

    function setLocalSettingsMessage(message, type) {
        if (!localSettingsMessage) {
            return;
        }
        if (!message) {
            localSettingsMessage.className = 'alert d-none mb-2';
            localSettingsMessage.textContent = '';
            return;
        }
        localSettingsMessage.className = `alert alert-${type || 'info'} mb-2`;
        localSettingsMessage.textContent = message;
    }

    function normalizeLocalSettings(payload) {
        const raw = payload && typeof payload === 'object' ? payload : {};
        const config = raw.config && typeof raw.config === 'object' ? raw.config : raw;
        const server = config.server && typeof config.server === 'object' ? config.server : {};
        const setting = config.setting && typeof config.setting === 'object' ? config.setting : {};
        const proxiesRaw = Array.isArray(raw.proxies) ? raw.proxies : [];
        const deleteAfterUploadRaw = setting.delete_video_after_upload;
        const deleteAfterUpload = typeof deleteAfterUploadRaw === 'boolean'
            ? deleteAfterUploadRaw
            : ['true', '1', 'yes', 'on'].includes(normalizeValue(deleteAfterUploadRaw).toLowerCase());
        return {
            config: {
                server: {
                    access_token: normalizeValue(server.access_token)
                },
                setting: {
                    path_folder: normalizeValue(setting.path_folder),
                    delay_min: normalizeValue(setting.delay_min || '10'),
                    delay_max: normalizeValue(setting.delay_max || '30'),
                    max_post: normalizeValue(setting.max_post || '10'),
                    thread: normalizeValue(setting.thread || '10'),
                    type_upload: normalizeValue(setting.type_upload || 'db'),
                    delete_video_after_upload: deleteAfterUpload
                }
            },
            proxies: proxiesRaw
                .map((proxy) => normalizeProxyValue(proxy))
                .filter(Boolean)
        };
    }

    function renderLocalSettingsForm(settingsData) {
        if (!localSettingsForm) {
            return;
        }

        const normalized = normalizeLocalSettings(settingsData);
        localSettingsForm.innerHTML = `
        <div class="col-12">
          <div class="border rounded p-2">
            <div class="fw-semibold mb-2">Server</div>
            <div class="row g-2">
              <div class="col-12">
                <label class="form-label mb-1" for="serverAccessTokenInput">Access Token</label>
                <div class="input-group input-group-sm">
                  <input type="text" id="serverAccessTokenInput" class="form-control" value="${escapeHtml(normalized.config.server.access_token)}">
                  <button type="button" class="btn btn-outline-primary" id="generateAccessTokenBtn">
                    <i class="fas fa-key me-1"></i>Tạo token
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12">
          <div class="border rounded p-2">
            <div class="fw-semibold mb-2">Setting</div>
            <div class="row g-2">
              <div class="col-12">
                <label class="form-label mb-1" for="settingPathFolderInput">Đường dẫn thư mục lưu trữ</label>
                <input type="text" id="settingPathFolderInput" class="form-control form-control-sm" value="${escapeHtml(normalized.config.setting.path_folder)}">
              </div>
              <div class="col-md-4">
                <label class="form-label mb-1" for="settingDelayMinInput">Delay tối thiểu</label>
                <input type="number" id="settingDelayMinInput" class="form-control form-control-sm" min="0" step="1" value="${escapeHtml(normalized.config.setting.delay_min)}">
              </div>
              <div class="col-md-4">
                <label class="form-label mb-1" for="settingDelayMaxInput">Delay tối đa</label>
                <input type="number" id="settingDelayMaxInput" class="form-control form-control-sm" min="0" step="1" value="${escapeHtml(normalized.config.setting.delay_max)}">
              </div>
              <div class="col-md-4">
                <label class="form-label mb-1" for="settingMaxPostInput">Số bài tối đa</label>
                <input type="number" id="settingMaxPostInput" class="form-control form-control-sm" min="0" step="1" value="${escapeHtml(normalized.config.setting.max_post)}">
              </div>
              <div class="col-md-4">
                <label class="form-label mb-1" for="settingThreadInput">Số luồng xử lý</label>
                <input type="number" id="settingThreadInput" class="form-control form-control-sm" min="1" step="1" value="${escapeHtml(normalized.config.setting.thread)}">
              </div>
              <div class="col-md-4">
                <label class="form-label mb-1" for="settingTypeUploadInput">Kiểu upload</label>
                <select id="settingTypeUploadInput" class="form-select form-select-sm">
                  <option value="db" ${normalized.config.setting.type_upload === 'db' ? 'selected' : ''}>CSDL local</option>
                  <option value="file" ${normalized.config.setting.type_upload === 'file' ? 'selected' : ''}>Tệp tin</option>
                </select>
              </div>
              <div class="col-md-4 d-flex align-items-end">
                <div class="form-check form-switch mb-1">
                  <input class="form-check-input" type="checkbox" id="settingDeleteVideoAfterUploadInput" ${normalized.config.setting.delete_video_after_upload ? 'checked' : ''}>
                  <label class="form-check-label" for="settingDeleteVideoAfterUploadInput">Xóa video sau khi upload</label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12">
          <div class="border rounded p-2">
            <div class="fw-semibold mb-2">Proxies</div>
            <label class="form-label mb-1" for="settingsProxiesInput">Mỗi proxy 1 dòng</label>
            <textarea id="settingsProxiesInput" class="form-control form-control-sm" rows="5" placeholder="http://user:pass@host:port">${escapeHtml(normalized.proxies.join('\n'))}</textarea>
          </div>
        </div>
      `;

        const generateAccessTokenBtn = document.getElementById('generateAccessTokenBtn');
        const serverAccessTokenInput = document.getElementById('serverAccessTokenInput');
        if (generateAccessTokenBtn && serverAccessTokenInput) {
            generateAccessTokenBtn.addEventListener('click', async function () {
                generateAccessTokenBtn.disabled = true;
                try {
                    const response = await fetch(GENERATE_TOKEN_URL, { method: 'POST' });
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    const result = await response.json();
                    const nextToken = normalizeValue(result && result.token);
                    if (!nextToken) {
                        throw new Error('Token empty');
                    }
                    serverAccessTokenInput.value = nextToken;
                    setLocalSettingsMessage('Đã tạo token mới từ server.', 'success');
                    addActivityLog('Tạo access_token mới thành công.', 'success');
                } catch (error) {
                    setLocalSettingsMessage('Không tạo được token từ server.', 'danger');
                    addActivityLog('Tạo access_token thất bại.', 'error');
                } finally {
                    generateAccessTokenBtn.disabled = false;
                }
            });
        }
    }

    function collectLocalSettingsPayload() {
        const serverAccessTokenInput = document.getElementById('serverAccessTokenInput');
        const settingPathFolderInput = document.getElementById('settingPathFolderInput');
        const settingDelayMinInput = document.getElementById('settingDelayMinInput');
        const settingDelayMaxInput = document.getElementById('settingDelayMaxInput');
        const settingMaxPostInput = document.getElementById('settingMaxPostInput');
        const settingThreadInput = document.getElementById('settingThreadInput');
        const settingTypeUploadInput = document.getElementById('settingTypeUploadInput');
        const settingDeleteVideoAfterUploadInput = document.getElementById('settingDeleteVideoAfterUploadInput');
        const settingsProxiesInput = document.getElementById('settingsProxiesInput');

        if (!serverAccessTokenInput || !settingPathFolderInput || !settingDelayMinInput || !settingDelayMaxInput || !settingMaxPostInput || !settingThreadInput || !settingTypeUploadInput || !settingDeleteVideoAfterUploadInput || !settingsProxiesInput) {
            throw new Error('Form cài đặt chưa sẵn sàng.');
        }

        const delayMin = Number(settingDelayMinInput.value);
        const delayMax = Number(settingDelayMaxInput.value);
        const maxPost = Number(settingMaxPostInput.value);
        const thread = Number(settingThreadInput.value);
        if (Number.isNaN(delayMin) || Number.isNaN(delayMax) || Number.isNaN(maxPost) || Number.isNaN(thread)) {
            throw new Error('delay_min, delay_max, max_post, thread phải là số.');
        }

        const proxies = settingsProxiesInput.value
            .split('\n')
            .map((line) => normalizeProxyValue(line))
            .filter(Boolean);
        const uniqueProxies = Array.from(new Set(proxies));

        return {
            config: {
                server: {
                    access_token: normalizeValue(serverAccessTokenInput.value)
                },
                setting: {
                    path_folder: normalizeValue(settingPathFolderInput.value),
                    delay_min: String(delayMin),
                    delay_max: String(delayMax),
                    max_post: String(maxPost),
                    thread: String(thread),
                    type_upload: normalizeValue(settingTypeUploadInput.value || 'db'),
                    delete_video_after_upload: !!settingDeleteVideoAfterUploadInput.checked
                }
            },
            proxies: uniqueProxies
        };
    }

    async function loadLocalSettings() {
        if (!localSettingsForm) {
            return;
        }
        setLocalSettingsMessage('Đang tải cài đặt local service...', 'info');
        if (reloadLocalSettingsBtn) reloadLocalSettingsBtn.disabled = true;
        if (saveLocalSettingsBtn) saveLocalSettingsBtn.disabled = true;

        try {
            const response = await fetch(LOCAL_SETTINGS_URL, { method: 'GET' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const payload = await response.json();
            localSettingsData = payload && typeof payload === 'object' ? payload : {};
            renderLocalSettingsForm(localSettingsData);
            setLocalSettingsMessage('Đã tải cài đặt thành công.', 'success');
            setLocalServiceError(false);
            addActivityLog('Đã tải cài đặt local service.', 'success');
        } catch (error) {
            setLocalSettingsMessage('Không tải được cài đặt. Vui lòng kiểm tra service local.', 'danger');
            setLocalServiceError(true);
            addActivityLog('Không tải được cài đặt local service.', 'error');
        } finally {
            if (reloadLocalSettingsBtn) reloadLocalSettingsBtn.disabled = false;
            if (saveLocalSettingsBtn) saveLocalSettingsBtn.disabled = false;
        }
    }

    async function saveLocalSettings() {
        if (!localSettingsForm) {
            return;
        }
        try {
            const settingsPayload = collectLocalSettingsPayload();
            setLocalSettingsMessage('Đang lưu cài đặt local service...', 'info');
            if (saveLocalSettingsBtn) saveLocalSettingsBtn.disabled = true;
            if (reloadLocalSettingsBtn) reloadLocalSettingsBtn.disabled = true;

            const response = await fetch(LOCAL_SETTINGS_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsPayload)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            let message = 'Đã lưu cài đặt thành công.';
            let nextPayload = settingsPayload;
            try {
                const result = await response.json();
                if (result && result.message) {
                    message = result.message;
                }
                if (result && typeof result === 'object') {
                    if (result.settings && typeof result.settings === 'object') {
                        nextPayload = result.settings;
                    } else if (result.data && typeof result.data === 'object') {
                        nextPayload = result.data;
                    } else if (result.config && typeof result.config === 'object') {
                        nextPayload = {
                            config: result.config,
                            proxies: Array.isArray(result.proxies) ? result.proxies : []
                        };
                    } else {
                        nextPayload = settingsPayload;
                    }
                }
            } catch (e) {
            }
            localSettingsData = nextPayload;
            renderLocalSettingsForm(localSettingsData);
            setLocalSettingsMessage(message, 'success');
            setLocalServiceError(false);
            addActivityLog('Đã lưu cài đặt local service.', 'success');
        } catch (error) {
            setLocalSettingsMessage(error.message || 'Lưu cài đặt thất bại. Vui lòng kiểm tra service local.', 'danger');
            setLocalServiceError(true);
            addActivityLog('Lưu cài đặt local service thất bại.', 'error');
        } finally {
            if (saveLocalSettingsBtn) saveLocalSettingsBtn.disabled = false;
            if (reloadLocalSettingsBtn) reloadLocalSettingsBtn.disabled = false;
        }
    }

    async function loadVideos() {
        videosTableBody.innerHTML = '<tr><td colspan="12" class="text-center py-4 text-muted">Đang tải dữ liệu...</td></tr>';
        try {
            const response = await fetch(API_URL, { method: 'GET' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const payload = await response.json();
            const videos = Array.isArray(payload.video) ? payload.video : [];
            allVideos = videos;
            setLocalServiceError(false);
            renderStats(allVideos);
            applyFiltersAndRender();
            addActivityLog(`Đã tải ${videos.length} video từ local service.`, 'success');
        } catch (error) {
            allVideos = [];
            renderStats(allVideos);
            renderTable([]);
            setLocalServiceError(true);
            addActivityLog('Không tải được danh sách video từ local service.', 'error');
        }
    }

    function getSelectedVideoIds() {
        return Array.from(videosTableBody.querySelectorAll('.video-checkbox:checked'))
            .map((el) => normalizeValue(el.getAttribute('data-id')))
            .filter(Boolean);
    }

    function updateSelectionState() {
        const checkboxes = Array.from(videosTableBody.querySelectorAll('.video-checkbox'));
        const checkedCount = checkboxes.filter((cb) => cb.checked).length;
        const totalCountSelection = checkboxes.length;
        const hasSelection = checkedCount > 0;

        if (deleteSelectedVideosBtn) {
            deleteSelectedVideosBtn.disabled = !hasSelection;
        }
        if (selectAllVideos) {
            selectAllVideos.checked = totalCountSelection > 0 && checkedCount === totalCountSelection;
            selectAllVideos.indeterminate = checkedCount > 0 && checkedCount < totalCountSelection;
        }
    }

    refreshVideosBtn.addEventListener('click', function () {
        addActivityLog('Thực hiện tải lại danh sách video.', 'info');
        loadVideos();
    });
    if (accountSearchBtn) {
        accountSearchBtn.addEventListener('click', function () {
            accountCurrentPage = 1;
            loadAccounts();
        });
    }
    if (accountSearchInput) {
        accountSearchInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                accountCurrentPage = 1;
                loadAccounts();
            }
        });
    }
    if (accountPrevPageBtn) {
        accountPrevPageBtn.addEventListener('click', function () {
            if (accountCurrentPage > 1) {
                accountCurrentPage -= 1;
                loadAccounts();
            }
        });
    }
    if (accountNextPageBtn) {
        accountNextPageBtn.addEventListener('click', function () {
            if (accountCurrentPage < accountTotalPages) {
                accountCurrentPage += 1;
                loadAccounts();
            }
        });
    }
    if (selectAllAccounts) {
        selectAllAccounts.addEventListener('change', function () {
            const checked = !!selectAllAccounts.checked;
            accountsTableBody.querySelectorAll('.account-checkbox').forEach((el) => {
                el.checked = checked;
            });
            updateAccountSelectedState();
        });
    }
    if (addAccountByCookieBtn) {
        addAccountByCookieBtn.addEventListener('click', function () {
            if (addAccountUsernameInput) addAccountUsernameInput.value = '';
            if (addAccountCookieInput) addAccountCookieInput.value = '';
            setAddAccountFeedback('');
            if (addAccountModal) {
                addAccountModal.show();
            }
        });
    }
    if (submitAddAccountBtn) {
        submitAddAccountBtn.addEventListener('click', async function () {
            const username = normalizeValue(addAccountUsernameInput ? addAccountUsernameInput.value : '');
            const cookieLive = normalizeValue(addAccountCookieInput ? addAccountCookieInput.value : '');
            const userId = (cookieLive.match(/SPC_U=(\d+)/) || [])[1];

            if (!username || !cookieLive) {
                setAddAccountFeedback('Vui lòng nhập username và cookie', 'warning');
                return;
            }
            if (!userId) {
                setAddAccountFeedback('Không parse được user_id từ SPC_U trong cookie', 'warning');
                return;
            }

            submitAddAccountBtn.disabled = true;
            setAddAccountFeedback('Đang xử lý...', 'info');
            try {
                const response = await fetch('/shopee-accounts/upload-video/create-account-by-cookie', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, user_id: userId, cookie_live: cookieLive })
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result && result.message ? result.message : 'Create account failed');
                }
                setAddAccountFeedback(`Đã thêm/cập nhật account ${result.account && result.account.username ? result.account.username : username}`, 'success');
                addActivityLog(`Đã thêm/cập nhật account ${username}.`, 'success');
                if (window.Swal) {
                    await window.Swal.fire({
                        title: 'Thành công',
                        text: `Đã thêm/cập nhật account ${result.account && result.account.username ? result.account.username : username}`,
                        icon: 'success',
                        timer: 1200,
                        showConfirmButton: false
                    });
                }
                if (addAccountModal) {
                    addAccountModal.hide();
                }
                loadAccounts();
            } catch (error) {
                setAddAccountFeedback(error.message || 'Không thêm được account', 'danger');
                if (window.Swal) {
                    await window.Swal.fire({
                        title: 'Lỗi',
                        text: error.message || 'Không thêm được account',
                        icon: 'error'
                    });
                }
                addActivityLog(`Không thêm được account ${username}.`, 'error');
            } finally {
                submitAddAccountBtn.disabled = false;
            }
        });
    }
    if (updateCookieByInputBtn) {
        updateCookieByInputBtn.addEventListener('click', async function () {
            if (!window.Swal) {
                return;
            }
            const inputResult = await window.Swal.fire({
                title: 'Update Cookie Live',
                input: 'textarea',
                inputLabel: 'Nhập cookie_live mới',
                inputPlaceholder: 'Dán cookie_live tại đây...',
                inputAttributes: { autocapitalize: 'off' },
                showCancelButton: true,
                confirmButtonText: 'Cập nhật',
                cancelButtonText: 'Hủy'
            });
            if (!inputResult.isConfirmed) {
                return;
            }
            const cookieLive = normalizeValue(inputResult.value);
            if (!cookieLive) {
                await window.Swal.fire({ title: 'Thiếu dữ liệu', text: 'cookie_live không được để trống', icon: 'warning' });
                return;
            }
            const userId = (cookieLive.match(/SPC_U=(\d+)/) || [])[1];
            if (!userId) {
                await window.Swal.fire({ title: 'Không parse được user_id', text: 'Cookie không có SPC_U hợp lệ', icon: 'warning' });
                return;
            }
            try {
                updateCookieByInputBtn.disabled = true;
                const response = await fetch('/shopee-accounts/upload-video/update-cookie-live-by-user-id', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, cookie_live: cookieLive })
                });
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result && result.message ? result.message : 'Update failed');
                await window.Swal.fire({
                    title: 'Thành công',
                    text: `Đã cập nhật cookie cho ${result.account && result.account.username ? result.account.username : userId}`,
                    icon: 'success',
                    timer: 1200,
                    showConfirmButton: false
                });
                addActivityLog(`Đã update cookie cho user_id ${userId}.`, 'success');
                loadAccounts();
            } catch (error) {
                await window.Swal.fire({ title: 'Lỗi', text: error.message || 'Không cập nhật được cookie_live', icon: 'error' });
                addActivityLog(`Không update được cookie cho user_id ${userId}.`, 'error');
            } finally {
                updateCookieByInputBtn.disabled = false;
            }
        });
    }
    async function batchToggleUploadApi(enabled) {
        const ids = getSelectedAccountIds();
        if (!ids.length) return;
        try {
            const response = await fetch('/shopee-accounts/upload-video/batch-toggle-upload-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountIds: ids, enabled })
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result && result.message ? result.message : 'Batch toggle failed');
            addActivityLog(`Đã ${enabled ? 'enable' : 'disable'} upload API cho ${ids.length} account.`, 'success');
            loadAccounts();
        } catch (error) {
            if (window.Swal) {
                await window.Swal.fire({ title: 'Lỗi', text: 'Không cập nhật được selected accounts', icon: 'error' });
            }
            addActivityLog('Batch toggle upload API thất bại.', 'error');
        }
    }
    if (enableUploadSelectedBtn) {
        enableUploadSelectedBtn.addEventListener('click', function () { batchToggleUploadApi(true); });
    }
    if (disableUploadSelectedBtn) {
        disableUploadSelectedBtn.addEventListener('click', function () { batchToggleUploadApi(false); });
    }
    if (deleteSelectedAccountsBtn) {
        deleteSelectedAccountsBtn.addEventListener('click', async function () {
            const ids = getSelectedAccountIds();
            if (!ids.length) return;
            let shouldDelete = true;
            if (window.Swal) {
                const confirmDelete = await window.Swal.fire({
                    title: 'Xóa tài khoản?',
                    text: `Xóa ${ids.length} tài khoản đã chọn?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Xóa',
                    cancelButtonText: 'Hủy'
                });
                shouldDelete = !!confirmDelete.isConfirmed;
            } else {
                shouldDelete = window.confirm(`Xóa ${ids.length} account đã chọn?`);
            }
            if (!shouldDelete) return;
            try {
                const response = await fetch('/shopee-accounts/upload-video/bulk-delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accountIds: ids })
                });
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result && result.message ? result.message : 'Delete failed');
                if (window.Swal) {
                    await window.Swal.fire({
                        title: 'Thành công',
                        text: `Đã xóa ${result.deletedCount || ids.length} tài khoản`,
                        icon: 'success',
                        timer: 1200,
                        showConfirmButton: false
                    });
                }
                addActivityLog(`Đã xóa ${result.deletedCount || ids.length} account.`, 'success');
                loadAccounts();
            } catch (error) {
                if (window.Swal) {
                    await window.Swal.fire({ title: 'Lỗi', text: 'Không xóa được selected accounts', icon: 'error' });
                }
                addActivityLog('Xóa selected accounts thất bại.', 'error');
            }
        });
    }
    if (setMaxDailyVideosBtn) {
        setMaxDailyVideosBtn.addEventListener('click', async function () {
            const ids = getSelectedAccountIds();
            if (!ids.length) return;
            let value = null;
            if (window.Swal) {
                const inputResult = await window.Swal.fire({
                    title: 'Set Max Daily Videos',
                    input: 'number',
                    inputLabel: 'Nhập số video upload tối đa trong ngày',
                    inputAttributes: { min: '0', step: '1' },
                    inputValue: '0',
                    showCancelButton: true,
                    confirmButtonText: 'Cập nhật',
                    cancelButtonText: 'Hủy'
                });
                if (!inputResult.isConfirmed) return;
                value = Number(inputResult.value);
            } else {
                const rawValue = normalizeValue(window.prompt('Nhập Max Daily Videos (>=0):', '0'));
                if (rawValue === '') return;
                value = Number(rawValue);
            }
            if (!Number.isFinite(value) || value < 0) {
                if (window.Swal) {
                    await window.Swal.fire({ title: 'Dữ liệu không hợp lệ', text: 'Giá trị phải là số không âm', icon: 'warning' });
                }
                return;
            }
            try {
                const response = await fetch('/shopee-accounts/upload-video/batch-set-max-daily-videos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accountIds: ids, maxDalyVideosUploaded: value })
                });
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result && result.message ? result.message : 'Set max daily failed');
                if (window.Swal) {
                    await window.Swal.fire({
                        title: 'Thành công',
                        text: `Đã cập nhật Max Daily Videos = ${value} cho ${result.modifiedCount || ids.length} tài khoản`,
                        icon: 'success'
                    });
                }
                addActivityLog(`Đã set Max Daily Videos=${value} cho ${ids.length} account.`, 'success');
                loadAccounts();
            } catch (error) {
                if (window.Swal) {
                    await window.Swal.fire({ title: 'Lỗi', text: 'Không cập nhật được Max Daily Videos', icon: 'error' });
                }
                addActivityLog('Set Max Daily Videos thất bại.', 'error');
            }
        });
    }
    if (accountsTableBody) {
        accountsTableBody.addEventListener('click', function (event) {
            const btn = event.target.closest('.view-account-logs-btn');
            if (!btn) {
                return;
            }
            const username = normalizeValue(btn.getAttribute('data-username'));
            if (!username) {
                return;
            }
            currentLogsUsername = username;
            if (accountLogsModalTitle) {
                accountLogsModalTitle.textContent = username;
            }
            loadAccountLogs(username);
            if (accountLogsModal) {
                accountLogsModal.show();
            }
            addActivityLog(`Mở logs account: ${username}.`, 'info');
        });

        accountsTableBody.addEventListener('change', async function (event) {
            const target = event.target;
            if (target && target.classList.contains('account-checkbox')) {
                updateAccountSelectedState();
                return;
            }
            if (target && target.classList.contains('toggle-is-upload-api-account')) {
                const accountId = normalizeValue(target.getAttribute('data-id'));
                const enabled = !!target.checked;
                target.disabled = true;
                try {
                    const response = await fetch(`/shopee-accounts/upload-video/${accountId}/toggle-upload-api`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ enabled })
                    });
                    const result = await response.json();
                    if (!response.ok || !result.success) {
                        throw new Error(result && result.message ? result.message : 'Toggle failed');
                    }
                    addActivityLog(`Đã cập nhật is_upload_api cho account ${accountId}.`, 'success');
                } catch (error) {
                    target.checked = !enabled;
                    addActivityLog(`Không cập nhật được is_upload_api cho account ${accountId}.`, 'error');
                } finally {
                    target.disabled = false;
                }
            }
        });
    }
    if (refreshAccountLogsBtn) {
        refreshAccountLogsBtn.addEventListener('click', function () {
            if (!currentLogsUsername) {
                return;
            }
            loadAccountLogs(currentLogsUsername);
        });
    }
    if (reloadLocalSettingsBtn) {
        reloadLocalSettingsBtn.addEventListener('click', function () {
            addActivityLog('Thực hiện tải lại cài đặt local service.', 'info');
            loadLocalSettings();
        });
    }
    if (saveLocalSettingsBtn) {
        saveLocalSettingsBtn.addEventListener('click', saveLocalSettings);
    }
    if (clearActivityLogsBtn) {
        clearActivityLogsBtn.addEventListener('click', function () {
            if (activityLogContainer) {
                activityLogContainer.textContent = 'Chưa có log.';
            }
        });
    }
    if (deleteSelectedVideosBtn) {
        deleteSelectedVideosBtn.addEventListener('click', async function () {
            const selectedIds = getSelectedVideoIds();
            if (!selectedIds.length) {
                return;
            }

            const shouldDelete = window.confirm(`Xác nhận xóa ${selectedIds.length} video đã chọn?`);
            if (!shouldDelete) {
                addActivityLog('Hủy thao tác xóa video đã chọn.', 'info');
                return;
            }

            deleteSelectedVideosBtn.disabled = true;
            setUploadMessage('Đang xóa video đã chọn...', 'warning');
            addActivityLog(`Bắt đầu xóa ${selectedIds.length} video đã chọn.`, 'info');

            const results = await Promise.all(
                selectedIds.map(async (id) => {
                    try {
                        const response = await fetch(`${VIDEO_DELETE_BASE_URL}/${encodeURIComponent(id)}`, {
                            method: 'DELETE'
                        });
                        return response.ok;
                    } catch (error) {
                        return false;
                    }
                })
            );

            const successCount = results.filter(Boolean).length;
            const failedCount = results.length - successCount;

            if (failedCount === 0) {
                setUploadMessage(`Đã xóa thành công ${successCount} video.`, 'success');
                addActivityLog(`Đã xóa thành công ${successCount} video.`, 'success');
            } else {
                setUploadMessage(`Đã xóa ${successCount} video, lỗi ${failedCount} video.`, 'warning');
                addActivityLog(`Xóa video: thành công ${successCount}, lỗi ${failedCount}.`, 'error');
            }

            await loadVideos();
        });
    }

    if (selectAllVideos) {
        selectAllVideos.addEventListener('change', function () {
            const checked = !!selectAllVideos.checked;
            videosTableBody.querySelectorAll('.video-checkbox').forEach((cb) => {
                cb.checked = checked;
            });
            updateSelectionState();
        });
    }

    if (uploadExcelBtn && uploadExcelInput) {
        uploadExcelBtn.addEventListener('click', function () {
            uploadExcelInput.click();
        });

        uploadExcelInput.addEventListener('change', async function () {
            const file = uploadExcelInput.files && uploadExcelInput.files[0];
            if (!file) {
                return;
            }

            setUploadMessage('Đang tải file excel lên...', 'info');
            uploadExcelBtn.disabled = true;
            addActivityLog(`Bắt đầu tải lên file excel: ${file.name}`, 'info');

            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch(UPLOAD_EXCEL_URL, {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                let resultMessage = 'Tải file excel thành công.';
                try {
                    const result = await response.json();
                    if (result && result.message) {
                        resultMessage = result.message;
                    }
                } catch (e) {
                }

                setUploadMessage(resultMessage, 'success');
                setLocalServiceError(false);
                addActivityLog(`Tải excel thành công: ${file.name}`, 'success');
                await loadVideos();
            } catch (error) {
                setUploadMessage('Tải file excel thất bại. Vui lòng kiểm tra service local.', 'danger');
                setLocalServiceError(true);
                addActivityLog(`Tải excel thất bại: ${file.name}`, 'error');
            } finally {
                uploadExcelBtn.disabled = false;
                uploadExcelInput.value = '';
            }
        });
    }

    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', function () {
            const link = document.createElement('a');
            link.href = TEMPLATE_URL;
            link.setAttribute('download', '');
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addActivityLog('Đã bấm tải file template excel.', 'info');
        });
    }
    statusFilter.addEventListener('change', applyFiltersAndRender);
    uploadFilter.addEventListener('change', applyFiltersAndRender);
    searchKeyword.addEventListener('input', applyFiltersAndRender);
    showOnlyPath.addEventListener('change', applyFiltersAndRender);
    videosTableBody.addEventListener('click', async function (event) {
        const targetBtn = event.target.closest('.copy-path-btn');
        if (!targetBtn) {
            return;
        }
        const fullPath = normalizeValue(targetBtn.getAttribute('data-path'));
        if (!fullPath || fullPath === '-') {
            return;
        }

        try {
            await navigator.clipboard.writeText(fullPath);
            targetBtn.classList.add('text-success');
            setTimeout(() => targetBtn.classList.remove('text-success'), 800);
            addActivityLog('Đã copy path_video.', 'success');
        } catch (error) {
            const fallback = document.createElement('textarea');
            fallback.value = fullPath;
            document.body.appendChild(fallback);
            fallback.select();
            document.execCommand('copy');
            document.body.removeChild(fallback);
            addActivityLog('Đã copy path_video bằng chế độ fallback.', 'info');
        }
    });
    videosTableBody.addEventListener('change', function (event) {
        if (event.target && event.target.classList.contains('video-checkbox')) {
            updateSelectionState();
        }
    });

    loadVideos();
    loadAccounts();
    loadLocalSettings();
    connectLocalLogSocket();
    connectRealtimeUploadLogs();
    addActivityLog('Đã khởi tạo trang quản lý video upload.', 'info');
    
})();

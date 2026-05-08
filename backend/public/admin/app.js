const ui = {
  tableBody: document.getElementById("tableBody"),
  tableScroll: document.getElementById("tableScroll"),
  emptyState: document.getElementById("emptyState"),
  errorBanner: document.getElementById("errorBanner"),
  detailToolbar: document.getElementById("detailToolbar"),
  summaryText: document.getElementById("summaryText"),
  exportButton: document.getElementById("exportButton"),
  statusFilter: document.getElementById("statusFilter"),
  registrationSearchInput: document.getElementById("registrationSearchInput"),
  detailTabButton: document.getElementById("detailTabButton"),
  summaryTabButton: document.getElementById("summaryTabButton"),
  uploadSummaryTabButton: document.getElementById("uploadSummaryTabButton"),
  uploadBreakdownTabButton: document.getElementById("uploadBreakdownTabButton"),
  uploadRawTabButton: document.getElementById("uploadRawTabButton"),
  masterTabButton: document.getElementById("masterTabButton"),
  detailPanel: document.getElementById("detailPanel"),
  summaryPanel: document.getElementById("summaryPanel"),
  summaryScroll: document.getElementById("summaryScroll"),
  summaryBody: document.getElementById("summaryBody"),
  summaryEmptyState: document.getElementById("summaryEmptyState"),
  uploadSummaryPanel: document.getElementById("uploadSummaryPanel"),
  uploadSummaryScroll: document.getElementById("uploadSummaryScroll"),
  uploadSummaryBody: document.getElementById("uploadSummaryBody"),
  uploadSummaryEmptyState: document.getElementById("uploadSummaryEmptyState"),
  uploadBreakdownToolbar: document.getElementById("uploadBreakdownToolbar"),
  breakdownKabupatenFilter: document.getElementById("breakdownKabupatenFilter"),
  breakdownStatusFilter: document.getElementById("breakdownStatusFilter"),
  breakdownSearchInput: document.getElementById("breakdownSearchInput"),
  breakdownSummaryText: document.getElementById("breakdownSummaryText"),
  uploadBreakdownPanel: document.getElementById("uploadBreakdownPanel"),
  uploadBreakdownScroll: document.getElementById("uploadBreakdownScroll"),
  uploadBreakdownHead: document.getElementById("uploadBreakdownHead"),
  uploadBreakdownBody: document.getElementById("uploadBreakdownBody"),
  uploadBreakdownEmptyState: document.getElementById("uploadBreakdownEmptyState"),
  uploadRawPanel: document.getElementById("uploadRawPanel"),
  uploadTableScroll: document.getElementById("uploadTableScroll"),
  uploadTableHead: document.getElementById("uploadTableHead"),
  uploadTableBody: document.getElementById("uploadTableBody"),
  uploadEmptyState: document.getElementById("uploadEmptyState"),
  masterPanel: document.getElementById("masterPanel"),
  masterFileInput: document.getElementById("masterFileInput"),
  masterUploadButton: document.getElementById("masterUploadButton"),
  masterRefreshButton: document.getElementById("masterRefreshButton"),
  masterUploadStatus: document.getElementById("masterUploadStatus"),
  masterDataInfo: document.getElementById("masterDataInfo"),
  masterColumnsValue: document.getElementById("masterColumnsValue"),
  masterRowsValue: document.getElementById("masterRowsValue"),
  masterUpdatedValue: document.getElementById("masterUpdatedValue"),
  rowTemplate: document.getElementById("rowTemplate"),
  heroViewName: document.getElementById("heroViewName"),
  heroLastSync: document.getElementById("heroLastSync"),
  heroRegistrationsCount: document.getElementById("heroRegistrationsCount"),
  heroUploadsCount: document.getElementById("heroUploadsCount"),
  heroMasterRowsCount: document.getElementById("heroMasterRowsCount"),
  metricRegistrationsTotal: document.getElementById("metricRegistrationsTotal"),
  metricRegistrationsPending: document.getElementById("metricRegistrationsPending"),
  metricRegistrationsApproved: document.getElementById("metricRegistrationsApproved"),
  metricRegistrationsAttention: document.getElementById("metricRegistrationsAttention"),
  metricUploadsTotal: document.getElementById("metricUploadsTotal"),
  metricUploadsSchools: document.getElementById("metricUploadsSchools"),
  metricUploadsPendingTarget: document.getElementById("metricUploadsPendingTarget"),
  metricUploadsKabupaten: document.getElementById("metricUploadsKabupaten"),
  detailDrawerBackdrop: document.getElementById("detailDrawerBackdrop"),
  detailPreviewStage: document.getElementById("detailPreviewStage"),
  detailDrawer: document.getElementById("detailDrawer"),
  detailDrawerCloseButton: document.getElementById("detailDrawerCloseButton"),
  previewStageMeta: document.getElementById("previewStageMeta"),
  previewStageAssets: document.getElementById("previewStageAssets"),
  drawerTitle: document.getElementById("drawerTitle"),
  drawerMeta: document.getElementById("drawerMeta"),
  drawerStatusPill: document.getElementById("drawerStatusPill"),
  drawerPrimaryLabel: document.getElementById("drawerPrimaryLabel"),
  drawerUpdatedAt: document.getElementById("drawerUpdatedAt"),
  drawerFields: document.getElementById("drawerFields"),
  drawerAssets: document.getElementById("drawerAssets"),
  drawerNoteInput: document.getElementById("drawerNoteInput"),
  drawerNoteSaveButton: document.getElementById("drawerNoteSaveButton"),
  drawerNoteStatus: document.getElementById("drawerNoteStatus"),
  drawerApproveButton: document.getElementById("drawerApproveButton"),
  drawerRejectButton: document.getElementById("drawerRejectButton"),
  drawerSuspendButton: document.getElementById("drawerSuspendButton"),
};

const statusFilterField = ui.statusFilter.closest(".toolbar__field");
const registrationSearchField = ui.registrationSearchInput.closest(".toolbar__field");

let currentItems = [];
let visibleRegistrationItems = [];
let summaryItems = [];
let uploadItems = [];
let breakdownRows = [];
let activeTab = "summary-registrations";
let currentMasterData = null;
let selectedRegistrationId = null;
let lastSyncAt = "";

async function loadRegistrations() {
  setLoading(true);
  hideError();

  try {
    const query = ui.statusFilter.value ? `?status=${encodeURIComponent(ui.statusFilter.value)}` : "";
    const [response, summaryResponse] = await Promise.all([
      fetch(`/api/admin/registrations${query}`),
      fetch("/api/admin/registrations"),
    ]);
    const [payload, summaryPayload] = await Promise.all([
      response.json(),
      summaryResponse.json(),
    ]);

    if (!response.ok) {
      throw new Error(payload.error || "Gagal memuat data registrasi.");
    }

    if (!summaryResponse.ok) {
      throw new Error(summaryPayload.error || "Gagal memuat data ringkasan.");
    }

    currentItems = Array.isArray(payload.items) ? payload.items : [];
    summaryItems = Array.isArray(summaryPayload.items) ? summaryPayload.items : [];

    renderRows();
    renderSummary(summaryItems);
    renderSubmissionRows(uploadItems);
    refreshToolbarSummary();
    updateDashboardMetrics();
    refreshSelectedRegistration();
    touchLastSync();
  } catch (error) {
    currentItems = [];
    summaryItems = [];
    renderRows();
    renderSummary([]);
    refreshToolbarSummary();
    updateDashboardMetrics();
    refreshSelectedRegistration();
    showError(error.message || "Terjadi kesalahan.");
  } finally {
    setLoading(false);
  }
}

async function loadSubmissions() {
  hideError();

  try {
    const response = await fetch("/api/admin/submissions");
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Gagal memuat data upload.");
    }

    uploadItems = Array.isArray(payload.items) ? payload.items : [];
    renderSubmissionRows(uploadItems);
    renderSubmissionSummary(uploadItems);
    refreshSubmissionBreakdown();
    refreshToolbarSummary();
    updateDashboardMetrics();
    touchLastSync();
  } catch (error) {
    uploadItems = [];
    renderSubmissionRows([]);
    renderSubmissionSummary([]);
    refreshSubmissionBreakdown();
    refreshToolbarSummary();
    updateDashboardMetrics();
    showError(error.message || "Gagal memuat data upload.");
  } finally {
    updateExportButtonState();
  }
}

async function loadMasterDataInfo() {
  try {
    const response = await fetch("/api/master-data/schools");
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Gagal memuat master data sekolah.");
    }

    currentMasterData = payload;
    renderMasterDataInfo(payload);
    renderSubmissionSummary(uploadItems);
    renderSubmissionRows(uploadItems);
    refreshSubmissionBreakdown();
    refreshToolbarSummary();
    updateDashboardMetrics();
    touchLastSync();
  } catch (error) {
    currentMasterData = null;
    renderMasterDataInfo(null, error.message || "Belum bisa memuat info master data.");
    renderSubmissionSummary(uploadItems);
    renderSubmissionRows(uploadItems);
    refreshSubmissionBreakdown();
    refreshToolbarSummary();
    updateDashboardMetrics();
    showError(error.message || "Belum bisa memuat info master data.");
  }
}

function renderMasterDataInfo(payload, errorMessage = "") {
  const columns = Array.isArray(payload?.columns) ? payload.columns : [];
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];

  ui.masterColumnsValue.textContent = formatCompactNumber(columns.length);
  ui.masterRowsValue.textContent = formatCompactNumber(rows.length);
  ui.masterUpdatedValue.textContent = payload?.updatedAt ? formatDate(payload.updatedAt) : "-";

  ui.masterDataInfo.textContent = errorMessage || (
    columns.length
      ? `Dataset ${payload.title || "Master Lokasi Sekolah"} memakai urutan kolom ${columns.join(" -> ")}.`
      : "Belum ada struktur kolom yang aktif."
  );
}

function renderRows() {
  ui.tableBody.innerHTML = "";
  visibleRegistrationItems = getVisibleRegistrationItems();

  if (!currentItems.length) {
    ui.tableScroll.classList.add("hidden");
    ui.emptyState.textContent = "Belum ada data registrasi yang masuk.";
    ui.emptyState.classList.remove("hidden");
    updateExportButtonState();
    return;
  }

  if (!visibleRegistrationItems.length) {
    ui.tableScroll.classList.add("hidden");
    ui.emptyState.textContent = "Tidak ada registrasi yang cocok dengan filter atau pencarian.";
    ui.emptyState.classList.remove("hidden");
    updateExportButtonState();
    return;
  }

  ui.tableScroll.classList.remove("hidden");
  ui.emptyState.classList.add("hidden");

  visibleRegistrationItems.forEach((item) => {
    const fragment = ui.rowTemplate.content.cloneNode(true);
    const statusPill = fragment.querySelector(".status-pill");
    const name = fragment.querySelector(".row-name");
    const meta = fragment.querySelector(".row-meta");
    const area = fragment.querySelector(".row-area");
    const assets = fragment.querySelector(".row-assets");
    const assetsDetail = fragment.querySelector(".row-assets-detail");
    const notePreview = fragment.querySelector(".row-note-preview");
    const created = fragment.querySelector(".row-created");
    const updated = fragment.querySelector(".row-updated");
    const viewButton = fragment.querySelector(".row-view-button");

    const assetSummary = summarizeRegistrationAssets(item);

    statusPill.textContent = item.status || "-";
    statusPill.dataset.status = item.status || "";
    name.textContent = item.nama || item.displayName || "Tanpa nama";
    meta.textContent = [item.gmail || "-", item.uid || "-"].join(" • ");
    area.textContent = item.areaKerja || item.kabupaten || "Belum diisi";
    assets.textContent = assetSummary.title;
    assetsDetail.textContent = assetSummary.detail;
    notePreview.textContent = truncateText(item.adminNote || item.rejectionReason || "Belum ada catatan admin.", 120);
    created.textContent = `Dibuat ${formatDate(item.createdAt)}`;
    updated.textContent = `Update ${formatDate(item.updatedAt)}`;

    viewButton.addEventListener("click", () => openRegistrationDrawer(item));
    ui.tableBody.appendChild(fragment);
  });

  updateExportButtonState();
}

function renderSummary(items) {
  ui.summaryBody.innerHTML = "";

  if (!items.length) {
    ui.summaryScroll.classList.add("hidden");
    ui.summaryEmptyState.classList.remove("hidden");
    return;
  }

  const { rows, totals } = buildAreaSummary(items);
  ui.summaryScroll.classList.remove("hidden");
  ui.summaryEmptyState.classList.add("hidden");

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="cell-wrap cell-strong">${escapeHtml(row.areaKerja)}</td>
      <td class="cell-nowrap">${row.approved}</td>
      <td class="cell-nowrap">${row.pending}</td>
      <td class="cell-nowrap">${row.rejected}</td>
      <td class="cell-nowrap">${row.suspended}</td>
      <td class="cell-nowrap cell-strong">${row.total}</td>
    `;
    ui.summaryBody.appendChild(tr);
  });

  const totalRow = document.createElement("tr");
  totalRow.className = "summary-total-row";
  totalRow.innerHTML = `
    <td class="cell-wrap cell-strong">Total</td>
    <td class="cell-nowrap cell-strong">${totals.approved}</td>
    <td class="cell-nowrap cell-strong">${totals.pending}</td>
    <td class="cell-nowrap cell-strong">${totals.rejected}</td>
    <td class="cell-nowrap cell-strong">${totals.suspended}</td>
    <td class="cell-nowrap cell-strong">${totals.total}</td>
  `;
  ui.summaryBody.appendChild(totalRow);
}

function renderSubmissionRows(items) {
  ui.uploadTableHead.innerHTML = "";
  ui.uploadTableBody.innerHTML = "";

  if (!items.length) {
    ui.uploadTableScroll.classList.add("hidden");
    ui.uploadEmptyState.classList.remove("hidden");
    return;
  }

  ui.uploadTableScroll.classList.remove("hidden");
  ui.uploadEmptyState.classList.add("hidden");

  const orderedItems = getSubmissionRawItems(items);
  const locationColumns = getSubmissionLocationColumns(orderedItems);
  const photoColumns = getSubmissionPhotoColumns(orderedItems);
  const headerColumns = [
    "No.",
    "Submission ID",
    "UID",
    "Email",
    "Nama",
    ...locationColumns,
    ...photoColumns,
    "GPS Timestamp",
    "GPS Latitude",
    "GPS Longitude",
    "GPS Akurasi",
    "GPS Alamat",
    "Tanggal Disimpan",
    "Tanggal Upload",
  ];

  const headerRow = document.createElement("tr");
  headerRow.innerHTML = headerColumns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  ui.uploadTableHead.appendChild(headerRow);

  orderedItems.forEach((item, index) => {
    const parsed = parseSubmissionAnswers(item);
    const identity = resolveSubmissionIdentity(item);
    const tr = document.createElement("tr");
    const cells = [];

    cells.push(createTextCell(index + 1, "cell-nowrap"));
    cells.push(createTextCell(item.submissionId, "cell-code"));
    cells.push(createTextCell(item.uid, "cell-code"));
    cells.push(createTextCell(identity.gmail, "cell-wrap"));
    cells.push(createTextCell(identity.nama, "cell-wrap"));

    locationColumns.forEach((column) => {
      cells.push(createTextCell(parsed.selectedLocation[column], "cell-wrap"));
    });

    photoColumns.forEach((title) => {
      const photo = parsed.photoMap.get(title);
      const td = document.createElement("td");
      td.className = "cell-wrap";

      if (photo?.url) {
        const link = document.createElement("a");
        link.className = "submission-file-link";
        link.href = photo.url;
        link.target = "_blank";
        link.rel = "noreferrer noopener";
        link.textContent = photo.filename || "Lihat Foto";
        td.appendChild(link);
      } else {
        td.textContent = "-";
      }

      cells.push(td);
    });

    cells.push(createTextCell(formatDate(parsed.gpsRecord.timestamp), "cell-nowrap"));
    cells.push(createTextCell(parsed.gpsRecord.latitude, "cell-nowrap"));
    cells.push(createTextCell(parsed.gpsRecord.longitude, "cell-nowrap"));
    cells.push(createTextCell(parsed.gpsRecord.accuracyMeters, "cell-nowrap"));
    cells.push(createTextCell(parsed.gpsRecord.address, "cell-wrap"));
    cells.push(createTextCell(formatDate(item.createdAt), "cell-nowrap"));
    cells.push(createTextCell(formatDate(item.uploadedAt), "cell-nowrap"));

    cells.forEach((cell) => tr.appendChild(cell));
    ui.uploadTableBody.appendChild(tr);
  });
}

function renderSubmissionSummary(items) {
  ui.uploadSummaryBody.innerHTML = "";
  const { rows, totals } = buildSubmissionSummary(items);

  if (!rows.length) {
    ui.uploadSummaryScroll.classList.add("hidden");
    ui.uploadSummaryEmptyState.classList.remove("hidden");
    return;
  }

  ui.uploadSummaryScroll.classList.remove("hidden");
  ui.uploadSummaryEmptyState.classList.add("hidden");

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="cell-wrap cell-strong">${escapeHtml(row.kabupaten)}</td>
      <td class="cell-nowrap">${row.target}</td>
      <td class="cell-nowrap">${row.achv}</td>
      <td class="cell-nowrap">${row.toBeAchv}</td>
    `;
    ui.uploadSummaryBody.appendChild(tr);
  });

  const totalRow = document.createElement("tr");
  totalRow.className = "summary-total-row";
  totalRow.innerHTML = `
    <td class="cell-wrap cell-strong">Total</td>
    <td class="cell-nowrap cell-strong">${totals.target}</td>
    <td class="cell-nowrap cell-strong">${totals.achv}</td>
    <td class="cell-nowrap cell-strong">${totals.toBeAchv}</td>
  `;
  ui.uploadSummaryBody.appendChild(totalRow);
}

function refreshSubmissionBreakdown() {
  breakdownRows = buildSubmissionBreakdownRows();
  populateBreakdownKabupatenOptions(breakdownRows);
  renderSubmissionBreakdown(breakdownRows);
}

function renderSubmissionBreakdown(rows) {
  ui.uploadBreakdownHead.innerHTML = "";
  ui.uploadBreakdownBody.innerHTML = "";

  if (!rows.length) {
    ui.uploadBreakdownScroll.classList.add("hidden");
    ui.uploadBreakdownEmptyState.classList.remove("hidden");
    ui.breakdownSummaryText.textContent = "Belum ada master data sekolah untuk diringkas.";
    updateExportButtonState();
    return;
  }

  const filteredRows = filterSubmissionBreakdownRows(rows);
  const locationColumns = Array.isArray(currentMasterData?.columns) ? currentMasterData.columns : [];
  const headerColumns = [...locationColumns, "Status"];

  const headerRow = document.createElement("tr");
  headerRow.innerHTML = headerColumns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  ui.uploadBreakdownHead.appendChild(headerRow);

  if (!filteredRows.length) {
    ui.uploadBreakdownScroll.classList.add("hidden");
    ui.uploadBreakdownEmptyState.classList.remove("hidden");
    ui.breakdownSummaryText.textContent = "Tidak ada sekolah yang cocok dengan filter atau pencarian.";
    updateExportButtonState();
    return;
  }

  ui.uploadBreakdownScroll.classList.remove("hidden");
  ui.uploadBreakdownEmptyState.classList.add("hidden");
  ui.breakdownSummaryText.textContent = `${filteredRows.length} dari ${rows.length} sekolah tampil`;

  filteredRows.forEach((row) => {
    const tr = document.createElement("tr");
    locationColumns.forEach((column) => {
      tr.appendChild(createTextCell(row.values[column], "cell-wrap"));
    });
    tr.appendChild(createStatusCell(row.status));
    ui.uploadBreakdownBody.appendChild(tr);
  });

  updateExportButtonState();
}

async function saveSelectedRegistrationNote() {
  const item = findRegistrationById(selectedRegistrationId);
  if (!item) return;

  const adminNote = ui.drawerNoteInput.value.trim();
  setDrawerNoteState("Menyimpan...", "saving");
  ui.drawerNoteSaveButton.disabled = true;

  try {
    const response = await fetch(`/api/admin/registrations/${item.registrationId}/note`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminNote }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Gagal menyimpan catatan.");
    }

    mergeRegistrationRecord({
      registrationId: item.registrationId,
      adminNote: payload.adminNote || "",
      rejectionReason: payload.rejectionReason || item.rejectionReason || "",
      updatedAt: payload.updatedAt || item.updatedAt,
    });

    renderRows();
    refreshToolbarSummary();
    refreshSelectedRegistration("Tersimpan");
    updateDashboardMetrics();
    touchLastSync();
  } catch (error) {
    setDrawerNoteState(error.message || "Gagal menyimpan", "error");
    showError(error.message || "Terjadi kesalahan.");
  } finally {
    ui.drawerNoteSaveButton.disabled = false;
  }
}

async function updateSelectedRegistrationStatus(action) {
  const item = findRegistrationById(selectedRegistrationId);
  if (!item) return;

  const adminNote = ui.drawerNoteInput.value.trim();
  if ((action === "reject" || action === "suspend") && !adminNote) {
    showError(`Isi catatan terlebih dahulu untuk alasan ${action === "reject" ? "reject" : "suspend"}.`);
    ui.drawerNoteInput.focus();
    return;
  }

  hideError();
  setDrawerActionLoading(true);

  try {
    const response = await fetch(`/api/admin/registrations/${item.registrationId}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminNote }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Gagal memperbarui status.");
    }

    await loadRegistrations();
    refreshSelectedRegistration("Status berhasil diperbarui.");
    touchLastSync();
  } catch (error) {
    showError(error.message || "Terjadi kesalahan.");
  } finally {
    setDrawerActionLoading(false);
  }
}

function setLoading(isLoading) {
  updateExportButtonState(isLoading);
}

function setMasterUploadState(message, state = "") {
  ui.masterUploadStatus.textContent = message;
  ui.masterUploadStatus.dataset.state = state || "";
}

function showError(message) {
  ui.errorBanner.textContent = message;
  ui.errorBanner.classList.remove("hidden");
}

function hideError() {
  ui.errorBanner.textContent = "";
  ui.errorBanner.classList.add("hidden");
}

function setDrawerNoteState(message, state = "") {
  ui.drawerNoteStatus.textContent = message;
  ui.drawerNoteStatus.dataset.state = state || "";
}

function refreshToolbarSummary() {
  if (activeTab === "detail-registrations") {
    const visibleCount = visibleRegistrationItems.length;
    const filteredCount = currentItems.length;
    const totalCount = summaryItems.length;
    const hasSearch = Boolean(ui.registrationSearchInput.value.trim());
    const hasStatusFilter = Boolean(ui.statusFilter.value);

    if (!filteredCount) {
      ui.summaryText.textContent = "Belum ada registrasi yang cocok dengan filter status saat ini.";
      return;
    }

    if (hasSearch) {
      ui.summaryText.textContent = `${visibleCount} data tampil dari ${filteredCount} registrasi sesuai status, ${totalCount} total registrasi.`;
      return;
    }

    ui.summaryText.textContent = hasStatusFilter
      ? `${filteredCount} registrasi sesuai status, ${totalCount} total registrasi.`
      : `${totalCount} total registrasi siap direview.`;
    return;
  }

  if (activeTab === "summary-registrations") {
    const areaCount = buildAreaSummary(summaryItems).rows.length;
    ui.summaryText.textContent = summaryItems.length
      ? `${summaryItems.length} registrasi diringkas ke ${areaCount} area kerja.`
      : "Belum ada data registrasi untuk diringkas.";
    return;
  }

  if (activeTab === "summary-submissions") {
    const summary = buildSubmissionSummary(uploadItems);
    ui.summaryText.textContent = summary.rows.length
      ? `${summary.totals.achv} sekolah tercapai dari ${summary.totals.target} target.`
      : "Belum ada master data atau upload yang bisa diringkas.";
    return;
  }

  if (activeTab === "breakdown-submissions") {
    ui.summaryText.textContent = breakdownRows.length
      ? `${breakdownRows.length} sekolah master tersedia untuk audit progres lapangan.`
      : "Belum ada master data sekolah yang bisa dipecah.";
    return;
  }

  if (activeTab === "detail-submissions") {
    ui.summaryText.textContent = uploadItems.length
      ? `${uploadItems.length} raw upload tersimpan di backend.`
      : "Belum ada raw data upload yang masuk.";
    return;
  }

  ui.summaryText.textContent = "Kelola data master sekolah dari panel ini.";
}

function updateExportButtonState(isLoading = false) {
  const showExportButton = activeTab !== "summary-registrations";
  ui.exportButton.classList.toggle("hidden", !showExportButton);

  if (!showExportButton) {
    ui.exportButton.disabled = true;
    return;
  }

  const hasRows = activeTab === "summary-registrations"
    ? summaryItems.length > 0
    : activeTab === "detail-registrations"
      ? visibleRegistrationItems.length > 0
      : activeTab === "summary-submissions"
        ? buildSubmissionSummary(uploadItems).rows.length > 0
        : activeTab === "breakdown-submissions"
          ? filterSubmissionBreakdownRows(breakdownRows).length > 0
          : activeTab === "detail-submissions"
            ? uploadItems.length > 0
            : false;

  ui.exportButton.disabled = isLoading || !hasRows;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value) || 0);
}

function truncateText(value, limit = 100) {
  const normalized = String(value || "").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1)}…`;
}

function summarizeRegistrationAssets(item) {
  const assets = [
    item.ktpDriveFileId || item.ktpLocalPath ? "KTP" : "",
    item.selfieDriveFileId || item.selfieLocalPath ? "Selfie" : "",
  ].filter(Boolean);

  if (!assets.length) {
    return {
      title: "Belum ada aset",
      detail: "Menunggu upload berkas dari APK",
    };
  }

  return {
    title: `${assets.length}/2 aset tersedia`,
    detail: assets.join(" • "),
  };
}

function openRegistrationDrawer(item) {
  selectedRegistrationId = item.registrationId;
  fillRegistrationDrawer(item);
  ui.detailPreviewStage.classList.remove("hidden");
  ui.detailDrawer.classList.remove("hidden");
  ui.detailDrawerBackdrop.classList.remove("hidden");
  ui.detailPreviewStage.setAttribute("aria-hidden", "false");
  ui.detailDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
}

function closeRegistrationDrawer() {
  selectedRegistrationId = null;
  ui.detailPreviewStage.classList.add("hidden");
  ui.detailDrawer.classList.add("hidden");
  ui.detailDrawerBackdrop.classList.add("hidden");
  ui.detailPreviewStage.setAttribute("aria-hidden", "true");
  ui.detailDrawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
  setDrawerActionAvailability(null);
  setDrawerNoteState("", "");
}

function refreshSelectedRegistration(successMessage = "") {
  if (!selectedRegistrationId || ui.detailDrawer.classList.contains("hidden")) {
    return;
  }

  const item = findRegistrationById(selectedRegistrationId);
  if (!item) {
    closeRegistrationDrawer();
    return;
  }

  fillRegistrationDrawer(item, successMessage);
}

function fillRegistrationDrawer(item, successMessage = "") {
  ui.drawerStatusPill.textContent = item.status || "-";
  ui.drawerStatusPill.dataset.status = item.status || "";
  ui.drawerTitle.textContent = item.nama || item.displayName || "Tanpa nama";
  ui.drawerMeta.textContent = [item.gmail || "-", item.uid || "-", item.areaKerja || item.kabupaten || "Belum diisi"]
    .filter(Boolean)
    .join(" • ");
  ui.drawerPrimaryLabel.textContent = item.registrationId || "-";
  ui.drawerUpdatedAt.textContent = `Diperbarui ${formatDate(item.updatedAt)}`;
  ui.drawerNoteInput.value = item.adminNote || item.rejectionReason || "";
  renderDrawerFields(item);
  renderDrawerAssets(item);
  renderPreviewStage(item);
  setDrawerActionAvailability(item);
  setDrawerNoteState(successMessage, successMessage ? "saved" : "");
}

function renderDrawerFields(item) {
  ui.drawerFields.innerHTML = "";

  const fields = [
    ["Registration ID", item.registrationId],
    ["UID", item.uid],
    ["Gmail", item.gmail],
    ["Nama", item.nama || item.displayName],
    ["NIK", item.nik],
    ["No HP", item.noHp],
    ["No Rekening", item.noRekening],
    ["Nama Bank", item.namaBank],
    ["Nama Pemilik", item.namaPemilik],
    ["Area Kerja", item.areaKerja],
    ["Alamat", buildAddressSummary(item)],
    ["Dibuat", formatDate(item.createdAt)],
    ["Update", formatDate(item.updatedAt)],
  ];

  if (item.rejectionReason) {
    fields.push(["Alasan Terakhir", item.rejectionReason]);
  }

  fields.forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "detail-item";
    card.innerHTML = `
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "-")}</strong>
    `;
    ui.drawerFields.appendChild(card);
  });
}

function renderDrawerAssets(item) {
  ui.drawerAssets.innerHTML = "";
  ui.drawerAssets.appendChild(createAssetCard("KTP", item.ktpDriveFileId, item.ktpLocalPath));
  ui.drawerAssets.appendChild(createAssetCard("Selfie", item.selfieDriveFileId, item.selfieLocalPath));
}

function renderPreviewStage(item) {
  ui.previewStageMeta.textContent = [
    item.nama || item.displayName || "Tanpa nama",
    item.areaKerja || item.kabupaten || "Area belum diisi",
    "Klik gambar untuk membuka ukuran penuh.",
  ].join(" • ");

  ui.previewStageAssets.innerHTML = "";
  ui.previewStageAssets.appendChild(
    createPreviewAssetCard("Preview KTP", item.ktpDriveFileId, item.ktpLocalPath),
  );
  ui.previewStageAssets.appendChild(
    createPreviewAssetCard("Preview Foto Selfie", item.selfieDriveFileId, item.selfieLocalPath),
  );
}

function createAssetCard(label, remoteUrl, fallbackPath) {
  const href = resolveAssetHref(remoteUrl);
  const hasPreview = isPreviewableImageHref(href);
  const card = document.createElement(href ? "a" : "div");
  card.className = "asset-card";

  if (href) {
    card.href = href;
    card.target = "_blank";
    card.rel = "noreferrer noopener";
  }

  if (hasPreview) {
    const image = document.createElement("img");
    image.src = href;
    image.alt = `Preview ${label}`;
    card.appendChild(image);
  }

  const copy = document.createElement("div");
  copy.className = "asset-card__copy";

  const title = document.createElement("strong");
  title.className = "asset-card__title";
  title.textContent = label;

  const status = document.createElement("span");
  status.textContent = href
    ? "Berkas tersedia untuk dibuka."
    : trimAssetLabel(fallbackPath) || "Belum ada berkas yang tersimpan.";

  const hint = document.createElement("span");
  hint.textContent = href
    ? (hasPreview ? "Klik kartu untuk membuka gambar penuh." : "Klik kartu untuk membuka file.")
    : "Menunggu upload asset dari APK.";

  copy.appendChild(title);
  copy.appendChild(status);
  copy.appendChild(hint);
  card.appendChild(copy);

  return card;
}

function createPreviewAssetCard(label, remoteUrl, fallbackPath) {
  const href = resolveAssetHref(remoteUrl);
  const hasPreview = isPreviewableImageHref(href);
  const card = document.createElement(href ? "a" : "div");
  card.className = "preview-asset-card";

  if (href) {
    card.href = href;
    card.target = "_blank";
    card.rel = "noreferrer noopener";
  }

  const media = document.createElement("div");
  media.className = "preview-asset-card__media";

  if (hasPreview) {
    const image = document.createElement("img");
    image.src = href;
    image.alt = label;
    image.loading = "lazy";
    image.addEventListener("error", () => {
      media.replaceChildren(createPreviewAssetPlaceholder("Preview gambar belum tersedia."));
    });
    media.appendChild(image);
  } else {
    media.appendChild(createPreviewAssetPlaceholder(
      trimAssetLabel(fallbackPath) || "Belum ada file yang bisa dipreview.",
    ));
  }

  const copy = document.createElement("div");
  copy.className = "preview-asset-card__copy";

  const title = document.createElement("strong");
  title.className = "preview-asset-card__title";
  title.textContent = label;

  const status = document.createElement("span");
  status.textContent = href
    ? "Berkas tersedia untuk ditinjau di panel ini."
    : "Belum ada berkas tersimpan untuk item ini.";

  const hint = document.createElement("span");
  hint.textContent = href
    ? "Klik kartu untuk membuka file penuh."
    : "Menunggu upload asset dari APK.";

  copy.appendChild(title);
  copy.appendChild(status);
  copy.appendChild(hint);
  card.appendChild(media);
  card.appendChild(copy);

  return card;
}

function createPreviewAssetPlaceholder(message) {
  const placeholder = document.createElement("div");
  placeholder.className = "preview-asset-card__placeholder";
  placeholder.textContent = message;
  return placeholder;
}

function setDrawerActionAvailability(item) {
  const hasSelection = Boolean(item);
  const status = item?.status || "";
  ui.drawerNoteInput.disabled = !hasSelection;
  ui.drawerNoteSaveButton.disabled = !hasSelection;
  ui.drawerApproveButton.disabled = !hasSelection || status === "APPROVED";
  ui.drawerRejectButton.disabled = !hasSelection || status === "REJECTED";
  ui.drawerSuspendButton.disabled = !hasSelection || status === "SUSPENDED";
}

function setDrawerActionLoading(isLoading) {
  if (isLoading) {
    ui.drawerNoteInput.disabled = true;
    ui.drawerNoteSaveButton.disabled = true;
    ui.drawerApproveButton.disabled = true;
    ui.drawerRejectButton.disabled = true;
    ui.drawerSuspendButton.disabled = true;
    return;
  }

  const item = findRegistrationById(selectedRegistrationId);
  setDrawerActionAvailability(item);
}

function resolveAssetHref(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (normalized.startsWith("/uploads/")) return normalized;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return "";
}

function isPreviewableImageHref(href) {
  if (!href) {
    return false;
  }

  return href.startsWith("/uploads/") || /^https?:\/\//i.test(href);
}

function trimAssetLabel(value) {
  if (!value) return "";
  const segments = String(value).split(/[\\/]/);
  return segments[segments.length - 1] || String(value);
}

function buildAddressSummary(item) {
  return [
    item.alamat,
    item.rtRw,
    item.kelDesa,
    item.kecamatan,
    item.kabupaten,
  ].filter(Boolean).join(", ");
}

function findRegistrationById(registrationId) {
  return [...summaryItems, ...currentItems].find((item) => item.registrationId === registrationId) || null;
}

function mergeRegistrationRecord(partial) {
  const applyUpdate = (items) => items.map((item) => (
    item.registrationId === partial.registrationId ? { ...item, ...partial } : item
  ));

  currentItems = applyUpdate(currentItems);
  summaryItems = applyUpdate(summaryItems);
}

function exportToExcel() {
  if (activeTab === "summary-registrations") {
    exportSummaryToExcel();
    return;
  }

  if (activeTab === "detail-registrations") {
    exportRegistrationsToExcel();
    return;
  }

  if (activeTab === "summary-submissions") {
    exportSubmissionSummaryToExcel();
    return;
  }

  if (activeTab === "breakdown-submissions") {
    exportSubmissionBreakdownToExcel();
    return;
  }

  if (activeTab === "detail-submissions") {
    exportSubmissionRawToExcel();
  }
}

function exportRegistrationsToExcel() {
  if (!visibleRegistrationItems.length) return;

  const rowsHtml = visibleRegistrationItems.map((item) => {
    const values = [
      item.status || "",
      item.registrationId || "",
      item.uid || "",
      item.gmail || "",
      item.nama || item.displayName || "",
      item.nik || "",
      item.alamat || "",
      item.noHp || "",
      item.noRekening || "",
      item.namaBank || "",
      item.namaPemilik || "",
      item.areaKerja || "",
      item.ktpDriveFileId || item.ktpLocalPath || "",
      item.selfieDriveFileId || item.selfieLocalPath || "",
      formatDate(item.createdAt),
      formatDate(item.updatedAt),
      item.adminNote || item.rejectionReason || "",
    ];

    return `<tr>${values.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`;
  }).join("");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>
              <th>Status</th>
              <th>ID Reg</th>
              <th>UID</th>
              <th>Gmail</th>
              <th>Nama</th>
              <th>NIK</th>
              <th>Alamat</th>
              <th>No HP</th>
              <th>No Rekening</th>
              <th>Nama Bank</th>
              <th>Nama Pemilik</th>
              <th>Area Kerja</th>
              <th>KTP</th>
              <th>Selfie</th>
              <th>Dibuat</th>
              <th>Update</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `.trim();

  downloadExcelBlob(html, "tic-registrations");
}

function exportSubmissionRawToExcel() {
  if (!uploadItems.length) return;

  const orderedItems = getSubmissionRawItems(uploadItems);
  const locationColumns = getSubmissionLocationColumns(orderedItems);
  const photoColumns = getSubmissionPhotoColumns(orderedItems);
  const headerColumns = [
    "No.",
    "Submission ID",
    "UID",
    "Email",
    "Nama",
    ...locationColumns,
    ...photoColumns,
    "GPS Timestamp",
    "GPS Latitude",
    "GPS Longitude",
    "GPS Akurasi",
    "GPS Alamat",
    "Tanggal Disimpan",
    "Tanggal Upload",
  ];

  const rowsHtml = orderedItems.map((item, index) => {
    const parsed = parseSubmissionAnswers(item);
    const identity = resolveSubmissionIdentity(item);
    const values = [
      index + 1,
      item.submissionId || "",
      item.uid || "",
      identity.gmail || "",
      identity.nama || "",
      ...locationColumns.map((column) => parsed.selectedLocation[column] || ""),
      ...photoColumns.map((title) => {
        const photo = parsed.photoMap.get(title);
        return photo?.url || photo?.filename || "";
      }),
      formatDate(parsed.gpsRecord.timestamp),
      parsed.gpsRecord.latitude,
      parsed.gpsRecord.longitude,
      parsed.gpsRecord.accuracyMeters,
      parsed.gpsRecord.address,
      formatDate(item.createdAt),
      formatDate(item.uploadedAt),
    ];

    return `<tr>${values.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`;
  }).join("");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>
              ${headerColumns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `.trim();

  downloadExcelBlob(html, "tic-upload-raw-data");
}

function exportSummaryToExcel() {
  if (!summaryItems.length) return;

  const { rows, totals } = buildAreaSummary(summaryItems);
  const rowsHtml = rows.map((row) => {
    const values = [
      row.areaKerja,
      row.approved,
      row.pending,
      row.rejected,
      row.suspended,
      row.total,
    ];

    return `<tr>${values.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`;
  }).join("");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>
              <th>Area Kerja</th>
              <th>Approved</th>
              <th>Pending</th>
              <th>Rejected</th>
              <th>Suspended</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr>
              <td><strong>Total</strong></td>
              <td><strong>${totals.approved}</strong></td>
              <td><strong>${totals.pending}</strong></td>
              <td><strong>${totals.rejected}</strong></td>
              <td><strong>${totals.suspended}</strong></td>
              <td><strong>${totals.total}</strong></td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `.trim();

  downloadExcelBlob(html, "tic-summary-area-kerja");
}

function exportSubmissionSummaryToExcel() {
  const { rows, totals } = buildSubmissionSummary(uploadItems);
  if (!rows.length) return;

  const rowsHtml = rows.map((row) => {
    const values = [row.kabupaten, row.target, row.achv, row.toBeAchv];
    return `<tr>${values.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`;
  }).join("");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>
              <th>Kabupaten</th>
              <th>Target</th>
              <th>Achv</th>
              <th>To be Achv</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr>
              <td><strong>Total</strong></td>
              <td><strong>${totals.target}</strong></td>
              <td><strong>${totals.achv}</strong></td>
              <td><strong>${totals.toBeAchv}</strong></td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `.trim();

  downloadExcelBlob(html, "tic-upload-summary");
}

function exportSubmissionBreakdownToExcel() {
  const rows = filterSubmissionBreakdownRows(breakdownRows);
  if (!rows.length) return;

  const locationColumns = Array.isArray(currentMasterData?.columns) ? currentMasterData.columns : [];
  const headerColumns = [...locationColumns, "Status"];
  const rowsHtml = rows.map((row) => {
    const values = [
      ...locationColumns.map((column) => row.values[column] || ""),
      row.status || "",
    ];
    return `<tr>${values.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`;
  }).join("");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>
              ${headerColumns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `.trim();

  downloadExcelBlob(html, "tic-upload-breakdown");
}

function downloadExcelBlob(html, filePrefix) {
  const blob = new Blob(["\ufeff", html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  anchor.href = url;
  anchor.download = `${filePrefix}-${timestamp}.xls`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function buildAreaSummary(items) {
  const areaMap = new Map();
  const totals = {
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
    total: 0,
  };

  items.forEach((item) => {
    const areaKerja = item.areaKerja || "Belum diisi";
    const status = String(item.status || "").toUpperCase();

    if (!areaMap.has(areaKerja)) {
      areaMap.set(areaKerja, {
        areaKerja,
        pending: 0,
        approved: 0,
        rejected: 0,
        suspended: 0,
        total: 0,
      });
    }

    const row = areaMap.get(areaKerja);
    row.total += 1;
    totals.total += 1;

    if (status === "PENDING") {
      row.pending += 1;
      totals.pending += 1;
    } else if (status === "APPROVED") {
      row.approved += 1;
      totals.approved += 1;
    } else if (status === "REJECTED") {
      row.rejected += 1;
      totals.rejected += 1;
    } else if (status === "SUSPENDED") {
      row.suspended += 1;
      totals.suspended += 1;
    }
  });

  const rows = Array.from(areaMap.values()).sort((left, right) => left.areaKerja.localeCompare(right.areaKerja, "id"));
  return { rows, totals };
}

function buildSubmissionSummary(items) {
  const { kabupatenColumn, schoolColumn } = getMasterColumnHints();
  const targetMap = new Map();
  const achievementMap = new Map();

  const masterRows = Array.isArray(currentMasterData?.rows) ? currentMasterData.rows : [];
  const masterColumns = Array.isArray(currentMasterData?.columns) ? currentMasterData.columns : [];
  const kabupatenIndex = masterColumns.indexOf(kabupatenColumn);
  const schoolIndex = masterColumns.indexOf(schoolColumn);

  masterRows.forEach((row) => {
    const kabupaten = String(row?.[kabupatenIndex] || "").trim() || "Belum diisi";
    const schoolName = String(row?.[schoolIndex] || "").trim() || JSON.stringify(row);
    if (!targetMap.has(kabupaten)) {
      targetMap.set(kabupaten, new Set());
    }
    targetMap.get(kabupaten).add(schoolName);
  });

  items.forEach((item) => {
    if (String(item.status || "").toUpperCase() !== "UPLOADED") {
      return;
    }

    const parsed = parseSubmissionAnswers(item);
    const kabupaten = String(parsed.selectedLocation[kabupatenColumn] || "").trim() || "Belum diisi";
    const schoolName = String(parsed.selectedLocation[schoolColumn] || item.formName || item.submissionId).trim();
    if (!achievementMap.has(kabupaten)) {
      achievementMap.set(kabupaten, new Set());
    }
    achievementMap.get(kabupaten).add(schoolName);
  });

  const allKabupaten = Array.from(new Set([...targetMap.keys(), ...achievementMap.keys()]))
    .sort((left, right) => left.localeCompare(right, "id"));

  const totals = {
    target: 0,
    achv: 0,
    toBeAchv: 0,
  };

  const rows = allKabupaten.map((kabupaten) => {
    const target = targetMap.get(kabupaten)?.size || 0;
    const achv = achievementMap.get(kabupaten)?.size || 0;
    const toBeAchv = Math.max(target - achv, 0);

    totals.target += target;
    totals.achv += achv;
    totals.toBeAchv += toBeAchv;

    return {
      kabupaten,
      target,
      achv,
      toBeAchv,
    };
  });

  return { rows, totals };
}

function buildSubmissionBreakdownRows() {
  const columns = Array.isArray(currentMasterData?.columns) ? currentMasterData.columns : [];
  const rows = Array.isArray(currentMasterData?.rows) ? currentMasterData.rows : [];
  if (!columns.length || !rows.length) {
    return [];
  }

  const { schoolColumn } = getMasterColumnHints();
  const schoolIndex = columns.indexOf(schoolColumn);
  const completedSchools = new Set();

  uploadItems.forEach((item) => {
    if (String(item.status || "").toUpperCase() !== "UPLOADED") {
      return;
    }

    const parsed = parseSubmissionAnswers(item);
    const schoolName = String(parsed.selectedLocation[schoolColumn] || item.formName || "").trim();
    if (schoolName) {
      completedSchools.add(normalizeSearchValue(schoolName));
    }
  });

  return rows
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell || "").trim()))
    .map((row, index) => {
      const values = {};
      columns.forEach((column, columnIndex) => {
        values[column] = String(row?.[columnIndex] || "").trim();
      });

      const schoolName = String(row?.[schoolIndex] || "").trim();
      const status = completedSchools.has(normalizeSearchValue(schoolName)) ? "DONE" : "PENDING";

      return {
        id: `${index}-${schoolName}`,
        values,
        status,
      };
    });
}

function getMasterColumnHints() {
  const columns = Array.isArray(currentMasterData?.columns) ? currentMasterData.columns : [];
  const kabupatenColumn = columns.find((column) => /kab/i.test(column)) || columns[0] || "Kabupaten";
  const schoolColumn = columns.find((column) => /sekolah/i.test(column)) || columns[columns.length - 1] || "Nama Sekolah";
  return { kabupatenColumn, schoolColumn };
}

function populateBreakdownKabupatenOptions(rows) {
  const { kabupatenColumn } = getMasterColumnHints();
  const currentValue = ui.breakdownKabupatenFilter.value;
  const kabupatenValues = Array.from(new Set(
    rows
      .map((row) => row.values[kabupatenColumn] || "Belum diisi")
      .filter(Boolean),
  )).sort((left, right) => left.localeCompare(right, "id"));

  ui.breakdownKabupatenFilter.innerHTML = [
    '<option value="">Semua Kabupaten</option>',
    ...kabupatenValues.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`),
  ].join("");

  ui.breakdownKabupatenFilter.value = kabupatenValues.includes(currentValue) ? currentValue : "";
}

function filterSubmissionBreakdownRows(rows) {
  const { kabupatenColumn } = getMasterColumnHints();
  const selectedKabupaten = ui.breakdownKabupatenFilter.value.trim();
  const selectedStatus = ui.breakdownStatusFilter.value.trim().toUpperCase();
  const searchTerm = normalizeSearchValue(ui.breakdownSearchInput.value);

  return rows.filter((row) => {
    const kabupatenValue = String(row.values[kabupatenColumn] || "Belum diisi").trim();
    if (selectedKabupaten && kabupatenValue !== selectedKabupaten) {
      return false;
    }

    if (selectedStatus && row.status !== selectedStatus) {
      return false;
    }

    if (!searchTerm) {
      return true;
    }

    const haystack = normalizeSearchValue([...Object.values(row.values), row.status].join(" "));
    return haystack.includes(searchTerm);
  });
}

function getSubmissionLocationColumns(items) {
  const masterColumns = Array.isArray(currentMasterData?.columns) ? currentMasterData.columns : [];
  if (masterColumns.length) {
    return masterColumns;
  }

  const seen = new Set();
  items.forEach((item) => {
    const parsed = parseSubmissionAnswers(item);
    Object.keys(parsed.selectedLocation).forEach((key) => {
      if (key) seen.add(key);
    });
  });

  return Array.from(seen);
}

function getSubmissionPhotoColumns(items) {
  const seen = new Set();
  items.forEach((item) => {
    const parsed = parseSubmissionAnswers(item);
    parsed.photoList.forEach((photo) => {
      if (photo.title) {
        seen.add(photo.title);
      }
    });
  });
  return Array.from(seen);
}

function parseSubmissionAnswers(item) {
  let payload = {};
  try {
    payload = item?.answersJson ? JSON.parse(item.answersJson) : {};
  } catch {
    payload = {};
  }

  const selectedLocation = payload.selectedLocation && typeof payload.selectedLocation === "object"
    ? payload.selectedLocation
    : {};
  const evidencePhotos = Array.isArray(payload.evidencePhotos) ? payload.evidencePhotos : [];
  const files = Array.isArray(item.files) ? item.files : [];
  const photoList = evidencePhotos.map((photo, index) => ({
    title: String(photo?.title || photo?.stepId || `Foto ${index + 1}`),
    url: files[index]?.driveFileId || "",
    filename: files[index]?.filename || photo?.title || `Foto ${index + 1}`,
  }));
  const photoMap = new Map(photoList.map((photo) => [photo.title, photo]));
  const gpsRecord = payload.gpsRecord && typeof payload.gpsRecord === "object"
    ? payload.gpsRecord
    : {};

  return {
    selectedLocation,
    photoList,
    photoMap,
    gpsRecord: {
      timestamp: gpsRecord.timestamp || "",
      latitude: gpsRecord.latitude ?? "",
      longitude: gpsRecord.longitude ?? "",
      accuracyMeters: gpsRecord.accuracyMeters ?? "",
      address: gpsRecord.address || "",
    },
  };
}

function resolveSubmissionIdentity(item) {
  const matchedRegistration = summaryItems.find((registration) => {
    if (item.uid && registration.uid === item.uid) {
      return true;
    }

    if (item.gmail && registration.gmail && registration.gmail === item.gmail) {
      return true;
    }

    return false;
  });

  return {
    gmail: item.gmail || matchedRegistration?.gmail || "",
    nama: item.nama || matchedRegistration?.nama || matchedRegistration?.displayName || "",
  };
}

function createTextCell(value, className = "") {
  const td = document.createElement("td");
  if (className) td.className = className;
  const normalized = value === undefined || value === null || value === "" ? "-" : String(value);
  td.textContent = normalized;
  return td;
}

function createStatusCell(status) {
  const td = document.createElement("td");
  const pill = document.createElement("span");
  pill.className = "status-pill";
  pill.dataset.status = status || "";
  pill.textContent = status || "-";
  td.appendChild(pill);
  return td;
}

function normalizeSearchValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getVisibleRegistrationItems() {
  const searchTerm = normalizeSearchValue(ui.registrationSearchInput.value);
  if (!searchTerm) {
    return [...currentItems];
  }

  return currentItems.filter((item) => {
    const haystack = normalizeSearchValue([
      item.registrationId,
      item.uid,
      item.gmail,
      item.nama,
      item.displayName,
      item.areaKerja,
      item.kabupaten,
      item.nik,
    ].join(" "));
    return haystack.includes(searchTerm);
  });
}

function getSubmissionRawItems(items) {
  return [...items].sort((left, right) =>
    String(right.uploadedAt || right.createdAt || "").localeCompare(
      String(left.uploadedAt || left.createdAt || ""),
    ),
  );
}

function setActiveTab(tab) {
  activeTab = tab;

  const tabs = {
    "summary-registrations": {
      label: "Summary Registrasi",
      exportLabel: "",
    },
    "detail-registrations": {
      label: "Review Registrasi",
      exportLabel: "Export Registrasi",
    },
    "summary-submissions": {
      label: "Summary Upload",
      exportLabel: "Export Summary Upload",
    },
    "breakdown-submissions": {
      label: "Breakdown Sekolah",
      exportLabel: "Export Breakdown Sekolah",
    },
    "detail-submissions": {
      label: "Raw Upload",
      exportLabel: "Export Raw Upload",
    },
    "master-data": {
      label: "Master Data",
      exportLabel: "Export",
    },
  };

  const showRegistrationSummary = tab === "summary-registrations";
  const showRegistrationDetail = tab === "detail-registrations";
  const showUploadSummary = tab === "summary-submissions";
  const showUploadBreakdown = tab === "breakdown-submissions";
  const showUploadRaw = tab === "detail-submissions";
  const showMasterPanel = tab === "master-data";

  ui.summaryTabButton.setAttribute("aria-selected", showRegistrationSummary ? "true" : "false");
  ui.detailTabButton.setAttribute("aria-selected", showRegistrationDetail ? "true" : "false");
  ui.uploadSummaryTabButton.setAttribute("aria-selected", showUploadSummary ? "true" : "false");
  ui.uploadBreakdownTabButton.setAttribute("aria-selected", showUploadBreakdown ? "true" : "false");
  ui.uploadRawTabButton.setAttribute("aria-selected", showUploadRaw ? "true" : "false");
  ui.masterTabButton.setAttribute("aria-selected", showMasterPanel ? "true" : "false");

  ui.detailToolbar.classList.toggle("hidden", showMasterPanel);
  statusFilterField.classList.toggle("hidden", !showRegistrationDetail);
  registrationSearchField.classList.toggle("hidden", !showRegistrationDetail);
  ui.summaryPanel.classList.toggle("hidden", !showRegistrationSummary);
  ui.detailPanel.classList.toggle("hidden", !showRegistrationDetail);
  ui.uploadSummaryPanel.classList.toggle("hidden", !showUploadSummary);
  ui.uploadBreakdownToolbar.classList.toggle("hidden", !showUploadBreakdown);
  ui.uploadBreakdownPanel.classList.toggle("hidden", !showUploadBreakdown);
  ui.uploadRawPanel.classList.toggle("hidden", !showUploadRaw);
  ui.masterPanel.classList.toggle("hidden", !showMasterPanel);

  ui.heroViewName.textContent = tabs[tab].label;
  ui.exportButton.textContent = tabs[tab].exportLabel;

  refreshToolbarSummary();
  updateExportButtonState();
}

function updateDashboardMetrics() {
  const registrationSummary = buildAreaSummary(summaryItems);
  const uploadSummary = buildSubmissionSummary(uploadItems);
  const masterRows = Array.isArray(currentMasterData?.rows) ? currentMasterData.rows.length : 0;

  ui.heroRegistrationsCount.textContent = formatCompactNumber(registrationSummary.totals.total);
  ui.heroUploadsCount.textContent = formatCompactNumber(uploadItems.length);
  ui.heroMasterRowsCount.textContent = formatCompactNumber(masterRows);

  ui.metricRegistrationsTotal.textContent = formatCompactNumber(registrationSummary.totals.total);
  ui.metricRegistrationsPending.textContent = formatCompactNumber(registrationSummary.totals.pending);
  ui.metricRegistrationsApproved.textContent = formatCompactNumber(registrationSummary.totals.approved);
  ui.metricRegistrationsAttention.textContent = formatCompactNumber(
    registrationSummary.totals.rejected + registrationSummary.totals.suspended,
  );

  ui.metricUploadsTotal.textContent = formatCompactNumber(uploadItems.length);
  ui.metricUploadsSchools.textContent = formatCompactNumber(uploadSummary.totals.achv);
  ui.metricUploadsPendingTarget.textContent = formatCompactNumber(uploadSummary.totals.toBeAchv);
  ui.metricUploadsKabupaten.textContent = formatCompactNumber(uploadSummary.rows.length);
}

function touchLastSync() {
  lastSyncAt = new Date().toISOString();
  ui.heroLastSync.textContent = `Sinkron terakhir ${formatDate(lastSyncAt)}`;
}

async function uploadMasterDataExcel() {
  const file = ui.masterFileInput.files?.[0];
  if (!file) {
    setMasterUploadState("Pilih file Excel terlebih dahulu.", "error");
    return;
  }

  hideError();
  ui.masterUploadButton.disabled = true;
  ui.masterRefreshButton.disabled = true;
  setMasterUploadState(`Mengupload ${file.name}...`, "saving");

  try {
    const base64Data = await readFileAsBase64(file);
    const response = await fetch("/api/admin/master-data/schools/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        base64Data,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.details || payload.error || "Upload Excel gagal.");
    }

    setMasterUploadState(
      `Upload berhasil. ${payload.columns.length} kolom dan ${payload.rowCount} baris aktif terbaca.`,
      "saved",
    );
    ui.masterFileInput.value = "";
    await loadMasterDataInfo();
  } catch (error) {
    setMasterUploadState(error.message || "Upload Excel gagal.", "error");
    showError(error.message || "Upload Excel gagal.");
  } finally {
    ui.masterUploadButton.disabled = false;
    ui.masterRefreshButton.disabled = false;
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64Data = result.includes(",") ? result.split(",").pop() : result;
      if (!base64Data) {
        reject(new Error("File Excel tidak bisa dibaca."));
        return;
      }
      resolve(base64Data);
    };
    reader.onerror = () => reject(new Error("File Excel tidak bisa dibaca."));
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

ui.statusFilter.addEventListener("change", loadRegistrations);
ui.registrationSearchInput.addEventListener("input", () => {
  renderRows();
  refreshToolbarSummary();
});
ui.exportButton.addEventListener("click", exportToExcel);
ui.summaryTabButton.addEventListener("click", () => setActiveTab("summary-registrations"));
ui.detailTabButton.addEventListener("click", () => setActiveTab("detail-registrations"));
ui.uploadSummaryTabButton.addEventListener("click", () => setActiveTab("summary-submissions"));
ui.uploadBreakdownTabButton.addEventListener("click", () => setActiveTab("breakdown-submissions"));
ui.uploadRawTabButton.addEventListener("click", () => setActiveTab("detail-submissions"));
ui.masterTabButton.addEventListener("click", () => setActiveTab("master-data"));
ui.breakdownKabupatenFilter.addEventListener("change", () => renderSubmissionBreakdown(breakdownRows));
ui.breakdownStatusFilter.addEventListener("change", () => renderSubmissionBreakdown(breakdownRows));
ui.breakdownSearchInput.addEventListener("input", () => renderSubmissionBreakdown(breakdownRows));
ui.masterUploadButton.addEventListener("click", uploadMasterDataExcel);
ui.masterRefreshButton.addEventListener("click", loadMasterDataInfo);
ui.masterFileInput.addEventListener("change", () => {
  const file = ui.masterFileInput.files?.[0];
  setMasterUploadState(file ? `Siap upload: ${file.name}` : "Belum ada file dipilih.", file ? "dirty" : "");
});
ui.detailDrawerCloseButton.addEventListener("click", closeRegistrationDrawer);
ui.detailDrawerBackdrop.addEventListener("click", closeRegistrationDrawer);
ui.drawerNoteInput.addEventListener("input", () => setDrawerNoteState("Belum disimpan", "dirty"));
ui.drawerNoteInput.addEventListener("keydown", async (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    await saveSelectedRegistrationNote();
  }
});
ui.drawerNoteSaveButton.addEventListener("click", saveSelectedRegistrationNote);
ui.drawerApproveButton.addEventListener("click", () => updateSelectedRegistrationStatus("approve"));
ui.drawerRejectButton.addEventListener("click", () => updateSelectedRegistrationStatus("reject"));
ui.drawerSuspendButton.addEventListener("click", () => updateSelectedRegistrationStatus("suspend"));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !ui.detailDrawer.classList.contains("hidden")) {
    closeRegistrationDrawer();
  }
});

setDrawerActionAvailability(null);
setActiveTab(activeTab);
loadMasterDataInfo();
loadRegistrations();
loadSubmissions();

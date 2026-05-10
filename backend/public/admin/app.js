const ui = {
  tableBody: document.getElementById("tableBody"),
  tableScroll: document.getElementById("tableScroll"),
  emptyState: document.getElementById("emptyState"),
  errorBanner: document.getElementById("errorBanner"),
  detailToolbar: document.getElementById("detailToolbar"),
  summaryText: document.getElementById("summaryText"),
  exportButton: document.getElementById("exportButton"),
  statusFilter: document.getElementById("statusFilter"),
  areaKerjaFilter: document.getElementById("areaKerjaFilter"),
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
  uploadSummaryCharts: document.getElementById("uploadSummaryCharts"),
  uploadSummaryScroll: document.getElementById("uploadSummaryScroll"),
  uploadSummaryBody: document.getElementById("uploadSummaryBody"),
  uploadSummaryEmptyState: document.getElementById("uploadSummaryEmptyState"),
  uploadBreakdownToolbar: document.getElementById("uploadBreakdownToolbar"),
  breakdownKabupatenFilter: document.getElementById("breakdownKabupatenFilter"),
  breakdownStatusFilter: document.getElementById("breakdownStatusFilter"),
  breakdownSearchInput: document.getElementById("breakdownSearchInput"),
  breakdownExportButton: document.getElementById("breakdownExportButton"),
  breakdownSummaryText: document.getElementById("breakdownSummaryText"),
  uploadBreakdownPanel: document.getElementById("uploadBreakdownPanel"),
  uploadBreakdownScroll: document.getElementById("uploadBreakdownScroll"),
  uploadBreakdownHead: document.getElementById("uploadBreakdownHead"),
  uploadBreakdownBody: document.getElementById("uploadBreakdownBody"),
  uploadBreakdownEmptyState: document.getElementById("uploadBreakdownEmptyState"),
  uploadRawToolbar: document.getElementById("uploadRawToolbar"),
  rawKabupatenFilter: document.getElementById("rawKabupatenFilter"),
  rawStatusFilter: document.getElementById("rawStatusFilter"),
  rawSearchInput: document.getElementById("rawSearchInput"),
  rawExportButton: document.getElementById("rawExportButton"),
  uploadRawPanel: document.getElementById("uploadRawPanel"),
  uploadTableScroll: document.getElementById("uploadTableScroll"),
  uploadTableHead: document.getElementById("uploadTableHead"),
  uploadTableBody: document.getElementById("uploadTableBody"),
  uploadEmptyState: document.getElementById("uploadEmptyState"),
  masterPanel: document.getElementById("masterPanel"),
  masterFileInput: document.getElementById("masterFileInput"),
  masterUploadButton: document.getElementById("masterUploadButton"),
  masterRefreshButton: document.getElementById("masterRefreshButton"),
  masterDriveCheckButton: document.getElementById("masterDriveCheckButton"),
  masterMigrateRegistrationsButton: document.getElementById("masterMigrateRegistrationsButton"),
  masterAuditRegistrationsButton: document.getElementById("masterAuditRegistrationsButton"),
  masterUploadStatus: document.getElementById("masterUploadStatus"),
  masterDataInfo: document.getElementById("masterDataInfo"),
  masterColumnsValue: document.getElementById("masterColumnsValue"),
  masterRowsValue: document.getElementById("masterRowsValue"),
  masterUpdatedValue: document.getElementById("masterUpdatedValue"),
  rowTemplate: document.getElementById("rowTemplate"),
  heroViewName: document.getElementById("heroViewName"),
  heroLastSync: document.getElementById("heroLastSync"),
  logoutButton: document.getElementById("logoutButton"),
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
  previewStageTitle: document.getElementById("previewStageTitle"),
  previewStageMeta: document.getElementById("previewStageMeta"),
  previewStageAssets: document.getElementById("previewStageAssets"),
  drawerEyebrow: document.getElementById("drawerEyebrow"),
  drawerTitle: document.getElementById("drawerTitle"),
  drawerMeta: document.getElementById("drawerMeta"),
  drawerStatusPill: document.getElementById("drawerStatusPill"),
  drawerPrimaryLabel: document.getElementById("drawerPrimaryLabel"),
  drawerUpdatedAt: document.getElementById("drawerUpdatedAt"),
  drawerFieldsHeading: document.getElementById("drawerFieldsHeading"),
  drawerFields: document.getElementById("drawerFields"),
  drawerNoteInput: document.getElementById("drawerNoteInput"),
  drawerNoteSaveButton: document.getElementById("drawerNoteSaveButton"),
  drawerNoteStatus: document.getElementById("drawerNoteStatus"),
  drawerApproveButton: document.getElementById("drawerApproveButton"),
  drawerRejectButton: document.getElementById("drawerRejectButton"),
  drawerSuspendButton: document.getElementById("drawerSuspendButton"),
  drawerDeleteButton: document.getElementById("drawerDeleteButton"),
};

const statusFilterField = ui.statusFilter.closest(".toolbar__field");
const areaKerjaFilterField = ui.areaKerjaFilter.closest(".toolbar__field");
const registrationSearchField = ui.registrationSearchInput.closest(".toolbar__field");

let currentItems = [];
let visibleRegistrationItems = [];
let summaryItems = [];
let registrationAreaNeeds = {};
let uploadItems = [];
let visibleUploadItems = [];
let breakdownRows = [];
let activeTab = "summary-registrations";
let currentMasterData = null;
let selectedDrawerRecordId = null;
let selectedDrawerType = "";
let lastSyncAt = "";

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
  });

  if (response.status === 401) {
    window.location.href = `/login?next=${encodeURIComponent("/admin")}`;
    throw new Error("Sesi admin berakhir.");
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { error: await response.text() };

  return { response, payload };
}

async function loadRegistrations() {
  setLoading(true);
  hideError();

  try {
    const query = ui.statusFilter.value ? `?status=${encodeURIComponent(ui.statusFilter.value)}` : "";
    const [
      { response, payload },
      { response: summaryResponse, payload: summaryPayload },
    ] = await Promise.all([
      fetchJson(`/api/admin/registrations${query}`),
      fetchJson("/api/admin/registrations"),
    ]);

    if (!response.ok) {
      throw new Error(payload.error || "Gagal memuat data registrasi.");
    }

    if (!summaryResponse.ok) {
      throw new Error(summaryPayload.error || "Gagal memuat data ringkasan.");
    }

    currentItems = Array.isArray(payload.items) ? payload.items : [];
    summaryItems = Array.isArray(summaryPayload.items) ? summaryPayload.items : [];
    registrationAreaNeeds = normalizeRegistrationAreaNeedsMap(
      summaryPayload.registrationAreaNeeds || payload.registrationAreaNeeds,
    );

    populateAreaKerjaFilterOptions(summaryItems);
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
    registrationAreaNeeds = {};
    populateAreaKerjaFilterOptions([]);
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
    const { response, payload } = await fetchJson("/api/admin/submissions");

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
    const { response, payload } = await fetchJson("/api/master-data/schools");

    if (!response.ok) {
      throw new Error(payload.error || "Gagal memuat master data sekolah.");
    }

    currentMasterData = payload;
    renderMasterDataInfo(payload);
    renderSummary(summaryItems);
    renderSubmissionSummary(uploadItems);
    renderSubmissionRows(uploadItems);
    refreshSubmissionBreakdown();
    refreshToolbarSummary();
    updateDashboardMetrics();
    touchLastSync();
  } catch (error) {
    currentMasterData = null;
    renderMasterDataInfo(null, error.message || "Belum bisa memuat info master data.");
    renderSummary(summaryItems);
    renderSubmissionSummary(uploadItems);
    renderSubmissionRows(uploadItems);
    refreshSubmissionBreakdown();
    refreshToolbarSummary();
    updateDashboardMetrics();
    showError(error.message || "Belum bisa memuat info master data.");
  }
}

function formatGoogleDriveCheckMessage(payload) {
  const serviceAccount = payload?.serviceAccountEmail || "-";
  const registration = payload?.registration || {};
  const submission = payload?.submission || {};

  const describe = (label, result) => {
    if (result?.ok) {
      const folderName = result.folderName || result.folderId || "-";
      if (result.warning) {
        return `${label}: OK di ${folderName}, tetapi ${result.warning.toLowerCase()}`;
      }
      return `${label}: OK di ${folderName}`;
    }

    return `${label}: ${result?.error || "gagal dicek"}`;
  };

  return [
    `Service account: ${serviceAccount}.`,
    describe("Registration", registration),
    describe("Submission", submission),
  ].join(" | ");
}

async function runGoogleDriveCheck() {
  hideError();
  setMasterUploadState("Mengecek akses Google Drive...", "saving");
  ui.masterDriveCheckButton.disabled = true;

  try {
    const { response, payload } = await fetchJson("/api/admin/google-drive/check");
    const message = formatGoogleDriveCheckMessage(payload);

    if (!response.ok || !payload?.ok) {
      setMasterUploadState(message, "error");
      showError(message);
      return;
    }

    setMasterUploadState(message, "saved");
  } catch (error) {
    const message = error.message || "Belum bisa mengecek Google Drive.";
    setMasterUploadState(message, "error");
    showError(message);
  } finally {
    ui.masterDriveCheckButton.disabled = false;
  }
}

function formatRegistrationMigrationMessage(payload) {
  const summary = payload?.summary || {};
  const scannedRegistrations = Number(summary.scannedRegistrations) || 0;
  const migratedRegistrations = Number(summary.migratedRegistrations) || 0;
  const migratedAssets = Number(summary.migratedAssets) || 0;
  const plannedAssets = Number(summary.plannedAssets) || 0;
  const alreadyGoogleDriveAssets = Number(summary.alreadyGoogleDriveAssets) || 0;
  const missingLocalFiles = Number(summary.missingLocalFiles) || 0;
  const unsupportedAssets = Number(summary.unsupportedAssets) || 0;
  const errors = Number(summary.errors) || 0;

  if (summary.dryRun) {
    return [
      `Dry run selesai: ${scannedRegistrations} registrasi diperiksa.`,
      `${plannedAssets} asset siap dimigrasikan.`,
      `${alreadyGoogleDriveAssets} asset sudah di Google Drive.`,
      `${missingLocalFiles} file lokal hilang.`,
      `${unsupportedAssets} URL tidak didukung.`,
      `${errors} error.`,
    ].join(" ");
  }

  return [
    `Migrasi selesai: ${migratedRegistrations} registrasi diperbarui.`,
    `${migratedAssets} asset berhasil dipindahkan ke Google Drive.`,
    `${missingLocalFiles} file lokal hilang.`,
    `${unsupportedAssets} URL tidak didukung.`,
    `${errors} error.`,
  ].join(" ");
}

async function requestRegistrationMigration(body) {
  return fetchJson("/api/admin/google-drive/migrate-registrations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function runRegistrationMigration() {
  hideError();
  setMasterUploadState("Menyiapkan pengecekan migrasi registrasi lama...", "saving");
  ui.masterMigrateRegistrationsButton.disabled = true;
  ui.masterDriveCheckButton.disabled = true;

  try {
    const { response: dryRunResponse, payload: dryRunPayload } = await requestRegistrationMigration({
      dryRun: true,
    });
    const dryRunMessage = formatRegistrationMigrationMessage(dryRunPayload);

    if (!dryRunResponse.ok || !dryRunPayload?.ok) {
      throw new Error(dryRunPayload?.details || dryRunPayload?.error || dryRunMessage);
    }

    const plannedAssets = Number(dryRunPayload?.summary?.plannedAssets) || 0;
    if (!plannedAssets) {
      setMasterUploadState(dryRunMessage, "saved");
      return;
    }

    const confirmed = window.confirm(
      `${dryRunMessage}\n\nLanjut migrasi sekarang? File lokal lama tidak akan dihapus otomatis.`,
    );
    if (!confirmed) {
      setMasterUploadState("Dry run selesai. Migrasi dibatalkan oleh admin.", "dirty");
      return;
    }

    setMasterUploadState("Mengupload asset registrasi lama ke Google Drive...", "saving");
    const { response, payload } = await requestRegistrationMigration({
      dryRun: false,
    });
    const message = formatRegistrationMigrationMessage(payload);

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.details || payload?.error || message);
    }

    setMasterUploadState(message, "saved");
    await loadRegistrations();
  } catch (error) {
    const message = error.message || "Migrasi registrasi lama belum berhasil dijalankan.";
    setMasterUploadState(message, "error");
    showError(message);
  } finally {
    ui.masterMigrateRegistrationsButton.disabled = false;
    ui.masterDriveCheckButton.disabled = false;
  }
}

function formatRegistrationAuditMessage(payload) {
  const summary = payload?.summary || {};
  const advice = payload?.advice || "";
  const registrationsFullyOnGoogleDrive = Number(summary.registrationsFullyOnGoogleDrive) || 0;
  const totalRegistrations = Number(summary.totalRegistrations) || 0;
  const localRegistrationAssets = Number(summary.localRegistrationAssets) || 0;
  const localOtherAssets = Number(summary.localOtherAssets) || 0;
  const unsupportedAssets = Number(summary.unsupportedAssets) || 0;
  const staleLocalFilesOnDisk = Number(summary.staleLocalFilesOnDisk) || 0;

  return [
    `Audit selesai: ${registrationsFullyOnGoogleDrive}/${totalRegistrations} registrasi sudah full Google Drive.`,
    `${localRegistrationAssets} asset registrasi masih menunjuk file lokal.`,
    `${localOtherAssets + unsupportedAssets} asset perlu dicek manual.`,
    `${staleLocalFilesOnDisk} file lokal registrasi tidak lagi direferensikan.`,
    advice,
  ].join(" ");
}

async function runRegistrationAudit() {
  hideError();
  setMasterUploadState("Mengaudit status registrasi Google Drive...", "saving");
  ui.masterAuditRegistrationsButton.disabled = true;
  ui.masterDriveCheckButton.disabled = true;
  ui.masterMigrateRegistrationsButton.disabled = true;

  try {
    const { response, payload } = await fetchJson("/api/admin/google-drive/audit-registrations");
    const message = formatRegistrationAuditMessage(payload);

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.details || payload?.error || message);
    }

    const state = payload?.summary?.safeToDeleteLocalRegistrationFiles ? "saved" : "dirty";
    setMasterUploadState(message, state);
  } catch (error) {
    const message = error.message || "Audit registrasi Google Drive belum berhasil dijalankan.";
    setMasterUploadState(message, "error");
    showError(message);
  } finally {
    ui.masterAuditRegistrationsButton.disabled = false;
    ui.masterDriveCheckButton.disabled = false;
    ui.masterMigrateRegistrationsButton.disabled = false;
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
    const phone = fragment.querySelector(".row-phone");
    const notePreview = fragment.querySelector(".row-note-preview");
    const created = fragment.querySelector(".row-created");
    const updated = fragment.querySelector(".row-updated");
    const viewButton = fragment.querySelector(".row-view-button");

    statusPill.textContent = item.status || "-";
    statusPill.dataset.status = item.status || "";
    name.textContent = item.nama || item.displayName || "Tanpa nama";
    meta.textContent = item.gmail || "-";
    area.textContent = item.areaKerja || item.kabupaten || "Belum diisi";
    phone.textContent = item.noHp || "-";
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
  const { rows, totals } = buildAreaSummary(items);

  if (!rows.length) {
    ui.summaryScroll.classList.add("hidden");
    ui.summaryEmptyState.classList.remove("hidden");
    return;
  }

  ui.summaryScroll.classList.remove("hidden");
  ui.summaryEmptyState.classList.add("hidden");

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.appendChild(createTextCell(row.areaKerja, "cell-wrap cell-strong"));
    tr.appendChild(createRegistrationNeedCell(row));
    tr.appendChild(createTextCell(row.approved, "cell-nowrap cell-center"));
    tr.appendChild(createTextCell(row.pending, "cell-nowrap cell-center"));
    tr.appendChild(createTextCell(row.rejected, "cell-nowrap cell-center"));
    tr.appendChild(createTextCell(row.suspended, "cell-nowrap cell-center"));
    tr.appendChild(createTextCell(row.total, "cell-nowrap cell-center cell-strong"));
    ui.summaryBody.appendChild(tr);
  });

  const totalRow = document.createElement("tr");
  totalRow.className = "summary-total-row";
  totalRow.appendChild(createTextCell("Total", "cell-wrap cell-strong"));
  totalRow.appendChild(createTextCell(totals.requiredCount, "cell-nowrap cell-center cell-strong"));
  totalRow.appendChild(createTextCell(totals.approved, "cell-nowrap cell-center cell-strong"));
  totalRow.appendChild(createTextCell(totals.pending, "cell-nowrap cell-center cell-strong"));
  totalRow.appendChild(createTextCell(totals.rejected, "cell-nowrap cell-center cell-strong"));
  totalRow.appendChild(createTextCell(totals.suspended, "cell-nowrap cell-center cell-strong"));
  totalRow.appendChild(createTextCell(totals.total, "cell-nowrap cell-center cell-strong"));
  ui.summaryBody.appendChild(totalRow);
}

function populateAreaKerjaFilterOptions(items) {
  const selectedValue = ui.areaKerjaFilter.value;
  const areaOptions = [...new Set(
    items
      .map((item) => getRegistrationAreaLabel(item))
      .filter(Boolean),
  )].sort((left, right) => left.localeCompare(right, "id-ID"));

  ui.areaKerjaFilter.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Semua Area";
  ui.areaKerjaFilter.appendChild(defaultOption);

  areaOptions.forEach((area) => {
    const option = document.createElement("option");
    option.value = area;
    option.textContent = area;
    ui.areaKerjaFilter.appendChild(option);
  });

  ui.areaKerjaFilter.value = areaOptions.includes(selectedValue) ? selectedValue : "";
}

const SUBMISSION_REVIEW_SUMMARY_META = [
  { key: "APPROVED", label: "Approved", color: "#1f7a52" },
  { key: "PENDING", label: "Pending", color: "#dd8c1f" },
  { key: "SUSPENDED", label: "Suspended", color: "#475569" },
  { key: "REJECTED", label: "Rejected", color: "#bb3f34" },
];

function createEmptySubmissionReviewCounts() {
  return SUBMISSION_REVIEW_SUMMARY_META.reduce((result, item) => {
    result[item.key] = 0;
    return result;
  }, {});
}

function getSubmissionReviewStatus(item) {
  const normalized = String(item?.reviewStatus || "").trim().toUpperCase();
  return normalized || "PENDING";
}

function getSubmissionAdminNote(item) {
  return String(item?.adminNote || item?.rejectionReason || "").trim();
}

const RAW_UPLOAD_HIDDEN_LOCATION_COLUMNS = new Set(["kecamatan", "kelurahan"]);

function normalizeRawUploadColumnName(value) {
  return String(value || "").trim().toLowerCase();
}

function getSubmissionKabupaten(item) {
  const parsed = parseSubmissionAnswers(item);
  const { kabupatenColumn } = getMasterColumnHints();
  const locationEntries = Object.entries(parsed.selectedLocation);
  const matchedKabupaten = String(
    parsed.selectedLocation[kabupatenColumn]
      || locationEntries.find(([column]) => /kab/i.test(column))?.[1]
      || "",
  ).trim();
  return matchedKabupaten || "Belum diisi";
}

function populateRawUploadKabupatenOptions(items) {
  const currentValue = ui.rawKabupatenFilter.value;
  const kabupatenValues = Array.from(new Set(
    items.map((item) => getSubmissionKabupaten(item)).filter(Boolean),
  )).sort((left, right) => left.localeCompare(right, "id"));

  ui.rawKabupatenFilter.innerHTML = [
    '<option value="">Semua Kabupaten</option>',
    ...kabupatenValues.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`),
  ].join("");

  ui.rawKabupatenFilter.value = kabupatenValues.includes(currentValue) ? currentValue : "";
}

function filterSubmissionRawItems(items) {
  const selectedKabupaten = ui.rawKabupatenFilter.value.trim();
  const selectedStatus = ui.rawStatusFilter.value.trim().toUpperCase();
  const searchTerm = normalizeSearchValue(ui.rawSearchInput.value);

  return items.filter((item) => {
    const parsed = parseSubmissionAnswers(item);
    const identity = resolveSubmissionIdentity(item);
    const kabupaten = getSubmissionKabupaten(item);
    const reviewStatus = getSubmissionReviewStatus(item);
    const noteValue = getSubmissionAdminNote(item);

    if (selectedKabupaten && kabupaten !== selectedKabupaten) {
      return false;
    }

    if (selectedStatus && reviewStatus !== selectedStatus) {
      return false;
    }

    if (!searchTerm) {
      return true;
    }

    const haystack = normalizeSearchValue([
      item.submissionId,
      item.uid,
      identity.gmail,
      identity.nama,
      item.projectName,
      item.formName,
      reviewStatus,
      noteValue,
      kabupaten,
      ...Object.values(parsed.selectedLocation),
      parsed.gpsRecord.address,
    ].join(" "));

    return haystack.includes(searchTerm);
  });
}

function renderSubmissionRows(items) {
  ui.uploadTableHead.innerHTML = "";
  ui.uploadTableBody.innerHTML = "";
  populateRawUploadKabupatenOptions(items);
  visibleUploadItems = [];

  if (!items.length) {
    ui.uploadTableScroll.classList.add("hidden");
    ui.uploadEmptyState.classList.remove("hidden");
    ui.uploadEmptyState.textContent = "Belum ada raw data upload yang masuk.";
    updateExportButtonState();
    return;
  }

  const filteredItems = filterSubmissionRawItems(items);
  if (!filteredItems.length) {
    ui.uploadTableScroll.classList.add("hidden");
    ui.uploadEmptyState.classList.remove("hidden");
    ui.uploadEmptyState.textContent = "Tidak ada raw upload yang cocok dengan filter atau pencarian.";
    updateExportButtonState();
    return;
  }

  ui.uploadTableScroll.classList.remove("hidden");
  ui.uploadEmptyState.classList.add("hidden");

  const orderedItems = getSubmissionRawItems(filteredItems);
  visibleUploadItems = orderedItems;
  const locationColumns = getSubmissionLocationColumns(orderedItems);
  const visibleLocationColumns = locationColumns.filter(
    (column) => !RAW_UPLOAD_HIDDEN_LOCATION_COLUMNS.has(normalizeRawUploadColumnName(column)),
  );
  const headerColumns = [
    "No.",
    "Submission ID",
    "Nama",
    "Status",
    "Note",
    ...visibleLocationColumns,
    "Tanggal Disimpan",
    "Tanggal Upload",
    "Aksi",
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
    cells.push(createTextCell(identity.nama, "cell-wrap"));
    cells.push(createStatusCell(getSubmissionReviewStatus(item)));
    cells.push(createTextCell(getSubmissionAdminNote(item), "cell-wrap"));

    visibleLocationColumns.forEach((column) => {
      cells.push(createTextCell(parsed.selectedLocation[column], "cell-wrap"));
    });

    cells.push(createTextCell(formatDate(item.createdAt), "cell-nowrap"));
    cells.push(createTextCell(formatDate(item.uploadedAt), "cell-nowrap"));

    const reviewCell = document.createElement("td");
    const actionStack = document.createElement("div");
    actionStack.className = "row-action-stack";

    const reviewButton = document.createElement("button");
    reviewButton.type = "button";
    reviewButton.className = "button button--secondary button--small";
    reviewButton.textContent = "Review";
    reviewButton.addEventListener("click", () => openSubmissionDrawer(item));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button button--reject button--small";
    deleteButton.textContent = "Hapus";
    deleteButton.addEventListener("click", async () => {
      reviewButton.disabled = true;
      deleteButton.disabled = true;
      const deleted = await deleteSubmissionRecord(item);
      if (!deleted) {
        reviewButton.disabled = false;
        deleteButton.disabled = false;
      }
    });

    actionStack.appendChild(reviewButton);
    actionStack.appendChild(deleteButton);
    reviewCell.appendChild(actionStack);
    cells.push(reviewCell);

    cells.forEach((cell) => tr.appendChild(cell));
    ui.uploadTableBody.appendChild(tr);
  });

  updateExportButtonState();
}

function renderSubmissionSummary(items) {
  ui.uploadSummaryBody.innerHTML = "";
  const summary = buildSubmissionSummary(items);
  const { rows, totals } = summary;

  if (!rows.length) {
    ui.uploadSummaryCharts.classList.add("hidden");
    ui.uploadSummaryCharts.innerHTML = "";
    ui.uploadSummaryScroll.classList.add("hidden");
    ui.uploadSummaryEmptyState.classList.remove("hidden");
    return;
  }

  renderUploadSummaryCharts(summary);
  ui.uploadSummaryCharts.classList.remove("hidden");
  ui.uploadSummaryScroll.classList.remove("hidden");
  ui.uploadSummaryEmptyState.classList.add("hidden");

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="cell-wrap cell-strong">${escapeHtml(row.kabupaten)}</td>
      <td class="cell-nowrap cell-center">${row.target}</td>
      <td class="cell-nowrap cell-center">${row.achv}</td>
      <td class="cell-nowrap cell-center">${row.toBeAchv}</td>
      <td class="cell-nowrap cell-center upload-summary-divider-left">${row.approved}</td>
      <td class="cell-nowrap cell-center">${row.pending}</td>
      <td class="cell-nowrap cell-center">${row.suspended}</td>
      <td class="cell-nowrap cell-center">${row.rejected}</td>
    `;
    ui.uploadSummaryBody.appendChild(tr);
  });

  const totalRow = document.createElement("tr");
  totalRow.className = "summary-total-row";
  totalRow.innerHTML = `
    <td class="cell-wrap cell-strong">Total</td>
    <td class="cell-nowrap cell-center cell-strong">${totals.target}</td>
    <td class="cell-nowrap cell-center cell-strong">${totals.achv}</td>
    <td class="cell-nowrap cell-center cell-strong">${totals.toBeAchv}</td>
    <td class="cell-nowrap cell-center cell-strong upload-summary-divider-left">${totals.approved}</td>
    <td class="cell-nowrap cell-center cell-strong">${totals.pending}</td>
    <td class="cell-nowrap cell-center cell-strong">${totals.suspended}</td>
    <td class="cell-nowrap cell-center cell-strong">${totals.rejected}</td>
  `;
  ui.uploadSummaryBody.appendChild(totalRow);
}

function renderUploadSummaryCharts(summary) {
  const incomingSegments = [
    { label: "Achv", value: summary.totals.achv, color: "#1f7a52" },
    { label: "To be Achv", value: summary.totals.toBeAchv, color: "#dd8c1f" },
  ];
  const reviewSegments = SUBMISSION_REVIEW_SUMMARY_META.map((item) => ({
    label: item.label,
    value: summary.totals[item.key.toLowerCase()] || 0,
    color: item.color,
  }));

  ui.uploadSummaryCharts.innerHTML = "";
  ui.uploadSummaryCharts.appendChild(
    createUploadSummaryPieCard({
      eyebrow: "Data Masuk",
      title: "Achv vs To be Achv",
      centerValue: summary.totals.achv,
      centerLabel: "sekolah tercapai",
      segments: incomingSegments,
    }),
  );
  ui.uploadSummaryCharts.appendChild(
    createUploadSummaryPieCard({
      eyebrow: "Status Review Data",
      title: "Distribusi review upload",
      centerValue: reviewSegments.reduce((total, item) => total + item.value, 0),
      centerLabel: "total data upload",
      segments: reviewSegments,
    }),
  );
}

function createUploadSummaryPieCard({ eyebrow, title, centerValue, centerLabel, segments }) {
  const total = segments.reduce((result, item) => result + (Number(item.value) || 0), 0);
  const card = document.createElement("article");
  card.className = "upload-summary-card";

  const header = document.createElement("div");
  header.className = "upload-summary-card__header";
  header.innerHTML = `
    <p class="upload-summary-card__eyebrow">${escapeHtml(eyebrow)}</p>
    <h3>${escapeHtml(title)}</h3>
  `;

  const body = document.createElement("div");
  body.className = "upload-summary-card__body";

  const visual = document.createElement("div");
  visual.className = "upload-summary-pie";
  if (!total) {
    visual.dataset.empty = "true";
  } else {
    visual.style.setProperty("--pie-gradient", buildUploadSummaryPieGradient(segments));
  }

  const center = document.createElement("div");
  center.className = "upload-summary-pie__center";
  center.innerHTML = `
    <strong>${escapeHtml(formatCompactNumber(centerValue))}</strong>
    <span>${escapeHtml(centerLabel)}</span>
  `;
  visual.appendChild(center);

  const legend = document.createElement("ul");
  legend.className = "upload-summary-legend";
  segments.forEach((segment) => {
    const item = document.createElement("li");
    const percentage = total ? Math.round((segment.value / total) * 100) : 0;
    item.innerHTML = `
      <span class="upload-summary-legend__swatch" style="--legend-color: ${segment.color}"></span>
      <span class="upload-summary-legend__label">
        <strong>${escapeHtml(segment.label)}</strong>
        <small>${percentage}%</small>
      </span>
      <span class="upload-summary-legend__value">${escapeHtml(formatCompactNumber(segment.value))}</span>
    `;
    legend.appendChild(item);
  });

  body.appendChild(visual);
  body.appendChild(legend);
  card.appendChild(header);
  card.appendChild(body);
  return card;
}

function buildUploadSummaryPieGradient(segments) {
  const total = segments.reduce((result, item) => result + (Number(item.value) || 0), 0);
  if (!total) {
    return "conic-gradient(rgba(95, 111, 130, 0.18) 0deg 360deg)";
  }

  let cursor = 0;
  return `conic-gradient(${segments
    .filter((item) => item.value > 0)
    .map((item) => {
      const start = (cursor / total) * 360;
      cursor += item.value;
      const end = (cursor / total) * 360;
      return `${item.color} ${start}deg ${end}deg`;
    })
    .join(", ")})`;
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
    updateExportButtonState();
    return;
  }

  ui.uploadBreakdownScroll.classList.remove("hidden");
  ui.uploadBreakdownEmptyState.classList.add("hidden");

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
  const item = findSelectedDrawerItem();
  if (!item) return;

  const adminNote = ui.drawerNoteInput.value.trim();
  setDrawerNoteState("Menyimpan...", "saving");
  ui.drawerNoteSaveButton.disabled = true;

  try {
    const recordId = selectedDrawerType === "submission" ? item.submissionId : item.registrationId;
    const endpoint = selectedDrawerType === "submission"
      ? `/api/admin/submissions/${encodeURIComponent(recordId)}/note`
      : `/api/admin/registrations/${recordId}/note`;
    const { response, payload } = await fetchJson(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminNote }),
    });
    if (!response.ok) {
      throw new Error(payload.error || "Gagal menyimpan catatan.");
    }

    if (selectedDrawerType === "submission") {
      mergeSubmissionRecord({
        submissionId: item.submissionId,
        reviewStatus: payload.reviewStatus || getSubmissionReviewStatus(item),
        adminNote: payload.adminNote || "",
        rejectionReason: payload.rejectionReason || item.rejectionReason || "",
        updatedAt: payload.updatedAt || item.updatedAt,
      });
      renderSubmissionRows(uploadItems);
    } else {
      mergeRegistrationRecord({
        registrationId: item.registrationId,
        adminNote: payload.adminNote || "",
        rejectionReason: payload.rejectionReason || item.rejectionReason || "",
        updatedAt: payload.updatedAt || item.updatedAt,
      });
      renderRows();
    }

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
  const item = findSelectedDrawerItem();
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
    const recordId = selectedDrawerType === "submission" ? item.submissionId : item.registrationId;
    const endpoint = selectedDrawerType === "submission"
      ? `/api/admin/submissions/${encodeURIComponent(recordId)}/${action}`
      : `/api/admin/registrations/${recordId}/${action}`;
    const { response, payload } = await fetchJson(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminNote }),
    });
    if (!response.ok) {
      throw new Error(payload.error || "Gagal memperbarui status.");
    }

    if (selectedDrawerType === "submission") {
      mergeSubmissionRecord({
        submissionId: item.submissionId,
        reviewStatus: payload.reviewStatus || getSubmissionReviewStatus(item),
        adminNote: payload.adminNote || "",
        rejectionReason: payload.rejectionReason || item.rejectionReason || "",
        updatedAt: payload.updatedAt || item.updatedAt,
      });
      renderSubmissionRows(uploadItems);
    } else {
      await loadRegistrations();
    }

    refreshSelectedRegistration("Status berhasil diperbarui.");
    touchLastSync();
  } catch (error) {
    showError(error.message || "Terjadi kesalahan.");
  } finally {
    setDrawerActionLoading(false);
  }
}

async function deleteSubmissionRecord(item) {
  const submissionId = item?.submissionId;
  if (!submissionId) {
    return false;
  }

  const confirmed = window.confirm(
    `Hapus submission ${submissionId}?\n\nData raw upload dan file evidence terkait akan dihapus permanen.`,
  );
  if (!confirmed) {
    return false;
  }

  hideError();
  const isSelectedDrawerItem = selectedDrawerType === "submission" && selectedDrawerRecordId === submissionId;
  if (isSelectedDrawerItem) {
    setDrawerActionLoading(true);
  }

  try {
    const { response, payload } = await fetchJson(`/api/admin/submissions/${encodeURIComponent(submissionId)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(payload.error || payload.details || "Gagal menghapus submission.");
    }

    removeSubmissionRecord(submissionId);
    renderSubmissionRows(uploadItems);
    renderSubmissionSummary(uploadItems);
    refreshSubmissionBreakdown();
    refreshToolbarSummary();
    updateDashboardMetrics();
    touchLastSync();

    if (isSelectedDrawerItem) {
      closeRegistrationDrawer();
    }

    return true;
  } catch (error) {
    showError(error.message || "Gagal menghapus submission.");
    return false;
  } finally {
    if (isSelectedDrawerItem) {
      setDrawerActionLoading(false);
    }
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
    const hasAreaKerjaFilter = Boolean(ui.areaKerjaFilter.value);

    if (!filteredCount) {
      ui.summaryText.textContent = "Belum ada registrasi yang cocok dengan filter status saat ini.";
      return;
    }

    if (hasSearch || hasAreaKerjaFilter) {
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

  ui.summaryText.textContent = "Kelola data master sekolah dari panel ini.";
}

function updateExportButtonState(isLoading = false) {
  const showExportButton = activeTab !== "summary-registrations"
    && activeTab !== "summary-submissions"
    && activeTab !== "breakdown-submissions"
    && activeTab !== "detail-submissions";
  const showBreakdownExportButton = activeTab === "breakdown-submissions";
  const showRawExportButton = activeTab === "detail-submissions";
  ui.exportButton.classList.toggle("hidden", !showExportButton);
  ui.breakdownExportButton.classList.toggle("hidden", !showBreakdownExportButton);
  ui.rawExportButton.classList.toggle("hidden", !showRawExportButton);

  const hasRows = activeTab === "summary-registrations"
    ? summaryItems.length > 0
    : activeTab === "detail-registrations"
      ? visibleRegistrationItems.length > 0
      : activeTab === "summary-submissions"
        ? buildSubmissionSummary(uploadItems).rows.length > 0
        : activeTab === "breakdown-submissions"
          ? filterSubmissionBreakdownRows(breakdownRows).length > 0
          : activeTab === "detail-submissions"
            ? visibleUploadItems.length > 0
            : false;

  if (!showExportButton) {
    ui.exportButton.disabled = true;
  } else {
    ui.exportButton.disabled = isLoading || !hasRows;
  }

  if (!showBreakdownExportButton) {
    ui.breakdownExportButton.disabled = true;
  } else {
    ui.breakdownExportButton.disabled = isLoading || !hasRows;
  }

  if (!showRawExportButton) {
    ui.rawExportButton.disabled = true;
    return;
  }

  ui.rawExportButton.disabled = isLoading || !hasRows;
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

function setDrawerModeCopy(mode) {
  ui.detailDrawer.dataset.mode = mode;
  ui.detailPreviewStage.dataset.mode = mode;

  if (mode === "submission") {
    ui.drawerEyebrow.textContent = "Review Upload";
    ui.drawerFieldsHeading.textContent = "Detail upload";
    ui.previewStageTitle.textContent = "Evidence Lapangan";
    return;
  }

  ui.drawerEyebrow.textContent = "Review Registrasi";
  ui.drawerFieldsHeading.textContent = "Profil teknisi";
  ui.previewStageTitle.textContent = "KTP dan Foto Selfie";
}

function openRegistrationDrawer(item) {
  selectedDrawerType = "registration";
  selectedDrawerRecordId = item.registrationId;
  fillRegistrationDrawer(item);
  ui.detailPreviewStage.classList.remove("hidden");
  ui.detailDrawer.classList.remove("hidden");
  ui.detailDrawerBackdrop.classList.remove("hidden");
  ui.detailPreviewStage.setAttribute("aria-hidden", "false");
  ui.detailDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
}

function openSubmissionDrawer(item) {
  selectedDrawerType = "submission";
  selectedDrawerRecordId = item.submissionId;
  fillSubmissionDrawer(item);
  ui.detailPreviewStage.classList.remove("hidden");
  ui.detailDrawer.classList.remove("hidden");
  ui.detailDrawerBackdrop.classList.remove("hidden");
  ui.detailPreviewStage.setAttribute("aria-hidden", "false");
  ui.detailDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
}

function closeRegistrationDrawer() {
  selectedDrawerRecordId = null;
  selectedDrawerType = "";
  delete ui.detailDrawer.dataset.mode;
  delete ui.detailPreviewStage.dataset.mode;
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
  if (!selectedDrawerRecordId || ui.detailDrawer.classList.contains("hidden")) {
    return;
  }

  const item = findSelectedDrawerItem();
  if (!item) {
    closeRegistrationDrawer();
    return;
  }

  if (selectedDrawerType === "submission") {
    fillSubmissionDrawer(item, successMessage);
    return;
  }

  fillRegistrationDrawer(item, successMessage);
}

function fillRegistrationDrawer(item, successMessage = "") {
  setDrawerModeCopy("registration");
  ui.drawerDeleteButton.classList.add("hidden");
  ui.drawerStatusPill.textContent = item.status || "-";
  ui.drawerStatusPill.dataset.status = item.status || "";
  ui.drawerTitle.textContent = item.nama || item.displayName || "Tanpa nama";
  ui.drawerMeta.textContent = [item.gmail || "-", item.uid || "-", item.areaKerja || item.kabupaten || "Belum diisi"]
    .filter(Boolean)
    .join(" • ");
  ui.drawerMeta.classList.remove("hidden");
  ui.drawerPrimaryLabel.textContent = item.registrationId || "-";
  ui.drawerUpdatedAt.textContent = `Diperbarui ${formatDate(item.updatedAt)}`;
  ui.drawerNoteInput.value = item.adminNote || item.rejectionReason || "";
  renderRegistrationDrawerFields(item);
  renderRegistrationPreviewStage(item);
  setDrawerActionAvailability(item);
  setDrawerNoteState(successMessage, successMessage ? "saved" : "");
}

function fillSubmissionDrawer(item, successMessage = "") {
  const parsed = parseSubmissionAnswers(item);
  const identity = resolveSubmissionIdentity(item);
  const reviewStatus = getSubmissionReviewStatus(item);
  const kabupaten = getSubmissionKabupaten(item);

  setDrawerModeCopy("submission");
  ui.drawerDeleteButton.classList.remove("hidden");
  ui.drawerStatusPill.textContent = reviewStatus;
  ui.drawerStatusPill.dataset.status = reviewStatus;
  ui.drawerTitle.textContent = identity.nama || item.formName || item.submissionId || "Raw upload";
  ui.drawerMeta.textContent = [identity.gmail || "-", item.uid || "-", kabupaten]
    .filter(Boolean)
    .join(" â€¢ ");
  ui.drawerMeta.textContent = "";
  ui.drawerMeta.classList.add("hidden");
  ui.drawerPrimaryLabel.textContent = item.submissionId || "-";
  ui.drawerUpdatedAt.textContent = `Diperbarui ${formatDate(item.updatedAt || item.uploadedAt || item.createdAt)}`;
  ui.drawerNoteInput.value = getSubmissionAdminNote(item);
  renderSubmissionDrawerFields(item, parsed, identity);
  renderSubmissionPreviewStage(item, parsed, identity);
  setDrawerActionAvailability(item);
  setDrawerNoteState(successMessage, successMessage ? "saved" : "");
}

function renderRegistrationDrawerFields(item) {
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

function renderSubmissionDrawerFields(item, parsed = parseSubmissionAnswers(item), identity = resolveSubmissionIdentity(item)) {
  ui.drawerFields.innerHTML = "";

  const gpsSummary = [parsed.gpsRecord.latitude, parsed.gpsRecord.longitude]
    .filter((value) => value !== "" && value !== null && value !== undefined)
    .join(", ");
  const locationSummary = Object.values(parsed.selectedLocation).filter(Boolean).join(", ");
  const fields = [
    ["Submission ID", item.submissionId],
    ["Form", item.formName],
    ["Kabupaten", getSubmissionKabupaten(item)],
    ["Lokasi", locationSummary],
    ["GPS", gpsSummary],
    ["GPS Akurasi", parsed.gpsRecord.accuracyMeters],
    ["GPS Alamat", parsed.gpsRecord.address],
    ["Tanggal Disimpan", formatDate(item.createdAt)],
    ["Tanggal Upload", formatDate(item.uploadedAt)],
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

function renderRegistrationPreviewStage(item) {
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

function renderSubmissionPreviewStage(item, parsed = parseSubmissionAnswers(item), identity = resolveSubmissionIdentity(item)) {
  ui.previewStageMeta.textContent = [
    identity.nama || item.formName || "Raw upload",
    getSubmissionKabupaten(item),
    "Klik gambar untuk membuka ukuran penuh.",
  ].join(" â€¢ ");

  ui.previewStageAssets.innerHTML = "";
  if (!parsed.photoList.length) {
    ui.previewStageAssets.appendChild(
      createPreviewAssetCard("Evidence Lapangan", "", "Belum ada foto evidence tersimpan."),
    );
    return;
  }

  parsed.photoList.forEach((photo, index) => {
    ui.previewStageAssets.appendChild(
      createPreviewAssetCard(photo.title || `Evidence ${index + 1}`, photo.url, photo.filename),
    );
  });
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
  const status = selectedDrawerType === "submission" ? getSubmissionReviewStatus(item) : item?.status || "";
  ui.drawerNoteInput.disabled = !hasSelection;
  ui.drawerNoteSaveButton.disabled = !hasSelection;
  ui.drawerApproveButton.disabled = !hasSelection || status === "APPROVED";
  ui.drawerRejectButton.disabled = !hasSelection || status === "REJECTED";
  ui.drawerSuspendButton.disabled = !hasSelection || status === "SUSPENDED";
  ui.drawerDeleteButton.disabled = !hasSelection || selectedDrawerType !== "submission";
}

function setDrawerActionLoading(isLoading) {
  if (isLoading) {
    ui.drawerNoteInput.disabled = true;
    ui.drawerNoteSaveButton.disabled = true;
    ui.drawerApproveButton.disabled = true;
    ui.drawerRejectButton.disabled = true;
    ui.drawerSuspendButton.disabled = true;
    ui.drawerDeleteButton.disabled = true;
    return;
  }

  const item = findSelectedDrawerItem();
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

function findSubmissionById(submissionId) {
  return uploadItems.find((item) => item.submissionId === submissionId) || null;
}

function findSelectedDrawerItem() {
  if (!selectedDrawerRecordId) {
    return null;
  }

  return selectedDrawerType === "submission"
    ? findSubmissionById(selectedDrawerRecordId)
    : findRegistrationById(selectedDrawerRecordId);
}

function mergeRegistrationRecord(partial) {
  const applyUpdate = (items) => items.map((item) => (
    item.registrationId === partial.registrationId ? { ...item, ...partial } : item
  ));

  currentItems = applyUpdate(currentItems);
  summaryItems = applyUpdate(summaryItems);
}

function mergeSubmissionRecord(partial) {
  uploadItems = uploadItems.map((item) => (
    item.submissionId === partial.submissionId ? { ...item, ...partial } : item
  ));
}

function removeSubmissionRecord(submissionId) {
  uploadItems = uploadItems.filter((item) => item.submissionId !== submissionId);
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
  if (!visibleUploadItems.length) return;

  const orderedItems = getSubmissionRawItems(visibleUploadItems);
  const locationColumns = getSubmissionLocationColumns(orderedItems);
  const photoColumns = getSubmissionPhotoColumns(orderedItems);
  const headerColumns = [
    "No.",
    "Submission ID",
    "UID",
    "Email",
    "Nama",
    "Status",
    "Note",
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
      getSubmissionReviewStatus(item),
      getSubmissionAdminNote(item),
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
      row.requiredCount,
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
              <th>Kebutuhan Teknisi</th>
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
              <td><strong>${totals.requiredCount}</strong></td>
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
    const values = [
      row.kabupaten,
      row.target,
      row.achv,
      row.toBeAchv,
      row.approved,
      row.pending,
      row.suspended,
      row.rejected,
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
              <th>Kabupaten</th>
              <th>Target</th>
              <th>Achv</th>
              <th>To be Achv</th>
              <th>Approved Review</th>
              <th>Pending Review</th>
              <th>Suspended Review</th>
              <th>Rejected Review</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr>
              <td><strong>Total</strong></td>
              <td><strong>${totals.target}</strong></td>
              <td><strong>${totals.achv}</strong></td>
              <td><strong>${totals.toBeAchv}</strong></td>
              <td><strong>${totals.approved}</strong></td>
              <td><strong>${totals.pending}</strong></td>
              <td><strong>${totals.suspended}</strong></td>
              <td><strong>${totals.rejected}</strong></td>
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
    requiredCount: 0,
  };

  getRegistrationSummarySeedAreas().forEach((areaKerja) => {
    areaMap.set(areaKerja, {
      areaKerja,
      pending: 0,
      approved: 0,
      rejected: 0,
      suspended: 0,
      total: 0,
      requiredCount: getRegistrationAreaNeed(areaKerja),
    });
  });

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
        requiredCount: getRegistrationAreaNeed(areaKerja),
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
  rows.forEach((row) => {
    totals.requiredCount += row.requiredCount;
  });
  return { rows, totals };
}

function getRegistrationSummarySeedAreas() {
  const seededAreas = new Set();
  const { kabupatenColumn } = getMasterColumnHints();
  const masterColumns = Array.isArray(currentMasterData?.columns) ? currentMasterData.columns : [];
  const masterRows = Array.isArray(currentMasterData?.rows) ? currentMasterData.rows : [];
  const kabupatenIndex = masterColumns.indexOf(kabupatenColumn);

  if (kabupatenIndex >= 0) {
    masterRows.forEach((row) => {
      const areaKerja = String(row?.[kabupatenIndex] || "").trim();
      if (areaKerja) {
        seededAreas.add(areaKerja);
      }
    });
  }

  Object.keys(registrationAreaNeeds).forEach((areaKerja) => {
    const normalizedArea = String(areaKerja || "").trim();
    if (normalizedArea) {
      seededAreas.add(normalizedArea);
    }
  });

  return Array.from(seededAreas).sort((left, right) => left.localeCompare(right, "id"));
}

function buildSubmissionSummary(items) {
  const { kabupatenColumn, schoolColumn } = getMasterColumnHints();
  const targetMap = new Map();
  const achievementMap = new Map();
  const reviewStatusMap = new Map();

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

    if (!reviewStatusMap.has(kabupaten)) {
      reviewStatusMap.set(kabupaten, createEmptySubmissionReviewCounts());
    }
    const reviewStatus = getSubmissionReviewStatus(item);
    const normalizedReviewStatus = SUBMISSION_REVIEW_SUMMARY_META.some((meta) => meta.key === reviewStatus)
      ? reviewStatus
      : "PENDING";
    const reviewCounts = reviewStatusMap.get(kabupaten);
    reviewCounts[normalizedReviewStatus] = (reviewCounts[normalizedReviewStatus] || 0) + 1;
  });

  const allKabupaten = Array.from(new Set([...targetMap.keys(), ...achievementMap.keys(), ...reviewStatusMap.keys()]))
    .sort((left, right) => left.localeCompare(right, "id"));

  const totals = {
    target: 0,
    achv: 0,
    toBeAchv: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  };

  const rows = allKabupaten.map((kabupaten) => {
    const target = targetMap.get(kabupaten)?.size || 0;
    const achv = achievementMap.get(kabupaten)?.size || 0;
    const toBeAchv = Math.max(target - achv, 0);
    const reviewCounts = reviewStatusMap.get(kabupaten) || createEmptySubmissionReviewCounts();

    totals.target += target;
    totals.achv += achv;
    totals.toBeAchv += toBeAchv;
    totals.pending += reviewCounts.PENDING;
    totals.approved += reviewCounts.APPROVED;
    totals.rejected += reviewCounts.REJECTED;
    totals.suspended += reviewCounts.SUSPENDED;

    return {
      kabupaten,
      target,
      achv,
      toBeAchv,
      pending: reviewCounts.PENDING,
      approved: reviewCounts.APPROVED,
      rejected: reviewCounts.REJECTED,
      suspended: reviewCounts.SUSPENDED,
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

function createRegistrationNeedCell(row) {
  const td = document.createElement("td");
  td.className = "cell-center summary-need-cell";

  const layout = document.createElement("div");
  layout.className = "summary-need-cell__layout";

  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.inputMode = "numeric";
  input.className = "summary-need-input";
  input.value = String(row.requiredCount || 0);
  input.setAttribute("aria-label", `Kebutuhan teknisi untuk ${row.areaKerja}`);

  input.addEventListener("change", () => {
    saveRegistrationAreaNeed(row.areaKerja, input);
  });
  input.addEventListener("blur", () => {
    input.value = String(normalizeNonNegativeInteger(input.value));
  });

  const hint = document.createElement("span");
  const comparison = getRegistrationNeedComparison(row);
  hint.className = `summary-need-hint summary-need-hint--${comparison.tone}`;
  hint.textContent = comparison.label;
  hint.title = comparison.title;
  hint.setAttribute("aria-label", comparison.title);

  layout.appendChild(input);
  layout.appendChild(hint);
  td.appendChild(layout);
  return td;
}

async function saveRegistrationAreaNeed(areaKerja, input) {
  const previousValue = getRegistrationAreaNeed(areaKerja);
  const nextValue = normalizeNonNegativeInteger(input.value);
  input.value = String(nextValue);

  if (nextValue === previousValue) {
    return;
  }

  hideError();
  input.disabled = true;
  input.dataset.state = "saving";

  try {
    const { response, payload } = await fetchJson("/api/admin/registration-area-needs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        areaKerja,
        requiredCount: nextValue,
      }),
    });
    if (!response.ok) {
      throw new Error(payload.error || "Gagal menyimpan kebutuhan teknisi.");
    }

    registrationAreaNeeds = normalizeRegistrationAreaNeedsMap(payload.registrationAreaNeeds);
    renderSummary(summaryItems);
    touchLastSync();
  } catch (error) {
    input.value = String(previousValue);
    showError(error.message || "Gagal menyimpan kebutuhan teknisi.");
  } finally {
    input.disabled = false;
    delete input.dataset.state;
  }
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

function normalizeNonNegativeInteger(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.max(0, Math.trunc(parsed));
}

function normalizeRegistrationAreaNeedsMap(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value).reduce((accumulator, [areaKerja, requiredCount]) => {
    const normalizedArea = String(areaKerja || "").trim();
    if (!normalizedArea) {
      return accumulator;
    }

    accumulator[normalizedArea] = normalizeNonNegativeInteger(requiredCount);
    return accumulator;
  }, {});
}

function getRegistrationAreaNeed(areaKerja) {
  return normalizeNonNegativeInteger(registrationAreaNeeds[areaKerja]);
}

function getRegistrationNeedComparison(row) {
  const requiredCount = normalizeNonNegativeInteger(row?.requiredCount);
  const approvedCount = normalizeNonNegativeInteger(row?.approved);

  if (requiredCount === 0) {
    return {
      tone: "neutral",
      label: "?",
      title: "Kebutuhan teknisi belum diatur",
    };
  }

  if (approvedCount === requiredCount) {
    return {
      tone: "success",
      label: "0",
      title: "Kebutuhan teknisi sudah terpenuhi",
    };
  }

  if (approvedCount > requiredCount) {
    return {
      tone: "success",
      label: `+${approvedCount - requiredCount}`,
      title: `Surplus ${approvedCount - requiredCount} teknisi`,
    };
  }

  return {
    tone: "warning",
    label: `-${requiredCount - approvedCount}`,
    title: `Kurang ${requiredCount - approvedCount} teknisi`,
  };
}

function getVisibleRegistrationItems() {
  const searchTerm = normalizeSearchValue(ui.registrationSearchInput.value);
  const areaKerja = ui.areaKerjaFilter.value;

  return currentItems.filter((item) => {
    const matchesAreaKerja = !areaKerja || getRegistrationAreaLabel(item) === areaKerja;
    if (!matchesAreaKerja) {
      return false;
    }

    if (!searchTerm) {
      return true;
    }

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

function getRegistrationAreaLabel(item) {
  return String(item?.areaKerja || item?.kabupaten || "").trim();
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
      exportLabel: "",
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

  ui.detailToolbar.classList.toggle("hidden", showMasterPanel || showRegistrationSummary || showUploadSummary || showUploadBreakdown || showUploadRaw);
  ui.summaryText.classList.toggle("hidden", showRegistrationDetail || showUploadSummary || showUploadBreakdown || showUploadRaw);
  statusFilterField.classList.toggle("hidden", !showRegistrationDetail);
  areaKerjaFilterField.classList.toggle("hidden", !showRegistrationDetail);
  registrationSearchField.classList.toggle("hidden", !showRegistrationDetail);
  ui.summaryPanel.classList.toggle("hidden", !showRegistrationSummary);
  ui.detailPanel.classList.toggle("hidden", !showRegistrationDetail);
  ui.uploadSummaryPanel.classList.toggle("hidden", !showUploadSummary);
  ui.uploadBreakdownToolbar.classList.toggle("hidden", !showUploadBreakdown);
  ui.uploadBreakdownPanel.classList.toggle("hidden", !showUploadBreakdown);
  ui.uploadRawToolbar.classList.toggle("hidden", !showUploadRaw);
  ui.uploadRawPanel.classList.toggle("hidden", !showUploadRaw);
  ui.masterPanel.classList.toggle("hidden", !showMasterPanel);

  ui.heroViewName.textContent = tabs[tab].label;
  ui.exportButton.textContent = tabs[tab].exportLabel;
  ui.breakdownExportButton.textContent = tabs["breakdown-submissions"].exportLabel;
  ui.rawExportButton.textContent = tabs["detail-submissions"].exportLabel;

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

async function logoutAdmin() {
  ui.logoutButton.disabled = true;

  try {
    await fetchJson("/api/admin/logout", {
      method: "POST",
    });
  } catch {
    // Redirect anyway so the session is cleared from the browser flow.
  } finally {
    window.location.href = "/login";
  }
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
    const { response, payload } = await fetchJson("/api/admin/master-data/schools/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        base64Data,
      }),
    });

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
ui.areaKerjaFilter.addEventListener("change", () => {
  renderRows();
  refreshToolbarSummary();
});
ui.registrationSearchInput.addEventListener("input", () => {
  renderRows();
  refreshToolbarSummary();
});
ui.logoutButton.addEventListener("click", logoutAdmin);
ui.exportButton.addEventListener("click", exportToExcel);
ui.breakdownExportButton.addEventListener("click", exportToExcel);
ui.rawExportButton.addEventListener("click", exportToExcel);
ui.summaryTabButton.addEventListener("click", () => setActiveTab("summary-registrations"));
ui.detailTabButton.addEventListener("click", () => setActiveTab("detail-registrations"));
ui.uploadSummaryTabButton.addEventListener("click", () => setActiveTab("summary-submissions"));
ui.uploadBreakdownTabButton.addEventListener("click", () => setActiveTab("breakdown-submissions"));
ui.uploadRawTabButton.addEventListener("click", () => setActiveTab("detail-submissions"));
ui.masterTabButton.addEventListener("click", () => setActiveTab("master-data"));
ui.breakdownKabupatenFilter.addEventListener("change", () => renderSubmissionBreakdown(breakdownRows));
ui.breakdownStatusFilter.addEventListener("change", () => renderSubmissionBreakdown(breakdownRows));
ui.breakdownSearchInput.addEventListener("input", () => renderSubmissionBreakdown(breakdownRows));
ui.rawKabupatenFilter.addEventListener("change", () => renderSubmissionRows(uploadItems));
ui.rawStatusFilter.addEventListener("change", () => renderSubmissionRows(uploadItems));
ui.rawSearchInput.addEventListener("input", () => renderSubmissionRows(uploadItems));
ui.masterUploadButton.addEventListener("click", uploadMasterDataExcel);
ui.masterRefreshButton.addEventListener("click", loadMasterDataInfo);
ui.masterDriveCheckButton.addEventListener("click", runGoogleDriveCheck);
ui.masterMigrateRegistrationsButton.addEventListener("click", runRegistrationMigration);
ui.masterAuditRegistrationsButton.addEventListener("click", runRegistrationAudit);
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
ui.drawerDeleteButton.addEventListener("click", async () => {
  const item = findSelectedDrawerItem();
  if (!item || selectedDrawerType !== "submission") {
    return;
  }

  await deleteSubmissionRecord(item);
});
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

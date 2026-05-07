const tableBody = document.getElementById("tableBody");
const tableScroll = document.getElementById("tableScroll");
const emptyState = document.getElementById("emptyState");
const errorBanner = document.getElementById("errorBanner");
const detailToolbar = document.getElementById("detailToolbar");
const summaryText = document.getElementById("summaryText");
const exportButton = document.getElementById("exportButton");
const statusFilter = document.getElementById("statusFilter");
const detailTabButton = document.getElementById("detailTabButton");
const summaryTabButton = document.getElementById("summaryTabButton");
const uploadSummaryTabButton = document.getElementById("uploadSummaryTabButton");
const uploadRawTabButton = document.getElementById("uploadRawTabButton");
const detailPanel = document.getElementById("detailPanel");
const summaryPanel = document.getElementById("summaryPanel");
const summaryScroll = document.getElementById("summaryScroll");
const summaryBody = document.getElementById("summaryBody");
const summaryEmptyState = document.getElementById("summaryEmptyState");
const uploadSummaryPanel = document.getElementById("uploadSummaryPanel");
const uploadSummaryScroll = document.getElementById("uploadSummaryScroll");
const uploadSummaryBody = document.getElementById("uploadSummaryBody");
const uploadSummaryEmptyState = document.getElementById("uploadSummaryEmptyState");
const uploadRawPanel = document.getElementById("uploadRawPanel");
const uploadTableScroll = document.getElementById("uploadTableScroll");
const uploadTableBody = document.getElementById("uploadTableBody");
const uploadEmptyState = document.getElementById("uploadEmptyState");
const masterFileInput = document.getElementById("masterFileInput");
const masterUploadButton = document.getElementById("masterUploadButton");
const masterRefreshButton = document.getElementById("masterRefreshButton");
const masterUploadStatus = document.getElementById("masterUploadStatus");
const masterDataInfo = document.getElementById("masterDataInfo");
const template = document.getElementById("rowTemplate");
const uploadTemplate = document.getElementById("uploadRowTemplate");
let currentItems = [];
let summaryItems = [];
let uploadItems = [];
let activeTab = "summary-registrations";
let currentMasterData = null;

async function loadRegistrations() {
  setLoading(true);
  hideError();

  try {
    const query = statusFilter.value ? `?status=${encodeURIComponent(statusFilter.value)}` : "";
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
    renderRows(currentItems);
    renderSummary(summaryItems);
    summaryText.textContent = statusFilter.value
      ? `${payload.count || currentItems.length} data sesuai filter, ${summaryPayload.count || summaryItems.length} total registrasi`
      : `${summaryPayload.count || summaryItems.length} total data registrasi`;
  } catch (error) {
    currentItems = [];
    summaryItems = [];
    renderRows([]);
    renderSummary([]);
    showError(error.message || "Terjadi kesalahan.");
  } finally {
    setLoading(false);
    updateExportButtonState();
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
  } catch (error) {
    uploadItems = [];
    renderSubmissionRows([]);
    renderSubmissionSummary([]);
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
    const columns = Array.isArray(payload.columns) ? payload.columns : [];
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    masterDataInfo.textContent = [
      `Dataset: ${payload.title || "Master Lokasi Sekolah"}`,
      `Kolom: ${columns.length ? columns.join(" -> ") : "-"}`,
      `Jumlah baris: ${rows.length}`,
      `Update terakhir: ${formatDate(payload.updatedAt)}`,
    ].join(" | ");
  } catch (error) {
    currentMasterData = null;
    masterDataInfo.textContent = error.message || "Belum bisa memuat info master data.";
    showError(error.message || "Belum bisa memuat info master data.");
  }
}

function renderRows(items) {
  tableBody.innerHTML = "";

  if (!items.length) {
    tableScroll.classList.add("hidden");
    emptyState.classList.remove("hidden");
    return;
  }

  tableScroll.classList.remove("hidden");
  emptyState.classList.add("hidden");

  items.forEach((item) => {
    const fragment = template.content.cloneNode(true);
    const row = fragment.querySelector("tr");
    const statusPill = fragment.querySelector(".status-pill");
    const registrationId = fragment.querySelector(".row-registration-id");
    const uid = fragment.querySelector(".row-uid");
    const gmail = fragment.querySelector(".row-gmail");
    const name = fragment.querySelector(".row-name");
    const nik = fragment.querySelector(".row-nik");
    const alamat = fragment.querySelector(".row-alamat");
    const noHp = fragment.querySelector(".row-nohp");
    const rekening = fragment.querySelector(".row-rekening");
    const bank = fragment.querySelector(".row-bank");
    const pemilik = fragment.querySelector(".row-pemilik");
    const area = fragment.querySelector(".row-area");
    const ktpLink = fragment.querySelector(".row-ktp-link");
    const ktpThumb = fragment.querySelector(".row-ktp-thumb");
    const ktpText = fragment.querySelector(".row-ktp-text");
    const selfieLink = fragment.querySelector(".row-selfie-link");
    const selfieThumb = fragment.querySelector(".row-selfie-thumb");
    const selfieText = fragment.querySelector(".row-selfie-text");
    const created = fragment.querySelector(".row-created");
    const updated = fragment.querySelector(".row-updated");
    const noteInput = fragment.querySelector(".row-note-input");
    const noteSaveButton = fragment.querySelector(".row-note-save");
    const noteStatus = fragment.querySelector(".row-note-status");
    const approveButton = fragment.querySelector(".button--approve");
    const rejectButton = fragment.querySelector(".button--reject");
    const suspendButton = fragment.querySelector(".button--suspend");
    const initialNote = item.adminNote || item.rejectionReason || "";

    statusPill.textContent = item.status || "-";
    statusPill.dataset.status = item.status || "";

    registrationId.textContent = item.registrationId || "-";
    uid.textContent = item.uid || "-";
    gmail.textContent = item.gmail || "-";
    name.textContent = item.nama || item.displayName || "-";
    nik.textContent = item.nik || "-";
    alamat.textContent = item.alamat || "-";
    noHp.textContent = item.noHp || "-";
    rekening.textContent = item.noRekening || "-";
    bank.textContent = item.namaBank || "-";
    pemilik.textContent = item.namaPemilik || "-";
    area.textContent = item.areaKerja || "-";
    applyAssetCell(
      ktpLink,
      ktpThumb,
      ktpText,
      item.ktpDriveFileId,
      item.ktpLocalPath,
      "KTP"
    );
    applyAssetCell(
      selfieLink,
      selfieThumb,
      selfieText,
      item.selfieDriveFileId,
      item.selfieLocalPath,
      "Selfie"
    );
    created.textContent = formatDate(item.createdAt);
    updated.textContent = formatDate(item.updatedAt);
    noteInput.value = initialNote;
    setNoteStatus(noteStatus, "", "");

    approveButton.disabled = item.status === "APPROVED";
    rejectButton.disabled = item.status === "REJECTED";
    suspendButton.disabled = item.status === "SUSPENDED";

    noteInput.addEventListener("input", () => {
      item.adminNote = noteInput.value.trim();
      if (item.status === "REJECTED" || item.status === "SUSPENDED") {
        item.rejectionReason = item.adminNote;
      }
      setNoteStatus(noteStatus, "Belum disimpan", "dirty");
    });

    noteInput.addEventListener("keydown", async (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        await saveNote(item, noteInput, noteStatus, noteSaveButton, updated);
      }
    });

    noteSaveButton.addEventListener("click", async () => {
      await saveNote(item, noteInput, noteStatus, noteSaveButton, updated);
    });

    approveButton.addEventListener("click", () => updateStatus(item.registrationId, "approve", {
      adminNote: noteInput.value.trim(),
    }));
    rejectButton.addEventListener("click", async () => {
      const adminNote = noteInput.value.trim();
      if (!adminNote) {
        showError("Isi kolom catatan terlebih dahulu untuk alasan reject.");
        noteInput.focus();
        return;
      }
      await updateStatus(item.registrationId, "reject", { adminNote });
    });
    suspendButton.addEventListener("click", async () => {
      const adminNote = noteInput.value.trim();
      if (!adminNote) {
        showError("Isi kolom catatan terlebih dahulu untuk alasan suspend.");
        noteInput.focus();
        return;
      }
      await updateStatus(item.registrationId, "suspend", { adminNote });
    });

    row.dataset.status = item.status || "";
    tableBody.appendChild(row);
  });
}

function renderSummary(items) {
  summaryBody.innerHTML = "";

  if (!items.length) {
    summaryScroll.classList.add("hidden");
    summaryEmptyState.classList.remove("hidden");
    return;
  }

  const { rows, totals } = buildAreaSummary(items);
  summaryScroll.classList.remove("hidden");
  summaryEmptyState.classList.add("hidden");

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="cell-wrap cell-strong">${escapeHtml(row.areaKerja)}</td>
      <td class="cell-nowrap">${row.pending}</td>
      <td class="cell-nowrap">${row.approved}</td>
      <td class="cell-nowrap">${row.rejected}</td>
      <td class="cell-nowrap">${row.suspended}</td>
      <td class="cell-nowrap cell-strong">${row.total}</td>
    `;
    summaryBody.appendChild(tr);
  });

  const totalRow = document.createElement("tr");
  totalRow.className = "summary-total-row";
  totalRow.innerHTML = `
    <td class="cell-wrap cell-strong">Total</td>
    <td class="cell-nowrap cell-strong">${totals.pending}</td>
    <td class="cell-nowrap cell-strong">${totals.approved}</td>
    <td class="cell-nowrap cell-strong">${totals.rejected}</td>
    <td class="cell-nowrap cell-strong">${totals.suspended}</td>
    <td class="cell-nowrap cell-strong">${totals.total}</td>
  `;
  summaryBody.appendChild(totalRow);
}

function renderSubmissionRows(items) {
  uploadTableBody.innerHTML = "";

  if (!items.length) {
    uploadTableScroll.classList.add("hidden");
    uploadEmptyState.classList.remove("hidden");
    return;
  }

  uploadTableScroll.classList.remove("hidden");
  uploadEmptyState.classList.add("hidden");

  items.forEach((item) => {
    const fragment = uploadTemplate.content.cloneNode(true);
    const statusPill = fragment.querySelector(".status-pill");
    const submissionId = fragment.querySelector(".row-submission-id");
    const uid = fragment.querySelector(".row-submission-uid");
    const gmail = fragment.querySelector(".row-submission-gmail");
    const project = fragment.querySelector(".row-submission-project");
    const school = fragment.querySelector(".row-submission-school");
    const fileCount = fragment.querySelector(".row-submission-file-count");
    const fileList = fragment.querySelector(".row-submission-files");
    const created = fragment.querySelector(".row-submission-created");
    const uploaded = fragment.querySelector(".row-submission-uploaded");
    const files = Array.isArray(item.files) ? item.files : [];

    statusPill.textContent = item.status || "-";
    statusPill.dataset.status = item.status || "";
    submissionId.textContent = item.submissionId || "-";
    uid.textContent = item.uid || "-";
    gmail.textContent = item.gmail || "-";
    project.textContent = item.projectName || "-";
    school.textContent = item.formName || "-";
    fileCount.textContent = String(files.length);
    created.textContent = formatDate(item.createdAt);
    uploaded.textContent = formatDate(item.uploadedAt);

    if (!files.length) {
      fileList.textContent = "-";
    } else {
      const wrapper = document.createElement("div");
      wrapper.className = "submission-files";
      files.forEach((file, index) => {
        const link = document.createElement("a");
        link.className = "submission-file-link";
        link.textContent = file.filename || `File ${index + 1}`;
        if (file.driveFileId) {
          link.href = file.driveFileId;
          link.target = "_blank";
          link.rel = "noreferrer noopener";
        } else {
          link.classList.add("submission-file-link--muted");
        }
        wrapper.appendChild(link);
      });
      fileList.appendChild(wrapper);
    }

    uploadTableBody.appendChild(fragment);
  });
}

function renderSubmissionSummary(items) {
  uploadSummaryBody.innerHTML = "";

  if (!items.length) {
    uploadSummaryScroll.classList.add("hidden");
    uploadSummaryEmptyState.classList.remove("hidden");
    return;
  }

  const { rows, totals } = buildSubmissionSummary(items);
  uploadSummaryScroll.classList.remove("hidden");
  uploadSummaryEmptyState.classList.add("hidden");

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="cell-wrap cell-strong">${escapeHtml(row.schoolName)}</td>
      <td class="cell-nowrap">${row.totalData}</td>
      <td class="cell-nowrap">${row.totalFiles}</td>
      <td class="cell-nowrap">${escapeHtml(formatDate(row.latestUploadedAt))}</td>
    `;
    uploadSummaryBody.appendChild(tr);
  });

  const totalRow = document.createElement("tr");
  totalRow.className = "summary-total-row";
  totalRow.innerHTML = `
    <td class="cell-wrap cell-strong">Total</td>
    <td class="cell-nowrap cell-strong">${totals.totalData}</td>
    <td class="cell-nowrap cell-strong">${totals.totalFiles}</td>
    <td class="cell-nowrap cell-strong">${escapeHtml(formatDate(totals.latestUploadedAt))}</td>
  `;
  uploadSummaryBody.appendChild(totalRow);
}

async function saveNote(item, noteInput, noteStatus, noteSaveButton, updatedCell) {
  const adminNote = noteInput.value.trim();
  setNoteStatus(noteStatus, "Menyimpan...", "saving");
  noteSaveButton.disabled = true;

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

    item.adminNote = payload.adminNote || "";
    item.rejectionReason = payload.rejectionReason || item.rejectionReason || "";
    item.updatedAt = payload.updatedAt || item.updatedAt;
    noteInput.value = item.adminNote || item.rejectionReason || "";
    updatedCell.textContent = formatDate(item.updatedAt);
    setNoteStatus(noteStatus, "Tersimpan", "saved");
  } catch (error) {
    setNoteStatus(noteStatus, error.message || "Gagal menyimpan", "error");
    showError(error.message || "Terjadi kesalahan.");
  } finally {
    noteSaveButton.disabled = false;
  }
}

async function updateStatus(registrationId, action, body = {}) {
  hideError();

  try {
    const response = await fetch(`/api/admin/registrations/${registrationId}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Gagal memperbarui status.");
    }

    await loadRegistrations();
  } catch (error) {
    showError(error.message || "Terjadi kesalahan.");
  }
}

function setLoading(isLoading) {
  updateExportButtonState(isLoading);
}

function setMasterUploadState(message, state = "") {
  masterUploadStatus.textContent = message;
  masterUploadStatus.dataset.state = state;
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.remove("hidden");
}

function hideError() {
  errorBanner.textContent = "";
  errorBanner.classList.add("hidden");
}

function setNoteStatus(element, message, state) {
  element.textContent = message;
  element.dataset.state = state || "";
}

function updateExportButtonState(isLoading = false) {
  const hasRows = activeTab === "detail-registrations"
    ? currentItems.length > 0
    : activeTab === "summary-registrations"
      ? summaryItems.length > 0
      : uploadItems.length > 0;
  exportButton.disabled = isLoading || !hasRows;
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

function applyAssetCell(linkEl, imageEl, textEl, remoteUrl, fallbackPath, label) {
  const hasPreview = typeof remoteUrl === "string" && remoteUrl.startsWith("/uploads/");
  const displayText = hasPreview
    ? "Lihat gambar"
    : trimAssetLabel(fallbackPath) || `${label} belum diupload`;

  textEl.textContent = displayText;

  if (hasPreview) {
    linkEl.href = remoteUrl;
    imageEl.src = remoteUrl;
    imageEl.classList.remove("hidden");
  } else {
    linkEl.removeAttribute("href");
    imageEl.removeAttribute("src");
    imageEl.classList.add("hidden");
  }
}

function trimAssetLabel(value) {
  if (!value) return "";
  const segments = String(value).split(/[\\/]/);
  return segments[segments.length - 1] || String(value);
}

function exportToExcel() {
  if (activeTab === "summary-registrations") {
    exportSummaryToExcel();
    return;
  }

  if (!currentItems.length) return;

  const rowsHtml = currentItems.map((item) => {
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

function exportSummaryToExcel() {
  if (!summaryItems.length) return;

  const { rows, totals } = buildAreaSummary(summaryItems);
  const rowsHtml = rows.map((row) => {
    const values = [
      row.areaKerja,
      row.pending,
      row.approved,
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
              <th>Pending</th>
              <th>Approved</th>
              <th>Rejected</th>
              <th>Suspended</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr>
              <td><strong>Total</strong></td>
              <td><strong>${totals.pending}</strong></td>
              <td><strong>${totals.approved}</strong></td>
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

  const rows = Array.from(areaMap.values()).sort((a, b) => a.areaKerja.localeCompare(b.areaKerja, "id"));
  return { rows, totals };
}

function buildSubmissionSummary(items) {
  const schoolMap = new Map();
  const totals = {
    totalData: 0,
    totalFiles: 0,
    latestUploadedAt: "",
  };

  items.forEach((item) => {
    const schoolName = item.formName || "Tanpa nama sekolah";
    const uploadedAt = item.uploadedAt || item.createdAt || "";
    const files = Array.isArray(item.files) ? item.files : [];

    if (!schoolMap.has(schoolName)) {
      schoolMap.set(schoolName, {
        schoolName,
        totalData: 0,
        totalFiles: 0,
        latestUploadedAt: "",
      });
    }

    const row = schoolMap.get(schoolName);
    row.totalData += 1;
    row.totalFiles += files.length;
    if (!row.latestUploadedAt || String(uploadedAt).localeCompare(String(row.latestUploadedAt)) > 0) {
      row.latestUploadedAt = uploadedAt;
    }

    totals.totalData += 1;
    totals.totalFiles += files.length;
    if (!totals.latestUploadedAt || String(uploadedAt).localeCompare(String(totals.latestUploadedAt)) > 0) {
      totals.latestUploadedAt = uploadedAt;
    }
  });

  const rows = Array.from(schoolMap.values()).sort((a, b) => a.schoolName.localeCompare(b.schoolName, "id"));
  return { rows, totals };
}

function setActiveTab(tab) {
  activeTab = tab;
  const showRegistrationSummary = tab === "summary-registrations";
  const showRegistrationDetail = tab === "detail-registrations";
  const showUploadSummary = tab === "summary-submissions";
  const showUploadRaw = tab === "detail-submissions";

  summaryTabButton.setAttribute("aria-selected", showRegistrationSummary ? "true" : "false");
  detailTabButton.setAttribute("aria-selected", showRegistrationDetail ? "true" : "false");
  uploadSummaryTabButton.setAttribute("aria-selected", showUploadSummary ? "true" : "false");
  uploadRawTabButton.setAttribute("aria-selected", showUploadRaw ? "true" : "false");

  detailToolbar.classList.toggle("hidden", !showRegistrationDetail);
  summaryPanel.classList.toggle("hidden", !showRegistrationSummary);
  detailPanel.classList.toggle("hidden", !showRegistrationDetail);
  uploadSummaryPanel.classList.toggle("hidden", !showUploadSummary);
  uploadRawPanel.classList.toggle("hidden", !showUploadRaw);
  updateExportButtonState();
}

async function uploadMasterDataExcel() {
  const file = masterFileInput.files?.[0];
  if (!file) {
    setMasterUploadState("Pilih file Excel terlebih dahulu.", "error");
    return;
  }

  hideError();
  masterUploadButton.disabled = true;
  masterRefreshButton.disabled = true;
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
      "saved"
    );
    masterFileInput.value = "";
    await loadMasterDataInfo();
  } catch (error) {
    setMasterUploadState(error.message || "Upload Excel gagal.", "error");
    showError(error.message || "Upload Excel gagal.");
  } finally {
    masterUploadButton.disabled = false;
    masterRefreshButton.disabled = false;
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

statusFilter.addEventListener("change", loadRegistrations);
exportButton.addEventListener("click", exportToExcel);
summaryTabButton.addEventListener("click", () => setActiveTab("summary-registrations"));
detailTabButton.addEventListener("click", () => setActiveTab("detail-registrations"));
uploadSummaryTabButton.addEventListener("click", () => setActiveTab("summary-submissions"));
uploadRawTabButton.addEventListener("click", () => setActiveTab("detail-submissions"));
masterUploadButton.addEventListener("click", uploadMasterDataExcel);
masterRefreshButton.addEventListener("click", loadMasterDataInfo);
masterFileInput.addEventListener("change", () => {
  const file = masterFileInput.files?.[0];
  setMasterUploadState(file ? `Siap upload: ${file.name}` : "Belum ada file dipilih.", file ? "dirty" : "");
});

loadMasterDataInfo();
loadRegistrations();
loadSubmissions();
setActiveTab(activeTab);

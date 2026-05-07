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
const detailPanel = document.getElementById("detailPanel");
const summaryPanel = document.getElementById("summaryPanel");
const summaryScroll = document.getElementById("summaryScroll");
const summaryBody = document.getElementById("summaryBody");
const summaryEmptyState = document.getElementById("summaryEmptyState");
const template = document.getElementById("rowTemplate");
let currentItems = [];
let summaryItems = [];
let activeTab = "summary";

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

    noteInput.addEventListener("input", () => {
      item.adminNote = noteInput.value.trim();
      if (item.status === "REJECTED") {
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
    <td class="cell-nowrap cell-strong">${totals.total}</td>
  `;
  summaryBody.appendChild(totalRow);
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
  const hasRows = activeTab === "summary" ? summaryItems.length > 0 : currentItems.length > 0;
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
  if (activeTab === "summary") {
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
    }
  });

  const rows = Array.from(areaMap.values()).sort((a, b) => a.areaKerja.localeCompare(b.areaKerja, "id"));
  return { rows, totals };
}

function setActiveTab(tab) {
  activeTab = tab;
  const showingSummary = tab === "summary";

  detailTabButton.setAttribute("aria-selected", showingSummary ? "false" : "true");
  summaryTabButton.setAttribute("aria-selected", showingSummary ? "true" : "false");
  detailToolbar.classList.toggle("hidden", showingSummary);
  detailPanel.classList.toggle("hidden", showingSummary);
  summaryPanel.classList.toggle("hidden", !showingSummary);
  updateExportButtonState();
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
detailTabButton.addEventListener("click", () => setActiveTab("detail"));
summaryTabButton.addEventListener("click", () => setActiveTab("summary"));

loadRegistrations();

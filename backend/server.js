const http = require("node:http");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createHmac, createSign, randomUUID, timingSafeEqual } = require("node:crypto");
const { URL } = require("node:url");
const XLSX = require("xlsx-js-style");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8787);
const maxJsonBodyBytes = 16 * 1024 * 1024;

const rootDir = __dirname;
const defaultStorageRoot = rootDir;

function resolveRuntimePath(configValue, fallbackPath) {
  const trimmed = typeof configValue === "string" ? configValue.trim() : "";
  if (!trimmed) return fallbackPath;
  return path.isAbsolute(trimmed) ? trimmed : path.resolve(rootDir, trimmed);
}

const storageRoot = resolveRuntimePath(process.env.TIC_STORAGE_ROOT, defaultStorageRoot);
const dataDir = resolveRuntimePath(process.env.TIC_DATA_DIR, path.join(storageRoot, "data"));
const publicDir = path.join(rootDir, "public");
const uploadsDir = resolveRuntimePath(process.env.TIC_UPLOADS_DIR, path.join(storageRoot, "uploads"));
const registrationsFile = path.join(dataDir, "registrations.json");
const submissionsFile = path.join(dataDir, "submissions.json");
const registrationAreaNeedsFile = path.join(dataDir, "registration_area_needs.json");
const appReleasePolicyFile = path.join(dataDir, "app_release_policy.json");
const bundledSchoolMasterFile = path.join(rootDir, "data", "school_master.json");
const schoolMasterFile = path.join(dataDir, "school_master.json");
const adminSessionCookieName = "tic_admin_session";
const adminSessionMaxAgeMs = 1000 * 60 * 60 * 12;
const defaultAdminUsername = "admin";
const defaultAdminPassword = "password##45";

const staticContentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

async function ensureStorage() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(uploadsDir, { recursive: true });

  try {
    await fs.access(registrationsFile);
  } catch {
    await fs.writeFile(registrationsFile, "[]\n", "utf8");
  }

  try {
    await fs.access(submissionsFile);
  } catch {
    await fs.writeFile(submissionsFile, "[]\n", "utf8");
  }

  try {
    await fs.access(registrationAreaNeedsFile);
  } catch {
    await fs.writeFile(registrationAreaNeedsFile, "{}\n", "utf8");
  }

  try {
    await fs.access(appReleasePolicyFile);
  } catch {
    await fs.writeFile(
      appReleasePolicyFile,
      `${JSON.stringify(buildDefaultAppReleasePolicy(), null, 2)}\n`,
      "utf8",
    );
  }

  try {
    await fs.access(schoolMasterFile);
  } catch {
    try {
      const bundledMaster = await fs.readFile(bundledSchoolMasterFile, "utf8");
      await fs.writeFile(schoolMasterFile, bundledMaster, "utf8");
    } catch {
      await fs.writeFile(
        schoolMasterFile,
        `${JSON.stringify({
          datasetId: "school-location-master",
          title: "Master Lokasi Sekolah",
          columns: [],
          rows: [],
          updatedAt: new Date().toISOString(),
        }, null, 2)}\n`,
        "utf8",
      );
    }
  }
}

async function readRegistrations() {
  await ensureStorage();
  const raw = await fs.readFile(registrationsFile, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.map(normalizeRegistrationRecord) : [];
}

async function writeRegistrations(items) {
  await ensureStorage();
  const normalizedItems = Array.isArray(items) ? items.map(normalizeRegistrationRecord) : [];
  await fs.writeFile(
    registrationsFile,
    `${JSON.stringify(normalizedItems, null, 2)}\n`,
    "utf8",
  );
}

async function readSubmissions() {
  await ensureStorage();
  const raw = await fs.readFile(submissionsFile, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function writeSubmissions(items) {
  await ensureStorage();
  await fs.writeFile(
    submissionsFile,
    `${JSON.stringify(items, null, 2)}\n`,
    "utf8",
  );
}

async function readRegistrationAreaNeeds() {
  await ensureStorage();
  const raw = await fs.readFile(registrationAreaNeedsFile, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  return Object.entries(parsed).reduce((accumulator, [areaKerja, value]) => {
    const normalizedArea = normalizeString(areaKerja);
    if (!normalizedArea) {
      return accumulator;
    }

    accumulator[normalizedArea] = normalizeNonNegativeInteger(value);
    return accumulator;
  }, {});
}

async function writeRegistrationAreaNeeds(payload) {
  await ensureStorage();
  await fs.writeFile(
    registrationAreaNeedsFile,
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
}

function getAppReleasePolicyDefaults() {
  const minimumApprovedVersionCode = normalizeNonNegativeInteger(process.env.TIC_MIN_APPROVED_APP_VERSION_CODE);
  const latestVersionCode = normalizeNonNegativeInteger(
    process.env.TIC_LATEST_APP_VERSION_CODE || process.env.TIC_MIN_APPROVED_APP_VERSION_CODE,
  );

  return {
    minimumApprovedVersionCode,
    latestVersionCode: Math.max(latestVersionCode, minimumApprovedVersionCode),
    latestVersionName: normalizeString(process.env.TIC_LATEST_APP_VERSION_NAME) || null,
    updateUrl: normalizeString(process.env.TIC_APP_UPDATE_URL) || null,
    updateMessage: normalizeString(process.env.TIC_APP_UPDATE_MESSAGE) || null,
    updatedAt: null,
  };
}

function normalizeAppReleasePolicy(payload = {}, fallback = getAppReleasePolicyDefaults()) {
  const source = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const fallbackSource = fallback && typeof fallback === "object" && !Array.isArray(fallback) ? fallback : {};
  const minimumApprovedVersionCode = normalizeNonNegativeInteger(
    source.minimumApprovedVersionCode ?? fallbackSource.minimumApprovedVersionCode,
  );
  const latestVersionCode = Math.max(
    normalizeNonNegativeInteger(source.latestVersionCode ?? fallbackSource.latestVersionCode),
    minimumApprovedVersionCode,
  );

  return {
    minimumApprovedVersionCode,
    latestVersionCode,
    latestVersionName: normalizeString(source.latestVersionName ?? fallbackSource.latestVersionName) || null,
    updateUrl: normalizeString(source.updateUrl ?? fallbackSource.updateUrl) || null,
    updateMessage: normalizeString(source.updateMessage ?? fallbackSource.updateMessage) || null,
    updatedAt: normalizeString(source.updatedAt ?? fallbackSource.updatedAt) || null,
  };
}

function buildDefaultAppReleasePolicy() {
  return {
    ...normalizeAppReleasePolicy(getAppReleasePolicyDefaults()),
    updatedAt: new Date().toISOString(),
  };
}

async function readAppReleasePolicy() {
  await ensureStorage();
  const raw = await fs.readFile(appReleasePolicyFile, "utf8");
  const parsed = JSON.parse(raw);
  return normalizeAppReleasePolicy(parsed);
}

async function writeAppReleasePolicy(payload) {
  await ensureStorage();
  const normalizedPolicy = {
    ...normalizeAppReleasePolicy(payload),
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(
    appReleasePolicyFile,
    `${JSON.stringify(normalizedPolicy, null, 2)}\n`,
    "utf8",
  );
  return normalizedPolicy;
}

function findRegistrationForSubmission(items, submissionRecord) {
  const uid = normalizeString(submissionRecord?.uid);
  const gmail = normalizeString(submissionRecord?.gmail).toLowerCase();

  return items.find((item) => {
    if (uid && normalizeString(item.uid) === uid) return true;
    if (gmail && normalizeString(item.gmail).toLowerCase() === gmail) return true;
    return false;
  });
}

function normalizeSubmissionReviewStatus(value) {
  const normalized = normalizeString(value).toUpperCase();
  if (["APPROVED", "REJECTED", "SUSPENDED"].includes(normalized)) {
    return normalized;
  }

  return "PENDING";
}

function normalizeRegistrationStatus(value) {
  const normalized = normalizeString(value).toUpperCase();
  if (normalized === "APPROVED" || normalized === "APPROVEDV2") {
    return "APPROVEDV2";
  }
  if (["REJECTED", "SUSPENDED"].includes(normalized)) {
    return normalized;
  }

  return "PENDING";
}

function normalizeRegistrationRecord(record = {}) {
  return {
    ...record,
    status: normalizeRegistrationStatus(record?.status),
    adminNote: normalizeString(record?.adminNote) || null,
    rejectionReason: normalizeString(record?.rejectionReason) || null,
  };
}

function normalizeSubmissionIdentity(record, registrations = []) {
  const matchedRegistration = findRegistrationForSubmission(registrations, record);

  return {
    ...record,
    gmail: normalizeString(record?.gmail) || normalizeString(matchedRegistration?.gmail),
    nama:
      normalizeString(record?.nama)
      || normalizeString(matchedRegistration?.nama)
      || normalizeString(matchedRegistration?.displayName),
    reviewStatus: normalizeSubmissionReviewStatus(record?.reviewStatus),
    adminNote: normalizeString(record?.adminNote) || null,
    rejectionReason: normalizeString(record?.rejectionReason) || null,
  };
}

async function readSchoolMaster() {
  await ensureStorage();
  const raw = await fs.readFile(schoolMasterFile, "utf8");
  const parsed = JSON.parse(raw);
  const columns = Array.isArray(parsed.columns)
    ? parsed.columns.map((item) => normalizeString(item)).filter(Boolean)
    : [];
  const rows = Array.isArray(parsed.rows)
    ? parsed.rows
        .filter((row) => Array.isArray(row))
        .map((row) => row.map((cell) => normalizeString(cell)))
        .filter((row) => row.some((cell) => cell))
    : [];

  return {
    datasetId: normalizeString(parsed.datasetId) || "school-location-master",
    title: normalizeString(parsed.title) || "Master Lokasi Sekolah",
    columns,
    rows,
    updatedAt: normalizeString(parsed.updatedAt) || null,
  };
}

async function writeSchoolMaster(payload) {
  await ensureStorage();
  await fs.writeFile(
    schoolMasterFile,
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
}

function parseSchoolMasterWorkbook(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, {
    type: "buffer",
    cellText: true,
    cellDates: false,
  });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Worksheet tidak ditemukan di file Excel.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });

  if (!Array.isArray(matrix) || matrix.length === 0) {
    throw new Error("File Excel tidak memiliki data.");
  }

  const headerRowIndex = matrix.findIndex((row) =>
    Array.isArray(row) && row.some((cell) => normalizeString(cell)),
  );
  if (headerRowIndex < 0) {
    throw new Error("Header kolom tidak ditemukan pada file Excel.");
  }

  const headerRow = matrix[headerRowIndex];
  const activeColumnIndexes = headerRow
    .map((cell, index) => [normalizeString(cell), index])
    .filter(([value]) => value)
    .map(([, index]) => index);

  if (!activeColumnIndexes.length) {
    throw new Error("Header kolom kosong. Isi minimal 1 nama kolom di baris pertama data.");
  }

  const columns = activeColumnIndexes.map((index) => normalizeString(headerRow[index]));
  const rows = matrix
    .slice(headerRowIndex + 1)
    .filter((row) => Array.isArray(row))
    .map((row) => activeColumnIndexes.map((index) => normalizeString(row[index])))
    .filter((row) => row.some((cell) => cell));

  if (!rows.length) {
    throw new Error("Data lokasi sekolah belum ditemukan di bawah header.");
  }

  return {
    datasetId: "school-location-master",
    title: "Master Lokasi Sekolah",
    columns,
    rows,
    updatedAt: new Date().toISOString(),
  };
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text, extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    ...extraHeaders,
  });
  res.end(text);
}

function sendRedirect(res, location, extraHeaders = {}) {
  res.writeHead(302, {
    Location: location,
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end();
}

async function sendStatic(res, relativePath) {
  await sendFileFromRoot(res, publicDir, relativePath);
}

async function sendFileFromRoot(res, baseDir, relativePath) {
  const normalizedBaseDir = path.resolve(baseDir);
  const safePath = relativePath.replace(/^\/+/, "");
  const resolvedPath = path.resolve(baseDir, safePath);
  const allowedPrefix = `${normalizedBaseDir}${path.sep}`;

  if (resolvedPath !== normalizedBaseDir && !resolvedPath.startsWith(allowedPrefix)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  try {
    const fileBuffer = await fs.readFile(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = staticContentTypes[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    res.end(fileBuffer);
  } catch {
    sendText(res, 404, "Not found");
  }
}

async function readJsonBody(req) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > maxJsonBodyBytes) {
      throw new Error("Body terlalu besar.");
    }
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  if (!rawBody) return {};
  return JSON.parse(rawBody);
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMultilineSecret(value) {
  return normalizeString(value).replace(/\\n/g, "\n");
}

function parseJsonEnv(value, fallback = {}) {
  const normalized = normalizeString(value);
  if (!normalized) return fallback;

  try {
    return JSON.parse(normalized);
  } catch (error) {
    throw new Error(`JSON environment variable tidak valid: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function parseJsonFileEnv(filePath, fallback = {}) {
  const normalizedPath = normalizeString(filePath);
  if (!normalizedPath) return fallback;

  try {
    const raw = fsSync.readFileSync(normalizedPath, "utf8");
    return parseJsonEnv(raw, fallback);
  } catch (error) {
    throw new Error(
      `Gagal membaca file JSON environment ${normalizedPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function getGoogleDriveConfig() {
  const mode = normalizeString(process.env.TIC_ASSET_STORAGE_MODE).toLowerCase() || "local";
  const serviceAccountJsonFile = normalizeString(
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_FILE || process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_PATH,
  );
  const serviceAccountJson = parseJsonEnv(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON, null)
    || parseJsonFileEnv(serviceAccountJsonFile, null);
  const rootFolderId = normalizeString(process.env.GOOGLE_DRIVE_FOLDER_ID);

  const clientEmail = normalizeString(
    serviceAccountJson?.client_email || process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL,
  );
  const privateKey = normalizeMultilineSecret(
    serviceAccountJson?.private_key || process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY,
  );
  const privateKeyId = normalizeString(
    serviceAccountJson?.private_key_id || process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
  );

  return {
    mode,
    enabled: mode === "google-drive",
    clientEmail,
    privateKey,
    privateKeyId,
    rootFolderId,
    registrationsFolderId: normalizeString(process.env.GOOGLE_DRIVE_REGISTRATIONS_FOLDER_ID) || rootFolderId,
    submissionsFolderId: normalizeString(process.env.GOOGLE_DRIVE_SUBMISSIONS_FOLDER_ID) || rootFolderId,
    tokenUrl: "https://oauth2.googleapis.com/token",
    uploadBaseUrl: "https://www.googleapis.com/upload/drive/v3/files",
    fileBaseUrl: "https://www.googleapis.com/drive/v3/files",
    scope: "https://www.googleapis.com/auth/drive",
  };
}

const googleDriveConfig = getGoogleDriveConfig();
let googleDriveTokenCache = {
  accessToken: "",
  expiresAt: 0,
};
const googleDriveFolderCache = new Map();

function isGoogleDriveStorageEnabled() {
  return googleDriveConfig.enabled;
}

function getGoogleDriveFolderId(kind) {
  const folderId = kind === "registration"
    ? googleDriveConfig.registrationsFolderId
    : googleDriveConfig.submissionsFolderId;

  if (!folderId) {
    throw new Error(
      kind === "registration"
        ? "GOOGLE_DRIVE_REGISTRATIONS_FOLDER_ID atau GOOGLE_DRIVE_FOLDER_ID wajib diisi saat TIC_ASSET_STORAGE_MODE=google-drive."
        : "GOOGLE_DRIVE_SUBMISSIONS_FOLDER_ID atau GOOGLE_DRIVE_FOLDER_ID wajib diisi saat TIC_ASSET_STORAGE_MODE=google-drive.",
    );
  }

  return folderId;
}

function ensureGoogleDriveConfig() {
  if (!isGoogleDriveStorageEnabled()) {
    throw new Error("Google Drive storage belum diaktifkan.");
  }

  if (!googleDriveConfig.clientEmail) {
    throw new Error("GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL wajib diisi saat TIC_ASSET_STORAGE_MODE=google-drive.");
  }

  if (!googleDriveConfig.privateKey) {
    throw new Error("GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY wajib diisi saat TIC_ASSET_STORAGE_MODE=google-drive.");
  }
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function parseJsonResponseSafe(response) {
  const raw = await response.text();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

async function getGoogleDriveAccessToken() {
  ensureGoogleDriveConfig();

  if (googleDriveTokenCache.accessToken && googleDriveTokenCache.expiresAt > Date.now() + 30_000) {
    return googleDriveTokenCache.accessToken;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  if (googleDriveConfig.privateKeyId) {
    header.kid = googleDriveConfig.privateKeyId;
  }

  const claims = {
    iss: googleDriveConfig.clientEmail,
    scope: googleDriveConfig.scope,
    aud: googleDriveConfig.tokenUrl,
    exp: now + 3600,
    iat: now,
  };

  const unsignedToken = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(claims))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signedToken = `${unsignedToken}.${toBase64Url(signer.sign(googleDriveConfig.privateKey))}`;

  const tokenResponse = await fetch(googleDriveConfig.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedToken,
    }).toString(),
  });

  const tokenPayload = await parseJsonResponseSafe(tokenResponse);
  if (!tokenResponse.ok || !normalizeString(tokenPayload.access_token)) {
    throw new Error(
      `Gagal mengambil access token Google Drive: ${tokenPayload.error_description || tokenPayload.error || tokenPayload.raw || tokenResponse.status}`,
    );
  }

  googleDriveTokenCache = {
    accessToken: tokenPayload.access_token,
    expiresAt: Date.now() + Math.max((Number(tokenPayload.expires_in) || 3600) - 60, 60) * 1000,
  };

  return googleDriveTokenCache.accessToken;
}

function createGoogleDriveProxyUrl(fileId, fileName = "file") {
  return `/uploads/google-drive/${encodeURIComponent(fileId)}/${encodeURIComponent(fileName)}`;
}

function escapeGoogleDriveQueryValue(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

async function findGoogleDriveChildFile({
  parentFolderId,
  fileName,
  mimeType = "",
}) {
  const normalizedParentId = normalizeString(parentFolderId);
  const normalizedFileName = normalizeString(fileName);
  if (!normalizedParentId || !normalizedFileName) {
    return null;
  }

  const queryParts = [
    `'${escapeGoogleDriveQueryValue(normalizedParentId)}' in parents`,
    `name = '${escapeGoogleDriveQueryValue(normalizedFileName)}'`,
    "trashed = false",
    "mimeType != 'application/vnd.google-apps.folder'",
  ];

  if (normalizeString(mimeType)) {
    queryParts.push(`mimeType = '${escapeGoogleDriveQueryValue(normalizeString(mimeType))}'`);
  }

  const [existingFile] = await listGoogleDriveFiles({
    query: queryParts.join(" and "),
    pageSize: 1,
  });

  return existingFile && normalizeString(existingFile.id) ? existingFile : null;
}

async function uploadBufferToGoogleDrive({ buffer, fileName, mimeType, parentFolderId, existingFileId = "" }) {
  ensureGoogleDriveConfig();

  const token = await getGoogleDriveAccessToken();
  const normalizedExistingFileId = normalizeString(existingFileId);
  const initUrl = new URL(
    normalizedExistingFileId
      ? `${googleDriveConfig.uploadBaseUrl}/${encodeURIComponent(normalizedExistingFileId)}`
      : googleDriveConfig.uploadBaseUrl,
  );
  initUrl.searchParams.set("uploadType", "resumable");
  initUrl.searchParams.set("supportsAllDrives", "true");
  initUrl.searchParams.set("fields", "id,name,mimeType,size");

  const metadata = normalizedExistingFileId
    ? { name: fileName }
    : {
      name: fileName,
      parents: [parentFolderId],
    };

  const initResponse = await fetch(initUrl, {
    method: normalizedExistingFileId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": mimeType || "application/octet-stream",
      "X-Upload-Content-Length": String(buffer.length),
    },
    body: JSON.stringify(metadata),
  });

  if (!initResponse.ok) {
    const payload = await parseJsonResponseSafe(initResponse);
    throw new Error(
      `Gagal membuat sesi upload Google Drive: ${payload.error?.message || payload.raw || initResponse.status}`,
    );
  }

  const sessionUrl = normalizeString(initResponse.headers.get("location"));
  if (!sessionUrl) {
    throw new Error("Google Drive tidak mengembalikan URL sesi upload.");
  }

  const uploadResponse = await fetch(sessionUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": mimeType || "application/octet-stream",
      "Content-Length": String(buffer.length),
    },
    body: buffer,
  });

  const uploadPayload = await parseJsonResponseSafe(uploadResponse);
  if (!uploadResponse.ok || !normalizeString(uploadPayload.id)) {
    throw new Error(
      `Gagal mengunggah file ke Google Drive: ${uploadPayload.error?.message || uploadPayload.raw || uploadResponse.status}`,
    );
  }

  return {
    id: uploadPayload.id,
    name: normalizeString(uploadPayload.name) || fileName,
    mimeType: normalizeString(uploadPayload.mimeType) || mimeType || "application/octet-stream",
  };
}

async function fetchGoogleDriveFile(fileId) {
  ensureGoogleDriveConfig();

  const normalizedFileId = normalizeString(fileId);
  if (!normalizedFileId) {
    throw new Error("File ID Google Drive tidak valid.");
  }

  const token = await getGoogleDriveAccessToken();
  const fileUrl = new URL(`${googleDriveConfig.fileBaseUrl}/${encodeURIComponent(normalizedFileId)}`);
  fileUrl.searchParams.set("alt", "media");
  fileUrl.searchParams.set("supportsAllDrives", "true");

  const response = await fetch(fileUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const payload = await parseJsonResponseSafe(response);
    if (response.status === 404) {
      throw new Error("File Google Drive tidak ditemukan.");
    }
    throw new Error(
      `Gagal membaca file Google Drive: ${payload.error?.message || payload.raw || response.status}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: normalizeString(response.headers.get("content-type")) || "application/octet-stream",
    contentLength: normalizeString(response.headers.get("content-length")),
  };
}

async function fetchGoogleDriveMetadata(fileId, fields = "id,name,mimeType,driveId,parents,trashed") {
  ensureGoogleDriveConfig();

  const normalizedFileId = normalizeString(fileId);
  if (!normalizedFileId) {
    throw new Error("File ID Google Drive tidak valid.");
  }

  const token = await getGoogleDriveAccessToken();
  const fileUrl = new URL(`${googleDriveConfig.fileBaseUrl}/${encodeURIComponent(normalizedFileId)}`);
  fileUrl.searchParams.set("supportsAllDrives", "true");
  fileUrl.searchParams.set("fields", fields);

  const response = await fetch(fileUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await parseJsonResponseSafe(response);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Folder Google Drive tidak ditemukan.");
    }

    throw new Error(
      `Gagal membaca metadata Google Drive: ${payload.error?.message || payload.raw || response.status}`,
    );
  }

  return payload;
}

async function listGoogleDriveFiles({
  query,
  fields = "files(id,name,mimeType,parents,driveId)",
  pageSize = 10,
}) {
  ensureGoogleDriveConfig();

  const token = await getGoogleDriveAccessToken();
  const listUrl = new URL(googleDriveConfig.fileBaseUrl);
  listUrl.searchParams.set("supportsAllDrives", "true");
  listUrl.searchParams.set("includeItemsFromAllDrives", "true");
  listUrl.searchParams.set("corpora", "allDrives");
  listUrl.searchParams.set("spaces", "drive");
  listUrl.searchParams.set("pageSize", String(pageSize));
  listUrl.searchParams.set("fields", fields);
  listUrl.searchParams.set("q", query);

  const response = await fetch(listUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await parseJsonResponseSafe(response);
  if (!response.ok) {
    throw new Error(
      `Gagal mencari file/folder Google Drive: ${payload.error?.message || payload.raw || response.status}`,
    );
  }

  return Array.isArray(payload.files) ? payload.files : [];
}

async function createGoogleDriveFolder({ name, parentFolderId }) {
  ensureGoogleDriveConfig();

  const token = await getGoogleDriveAccessToken();
  const createUrl = new URL(googleDriveConfig.fileBaseUrl);
  createUrl.searchParams.set("supportsAllDrives", "true");
  createUrl.searchParams.set("fields", "id,name,mimeType,parents,driveId");

  const response = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    }),
  });

  const payload = await parseJsonResponseSafe(response);
  if (!response.ok || !normalizeString(payload.id)) {
    throw new Error(
      `Gagal membuat folder Google Drive: ${payload.error?.message || payload.raw || response.status}`,
    );
  }

  return payload;
}

function normalizeGoogleDriveFolderName(value, fallback = "Tanpa Nama") {
  const normalized = normalizeString(value)
    .replace(/[\\/]/g, "-")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || fallback;
}

async function ensureGoogleDriveChildFolder(parentFolderId, folderName) {
  const normalizedParentId = normalizeString(parentFolderId);
  const normalizedFolderName = normalizeGoogleDriveFolderName(folderName);
  const cacheKey = `${normalizedParentId}::${normalizedFolderName}`;
  const cachedFolderId = googleDriveFolderCache.get(cacheKey);
  if (cachedFolderId) {
    return cachedFolderId;
  }

  const query = [
    `'${escapeGoogleDriveQueryValue(normalizedParentId)}' in parents`,
    "mimeType = 'application/vnd.google-apps.folder'",
    `name = '${escapeGoogleDriveQueryValue(normalizedFolderName)}'`,
    "trashed = false",
  ].join(" and ");

  const [existingFolder] = await listGoogleDriveFiles({ query, pageSize: 1 });
  if (normalizeString(existingFolder?.id)) {
    googleDriveFolderCache.set(cacheKey, existingFolder.id);
    return existingFolder.id;
  }

  const createdFolder = await createGoogleDriveFolder({
    name: normalizedFolderName,
    parentFolderId: normalizedParentId,
  });
  googleDriveFolderCache.set(cacheKey, createdFolder.id);
  return createdFolder.id;
}

function extractGoogleDriveFileIdFromProxyUrl(value) {
  const normalized = normalizeString(value);
  if (!normalized.startsWith("/uploads/google-drive/")) {
    return "";
  }

  const relativePath = normalized.replace(/^\/uploads\/google-drive\//, "");
  const [rawFileId] = relativePath.split("/");
  try {
    return decodeURIComponent(rawFileId || "");
  } catch {
    return "";
  }
}

async function deleteGoogleDriveFile(fileId) {
  ensureGoogleDriveConfig();

  const normalizedFileId = normalizeString(fileId);
  if (!normalizedFileId) {
    return;
  }

  const token = await getGoogleDriveAccessToken();
  const fileUrl = new URL(`${googleDriveConfig.fileBaseUrl}/${encodeURIComponent(normalizedFileId)}`);
  fileUrl.searchParams.set("supportsAllDrives", "true");

  const response = await fetch(fileUrl, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) {
    return;
  }

  if (!response.ok) {
    const payload = await parseJsonResponseSafe(response);
    throw new Error(
      `Gagal menghapus file Google Drive: ${payload.error?.message || payload.raw || response.status}`,
    );
  }
}

async function runGoogleDriveFolderCheck(kind) {
  const folderId = getGoogleDriveFolderId(kind);
  const metadata = await fetchGoogleDriveMetadata(folderId);
  const testFileName = `tic-drive-check-${kind}-${Date.now()}.txt`;
  const uploadResult = await uploadBufferToGoogleDrive({
    buffer: Buffer.from(`TIC Google Drive check ${kind} ${new Date().toISOString()}`, "utf8"),
    fileName: testFileName,
    mimeType: "text/plain; charset=utf-8",
    parentFolderId: folderId,
  });

  let cleanupError = "";
  try {
    await deleteGoogleDriveFile(uploadResult.id);
  } catch (error) {
    cleanupError = error instanceof Error ? error.message : String(error);
  }

  return {
    kind,
    ok: true,
    folderId,
    folderName: normalizeString(metadata.name) || "(tanpa nama)",
    mimeType: normalizeString(metadata.mimeType),
    driveId: normalizeString(metadata.driveId) || null,
    testUploadFileId: uploadResult.id,
    cleanupError: cleanupError || null,
    warning: cleanupError ? "File test berhasil dibuat, tetapi gagal dihapus kembali." : null,
  };
}

function buildRegistrationStorageFileName(uid, assetType, originalFileName, mimeType) {
  const extension = getUploadExtension(originalFileName, mimeType);
  const safeUid = sanitizePathSegment(uid, "unknown_uid");
  return `${safeUid}_${assetType}${extension}`;
}

function buildSubmissionStorageFileName(uid, submissionId, index, originalFileName, mimeType) {
  const extension = getUploadExtension(originalFileName, mimeType);
  const safeUid = sanitizePathSegment(uid, "unknown_uid");
  const safeSubmissionId = sanitizePathSegment(submissionId, `submission_${Date.now()}`);
  const safeBaseName = sanitizePathSegment(path.parse(originalFileName).name, `evidence_${index + 1}`);
  return `${safeUid}_${safeSubmissionId}_${String(index + 1).padStart(2, "0")}_${safeBaseName}${extension}`;
}

function normalizeNonNegativeInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }

  return Math.max(0, Math.trunc(number));
}

function getAdminAuthConfig() {
  const envUsername = typeof process.env.ADMIN_USERNAME === "string"
    ? process.env.ADMIN_USERNAME.trim()
    : "";
  const envPassword = typeof process.env.ADMIN_PASSWORD === "string"
    ? process.env.ADMIN_PASSWORD.trim()
    : "";
  const username = envUsername || defaultAdminUsername;
  const password = envPassword || defaultAdminPassword;
  const secret = typeof process.env.ADMIN_SESSION_SECRET === "string"
    ? process.env.ADMIN_SESSION_SECRET.trim()
    : "";

  return {
    enabled: Boolean(username && password),
    username,
    password,
    secret: secret || `${username}:${password}:${storageRoot}`,
  };
}

function parseCookies(req) {
  const rawCookieHeader = typeof req.headers.cookie === "string" ? req.headers.cookie : "";
  return rawCookieHeader
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((accumulator, entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex < 0) {
        return accumulator;
      }

      const name = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      if (!name) {
        return accumulator;
      }

      try {
        accumulator[name] = decodeURIComponent(value);
      } catch {
        accumulator[name] = value;
      }
      return accumulator;
    }, {});
}

function safeTimingEqual(leftValue, rightValue) {
  const leftBuffer = Buffer.from(String(leftValue || ""));
  const rightBuffer = Buffer.from(String(rightValue || ""));
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function signAdminSessionPayload(encodedPayload, secret) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function createAdminSessionValue(username, secret) {
  const encodedPayload = Buffer.from(JSON.stringify({
    username,
    expiresAt: Date.now() + adminSessionMaxAgeMs,
  }), "utf8").toString("base64url");
  const signature = signAdminSessionPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

function verifyAdminSessionValue(sessionValue, config) {
  if (!sessionValue) {
    return false;
  }

  const [encodedPayload, signature] = String(sessionValue).split(".");
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signAdminSessionPayload(encodedPayload, config.secret);
  if (!safeTimingEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (payload.username !== config.username) {
      return false;
    }

    const expiresAt = Number(payload.expiresAt);
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  } catch {
    return false;
  }
}

function isSecureRequest(req) {
  const forwardedProto = typeof req.headers["x-forwarded-proto"] === "string"
    ? req.headers["x-forwarded-proto"]
    : "";
  return forwardedProto.toLowerCase().includes("https");
}

function buildAdminSessionCookie(req, value, maxAgeMs) {
  const cookieParts = [
    `${adminSessionCookieName}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.floor(maxAgeMs / 1000))}`,
  ];

  if (isSecureRequest(req)) {
    cookieParts.push("Secure");
  }

  return cookieParts.join("; ");
}

function expireAdminSessionCookie(req) {
  return buildAdminSessionCookie(req, "", 0);
}

function isAdminAuthenticated(req) {
  const config = getAdminAuthConfig();
  if (!config.enabled) {
    return true;
  }

  const cookies = parseCookies(req);
  return verifyAdminSessionValue(cookies[adminSessionCookieName], config);
}

function normalizeAssetUrl(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function isGoogleDriveProxyUrl(value) {
  return normalizeString(value).startsWith("/uploads/google-drive/");
}

function isLocalUploadsProxyUrl(value) {
  return normalizeString(value).startsWith("/uploads/");
}

function resolveUploadsProxyUrlToLocalPath(value) {
  const normalized = normalizeString(value);
  if (!isLocalUploadsProxyUrl(normalized) || isGoogleDriveProxyUrl(normalized)) {
    return "";
  }

  const relativePath = normalized.replace(/^\/uploads\//, "");
  const normalizedUploadsDir = path.resolve(uploadsDir);
  const resolvedPath = path.resolve(uploadsDir, relativePath);
  const allowedPrefix = `${normalizedUploadsDir}${path.sep}`;

  if (resolvedPath === normalizedUploadsDir || !resolvedPath.startsWith(allowedPrefix)) {
    return "";
  }

  return resolvedPath;
}

async function migrateRegistrationAssetToGoogleDrive({
  assetUrl,
  assetType,
  uid,
  dryRun = true,
}) {
  const normalizedAssetUrl = normalizeString(assetUrl);
  if (!normalizedAssetUrl) {
    return {
      status: "empty",
      assetType,
      fromUrl: null,
      toUrl: null,
      fileName: null,
      message: "Field asset kosong.",
    };
  }

  if (isGoogleDriveProxyUrl(normalizedAssetUrl)) {
    return {
      status: "already-google-drive",
      assetType,
      fromUrl: normalizedAssetUrl,
      toUrl: normalizedAssetUrl,
      fileName: null,
      message: "Asset sudah mengarah ke Google Drive.",
    };
  }

  const localPath = resolveUploadsProxyUrlToLocalPath(normalizedAssetUrl);
  if (!localPath) {
    return {
      status: "unsupported",
      assetType,
      fromUrl: normalizedAssetUrl,
      toUrl: null,
      fileName: null,
      message: "URL asset bukan file lokal backend yang bisa dimigrasikan.",
    };
  }

  try {
    await fs.access(localPath);
  } catch {
    return {
      status: "missing-local-file",
      assetType,
      fromUrl: normalizedAssetUrl,
      toUrl: null,
      fileName: path.basename(localPath),
      message: `File lokal tidak ditemukan: ${localPath}`,
    };
  }

  const fileName = path.basename(localPath) || buildRegistrationStorageFileName(uid, assetType, "", "");
  const mimeType = normalizeString(staticContentTypes[path.extname(fileName).toLowerCase()]).split(";")[0] || "application/octet-stream";

  if (dryRun) {
    return {
      status: "planned",
      assetType,
      fromUrl: normalizedAssetUrl,
      toUrl: null,
      fileName,
      message: "Asset siap dimigrasikan ke Google Drive.",
    };
  }

  const parentFolderId = getGoogleDriveFolderId("registration");
  const existingFile = await findGoogleDriveChildFile({
    parentFolderId,
    fileName,
  });
  const buffer = await fs.readFile(localPath);
  const uploadResult = await uploadBufferToGoogleDrive({
    buffer,
    fileName,
    mimeType,
    parentFolderId,
    existingFileId: normalizeString(existingFile?.id),
  });
  const migratedUrl = createGoogleDriveProxyUrl(uploadResult.id, uploadResult.name);

  return {
    status: existingFile?.id ? "updated-google-drive" : "uploaded-google-drive",
    assetType,
    fromUrl: normalizedAssetUrl,
    toUrl: migratedUrl,
    fileName: uploadResult.name || fileName,
    message: existingFile?.id
      ? "Asset lokal berhasil mengganti file yang sudah ada di Google Drive."
      : "Asset lokal berhasil diupload ke Google Drive.",
  };
}

async function migrateRegistrationsToGoogleDrive({ dryRun = true, limit = 0 } = {}) {
  ensureGoogleDriveConfig();

  const items = await readRegistrations();
  const normalizedLimit = normalizeNonNegativeInteger(limit);
  const targetItems = normalizedLimit ? items.slice(0, normalizedLimit) : items;
  const summary = {
    dryRun,
    totalRegistrations: items.length,
    scannedRegistrations: targetItems.length,
    migratedRegistrations: 0,
    migratedAssets: 0,
    alreadyGoogleDriveAssets: 0,
    plannedAssets: 0,
    missingLocalFiles: 0,
    unsupportedAssets: 0,
    emptyAssets: 0,
    errors: 0,
    wroteRegistrationsFile: false,
  };
  const details = [];
  let hasChanges = false;

  for (const record of targetItems) {
    const assetEntries = [
      ["ktpDriveFileId", "ktp"],
      ["selfieDriveFileId", "selfie"],
    ];
    const assetResults = [];
    let recordChanged = false;

    for (const [fieldName, assetType] of assetEntries) {
      try {
        const assetResult = await migrateRegistrationAssetToGoogleDrive({
          assetUrl: record[fieldName],
          assetType,
          uid: record.uid,
          dryRun,
        });
        assetResults.push({
          fieldName,
          ...assetResult,
        });

        if (assetResult.status === "empty") {
          summary.emptyAssets += 1;
          continue;
        }

        if (assetResult.status === "already-google-drive") {
          summary.alreadyGoogleDriveAssets += 1;
          continue;
        }

        if (assetResult.status === "planned") {
          summary.plannedAssets += 1;
          continue;
        }

        if (assetResult.status === "missing-local-file") {
          summary.missingLocalFiles += 1;
          continue;
        }

        if (assetResult.status === "unsupported") {
          summary.unsupportedAssets += 1;
          continue;
        }

        if (assetResult.status === "uploaded-google-drive" || assetResult.status === "updated-google-drive") {
          record[fieldName] = assetResult.toUrl;
          summary.migratedAssets += 1;
          recordChanged = true;
          continue;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        summary.errors += 1;
        assetResults.push({
          fieldName,
          status: "error",
          assetType,
          fromUrl: normalizeString(record[fieldName]) || null,
          toUrl: null,
          fileName: null,
          message,
        });
      }
    }

    if (recordChanged) {
      summary.migratedRegistrations += 1;
      record.updatedAt = new Date().toISOString();
      hasChanges = true;
    }

    if (assetResults.some((item) => item.status !== "empty")) {
      details.push({
        registrationId: record.registrationId,
        uid: record.uid,
        nama: record.nama || null,
        gmail: record.gmail || null,
        assets: assetResults,
      });
    }
  }

  if (hasChanges && !dryRun) {
    await writeRegistrations(items);
    summary.wroteRegistrationsFile = true;
  }

  return {
    ok: true,
    summary,
    items: details,
  };
}

function toPortableRelativePath(rootDir, targetPath) {
  const relativePath = path.relative(rootDir, targetPath);
  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return "";
  }

  return relativePath.split(path.sep).join("/");
}

async function listFilesRecursive(rootDir) {
  const normalizedRootDir = path.resolve(rootDir);
  let entries = [];

  try {
    entries = await fs.readdir(normalizedRootDir, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(normalizedRootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(fullPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function classifyRegistrationAssetUrl(assetUrl) {
  const normalizedAssetUrl = normalizeString(assetUrl);
  if (!normalizedAssetUrl) {
    return {
      status: "empty",
      assetUrl: null,
      localPath: "",
      relativeUploadsPath: "",
    };
  }

  if (isGoogleDriveProxyUrl(normalizedAssetUrl)) {
    return {
      status: "google-drive",
      assetUrl: normalizedAssetUrl,
      localPath: "",
      relativeUploadsPath: "",
    };
  }

  const localPath = resolveUploadsProxyUrlToLocalPath(normalizedAssetUrl);
  if (!localPath) {
    return {
      status: "unsupported",
      assetUrl: normalizedAssetUrl,
      localPath: "",
      relativeUploadsPath: "",
    };
  }

  const relativeUploadsPath = toPortableRelativePath(path.resolve(uploadsDir), localPath);
  if (!relativeUploadsPath.startsWith("registrations/")) {
    return {
      status: "local-other",
      assetUrl: normalizedAssetUrl,
      localPath,
      relativeUploadsPath,
    };
  }

  return {
    status: "local-uploads",
    assetUrl: normalizedAssetUrl,
    localPath,
    relativeUploadsPath,
  };
}

async function auditRegistrationsGoogleDrive({ detailLimit = 50 } = {}) {
  const items = await readRegistrations();
  const registrationsUploadsDir = path.resolve(path.join(uploadsDir, "registrations"));
  const localFilesOnDisk = await listFilesRecursive(registrationsUploadsDir);
  const localFilesOnDiskSet = new Set(localFilesOnDisk.map((filePath) => path.resolve(filePath)));
  const referencedLocalFilesSet = new Set();
  const normalizedDetailLimit = Math.max(0, Math.trunc(Number(detailLimit) || 0)) || 50;
  const summary = {
    totalRegistrations: items.length,
    scannedAssetFields: 0,
    registrationsFullyOnGoogleDrive: 0,
    registrationsWithLocalAssets: 0,
    registrationsWithIssues: 0,
    googleDriveAssets: 0,
    localRegistrationAssets: 0,
    localRegistrationAssetsMissingFiles: 0,
    localOtherAssets: 0,
    unsupportedAssets: 0,
    emptyAssets: 0,
    localFilesOnDisk: localFilesOnDisk.length,
    referencedLocalFilesOnDisk: 0,
    staleLocalFilesOnDisk: 0,
    safeToDeleteLocalRegistrationFiles: false,
    safeToDeleteRenderDisk: false,
  };
  const details = [];

  for (const record of items) {
    const assetEntries = [
      ["ktpDriveFileId", "ktp"],
      ["selfieDriveFileId", "selfie"],
    ];
    const assetResults = [];
    let hasLocalAssets = false;
    let hasIssues = false;
    let resolvedToGoogleDriveOrEmpty = true;

    for (const [fieldName, assetType] of assetEntries) {
      summary.scannedAssetFields += 1;
      const assetInfo = classifyRegistrationAssetUrl(record[fieldName]);
      const result = {
        fieldName,
        assetType,
        status: assetInfo.status,
        assetUrl: assetInfo.assetUrl,
        relativeUploadsPath: assetInfo.relativeUploadsPath || null,
        fileExists: null,
      };

      if (assetInfo.status === "empty") {
        summary.emptyAssets += 1;
        assetResults.push(result);
        continue;
      }

      if (assetInfo.status === "google-drive") {
        summary.googleDriveAssets += 1;
        assetResults.push(result);
        continue;
      }

      resolvedToGoogleDriveOrEmpty = false;

      if (assetInfo.status === "unsupported") {
        summary.unsupportedAssets += 1;
        hasIssues = true;
        assetResults.push(result);
        continue;
      }

      if (assetInfo.status === "local-other") {
        summary.localOtherAssets += 1;
        hasIssues = true;
      } else {
        summary.localRegistrationAssets += 1;
        hasLocalAssets = true;
      }

      let fileExists = false;
      try {
        await fs.access(assetInfo.localPath);
        fileExists = true;
      } catch {
        fileExists = false;
      }

      result.fileExists = fileExists;
      if (fileExists) {
        const normalizedLocalPath = path.resolve(assetInfo.localPath);
        if (localFilesOnDiskSet.has(normalizedLocalPath)) {
          referencedLocalFilesSet.add(normalizedLocalPath);
        }
      } else if (assetInfo.status === "local-uploads") {
        summary.localRegistrationAssetsMissingFiles += 1;
        hasIssues = true;
      }

      assetResults.push(result);
    }

    if (resolvedToGoogleDriveOrEmpty) {
      summary.registrationsFullyOnGoogleDrive += 1;
    }

    if (hasLocalAssets) {
      summary.registrationsWithLocalAssets += 1;
    }

    if (hasLocalAssets || hasIssues) {
      summary.registrationsWithIssues += 1;
    }

    if ((hasLocalAssets || hasIssues) && details.length < normalizedDetailLimit) {
      details.push({
        registrationId: record.registrationId,
        uid: record.uid,
        nama: record.nama || null,
        gmail: record.gmail || null,
        assets: assetResults.filter((asset) => asset.status !== "google-drive" && asset.status !== "empty"),
      });
    }
  }

  summary.referencedLocalFilesOnDisk = referencedLocalFilesSet.size;
  summary.staleLocalFilesOnDisk = localFilesOnDisk.filter((filePath) => !referencedLocalFilesSet.has(path.resolve(filePath))).length;
  summary.safeToDeleteLocalRegistrationFiles = Boolean(
    summary.localRegistrationAssets === 0
      && summary.localOtherAssets === 0
      && summary.unsupportedAssets === 0,
  );

  return {
    ok: true,
    summary,
    advice: summary.safeToDeleteLocalRegistrationFiles
      ? "Semua URL asset registrasi yang terisi sudah mengarah ke Google Drive. Folder uploads/registrations aman dibersihkan, tetapi disk Render tetap jangan dihapus karena masih dipakai file JSON dan kemungkinan data submission."
      : "Masih ada URL asset registrasi yang belum sepenuhnya aman untuk cleanup. Jangan hapus folder uploads/registrations dulu.",
    filesystem: {
      registrationsUploadsDir,
      sampleStaleLocalFiles: localFilesOnDisk
        .filter((filePath) => !referencedLocalFilesSet.has(path.resolve(filePath)))
        .slice(0, 20)
        .map((filePath) => toPortableRelativePath(registrationsUploadsDir, filePath) || path.basename(filePath)),
    },
    items: details,
  };
}

function buildRegistrationRecord(body) {
  const now = new Date().toISOString();

  return {
    registrationId: `reg-${Date.now()}-${randomUUID().slice(0, 8)}`,
    uid: normalizeString(body.uid),
    gmail: normalizeString(body.gmail),
    displayName: normalizeString(body.displayName),
    nik: normalizeString(body.nik),
    nama: normalizeString(body.nama),
    alamat: normalizeString(body.alamat),
    rtRw: normalizeString(body.rtRw),
    kelDesa: normalizeString(body.kelDesa),
    kecamatan: normalizeString(body.kecamatan),
    kabupaten: normalizeString(body.kabupaten),
    noHp: normalizeString(body.noHp),
    noRekening: normalizeString(body.noRekening),
    namaBank: normalizeString(body.namaBank),
    namaPemilik: normalizeString(body.namaPemilik),
    areaKerja: normalizeString(body.areaKerja),
    ktpLocalPath: normalizeString(body.ktpLocalPath),
    selfieLocalPath: normalizeString(body.selfieLocalPath),
    ktpDriveFileId: normalizeAssetUrl(body.ktpDriveFileId),
    selfieDriveFileId: normalizeAssetUrl(body.selfieDriveFileId),
    status: "PENDING",
    adminNote: null,
    rejectionReason: null,
    createdAt: normalizeString(body.createdAt) || now,
    updatedAt: now,
    source: "android",
  };
}

function validateRegistrationPayload(body) {
  const requiredFields = [
    ["uid", "UID wajib dikirim."],
    ["gmail", "Gmail wajib dikirim."],
    ["nik", "NIK wajib dikirim."],
    ["nama", "Nama wajib dikirim."],
    ["alamat", "Alamat wajib dikirim."],
    ["noHp", "No HP wajib dikirim."],
    ["noRekening", "No rekening wajib dikirim."],
    ["namaBank", "Nama bank wajib dikirim."],
    ["namaPemilik", "Nama pemilik wajib dikirim."],
    ["areaKerja", "Area kerja wajib dikirim."],
  ];

  for (const [field, message] of requiredFields) {
    if (!normalizeString(body[field])) {
      return message;
    }
  }

  return null;
}

function toUserProfile(record) {
  return {
    uid: record.uid,
    gmail: record.gmail,
    displayName: record.displayName,
    nik: record.nik || null,
    nama: record.nama || null,
    alamat: record.alamat || null,
    rtRw: record.rtRw || null,
    kelDesa: record.kelDesa || null,
    kecamatan: record.kecamatan || null,
    kabupaten: record.kabupaten || null,
    noHp: record.noHp || null,
    noRekening: record.noRekening || null,
    namaBank: record.namaBank || null,
    namaPemilik: record.namaPemilik || null,
    areaKerja: record.areaKerja || null,
    status: record.status,
    adminNote: record.adminNote || null,
    rejectionReason: record.rejectionReason,
    ktpDriveFileId: record.ktpDriveFileId,
    selfieDriveFileId: record.selfieDriveFileId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function getUploadExtension(fileName, mimeType) {
  const fromFileName = path.extname(normalizeString(fileName)).toLowerCase();
  if (fromFileName) return fromFileName;

  const normalizedMime = normalizeString(mimeType).toLowerCase();
  if (normalizedMime === "image/png") return ".png";
  if (normalizedMime === "image/webp") return ".webp";
  return ".jpg";
}

function validateAssetUploadPayload(body) {
  if (!normalizeString(body.uid)) return "UID wajib dikirim.";
  if (!normalizeString(body.assetType)) return "Jenis asset wajib dikirim.";
  if (!["ktp", "selfie"].includes(normalizeString(body.assetType).toLowerCase())) {
    return "Jenis asset harus `ktp` atau `selfie`.";
  }
  if (!normalizeString(body.fileName)) return "Nama file wajib dikirim.";
  if (!normalizeString(body.base64Data)) return "Isi file wajib dikirim.";
  return null;
}

function validateSchoolMasterUploadPayload(body) {
  if (!normalizeString(body.fileName)) return "Nama file Excel wajib dikirim.";
  if (!normalizeString(body.base64Data)) return "Isi file Excel wajib dikirim.";
  return null;
}

function validateSubmissionPayload(body) {
  const requiredFields = [
    ["submissionId", "Submission ID wajib dikirim."],
    ["uid", "UID wajib dikirim."],
    ["formName", "Nama sekolah wajib dikirim."],
    ["createdAt", "Tanggal simpan wajib dikirim."],
  ];

  for (const [field, message] of requiredFields) {
    if (!normalizeString(body[field])) {
      return message;
    }
  }

  return null;
}

function sanitizePathSegment(value, fallback = "item") {
  const normalized = normalizeString(value).replace(/[^a-zA-Z0-9_-]/g, "_");
  return normalized || fallback;
}

function parseSubmissionAnswersPayload(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  const normalized = normalizeString(value);
  if (!normalized) {
    return {};
  }

  try {
    const parsed = JSON.parse(normalized);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getSubmissionSelectedLocation(answersPayload) {
  const selectedLocation = answersPayload?.selectedLocation;
  return selectedLocation && typeof selectedLocation === "object" && !Array.isArray(selectedLocation)
    ? selectedLocation
    : {};
}

function resolveSubmissionKabupatenName({ answersPayload, matchedRegistration }) {
  const selectedLocation = getSubmissionSelectedLocation(answersPayload);
  const matchedKabupaten = normalizeString(
    Object.entries(selectedLocation).find(([column]) => /kab/i.test(normalizeString(column)))?.[1],
  );

  if (matchedKabupaten) {
    return matchedKabupaten;
  }

  return normalizeString(matchedRegistration?.kabupaten);
}

async function resolveSubmissionGoogleDriveFolder({
  uid,
  gmail,
  formName,
  answersJson,
  registrations,
}) {
  const rootFolderId = getGoogleDriveFolderId("submission");
  const answersPayload = parseSubmissionAnswersPayload(answersJson);
  const matchedRegistration = findRegistrationForSubmission(registrations, { uid, gmail });
  const locationValues = Object.values(getSubmissionSelectedLocation(answersPayload)).filter(Boolean);
  const fallbackSchoolName = locationValues.length ? String(locationValues[locationValues.length - 1]) : "";
  const kabupatenName = normalizeGoogleDriveFolderName(
    resolveSubmissionKabupatenName({ answersPayload, matchedRegistration }),
    "Kabupaten Belum Diisi",
  );
  const schoolName = normalizeGoogleDriveFolderName(
    normalizeString(formName)
      || fallbackSchoolName
      || "",
    "Sekolah Belum Diisi",
  );

  const kabupatenFolderId = await ensureGoogleDriveChildFolder(rootFolderId, kabupatenName);
  const schoolFolderId = await ensureGoogleDriveChildFolder(kabupatenFolderId, schoolName);

  return {
    folderId: schoolFolderId,
    kabupatenName,
    schoolName,
  };
}

async function deleteSubmissionStoredFiles(record) {
  const driveFileIds = Array.from(new Set(
    (Array.isArray(record?.files) ? record.files : [])
      .map((file) => extractGoogleDriveFileIdFromProxyUrl(file?.driveFileId))
      .filter(Boolean),
  ));

  for (const fileId of driveFileIds) {
    await deleteGoogleDriveFile(fileId);
  }

  const safeUid = sanitizePathSegment(record?.uid, "unknown_uid");
  const safeSubmissionId = sanitizePathSegment(record?.submissionId, "submission");
  const submissionsBaseDir = path.resolve(path.join(uploadsDir, "submissions"));
  const targetDir = path.resolve(path.join(submissionsBaseDir, safeUid, safeSubmissionId));
  const allowedPrefix = `${submissionsBaseDir}${path.sep}`;

  if (targetDir.startsWith(allowedPrefix)) {
    await fs.rm(targetDir, { recursive: true, force: true });
  }
}

async function storeSubmissionFiles(uid, submissionId, files, googleDriveParentFolderId = "") {
  if (!Array.isArray(files) || !files.length) {
    return [];
  }

  const safeUid = sanitizePathSegment(uid, "unknown_uid");
  const safeSubmissionId = sanitizePathSegment(submissionId, `submission_${Date.now()}`);
  const useGoogleDrive = isGoogleDriveStorageEnabled();
  const targetDir = path.join(uploadsDir, "submissions", safeUid, safeSubmissionId);
  const targetGoogleDriveParentFolderId = normalizeString(googleDriveParentFolderId) || getGoogleDriveFolderId("submission");
  if (!useGoogleDrive) {
    await fs.mkdir(targetDir, { recursive: true });
  }

  const storedFiles = [];
  for (const [index, file] of files.entries()) {
    const originalFileName = normalizeString(file.filename) || `evidence_${index + 1}.jpg`;
    const base64Data = normalizeString(file.base64Data);
    let fileUrl = normalizeString(file.driveFileId) || null;
    let storedFileName = originalFileName;

    if (base64Data) {
      if (useGoogleDrive) {
        storedFileName = buildSubmissionStorageFileName(
          uid,
          submissionId,
          index,
          originalFileName,
          file.mimeType,
        );
        const existingFile = await findGoogleDriveChildFile({
          parentFolderId: targetGoogleDriveParentFolderId,
          fileName: storedFileName,
        });
        const uploadResult = await uploadBufferToGoogleDrive({
          buffer: Buffer.from(base64Data, "base64"),
          fileName: storedFileName,
          mimeType: normalizeString(file.mimeType) || "image/jpeg",
          parentFolderId: targetGoogleDriveParentFolderId,
          existingFileId: normalizeString(existingFile?.id),
        });
        fileUrl = createGoogleDriveProxyUrl(uploadResult.id, uploadResult.name);
      } else {
        const storedExtension = getUploadExtension(originalFileName, file.mimeType);
        const safeBaseName = sanitizePathSegment(path.parse(originalFileName).name, `evidence_${index + 1}`);
        storedFileName = `${String(index + 1).padStart(2, "0")}_${safeBaseName}${storedExtension}`;
        const targetPath = path.join(targetDir, storedFileName);
        await fs.writeFile(targetPath, Buffer.from(base64Data, "base64"));
        fileUrl = `/uploads/submissions/${encodeURIComponent(safeUid)}/${encodeURIComponent(safeSubmissionId)}/${encodeURIComponent(storedFileName)}`;
      }
    }

    storedFiles.push({
      id: normalizeString(file.id) || `file-${randomUUID().slice(0, 8)}`,
      submissionId: normalizeString(file.submissionId) || submissionId,
      fileType: normalizeString(file.fileType) || "PHOTO",
      localPath: normalizeString(file.localPath),
      driveFileId: fileUrl,
      filename: storedFileName,
      createdAt: normalizeString(file.createdAt) || new Date().toISOString(),
      mimeType: normalizeString(file.mimeType) || "image/jpeg",
    });
  }

  return storedFiles;
}

async function storeRegistrationAsset(body) {
  const uid = normalizeString(body.uid);
  const assetType = normalizeString(body.assetType).toLowerCase();
  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeFileName = buildRegistrationStorageFileName(uid, assetType, body.fileName, body.mimeType);

  let fileUrl;
  if (isGoogleDriveStorageEnabled()) {
    const parentFolderId = getGoogleDriveFolderId("registration");
    const existingFile = await findGoogleDriveChildFile({
      parentFolderId,
      fileName: safeFileName,
    });
    const uploadResult = await uploadBufferToGoogleDrive({
      buffer: Buffer.from(normalizeString(body.base64Data), "base64"),
      fileName: safeFileName,
      mimeType: normalizeString(body.mimeType) || "image/jpeg",
      parentFolderId,
      existingFileId: normalizeString(existingFile?.id),
    });
    fileUrl = createGoogleDriveProxyUrl(uploadResult.id, uploadResult.name);
  } else {
    const targetDir = path.join(uploadsDir, "registrations", safeUid);
    const targetPath = path.join(targetDir, safeFileName);

    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(targetPath, Buffer.from(normalizeString(body.base64Data), "base64"));
    fileUrl = `/uploads/registrations/${encodeURIComponent(safeUid)}/${encodeURIComponent(safeFileName)}`;
  }

  return {
    assetType,
    fileName: safeFileName,
    fileUrl,
  };
}

function findRegistration(items, searchParams) {
  const registrationId = normalizeString(searchParams.get("registrationId"));
  const uid = normalizeString(searchParams.get("uid"));
  const gmail = normalizeString(searchParams.get("gmail")).toLowerCase();

  return items.find((item) => {
    if (registrationId && item.registrationId === registrationId) return true;
    if (uid && item.uid === uid) return true;
    if (gmail && item.gmail.toLowerCase() === gmail) return true;
    return false;
  });
}

async function buildSubmissionRecord(body) {
  const now = new Date().toISOString();
  const registrations = await readRegistrations();
  const googleDriveFolder = isGoogleDriveStorageEnabled()
    ? await resolveSubmissionGoogleDriveFolder({
      uid: normalizeString(body.uid),
      gmail: normalizeString(body.gmail),
      formName: normalizeString(body.formName),
      answersJson: body.answersJson,
      registrations,
    })
    : null;
  const files = await storeSubmissionFiles(
    normalizeString(body.uid),
    normalizeString(body.submissionId),
    Array.isArray(body.files) ? body.files : [],
    googleDriveFolder?.folderId || "",
  );

  return normalizeSubmissionIdentity({
    submissionId: normalizeString(body.submissionId),
    uid: normalizeString(body.uid),
    gmail: normalizeString(body.gmail),
    nama: normalizeString(body.nama),
    projectName: normalizeString(body.projectName),
    formName: normalizeString(body.formName),
    answersJson: typeof body.answersJson === "string" ? body.answersJson : JSON.stringify(body.answersJson || {}),
    gpsLat: typeof body.gpsLat === "number" ? body.gpsLat : null,
    gpsLng: typeof body.gpsLng === "number" ? body.gpsLng : null,
    gpsAccuracy: typeof body.gpsAccuracy === "number" ? body.gpsAccuracy : null,
    driveFolderId: isGoogleDriveStorageEnabled()
      ? googleDriveFolder?.folderId || getGoogleDriveFolderId("submission")
      : normalizeString(body.driveFolderId) || null,
    status: "UPLOADED",
    reviewStatus: "PENDING",
    adminNote: null,
    rejectionReason: null,
    createdAt: normalizeString(body.createdAt) || now,
    uploadedAt: now,
    files,
    source: "android",
    updatedAt: now,
  }, registrations);
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, {
      status: "ok",
      service: "tic-registration-backend",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/login") {
    const adminConfig = getAdminAuthConfig();
    if (!adminConfig.enabled) {
      sendJson(res, 503, { error: "Login admin belum dikonfigurasi di server." });
      return;
    }

    let body = {};
    try {
      body = await readJsonBody(req);
    } catch {
      body = {};
    }

    const username = normalizeString(body.username);
    const password = normalizeString(body.password);
    const isValidUsername = safeTimingEqual(username, adminConfig.username);
    const isValidPassword = safeTimingEqual(password, adminConfig.password);

    if (!isValidUsername || !isValidPassword) {
      sendJson(res, 401, { error: "Username atau password salah." });
      return;
    }

    const sessionValue = createAdminSessionValue(adminConfig.username, adminConfig.secret);
    sendJson(
      res,
      200,
      { ok: true, username: adminConfig.username },
      { "Set-Cookie": buildAdminSessionCookie(req, sessionValue, adminSessionMaxAgeMs) },
    );
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/logout") {
    sendJson(
      res,
      200,
      { ok: true },
      { "Set-Cookie": expireAdminSessionCookie(req) },
    );
    return;
  }

  if (url.pathname.startsWith("/api/admin/")) {
    const adminConfig = getAdminAuthConfig();
    if (adminConfig.enabled && !isAdminAuthenticated(req)) {
      sendJson(
        res,
        401,
        { error: "Sesi admin tidak valid atau sudah berakhir." },
        { "Set-Cookie": expireAdminSessionCookie(req) },
      );
      return;
    }
  }

  if (req.method === "POST" && url.pathname === "/api/uploads/registration-assets") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Body JSON tidak valid.",
      });
      return;
    }

    const validationError = validateAssetUploadPayload(body);
    if (validationError) {
      sendJson(res, 422, { error: validationError });
      return;
    }

    try {
      const uploadResult = await storeRegistrationAsset(body);
      sendJson(res, 201, uploadResult);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      console.error("Registration asset upload failed:", details);
      sendJson(res, 500, {
        error: `Gagal menyimpan file upload. ${details}`,
        details,
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/registrations") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { error: "Body JSON tidak valid." });
      return;
    }

    const validationError = validateRegistrationPayload(body);
    if (validationError) {
      sendJson(res, 422, { error: validationError });
      return;
    }

    const items = await readRegistrations();
    const existingIndex = items.findIndex((item) => item.uid === normalizeString(body.uid));
    const record = buildRegistrationRecord(body);

    if (existingIndex >= 0) {
      record.registrationId = items[existingIndex].registrationId;
      record.createdAt = items[existingIndex].createdAt;
      items[existingIndex] = record;
    } else {
      items.unshift(record);
    }

    await writeRegistrations(items);

    sendJson(res, 201, {
      registrationId: record.registrationId,
      status: record.status,
      ktpDriveFileId: record.ktpDriveFileId,
      selfieDriveFileId: record.selfieDriveFileId,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/registrations/status") {
    const items = await readRegistrations();
    const record = findRegistration(items, url.searchParams);

    if (!record) {
      sendJson(res, 404, { error: "Registrasi tidak ditemukan." });
      return;
    }

    sendJson(res, 200, {
      registrationId: record.registrationId,
      status: record.status,
      rejectionReason: record.rejectionReason,
      updatedAt: record.updatedAt,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/users/me") {
    const [items, appReleasePolicy] = await Promise.all([
      readRegistrations(),
      readAppReleasePolicy(),
    ]);
    const record = findRegistration(items, url.searchParams);

    if (!record) {
      sendJson(res, 404, { error: "User profile tidak ditemukan." });
      return;
    }

    sendJson(res, 200, {
      ...toUserProfile(record),
      appReleasePolicy,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/master-data/schools") {
    try {
      const masterData = await readSchoolMaster();
      sendJson(res, 200, masterData);
    } catch (error) {
      sendJson(res, 500, {
        error: "Master data sekolah belum bisa dibaca.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/submissions") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { error: "Body JSON tidak valid." });
      return;
    }

    const validationError = validateSubmissionPayload(body);
    if (validationError) {
      sendJson(res, 422, { error: validationError });
      return;
    }

    try {
      const items = await readSubmissions();
      const record = await buildSubmissionRecord(body);
      const existingIndex = items.findIndex((item) => item.submissionId === record.submissionId);
      if (existingIndex >= 0) {
        items[existingIndex] = {
          ...items[existingIndex],
          ...record,
          createdAt: items[existingIndex].createdAt || record.createdAt,
        };
      } else {
        items.unshift(record);
      }

      await writeSubmissions(items);
      sendJson(res, 201, {
        submissionId: record.submissionId,
        driveFolderId: record.driveFolderId,
        driveFileIds: record.files.map((file) => file.driveFileId).filter(Boolean),
        uploadStatus: record.status,
        uploadedAt: record.uploadedAt,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      console.error("Submission upload failed:", details);
      sendJson(res, 500, {
        error: `Gagal menyimpan submission. ${details}`,
        details,
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/app-release-policy") {
    try {
      const policy = await readAppReleasePolicy();
      sendJson(res, 200, policy);
    } catch (error) {
      sendJson(res, 500, {
        error: "Policy versi aplikasi belum bisa dibaca.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/submissions/me") {
    const [items, registrations] = await Promise.all([
      readSubmissions(),
      readRegistrations(),
    ]);
    const normalizedItems = items.map((item) => normalizeSubmissionIdentity(item, registrations));
    const uid = normalizeString(url.searchParams.get("uid"));
    const gmail = normalizeString(url.searchParams.get("gmail")).toLowerCase();
    const filtered = normalizedItems.filter((item) => {
      if (uid && item.uid === uid) return true;
      if (gmail && normalizeString(item.gmail).toLowerCase() === gmail) return true;
      return false;
    });

    sendJson(
      res,
      200,
      filtered.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    );
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/submissions") {
    const [items, registrations] = await Promise.all([
      readSubmissions(),
      readRegistrations(),
    ]);
    const normalizedItems = items.map((item) => normalizeSubmissionIdentity(item, registrations));
    const statusFilter = normalizeString(url.searchParams.get("status")).toUpperCase();
    const filtered = statusFilter
      ? normalizedItems.filter((item) => normalizeString(item.status).toUpperCase() === statusFilter)
      : normalizedItems;

    sendJson(res, 200, {
      items: filtered.sort((a, b) => String(b.uploadedAt || b.createdAt).localeCompare(String(a.uploadedAt || a.createdAt))),
      count: filtered.length,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/google-drive/check") {
    if (!isGoogleDriveStorageEnabled()) {
      sendJson(res, 409, {
        ok: false,
        error: "Mode Google Drive belum aktif di server ini.",
        mode: googleDriveConfig.mode,
        checkedAt: new Date().toISOString(),
      });
      return;
    }

    const checkedAt = new Date().toISOString();
    const result = {
      ok: false,
      mode: googleDriveConfig.mode,
      serviceAccountEmail: googleDriveConfig.clientEmail,
      checkedAt,
      registration: null,
      submission: null,
    };

    try {
      result.registration = await runGoogleDriveFolderCheck("registration");
    } catch (error) {
      result.registration = {
        kind: "registration",
        ok: false,
        folderId: normalizeString(googleDriveConfig.registrationsFolderId),
        error: error instanceof Error ? error.message : String(error),
      };
    }

    try {
      result.submission = await runGoogleDriveFolderCheck("submission");
    } catch (error) {
      result.submission = {
        kind: "submission",
        ok: false,
        folderId: normalizeString(googleDriveConfig.submissionsFolderId),
        error: error instanceof Error ? error.message : String(error),
      };
    }

    result.ok = Boolean(result.registration?.ok && result.submission?.ok);
    sendJson(res, result.ok ? 200 : 500, result);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/google-drive/migrate-registrations") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch {
      body = {};
    }

    const dryRun = body.dryRun !== false;
    const limit = normalizeNonNegativeInteger(body.limit);

    try {
      const result = await migrateRegistrationsToGoogleDrive({ dryRun, limit });
      sendJson(res, 200, result);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      const statusCode = /belum diaktifkan|wajib diisi/i.test(details) ? 409 : 500;
      sendJson(res, statusCode, {
        ok: false,
        error: "Migrasi registrasi ke Google Drive gagal dijalankan.",
        details,
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/google-drive/audit-registrations") {
    try {
      const result = await auditRegistrationsGoogleDrive();
      sendJson(res, 200, result);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      sendJson(res, 500, {
        ok: false,
        error: "Audit registrasi Google Drive gagal dijalankan.",
        details,
      });
    }
    return;
  }

  const submissionDeleteMatch = url.pathname.match(/^\/api\/admin\/submissions\/([^/]+)$/);
  if (req.method === "DELETE" && submissionDeleteMatch) {
    const [, submissionId] = submissionDeleteMatch;
    const items = await readSubmissions();
    const targetIndex = items.findIndex((item) => item.submissionId === submissionId);

    if (targetIndex < 0) {
      sendJson(res, 404, { error: "Submission tidak ditemukan." });
      return;
    }

    const [target] = items.splice(targetIndex, 1);

    try {
      await deleteSubmissionStoredFiles(target);
    } catch (error) {
      sendJson(res, 500, {
        error: "Submission ditemukan, tetapi file terkait belum bisa dihapus.",
        details: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    await writeSubmissions(items);
    sendJson(res, 200, {
      submissionId,
      deleted: true,
      deletedAt: new Date().toISOString(),
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/master-data/schools/upload") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Body JSON tidak valid.",
      });
      return;
    }

    const validationError = validateSchoolMasterUploadPayload(body);
    if (validationError) {
      sendJson(res, 422, { error: validationError });
      return;
    }

    try {
      const workbookBuffer = Buffer.from(normalizeString(body.base64Data), "base64");
      const parsedMasterData = parseSchoolMasterWorkbook(workbookBuffer);
      await writeSchoolMaster(parsedMasterData);
      sendJson(res, 200, {
        message: "Master data sekolah berhasil diperbarui dari file Excel.",
        datasetId: parsedMasterData.datasetId,
        title: parsedMasterData.title,
        columns: parsedMasterData.columns,
        rowCount: parsedMasterData.rows.length,
        updatedAt: parsedMasterData.updatedAt,
      });
    } catch (error) {
      sendJson(res, 422, {
        error: "File Excel belum bisa diproses sebagai master data sekolah.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/app-release-policy") {
    try {
      const policy = await readAppReleasePolicy();
      sendJson(res, 200, policy);
    } catch (error) {
      sendJson(res, 500, {
        error: "Policy versi aplikasi belum bisa dibaca.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/app-release-policy") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch {
      body = {};
    }

    try {
      const savedPolicy = await writeAppReleasePolicy(body);
      sendJson(res, 200, savedPolicy);
    } catch (error) {
      sendJson(res, 500, {
        error: "Policy versi aplikasi belum bisa disimpan.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/registrations") {
    const [items, registrationAreaNeeds] = await Promise.all([
      readRegistrations(),
      readRegistrationAreaNeeds(),
    ]);
    const rawStatusFilter = normalizeString(url.searchParams.get("status"));
    const statusFilter = rawStatusFilter ? normalizeRegistrationStatus(rawStatusFilter) : "";
    const filtered = statusFilter
      ? items.filter((item) => normalizeRegistrationStatus(item.status) === statusFilter)
      : items;

    sendJson(res, 200, {
      items: filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      count: filtered.length,
      registrationAreaNeeds,
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/registration-area-needs") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch {
      body = {};
    }

    const areaKerja = normalizeString(body.areaKerja);
    if (!areaKerja) {
      sendJson(res, 422, { error: "Area kerja wajib diisi." });
      return;
    }

    const requiredCount = normalizeNonNegativeInteger(body.requiredCount);
    const registrationAreaNeeds = await readRegistrationAreaNeeds();
    registrationAreaNeeds[areaKerja] = requiredCount;
    await writeRegistrationAreaNeeds(registrationAreaNeeds);

    sendJson(res, 200, {
      areaKerja,
      requiredCount,
      registrationAreaNeeds,
    });
    return;
  }

  const approvalMatch = url.pathname.match(/^\/api\/admin\/registrations\/([^/]+)\/(approve|reject|suspend)$/);
  if (req.method === "POST" && approvalMatch) {
    const [, registrationId, action] = approvalMatch;
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch {
      body = {};
    }

    const items = await readRegistrations();
    const target = items.find((item) => item.registrationId === registrationId);

    if (!target) {
      sendJson(res, 404, { error: "Registrasi tidak ditemukan." });
      return;
    }

    const adminNote = normalizeString(body.adminNote) || normalizeString(body.rejectionReason);
    target.status = action === "approve"
      ? "APPROVEDV2"
      : action === "reject"
        ? "REJECTED"
        : "SUSPENDED";
    target.adminNote = adminNote || target.adminNote || null;
    target.rejectionReason = action === "approve"
      ? null
      : adminNote || (action === "suspend"
        ? "Akun sedang ditangguhkan oleh admin."
        : "Tidak ada catatan tambahan.");
    target.updatedAt = new Date().toISOString();

    await writeRegistrations(items);
    sendJson(res, 200, {
      registrationId: target.registrationId,
      status: target.status,
      adminNote: target.adminNote,
      rejectionReason: target.rejectionReason,
      updatedAt: target.updatedAt,
    });
    return;
  }

  const noteMatch = url.pathname.match(/^\/api\/admin\/registrations\/([^/]+)\/note$/);
  if (req.method === "POST" && noteMatch) {
    const [, registrationId] = noteMatch;
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch {
      body = {};
    }

    const items = await readRegistrations();
    const target = items.find((item) => item.registrationId === registrationId);

    if (!target) {
      sendJson(res, 404, { error: "Registrasi tidak ditemukan." });
      return;
    }

    const adminNote = normalizeString(body.adminNote) || null;
    target.adminNote = adminNote;
    if (target.status === "REJECTED" || target.status === "SUSPENDED") {
      target.rejectionReason = adminNote || (
        target.status === "SUSPENDED"
          ? "Akun sedang ditangguhkan oleh admin."
          : "Tidak ada catatan tambahan."
      );
    }
    target.updatedAt = new Date().toISOString();

    await writeRegistrations(items);
    sendJson(res, 200, {
      registrationId: target.registrationId,
      adminNote: target.adminNote,
      rejectionReason: target.rejectionReason,
      updatedAt: target.updatedAt,
    });
    return;
  }

  const submissionApprovalMatch = url.pathname.match(/^\/api\/admin\/submissions\/([^/]+)\/(approve|reject|suspend)$/);
  if (req.method === "POST" && submissionApprovalMatch) {
    const [, submissionId, action] = submissionApprovalMatch;
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch {
      body = {};
    }

    const items = await readSubmissions();
    const target = items.find((item) => item.submissionId === submissionId);

    if (!target) {
      sendJson(res, 404, { error: "Submission tidak ditemukan." });
      return;
    }

    const adminNote = normalizeString(body.adminNote) || normalizeString(body.rejectionReason);
    target.reviewStatus = action === "approve"
      ? "APPROVED"
      : action === "reject"
        ? "REJECTED"
        : "SUSPENDED";
    target.adminNote = adminNote || target.adminNote || null;
    target.rejectionReason = action === "approve"
      ? null
      : adminNote || (action === "suspend"
        ? "Submission sedang ditangguhkan oleh admin."
        : "Tidak ada catatan tambahan.");
    target.updatedAt = new Date().toISOString();

    await writeSubmissions(items);
    sendJson(res, 200, {
      submissionId: target.submissionId,
      reviewStatus: target.reviewStatus,
      adminNote: target.adminNote,
      rejectionReason: target.rejectionReason,
      updatedAt: target.updatedAt,
    });
    return;
  }

  const submissionNoteMatch = url.pathname.match(/^\/api\/admin\/submissions\/([^/]+)\/note$/);
  if (req.method === "POST" && submissionNoteMatch) {
    const [, submissionId] = submissionNoteMatch;
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch {
      body = {};
    }

    const items = await readSubmissions();
    const target = items.find((item) => item.submissionId === submissionId);

    if (!target) {
      sendJson(res, 404, { error: "Submission tidak ditemukan." });
      return;
    }

    const adminNote = normalizeString(body.adminNote) || null;
    target.reviewStatus = normalizeSubmissionReviewStatus(target.reviewStatus);
    target.adminNote = adminNote;
    if (target.reviewStatus === "REJECTED" || target.reviewStatus === "SUSPENDED") {
      target.rejectionReason = adminNote || (
        target.reviewStatus === "SUSPENDED"
          ? "Submission sedang ditangguhkan oleh admin."
          : "Tidak ada catatan tambahan."
      );
    }
    target.updatedAt = new Date().toISOString();

    await writeSubmissions(items);
    sendJson(res, 200, {
      submissionId: target.submissionId,
      reviewStatus: target.reviewStatus,
      adminNote: target.adminNote,
      rejectionReason: target.rejectionReason,
      updatedAt: target.updatedAt,
    });
    return;
  }

  sendJson(res, 404, { error: "Endpoint tidak ditemukan." });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || `${HOST}:${PORT}`}`);
    const adminConfig = getAdminAuthConfig();

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    if (req.method === "GET" && (url.pathname === "/login" || url.pathname === "/login.html")) {
      if (!adminConfig.enabled || isAdminAuthenticated(req)) {
        sendRedirect(res, "/admin");
        return;
      }

      await sendStatic(res, "login.html");
      return;
    }

    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/admin" || url.pathname === "/admin/" || url.pathname === "/admin/index.html")) {
      if (adminConfig.enabled && !isAdminAuthenticated(req)) {
        sendRedirect(res, `/login?next=${encodeURIComponent("/admin")}`, {
          "Set-Cookie": expireAdminSessionCookie(req),
        });
        return;
      }

      await sendStatic(res, "admin/index.html");
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/uploads/google-drive/")) {
      const relativePath = url.pathname.replace(/^\/uploads\/google-drive\//, "");
      const [rawFileId] = relativePath.split("/");
      let fileId = "";
      try {
        fileId = decodeURIComponent(rawFileId || "");
      } catch {
        sendText(res, 400, "File ID tidak valid.");
        return;
      }

      try {
        const file = await fetchGoogleDriveFile(fileId);
        res.writeHead(200, {
          "Content-Type": file.contentType,
          "Content-Length": file.contentLength || String(file.buffer.length),
          "Cache-Control": "no-store",
        });
        res.end(file.buffer);
      } catch (error) {
        const message = error instanceof Error ? error.message : "File Google Drive tidak ditemukan.";
        const statusCode = /tidak valid/i.test(message)
          ? 400
          : /tidak ditemukan/i.test(message)
            ? 404
            : 500;
        sendText(res, statusCode, message);
      }
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/uploads/")) {
      await sendFileFromRoot(res, uploadsDir, url.pathname.replace(/^\/uploads\//, ""));
      return;
    }

    if (req.method === "GET" && /\.[a-z0-9]+$/i.test(url.pathname) && !url.pathname.startsWith("/admin/")) {
      await sendStatic(res, url.pathname.slice(1));
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/admin/")) {
      await sendStatic(res, url.pathname.slice(1));
      return;
    }

    sendText(res, 404, "Not found");
  } catch (error) {
    sendJson(res, 500, {
      error: "Terjadi kesalahan di server.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

ensureStorage()
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`TIC backend listening on http://${HOST}:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to prepare storage:", error);
    process.exitCode = 1;
  });

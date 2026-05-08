const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createHmac, randomUUID, timingSafeEqual } = require("node:crypto");
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
  return Array.isArray(parsed) ? parsed : [];
}

async function writeRegistrations(items) {
  await ensureStorage();
  await fs.writeFile(
    registrationsFile,
    `${JSON.stringify(items, null, 2)}\n`,
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
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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

async function storeSubmissionFiles(uid, submissionId, files) {
  if (!Array.isArray(files) || !files.length) {
    return [];
  }

  const safeUid = sanitizePathSegment(uid, "unknown_uid");
  const safeSubmissionId = sanitizePathSegment(submissionId, `submission_${Date.now()}`);
  const targetDir = path.join(uploadsDir, "submissions", safeUid, safeSubmissionId);
  await fs.mkdir(targetDir, { recursive: true });

  const storedFiles = [];
  for (const [index, file] of files.entries()) {
    const originalFileName = normalizeString(file.filename) || `evidence_${index + 1}.jpg`;
    const extension = getUploadExtension(originalFileName, file.mimeType);
    const safeBaseName = sanitizePathSegment(path.parse(originalFileName).name, `evidence_${index + 1}`);
    const storedFileName = `${String(index + 1).padStart(2, "0")}_${safeBaseName}${extension}`;
    const base64Data = normalizeString(file.base64Data);
    let fileUrl = normalizeString(file.driveFileId) || null;

    if (base64Data) {
      const targetPath = path.join(targetDir, storedFileName);
      await fs.writeFile(targetPath, Buffer.from(base64Data, "base64"));
      fileUrl = `/uploads/submissions/${encodeURIComponent(safeUid)}/${encodeURIComponent(safeSubmissionId)}/${encodeURIComponent(storedFileName)}`;
    }

    storedFiles.push({
      id: normalizeString(file.id) || `file-${randomUUID().slice(0, 8)}`,
      submissionId: normalizeString(file.submissionId) || submissionId,
      fileType: normalizeString(file.fileType) || "PHOTO",
      localPath: normalizeString(file.localPath),
      driveFileId: fileUrl,
      filename: originalFileName,
      createdAt: normalizeString(file.createdAt) || new Date().toISOString(),
      mimeType: normalizeString(file.mimeType) || "image/jpeg",
    });
  }

  return storedFiles;
}

async function storeRegistrationAsset(body) {
  const uid = normalizeString(body.uid);
  const assetType = normalizeString(body.assetType).toLowerCase();
  const extension = getUploadExtension(body.fileName, body.mimeType);
  const timestamp = Date.now();
  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeFileName = `${assetType}_${timestamp}${extension}`;
  const targetDir = path.join(uploadsDir, "registrations", safeUid);
  const targetPath = path.join(targetDir, safeFileName);

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetPath, Buffer.from(normalizeString(body.base64Data), "base64"));

  const relativeFilePath = `/uploads/registrations/${encodeURIComponent(safeUid)}/${encodeURIComponent(safeFileName)}`;
  return {
    assetType,
    fileName: safeFileName,
    fileUrl: relativeFilePath,
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
  const files = await storeSubmissionFiles(
    normalizeString(body.uid),
    normalizeString(body.submissionId),
    Array.isArray(body.files) ? body.files : [],
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
    driveFolderId: normalizeString(body.driveFolderId) || null,
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
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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
      sendJson(res, 500, {
        error: "Gagal menyimpan file upload.",
        details: error instanceof Error ? error.message : String(error),
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
    const items = await readRegistrations();
    const record = findRegistration(items, url.searchParams);

    if (!record) {
      sendJson(res, 404, { error: "User profile tidak ditemukan." });
      return;
    }

    sendJson(res, 200, toUserProfile(record));
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

  if (req.method === "GET" && url.pathname === "/api/admin/registrations") {
    const [items, registrationAreaNeeds] = await Promise.all([
      readRegistrations(),
      readRegistrationAreaNeeds(),
    ]);
    const statusFilter = normalizeString(url.searchParams.get("status")).toUpperCase();
    const filtered = statusFilter
      ? items.filter((item) => item.status === statusFilter)
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
      ? "APPROVED"
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

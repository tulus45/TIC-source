const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { URL } = require("node:url");

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

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(text);
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

  if (req.method === "GET" && url.pathname === "/api/admin/registrations") {
    const items = await readRegistrations();
    const statusFilter = normalizeString(url.searchParams.get("status")).toUpperCase();
    const filtered = statusFilter
      ? items.filter((item) => item.status === statusFilter)
      : items;

    sendJson(res, 200, {
      items: filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      count: filtered.length,
    });
    return;
  }

  const approvalMatch = url.pathname.match(/^\/api\/admin\/registrations\/([^/]+)\/(approve|reject)$/);
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
    target.status = action === "approve" ? "APPROVED" : "REJECTED";
    target.adminNote = adminNote || target.adminNote || null;
    target.rejectionReason = action === "reject"
      ? adminNote || "Tidak ada catatan tambahan."
      : null;
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
    if (target.status === "REJECTED") {
      target.rejectionReason = adminNote || "Tidak ada catatan tambahan.";
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

  sendJson(res, 404, { error: "Endpoint tidak ditemukan." });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || `${HOST}:${PORT}`}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/admin")) {
      await sendStatic(res, "admin/index.html");
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/uploads/")) {
      await sendFileFromRoot(res, uploadsDir, url.pathname.replace(/^\/uploads\//, ""));
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

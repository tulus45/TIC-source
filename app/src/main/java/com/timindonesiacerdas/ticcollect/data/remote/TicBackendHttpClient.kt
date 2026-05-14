package com.timindonesiacerdas.ticcollect.data.remote

import android.util.Base64
import com.timindonesiacerdas.ticcollect.BuildConfig
import com.timindonesiacerdas.ticcollect.data.local.InMemorySessionStore
import com.timindonesiacerdas.ticcollect.data.model.AppReleasePolicy
import com.timindonesiacerdas.ticcollect.data.model.RegistrationDraft
import com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus
import com.timindonesiacerdas.ticcollect.data.model.SubmissionRecord
import com.timindonesiacerdas.ticcollect.data.model.SubmissionStatus
import com.timindonesiacerdas.ticcollect.data.model.UserProfile
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL
import java.net.URLEncoder
import java.net.UnknownHostException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

private const val connectTimeoutMillis = 20_000
private const val readTimeoutMillis = 120_000

open class TicBackendException(
    message: String,
    cause: Throwable? = null,
) : IOException(message, cause)

class TicBackendNotFoundException(
    message: String,
) : TicBackendException(message)

object TicBackendHttpClient : TicBackendApiContract {
    private val candidateBaseUrls = buildList {
        add(BuildConfig.BACKEND_BASE_URL.removeSuffix("/"))
        add("http://10.0.2.2:8787")
        add("http://127.0.0.1:8787")
    }.distinct()

    @Volatile
    private var activeBaseUrl: String = candidateBaseUrls.first()

    override suspend fun verifyFirebaseToken(request: VerifyAuthRequest): VerifyAuthResponse {
        throw TicBackendException("Verifikasi Firebase belum diimplementasikan pada backend lokal ini.")
    }

    override suspend fun getCurrentUser(
        uid: String?,
        gmail: String?,
        registrationId: String?,
        previousUid: String?,
    ): CurrentUserResponse {
        val payload = requestJson(
            method = "GET",
            path = TicApiRoutes.currentUser,
            query = buildQuery(uid, gmail, registrationId, previousUid),
        )

        return CurrentUserResponse(
            profile = UserProfile(
                uid = payload.optString("uid"),
                gmail = payload.optString("gmail"),
                displayName = payload.optString("displayName"),
                nik = payload.optStringOrNull("nik"),
                nama = payload.optStringOrNull("nama"),
                alamat = payload.optStringOrNull("alamat"),
                rtRw = payload.optStringOrNull("rtRw"),
                kelDesa = payload.optStringOrNull("kelDesa"),
                kecamatan = payload.optStringOrNull("kecamatan"),
                kabupaten = payload.optStringOrNull("kabupaten"),
                noHp = payload.optStringOrNull("noHp"),
                noRekening = payload.optStringOrNull("noRekening"),
                namaBank = payload.optStringOrNull("namaBank"),
                namaPemilik = payload.optStringOrNull("namaPemilik"),
                areaKerja = payload.optStringOrNull("areaKerja"),
                status = payload.optRegistrationStatus("status"),
                rejectionReason = payload.optStringOrNull("rejectionReason"),
                ktpDriveFileId = payload.optStringOrNull("ktpDriveFileId"),
                selfieDriveFileId = payload.optStringOrNull("selfieDriveFileId"),
                createdAt = payload.optStringOrNull("createdAt"),
                updatedAt = payload.optStringOrNull("updatedAt"),
            ),
            appReleasePolicy = payload.optAppReleasePolicy("appReleasePolicy"),
        )
    }

    override suspend fun getSchoolMasterData(): SchoolMasterDataResponse {
        val payload = requestJson(
            method = "GET",
            path = TicApiRoutes.schoolMaster,
        )

        return SchoolMasterDataResponse(
            datasetId = payload.optString("datasetId"),
            title = payload.optString("title"),
            columns = payload.optStringList("columns"),
            rows = payload.optNestedStringLists("rows"),
            updatedAt = payload.optStringOrNull("updatedAt"),
        )
    }

    override suspend fun getRegistrationStatus(
        uid: String?,
        gmail: String?,
        registrationId: String?,
        previousUid: String?,
    ): RegistrationStatusResponse {
        val payload = requestJson(
            method = "GET",
            path = TicApiRoutes.registrationStatus,
            query = buildQuery(uid, gmail, registrationId, previousUid),
        )

        return RegistrationStatusResponse(
            registrationId = payload.optStringOrNull("registrationId"),
            status = payload.optString("status"),
            rejectionReason = payload.optStringOrNull("rejectionReason"),
            updatedAt = payload.optStringOrNull("updatedAt"),
        )
    }

    override suspend fun uploadRegistrationAsset(
        uid: String,
        gmail: String,
        assetType: String,
        filePath: String,
    ): RegistrationAssetUploadResponse {
        val file = File(filePath)
        if (!file.exists()) {
            throw TicBackendException("File ${assetLabel(assetType)} tidak ditemukan di device.")
        }

        val base64Data = withContext(Dispatchers.IO) {
            Base64.encodeToString(file.readBytes(), Base64.NO_WRAP)
        }

        val payload = requestJson(
            method = "POST",
            path = "/api/uploads/registration-assets",
            body = JSONObject().apply {
                put("uid", uid)
                put("gmail", gmail)
                put("assetType", assetType)
                put("fileName", file.name)
                put("mimeType", guessMimeType(file))
                put("base64Data", base64Data)
            },
        )

        return RegistrationAssetUploadResponse(
            assetType = payload.optString("assetType"),
            fileName = payload.optString("fileName"),
            fileUrl = payload.optString("fileUrl"),
        )
    }

    override suspend fun submitRegistration(
        draft: RegistrationDraft,
        previousUid: String?,
    ): RegistrationUploadResponse {
        val payload = requestJson(
            method = "POST",
            path = TicApiRoutes.registrations,
            body = JSONObject().apply {
                put("uid", draft.uid)
                previousUid?.trim()?.takeIf { it.isNotBlank() }?.let { put("previousUid", it) }
                put("gmail", draft.gmail)
                put("displayName", draft.displayName)
                put("nik", draft.nik)
                put("nama", draft.nama)
                put("alamat", draft.alamat)
                put("rtRw", draft.rtRw)
                put("kelDesa", draft.kelDesa)
                put("kecamatan", draft.kecamatan)
                put("kabupaten", draft.kabupaten)
                put("noHp", draft.noHp)
                put("noRekening", draft.noRekening)
                put("namaBank", draft.namaBank)
                put("namaPemilik", draft.namaPemilik)
                put("areaKerja", draft.areaKerja)
                put("ktpLocalPath", draft.ktpLocalPath)
                put("selfieLocalPath", draft.selfieLocalPath)
                put("ktpDriveFileId", draft.ktpDriveFileId)
                put("selfieDriveFileId", draft.selfieDriveFileId)
                put("createdAt", draft.createdAt)
                put("updatedAt", draft.updatedAt)
            },
        )

        return RegistrationUploadResponse(
            registrationId = payload.optStringOrNull("registrationId"),
            status = payload.optString("status"),
            ktpDriveFileId = payload.optStringOrNull("ktpDriveFileId"),
            selfieDriveFileId = payload.optStringOrNull("selfieDriveFileId"),
        )
    }

    override suspend fun submitSubmission(record: SubmissionRecord): SubmissionUploadResponse {
        val preparedFiles = withContext(Dispatchers.IO) {
            record.files.map { file ->
                val sourceFile = File(file.localPath)
                if (!sourceFile.exists()) {
                    throw TicBackendException("File evidence ${file.filename} tidak ditemukan di device.")
                }

                JSONObject().apply {
                    put("id", file.id)
                    put("submissionId", file.submissionId)
                    put("fileType", file.fileType.name)
                    put("localPath", file.localPath)
                    put("driveFileId", file.driveFileId)
                    put("filename", file.filename)
                    put("createdAt", file.createdAt)
                    put("mimeType", guessMimeType(sourceFile))
                    put(
                        "base64Data",
                        Base64.encodeToString(sourceFile.readBytes(), Base64.NO_WRAP),
                    )
                }
            }
        }

        val payload = requestJson(
            method = "POST",
            path = TicApiRoutes.submissions,
            body = JSONObject().apply {
                put("submissionId", record.submissionId)
                put("uid", record.uid)
                put("gmail", record.gmail)
                put("nama", record.nama)
                put("projectName", record.projectName)
                put("formName", record.formName)
                put("answersJson", record.answersJson)
                put("gpsLat", record.gpsLat)
                put("gpsLng", record.gpsLng)
                put("gpsAccuracy", record.gpsAccuracy)
                put("driveFolderId", record.driveFolderId)
                put("status", record.status.name)
                put("createdAt", record.createdAt)
                put("uploadedAt", record.uploadedAt)
                put(
                    "files",
                    org.json.JSONArray().apply {
                        preparedFiles.forEach(::put)
                    },
                )
            },
        )

        return SubmissionUploadResponse(
            submissionId = payload.optString("submissionId"),
            driveFolderId = payload.optStringOrNull("driveFolderId"),
            driveFileIds = payload.optStringList("driveFileIds"),
            uploadStatus = payload.optString("uploadStatus"),
            uploadedAt = payload.optStringOrNull("uploadedAt"),
        )
    }

    override suspend fun getMySubmissions(): List<SubmissionRecord> {
        val currentUser = InMemorySessionStore.session.value.user
            ?: throw TicBackendException("Identitas perangkat belum tersedia.")

        val payload = requestJsonArray(
            method = "GET",
            path = TicApiRoutes.mySubmissions,
            query = buildQuery(currentUser.uid, currentUser.gmail, null, null),
        )

        return buildList(payload.length()) {
            for (index in 0 until payload.length()) {
                val item = payload.optJSONObject(index) ?: continue
                add(
                    SubmissionRecord(
                        submissionId = item.optString("submissionId"),
                        uid = item.optString("uid"),
                        gmail = item.optString("gmail"),
                        nama = item.optString("nama"),
                        projectName = item.optString("projectName"),
                        formName = item.optString("formName"),
                        answersJson = item.optString("answersJson"),
                        gpsLat = if (item.has("gpsLat") && !item.isNull("gpsLat")) item.optDouble("gpsLat") else null,
                        gpsLng = if (item.has("gpsLng") && !item.isNull("gpsLng")) item.optDouble("gpsLng") else null,
                        gpsAccuracy = if (item.has("gpsAccuracy") && !item.isNull("gpsAccuracy")) item.optDouble("gpsAccuracy").toFloat() else null,
                        driveFolderId = item.optStringOrNull("driveFolderId"),
                        status = runCatching {
                            SubmissionStatus.valueOf(item.optString("status").trim().uppercase())
                        }.getOrDefault(SubmissionStatus.DRAFT),
                        createdAt = item.optString("createdAt"),
                        uploadedAt = item.optStringOrNull("uploadedAt"),
                        files = emptyList(),
                    ),
                )
            }
        }
    }

    private suspend fun requestJson(
        method: String,
        path: String,
        query: Map<String, String> = emptyMap(),
        body: JSONObject? = null,
    ): JSONObject = withContext(Dispatchers.IO) {
        val prioritizedBaseUrls = buildList {
            add(activeBaseUrl)
            addAll(candidateBaseUrls.filterNot { it == activeBaseUrl })
        }

        var lastConnectionError: IOException? = null

        for (baseUrl in prioritizedBaseUrls) {
            try {
                val payload = requestJsonOnce(
                    baseUrl = baseUrl,
                    method = method,
                    path = path,
                    query = query,
                    body = body,
                )
                activeBaseUrl = baseUrl
                return@withContext payload
            } catch (error: IOException) {
                when (error) {
                    is TicBackendNotFoundException -> throw error
                    is TicBackendException -> throw error
                    is UnknownHostException,
                    is SocketTimeoutException -> lastConnectionError = error
                    else -> lastConnectionError = error
                }
            }
        }

        val message = when (lastConnectionError) {
            is SocketTimeoutException ->
                "Upload ke server memakan waktu terlalu lama dan timeout. Coba ulangi lagi. Jika backend sedang memakai Google Drive, proses upload memang bisa lebih lambat dari biasanya."
            else ->
                "Tidak bisa terhubung ke server registrasi. Alamat yang dicoba: ${prioritizedBaseUrls.joinToString()}. Pastikan backend online aktif, atau override `ticBackendBaseUrl` saat build kalau Anda sedang testing ke server lokal."
        }

        throw TicBackendException(
            message = message,
            cause = lastConnectionError,
        )
    }

    private suspend fun requestJsonArray(
        method: String,
        path: String,
        query: Map<String, String> = emptyMap(),
    ): org.json.JSONArray = withContext(Dispatchers.IO) {
        val prioritizedBaseUrls = buildList {
            add(activeBaseUrl)
            addAll(candidateBaseUrls.filterNot { it == activeBaseUrl })
        }

        var lastConnectionError: IOException? = null

        for (baseUrl in prioritizedBaseUrls) {
            try {
                val payload = requestJsonArrayOnce(
                    baseUrl = baseUrl,
                    method = method,
                    path = path,
                    query = query,
                )
                activeBaseUrl = baseUrl
                return@withContext payload
            } catch (error: IOException) {
                when (error) {
                    is TicBackendNotFoundException -> throw error
                    is TicBackendException -> throw error
                    is UnknownHostException,
                    is SocketTimeoutException -> lastConnectionError = error
                    else -> lastConnectionError = error
                }
            }
        }

        val message = when (lastConnectionError) {
            is SocketTimeoutException ->
                "Request ke server memakan waktu terlalu lama dan timeout. Coba ulangi lagi. Jika backend sedang memakai Google Drive, proses ini memang bisa lebih lambat dari biasanya."
            else ->
                "Tidak bisa terhubung ke server registrasi. Alamat yang dicoba: ${prioritizedBaseUrls.joinToString()}. Pastikan backend online aktif, atau override `ticBackendBaseUrl` saat build kalau Anda sedang testing ke server lokal."
        }

        throw TicBackendException(
            message = message,
            cause = lastConnectionError,
        )
    }

    private fun buildUrl(
        baseUrl: String,
        path: String,
        query: Map<String, String>,
    ): String {
        val queryString = query.entries
            .joinToString("&") { (key, value) ->
                "${urlEncode(key)}=${urlEncode(value)}"
            }

        return if (queryString.isBlank()) {
            "$baseUrl$path"
        } else {
            "$baseUrl$path?$queryString"
        }
    }

    private fun requestJsonOnce(
        baseUrl: String,
        method: String,
        path: String,
        query: Map<String, String>,
        body: JSONObject?,
    ): JSONObject {
        val requestUrl = buildUrl(baseUrl, path, query)
        val connection = (URL(requestUrl).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = connectTimeoutMillis
            readTimeout = readTimeoutMillis
            doInput = true
            setRequestProperty("Accept", "application/json")
        }

        if (body != null) {
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            connection.outputStream.bufferedWriter(Charsets.UTF_8).use { writer ->
                writer.write(body.toString())
            }
        }

        try {
            val statusCode = connection.responseCode
            val stream = if (statusCode in 200..299) connection.inputStream else connection.errorStream
            val rawBody = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            val payload = if (rawBody.isBlank()) JSONObject() else JSONObject(rawBody)

            if (statusCode !in 200..299) {
                val message = payload.optString("error").ifBlank {
                    "Server registrasi mengembalikan kode $statusCode."
                }
                if (statusCode == 404) {
                    throw TicBackendNotFoundException(message)
                }
                throw TicBackendException(message)
            }

            return payload
        } finally {
            connection.disconnect()
        }
    }

    private fun requestJsonArrayOnce(
        baseUrl: String,
        method: String,
        path: String,
        query: Map<String, String>,
    ): org.json.JSONArray {
        val requestUrl = buildUrl(baseUrl, path, query)
        val connection = (URL(requestUrl).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = connectTimeoutMillis
            readTimeout = readTimeoutMillis
            doInput = true
            setRequestProperty("Accept", "application/json")
        }

        try {
            val statusCode = connection.responseCode
            val stream = if (statusCode in 200..299) connection.inputStream else connection.errorStream
            val rawBody = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()

            if (statusCode !in 200..299) {
                val payload = if (rawBody.isBlank()) JSONObject() else JSONObject(rawBody)
                val message = payload.optString("error").ifBlank {
                    "Server registrasi mengembalikan kode $statusCode."
                }
                if (statusCode == 404) {
                    throw TicBackendNotFoundException(message)
                }
                throw TicBackendException(message)
            }

            return if (rawBody.isBlank()) org.json.JSONArray() else org.json.JSONArray(rawBody)
        } finally {
            connection.disconnect()
        }
    }

    private fun buildQuery(
        uid: String?,
        gmail: String?,
        registrationId: String?,
        previousUid: String?,
    ): Map<String, String> = buildMap {
        uid?.trim()?.takeIf { it.isNotBlank() }?.let { put("uid", it) }
        gmail?.trim()?.takeIf { it.isNotBlank() }?.let { put("gmail", it) }
        registrationId?.trim()?.takeIf { it.isNotBlank() }?.let { put("registrationId", it) }
        previousUid?.trim()?.takeIf { it.isNotBlank() }?.let { put("previousUid", it) }
    }

    private fun urlEncode(value: String): String = URLEncoder.encode(value, Charsets.UTF_8.name())

    private fun guessMimeType(file: File): String {
        return when (file.extension.lowercase()) {
            "png" -> "image/png"
            "webp" -> "image/webp"
            else -> "image/jpeg"
        }
    }

    private fun assetLabel(assetType: String): String = when (assetType.lowercase()) {
        "ktp" -> "KTP"
        "selfie" -> "selfie"
        else -> "dokumen"
    }

    private fun JSONObject.optRegistrationStatus(key: String): RegistrationStatus =
        runCatching { RegistrationStatus.valueOf(optString(key).trim().uppercase()) }
            .getOrDefault(RegistrationStatus.NOT_REGISTERED)

    private fun JSONObject.optStringList(key: String): List<String> {
        val rawArray = optJSONArray(key) ?: return emptyList()
        return buildList(rawArray.length()) {
            for (index in 0 until rawArray.length()) {
                val value = rawArray.optString(index).trim()
                if (value.isNotBlank()) {
                    add(value)
                }
            }
        }
    }

    private fun JSONObject.optNestedStringLists(key: String): List<List<String>> {
        val rawArray = optJSONArray(key) ?: return emptyList()
        return buildList(rawArray.length()) {
            for (index in 0 until rawArray.length()) {
                val rowArray = rawArray.optJSONArray(index) ?: continue
                val row = buildList(rowArray.length()) {
                    for (cellIndex in 0 until rowArray.length()) {
                        add(rowArray.optString(cellIndex).trim())
                    }
                }
                if (row.any { it.isNotBlank() }) {
                    add(row)
                }
            }
        }
    }

    private fun JSONObject.optStringOrNull(key: String): String? {
        if (isNull(key)) return null
        return optString(key).trim().ifBlank { null }
    }

    private fun JSONObject.optAppReleasePolicy(key: String): AppReleasePolicy {
        val policy = optJSONObject(key) ?: return AppReleasePolicy()
        return AppReleasePolicy(
            minimumApprovedVersionCode = policy.optInt("minimumApprovedVersionCode", 0).coerceAtLeast(0),
            latestVersionCode = policy.optInt("latestVersionCode", 0).coerceAtLeast(0),
            latestVersionName = policy.optStringOrNull("latestVersionName"),
            updateUrl = policy.optStringOrNull("updateUrl"),
            updateMessage = policy.optStringOrNull("updateMessage"),
            updatedAt = policy.optStringOrNull("updatedAt"),
        )
    }
}

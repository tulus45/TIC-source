package com.timindonesiacerdas.ticcollect.data.local

import android.app.Application
import android.content.SharedPreferences
import android.provider.Settings
import androidx.room.Room
import com.timindonesiacerdas.ticcollect.BuildConfig
import com.timindonesiacerdas.ticcollect.data.local.db.RegistrationDraftDao
import com.timindonesiacerdas.ticcollect.data.local.db.SessionDao
import com.timindonesiacerdas.ticcollect.data.local.db.SessionEntity
import com.timindonesiacerdas.ticcollect.data.local.db.TicLocalDatabase
import com.timindonesiacerdas.ticcollect.data.local.db.toAuthenticatedUser
import com.timindonesiacerdas.ticcollect.data.local.db.toEntity
import com.timindonesiacerdas.ticcollect.data.local.db.toLocalDraft
import com.timindonesiacerdas.ticcollect.data.local.db.toUserProfile
import com.timindonesiacerdas.ticcollect.data.model.AppAccessState
import com.timindonesiacerdas.ticcollect.data.model.AppReleasePolicy
import com.timindonesiacerdas.ticcollect.data.model.AuthenticatedUser
import com.timindonesiacerdas.ticcollect.data.model.LocalRegistrationDraft
import com.timindonesiacerdas.ticcollect.data.model.RegistrationDraft
import com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus
import com.timindonesiacerdas.ticcollect.data.model.SessionState
import com.timindonesiacerdas.ticcollect.data.model.SubmissionFileType
import com.timindonesiacerdas.ticcollect.data.model.SubmissionRecord
import com.timindonesiacerdas.ticcollect.data.model.SubmissionStatus
import com.timindonesiacerdas.ticcollect.data.model.UserProfile
import com.timindonesiacerdas.ticcollect.data.remote.RegistrationUploadResponse
import com.timindonesiacerdas.ticcollect.data.remote.TicBackendHttpClient
import com.timindonesiacerdas.ticcollect.utils.ImageUploadOptimizer
import com.timindonesiacerdas.ticcollect.utils.TimeFormatter
import java.io.File
import java.util.UUID
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

object InMemorySessionStore {
    private const val databaseName = "tic_collect.db"
    private const val preferencesName = "tic_collect_prefs"
    private const val installationUidKey = "installation_uid"
    private const val legacyInstallationUidKey = "legacy_installation_uid"
    private const val legacyDemoUidKey = "demo_uid"
    private const val submissionsStorageKey = "submissions_json"
    private const val stableInstallationUidPrefix = "tic-device-"

    private val storeScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val _session = MutableStateFlow(SessionState())
    val session: StateFlow<SessionState> = _session.asStateFlow()

    private val _submissions = MutableStateFlow<List<SubmissionRecord>>(emptyList())
    val submissions: StateFlow<List<SubmissionRecord>> = _submissions.asStateFlow()

    private val _currentRegistrationDraft = MutableStateFlow<LocalRegistrationDraft?>(null)
    val currentRegistrationDraft: StateFlow<LocalRegistrationDraft?> = _currentRegistrationDraft.asStateFlow()

    @Volatile
    private var initialized = false

    private lateinit var application: Application
    private lateinit var sessionDao: SessionDao
    private lateinit var registrationDraftDao: RegistrationDraftDao

    fun initialize(application: Application) {
        if (initialized) return

        synchronized(this) {
            if (initialized) return

            val database = Room.databaseBuilder(
                application,
                TicLocalDatabase::class.java,
                databaseName,
            ).fallbackToDestructiveMigration().build()

            this.application = application
            sessionDao = database.sessionDao()
            registrationDraftDao = database.registrationDraftDao()
            initialized = true
            _session.value = SessionState(
                isAuthenticated = true,
                user = buildLocalIdentity(),
                appAccess = buildCurrentAppAccessState(),
            )
            _submissions.value = loadStoredSubmissions()
            bindPersistentFlows()
            ensureLocalIdentity()
        }
    }

    fun ensureLocalIdentity() {
        ensureInitialized()
        val localIdentity = buildLocalIdentity()
        _session.value = _session.value.copy(
            isAuthenticated = true,
            user = localIdentity,
            appAccess = _session.value.appAccess.takeIf { it.currentVersionCode > 0 }
                ?: buildCurrentAppAccessState(),
        )
        maybeMigrateLegacyLocalData(localIdentity.uid)

        storeScope.launch {
            sessionDao.upsert(
                SessionEntity(
                    isAuthenticated = true,
                    uid = localIdentity.uid,
                    gmail = localIdentity.gmail,
                    displayName = localIdentity.displayName,
                    photoUrl = localIdentity.photoUrl,
                    firebaseIdToken = localIdentity.firebaseIdToken,
                ),
            )
        }
    }

    suspend fun simulateGoogleLogin() {
        ensureLocalIdentity()
    }

    private fun getOrCreateInstallationUid(): String {
        val preferences = application.getSharedPreferences(preferencesName, Application.MODE_PRIVATE)
        val existingValue = preferences.getString(installationUidKey, null)?.trim().orEmpty()
        if (existingValue.isNotBlank() && isStableInstallationUid(existingValue)) {
            return existingValue
        }

        val stableUid = buildStableInstallationUid()
        val legacyValue = existingValue.ifBlank {
            preferences.getString(legacyDemoUidKey, null)?.trim().orEmpty()
        }

        persistResolvedInstallationUid(
            preferences = preferences,
            currentUid = stableUid,
            previousUid = legacyValue.takeIf { it.isNotBlank() && it != stableUid },
        )
        return stableUid
    }

    private fun buildLocalIdentity(): AuthenticatedUser = AuthenticatedUser(
        uid = getOrCreateInstallationUid(),
        gmail = "",
        displayName = "",
        photoUrl = null,
        firebaseIdToken = null,
    )

    private fun buildFallbackSessionState(): SessionState {
        val localIdentity = buildLocalIdentity()
        return SessionState(
            isAuthenticated = true,
            user = localIdentity,
            profile = _session.value.profile?.takeIf { it.uid == localIdentity.uid },
            appAccess = _session.value.appAccess.takeIf { it.currentVersionCode > 0 }
                ?: buildCurrentAppAccessState(),
        )
    }

    suspend fun saveRegistrationDraft(draft: LocalRegistrationDraft) {
        ensureInitialized()
        registrationDraftDao.upsert(draft.toEntity())
    }

    suspend fun submitRegistration(draft: RegistrationDraft) {
        ensureInitialized()
        registrationDraftDao.upsert(draft.toLocalDraft().toEntity())
    }

    suspend fun submitRegistrationToBackend(draft: RegistrationDraft): RegistrationUploadResponse {
        ensureInitialized()

        val optimizedKtp = ImageUploadOptimizer.prepareForUpload(
            context = application,
            filePath = draft.ktpLocalPath,
            uploadLabel = "KTP",
        )
        val optimizedSelfie = ImageUploadOptimizer.prepareForUpload(
            context = application,
            filePath = draft.selfieLocalPath,
            uploadLabel = "selfie",
        )

        val ktpUpload = TicBackendHttpClient.uploadRegistrationAsset(
            uid = draft.uid,
            gmail = draft.gmail,
            assetType = "ktp",
            filePath = optimizedKtp.file.absolutePath,
        )
        val selfieUpload = TicBackendHttpClient.uploadRegistrationAsset(
            uid = draft.uid,
            gmail = draft.gmail,
            assetType = "selfie",
            filePath = optimizedSelfie.file.absolutePath,
        )
        val draftWithUploadRefs = draft.copy(
            ktpDriveFileId = ktpUpload.fileUrl,
            selfieDriveFileId = selfieUpload.fileUrl,
        )

        val response = TicBackendHttpClient.submitRegistration(
            draft = draftWithUploadRefs,
            previousUid = getLegacyInstallationUid(),
        )
        val localDraft = draft.toLocalDraft().copy(
            ktpDriveFileId = response.ktpDriveFileId ?: draftWithUploadRefs.ktpDriveFileId,
            selfieDriveFileId = response.selfieDriveFileId ?: draftWithUploadRefs.selfieDriveFileId,
            status = registrationStatusFromServer(response.status, default = RegistrationStatus.PENDING),
            rejectionReason = null,
            updatedAt = TimeFormatter.nowStorage(),
        )
        registrationDraftDao.upsert(localDraft.toEntity())
        return response
    }

    suspend fun restoreRegistrationByEmail(email: String): UserProfile {
        ensureInitialized()
        ensureLocalIdentity()

        val normalizedEmail = email.trim()
        require(normalizedEmail.isNotBlank()) {
            "Email wajib diisi."
        }

        val activeUser = session.value.user ?: buildLocalIdentity()
        sessionDao.upsert(
            SessionEntity(
                isAuthenticated = true,
                uid = activeUser.uid,
                gmail = normalizedEmail,
                displayName = activeUser.displayName,
                photoUrl = activeUser.photoUrl,
                firebaseIdToken = activeUser.firebaseIdToken,
            ),
        )

        return syncRegistrationFromBackend(
            user = activeUser,
            gmailOverride = normalizedEmail,
        )
    }

    suspend fun refreshRegistrationFromBackend(): UserProfile? {
        ensureInitialized()
        val user = session.value.user ?: return null
        return syncRegistrationFromBackend(user)
    }

    private suspend fun syncRegistrationFromBackend(
        user: AuthenticatedUser,
        gmailOverride: String? = null,
    ): UserProfile {
        val previousUid = getLegacyInstallationUid()
        val resolvedGmail = gmailOverride?.trim().takeIf { it?.isNotBlank() == true } ?: user.gmail

        val currentUser = TicBackendHttpClient.getCurrentUser(
            uid = user.uid,
            gmail = resolvedGmail,
            previousUid = previousUid,
        )
        val remoteProfile = currentUser.profile
        val appAccess = buildCurrentAppAccessState(currentUser.appReleasePolicy)

        val currentDraft = registrationDraftDao.getByUid(user.uid)?.toLocalDraft()
        val mergedDraft = LocalRegistrationDraft(
            uid = user.uid,
            gmail = remoteProfile.gmail.ifBlank { resolvedGmail.ifBlank { user.gmail } },
            displayName = remoteProfile.displayName.ifBlank { user.displayName },
            nik = remoteProfile.nik ?: currentDraft?.nik.orEmpty(),
            nama = remoteProfile.nama ?: currentDraft?.nama.orEmpty(),
            alamat = remoteProfile.alamat ?: currentDraft?.alamat.orEmpty(),
            rtRw = remoteProfile.rtRw ?: currentDraft?.rtRw.orEmpty(),
            kelDesa = remoteProfile.kelDesa ?: currentDraft?.kelDesa.orEmpty(),
            kecamatan = remoteProfile.kecamatan ?: currentDraft?.kecamatan.orEmpty(),
            kabupaten = remoteProfile.kabupaten ?: currentDraft?.kabupaten.orEmpty(),
            noHp = remoteProfile.noHp ?: currentDraft?.noHp.orEmpty(),
            noRekening = remoteProfile.noRekening ?: currentDraft?.noRekening.orEmpty(),
            namaBank = remoteProfile.namaBank ?: currentDraft?.namaBank.orEmpty(),
            namaPemilik = remoteProfile.namaPemilik ?: currentDraft?.namaPemilik.orEmpty(),
            areaKerja = remoteProfile.areaKerja ?: currentDraft?.areaKerja.orEmpty(),
            ktpLocalPath = currentDraft?.ktpLocalPath,
            selfieLocalPath = currentDraft?.selfieLocalPath,
            ktpDriveFileId = remoteProfile.ktpDriveFileId ?: currentDraft?.ktpDriveFileId,
            selfieDriveFileId = remoteProfile.selfieDriveFileId ?: currentDraft?.selfieDriveFileId,
            status = remoteProfile.status,
            rejectionReason = remoteProfile.rejectionReason,
            createdAt = remoteProfile.createdAt ?: currentDraft?.createdAt ?: TimeFormatter.nowStorage(),
            updatedAt = remoteProfile.updatedAt ?: TimeFormatter.nowStorage(),
        )
        registrationDraftDao.upsert(mergedDraft.toEntity())
        sessionDao.upsert(
            SessionEntity(
                isAuthenticated = true,
                uid = user.uid,
                gmail = remoteProfile.gmail.ifBlank { resolvedGmail.ifBlank { user.gmail } },
                displayName = remoteProfile.displayName.ifBlank { user.displayName },
                photoUrl = user.photoUrl,
                firebaseIdToken = user.firebaseIdToken,
            ),
        )
        if (remoteProfile.uid == user.uid && previousUid != null) {
            clearLegacyInstallationUid()
        }
        _session.value = _session.value.copy(appAccess = appAccess)
        return remoteProfile
    }

    fun setApprovalStatus(
        status: RegistrationStatus,
        rejectionReason: String? = null,
    ) {
        ensureInitialized()
        val activeUid = _session.value.user?.uid ?: return

        storeScope.launch {
            val currentDraft = registrationDraftDao.getByUid(activeUid) ?: return@launch
            registrationDraftDao.upsert(
                currentDraft.copy(
                    status = status.name,
                    rejectionReason = rejectionReason,
                    updatedAt = TimeFormatter.nowStorage(),
                ),
            )
        }
    }

    fun logout() {
        ensureInitialized()
        storeScope.launch {
            sessionDao.clear()
        }
    }

    fun enqueueSubmission(record: SubmissionRecord) {
        ensureInitialized()
        upsertSubmission(record)
    }

    fun deleteSubmission(submissionId: String) {
        ensureInitialized()
        if (submissionId.isBlank()) return

        val target = _submissions.value.firstOrNull { it.submissionId == submissionId } ?: return
        cleanupSubmissionFiles(target)

        val updatedItems = _submissions.value
            .filterNot { it.submissionId == submissionId }
            .sortedByDescending { it.createdAt }
        _submissions.value = updatedItems
        persistSubmissions(updatedItems)
    }

    fun uploadSubmission(submissionId: String) {
        ensureInitialized()
        if (submissionId.isBlank()) return

        val currentItems = _submissions.value
        val target = currentItems.firstOrNull { it.submissionId == submissionId } ?: return
        val uploadingRecord = target.copy(status = SubmissionStatus.UPLOADING)
        replaceSubmission(uploadingRecord)

        storeScope.launch {
            runCatching {
                TicBackendHttpClient.submitSubmission(
                    prepareSubmissionForUpload(uploadingRecord),
                )
            }.onSuccess { response ->
                val updatedRecord = uploadingRecord.copy(
                    status = SubmissionStatus.UPLOADED,
                    driveFolderId = response.driveFolderId,
                    uploadedAt = response.uploadedAt ?: TimeFormatter.nowStorage(),
                )
                replaceSubmission(updatedRecord)
            }.onFailure {
                replaceSubmission(
                    uploadingRecord.copy(
                        status = SubmissionStatus.FAILED_UPLOAD,
                    ),
                )
            }
        }
    }

    fun uploadAllSubmissions() {
        ensureInitialized()
        _submissions.value
            .filter { it.status != SubmissionStatus.UPLOADED && it.status != SubmissionStatus.UPLOADING }
            .forEach { uploadSubmission(it.submissionId) }
    }

    private fun bindPersistentFlows() {
        storeScope.launch {
            sessionDao.observeSession().collectLatest { sessionEntity ->
                val user = sessionEntity?.toAuthenticatedUser()

                if (sessionEntity == null || user == null) {
                    _session.value = buildFallbackSessionState()
                    _currentRegistrationDraft.value = null
                    ensureLocalIdentity()
                    return@collectLatest
                }

                registrationDraftDao.observeByUid(user.uid).collect { draftEntity ->
                    val localDraft = draftEntity?.toLocalDraft()
                    _currentRegistrationDraft.value = localDraft
                    _session.value = SessionState(
                        isAuthenticated = sessionEntity.isAuthenticated,
                        user = user,
                        profile = draftEntity?.toUserProfile(),
                        appAccess = _session.value.appAccess.takeIf { it.currentVersionCode > 0 }
                            ?: buildCurrentAppAccessState(),
                    )
                }
            }
        }
    }

    private fun ensureInitialized() {
        check(initialized) {
            "InMemorySessionStore.initialize(application) must be called before use."
        }
    }

    private fun registrationStatusFromServer(
        value: String,
        default: RegistrationStatus,
    ): RegistrationStatus = runCatching {
        RegistrationStatus.valueOf(value.trim().uppercase())
    }.getOrDefault(default)

    private fun buildCurrentAppAccessState(
        releasePolicy: AppReleasePolicy = AppReleasePolicy(),
    ): AppAccessState = AppAccessState(
        currentVersionCode = BuildConfig.APP_VERSION_CODE,
        currentVersionName = BuildConfig.APP_VERSION_NAME,
        releasePolicy = releasePolicy,
    )

    private fun isStableInstallationUid(value: String): Boolean =
        value.startsWith(stableInstallationUidPrefix)

    private fun buildStableInstallationUid(): String {
        val androidId = Settings.Secure.getString(
            application.contentResolver,
            Settings.Secure.ANDROID_ID,
        )?.trim().orEmpty()
        val stableSuffix = if (androidId.isNotBlank()) {
            UUID.nameUUIDFromBytes(androidId.toByteArray(Charsets.UTF_8))
        } else {
            UUID.randomUUID()
        }
        return "$stableInstallationUidPrefix$stableSuffix"
    }

    private fun persistResolvedInstallationUid(
        preferences: SharedPreferences,
        currentUid: String,
        previousUid: String?,
    ) {
        preferences.edit().apply {
            putString(installationUidKey, currentUid)
            remove(legacyDemoUidKey)
            if (previousUid.isNullOrBlank()) {
                remove(legacyInstallationUidKey)
            } else {
                putString(legacyInstallationUidKey, previousUid)
            }
        }.apply()
    }

    private fun getLegacyInstallationUid(): String? {
        val preferences = application.getSharedPreferences(preferencesName, Application.MODE_PRIVATE)
        return preferences.getString(legacyInstallationUidKey, null)?.trim().orEmpty().ifBlank { null }
    }

    private fun clearLegacyInstallationUid() {
        val preferences = application.getSharedPreferences(preferencesName, Application.MODE_PRIVATE)
        preferences.edit().remove(legacyInstallationUidKey).apply()
    }

    private fun maybeMigrateLegacyLocalData(currentUid: String) {
        val previousUid = getLegacyInstallationUid() ?: return
        if (previousUid == currentUid) {
            clearLegacyInstallationUid()
            return
        }

        storeScope.launch {
            val currentDraft = registrationDraftDao.getByUid(currentUid)
            val previousDraft = registrationDraftDao.getByUid(previousUid)
            if (currentDraft == null && previousDraft != null) {
                registrationDraftDao.upsert(
                    previousDraft.copy(
                        uid = currentUid,
                        updatedAt = TimeFormatter.nowStorage(),
                    ),
                )
            }
            if (previousDraft != null) {
                registrationDraftDao.deleteByUid(previousUid)
            }
            migrateStoredSubmissions(previousUid, currentUid)
        }
    }

    private fun migrateStoredSubmissions(previousUid: String, currentUid: String) {
        if (previousUid == currentUid) return

        val migratedItems = _submissions.value.map { record ->
            if (record.uid == previousUid) {
                record.copy(uid = currentUid)
            } else {
                record
            }
        }
        if (migratedItems == _submissions.value) return

        _submissions.value = migratedItems
        persistSubmissions(migratedItems)
    }

    private fun replaceSubmission(record: SubmissionRecord) {
        upsertSubmission(record)
    }

    private fun upsertSubmission(record: SubmissionRecord) {
        val previousRecord = _submissions.value.firstOrNull { it.submissionId == record.submissionId }
        cleanupReplacedSubmissionFiles(previousRecord, record)

        val updatedItems = _submissions.value
            .filterNot { it.submissionId == record.submissionId } + record
        val sortedItems = updatedItems.sortedByDescending { it.createdAt }
        _submissions.value = sortedItems
        persistSubmissions(sortedItems)
    }

    private fun cleanupReplacedSubmissionFiles(
        previousRecord: SubmissionRecord?,
        updatedRecord: SubmissionRecord,
    ) {
        if (previousRecord == null) return

        val activePaths = updatedRecord.files.map { it.localPath }.toSet()
        previousRecord.files
            .map { it.localPath }
            .filter { it.isNotBlank() && it !in activePaths }
            .forEach(::deleteLocalFile)
    }

    private fun cleanupSubmissionFiles(record: SubmissionRecord) {
        record.files
            .map { it.localPath }
            .filter { it.isNotBlank() }
            .forEach(::deleteLocalFile)
    }

    private fun deleteLocalFile(path: String) {
        runCatching {
            val file = File(path)
            if (file.exists()) {
                file.delete()
            }
        }
    }

    private fun prepareSubmissionForUpload(record: SubmissionRecord): SubmissionRecord {
        val session = _session.value
        val preparedGmail = record.gmail.ifBlank {
            session.profile?.gmail?.takeIf { it.isNotBlank() }
                ?: session.user?.gmail.orEmpty()
        }
        val preparedNama = record.nama.ifBlank {
            session.profile?.nama?.takeIf { it.isNotBlank() }
                ?: session.user?.displayName.orEmpty()
        }
        val preparedFiles = record.files.map { file ->
            if (file.fileType != SubmissionFileType.PHOTO) {
                file
            } else {
                val optimized = ImageUploadOptimizer.prepareForUpload(
                    context = application,
                    filePath = file.localPath,
                    uploadLabel = file.filename.ifBlank { "foto evidence" },
                )
                file.copy(
                    localPath = optimized.file.absolutePath,
                    filename = optimized.file.name,
                )
            }
        }

        return record.copy(
            gmail = preparedGmail,
            nama = preparedNama,
            files = preparedFiles,
        )
    }

    private fun loadStoredSubmissions(): List<SubmissionRecord> {
        val preferences = application.getSharedPreferences(preferencesName, Application.MODE_PRIVATE)
        val raw = preferences.getString(submissionsStorageKey, null).orEmpty()
        if (raw.isBlank()) return emptyList()

        return runCatching {
            val array = JSONArray(raw)
            buildList(array.length()) {
                for (index in 0 until array.length()) {
                    val item = array.optJSONObject(index) ?: continue
                    add(item.toSubmissionRecord())
                }
            }.sortedByDescending { it.createdAt }
        }.getOrDefault(emptyList())
    }

    private fun persistSubmissions(items: List<SubmissionRecord>) {
        val preferences = application.getSharedPreferences(preferencesName, Application.MODE_PRIVATE)
        val payload = JSONArray().apply {
            items.forEach { put(it.toJson()) }
        }
        preferences.edit().putString(submissionsStorageKey, payload.toString()).apply()
    }

    private fun SubmissionRecord.toJson(): JSONObject = JSONObject().apply {
        put("submissionId", submissionId)
        put("uid", uid)
        put("gmail", gmail)
        put("nama", nama)
        put("projectName", projectName)
        put("formName", formName)
        put("answersJson", answersJson)
        put("gpsLat", gpsLat)
        put("gpsLng", gpsLng)
        put("gpsAccuracy", gpsAccuracy)
        put("driveFolderId", driveFolderId)
        put("status", status.name)
        put("createdAt", createdAt)
        put("uploadedAt", uploadedAt)
        put(
            "files",
            JSONArray().apply {
                files.forEach { file ->
                    put(
                        JSONObject().apply {
                            put("id", file.id)
                            put("submissionId", file.submissionId)
                            put("fileType", file.fileType.name)
                            put("localPath", file.localPath)
                            put("driveFileId", file.driveFileId)
                            put("filename", file.filename)
                            put("createdAt", file.createdAt)
                        },
                    )
                }
            },
        )
    }

    private fun JSONObject.toSubmissionRecord(): SubmissionRecord = SubmissionRecord(
        submissionId = optString("submissionId"),
        uid = optString("uid"),
        gmail = optString("gmail"),
        nama = optString("nama"),
        projectName = optString("projectName"),
        formName = optString("formName"),
        answersJson = optString("answersJson"),
        gpsLat = if (has("gpsLat") && !isNull("gpsLat")) optDouble("gpsLat") else null,
        gpsLng = if (has("gpsLng") && !isNull("gpsLng")) optDouble("gpsLng") else null,
        gpsAccuracy = if (has("gpsAccuracy") && !isNull("gpsAccuracy")) optDouble("gpsAccuracy").toFloat() else null,
        driveFolderId = optString("driveFolderId").ifBlank { null },
        status = runCatching { SubmissionStatus.valueOf(optString("status")) }.getOrDefault(SubmissionStatus.DRAFT),
        createdAt = optString("createdAt"),
        uploadedAt = optString("uploadedAt").ifBlank { null },
        files = buildList {
            val fileArray = optJSONArray("files") ?: return@buildList
            for (index in 0 until fileArray.length()) {
                val file = fileArray.optJSONObject(index) ?: continue
                add(
                    com.timindonesiacerdas.ticcollect.data.model.SubmissionFile(
                        id = file.optString("id"),
                        submissionId = file.optString("submissionId"),
                        fileType = runCatching {
                            com.timindonesiacerdas.ticcollect.data.model.SubmissionFileType.valueOf(file.optString("fileType"))
                        }.getOrDefault(com.timindonesiacerdas.ticcollect.data.model.SubmissionFileType.PHOTO),
                        localPath = file.optString("localPath"),
                        driveFileId = file.optString("driveFileId").ifBlank { null },
                        filename = file.optString("filename"),
                        createdAt = file.optString("createdAt"),
                    ),
                )
            }
        },
    )
}

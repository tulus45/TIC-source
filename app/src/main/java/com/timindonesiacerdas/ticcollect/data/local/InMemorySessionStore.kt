package com.timindonesiacerdas.ticcollect.data.local

import android.app.Application
import androidx.room.Room
import com.timindonesiacerdas.ticcollect.data.local.db.RegistrationDraftDao
import com.timindonesiacerdas.ticcollect.data.local.db.SessionDao
import com.timindonesiacerdas.ticcollect.data.local.db.SessionEntity
import com.timindonesiacerdas.ticcollect.data.local.db.TicLocalDatabase
import com.timindonesiacerdas.ticcollect.data.local.db.toAuthenticatedUser
import com.timindonesiacerdas.ticcollect.data.local.db.toEntity
import com.timindonesiacerdas.ticcollect.data.local.db.toLocalDraft
import com.timindonesiacerdas.ticcollect.data.local.db.toUserProfile
import com.timindonesiacerdas.ticcollect.data.model.AuthenticatedUser
import com.timindonesiacerdas.ticcollect.data.model.LocalRegistrationDraft
import com.timindonesiacerdas.ticcollect.data.model.RegistrationDraft
import com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus
import com.timindonesiacerdas.ticcollect.data.model.SessionState
import com.timindonesiacerdas.ticcollect.data.model.SubmissionRecord
import com.timindonesiacerdas.ticcollect.data.model.SubmissionStatus
import com.timindonesiacerdas.ticcollect.data.model.UserProfile
import com.timindonesiacerdas.ticcollect.data.remote.RegistrationUploadResponse
import com.timindonesiacerdas.ticcollect.data.remote.TicBackendHttpClient
import com.timindonesiacerdas.ticcollect.utils.ImageUploadOptimizer
import com.timindonesiacerdas.ticcollect.utils.TicConstants
import com.timindonesiacerdas.ticcollect.utils.TimeFormatter
import java.util.UUID
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

object InMemorySessionStore {
    private const val databaseName = "tic_collect.db"
    private const val preferencesName = "tic_collect_prefs"
    private const val installationUidKey = "installation_uid"
    private const val legacyDemoUidKey = "demo_uid"

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
            )
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
        )

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
        if (existingValue.isNotBlank()) {
            return existingValue
        }

        val legacyValue = preferences.getString(legacyDemoUidKey, null)?.trim().orEmpty()
        val resolvedUid = if (legacyValue.isNotBlank()) legacyValue else "tic-installation-${UUID.randomUUID()}"

        preferences.edit()
            .putString(installationUidKey, resolvedUid)
            .apply()
        if (legacyValue.isBlank()) {
            preferences.edit().remove(legacyDemoUidKey).apply()
        }
        return resolvedUid
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

        val response = TicBackendHttpClient.submitRegistration(draftWithUploadRefs)
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

    suspend fun refreshRegistrationFromBackend(): UserProfile? {
        ensureInitialized()
        val user = session.value.user ?: return null

        val remoteProfile = TicBackendHttpClient.getCurrentUser(
            uid = user.uid,
            gmail = user.gmail,
        )

        val currentDraft = registrationDraftDao.getByUid(user.uid)?.toLocalDraft()
        val mergedDraft = LocalRegistrationDraft(
            uid = user.uid,
            gmail = remoteProfile.gmail.ifBlank { user.gmail },
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
            _submissions.value = emptyList()
        }
    }

    fun seedDemoPendingSubmissionIfEmpty() {
        val currentUser = _session.value.user ?: return
        if (_submissions.value.isNotEmpty()) return

        _submissions.value = listOf(
            SubmissionRecord(
                submissionId = "sub-demo-001",
                uid = currentUser.uid,
                gmail = currentUser.gmail,
                projectName = TicConstants.defaultProjectName,
                formName = TicConstants.defaultFormName,
                answersJson = """{"q1":"Ya","q2":"Responden Demo"}""",
                gpsLat = -6.200000,
                gpsLng = 106.816666,
                gpsAccuracy = 12.5f,
                driveFolderId = null,
                status = SubmissionStatus.COMPLETED_PENDING_UPLOAD,
                createdAt = TimeFormatter.nowStorage(),
                uploadedAt = null,
            ),
        )
    }

    private fun bindPersistentFlows() {
        storeScope.launch {
            sessionDao.observeSession().collectLatest { sessionEntity ->
                val user = sessionEntity?.toAuthenticatedUser()

                if (sessionEntity == null || user == null) {
                    _session.value = buildFallbackSessionState()
                    _currentRegistrationDraft.value = null
                    _submissions.value = emptyList()
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
                    )

                    if (localDraft?.status == RegistrationStatus.APPROVED) {
                        seedDemoPendingSubmissionIfEmpty()
                    } else {
                        _submissions.value = emptyList()
                    }
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
}

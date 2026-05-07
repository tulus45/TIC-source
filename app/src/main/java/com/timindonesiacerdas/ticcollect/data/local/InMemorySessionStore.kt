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
import com.timindonesiacerdas.ticcollect.utils.TicConstants
import com.timindonesiacerdas.ticcollect.utils.TimeFormatter
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

    private val storeScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val _session = MutableStateFlow(SessionState())
    val session: StateFlow<SessionState> = _session.asStateFlow()

    private val _submissions = MutableStateFlow<List<SubmissionRecord>>(emptyList())
    val submissions: StateFlow<List<SubmissionRecord>> = _submissions.asStateFlow()

    private val _currentRegistrationDraft = MutableStateFlow<LocalRegistrationDraft?>(null)
    val currentRegistrationDraft: StateFlow<LocalRegistrationDraft?> = _currentRegistrationDraft.asStateFlow()

    @Volatile
    private var initialized = false

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

            sessionDao = database.sessionDao()
            registrationDraftDao = database.registrationDraftDao()
            initialized = true
            bindPersistentFlows()
        }
    }

    suspend fun simulateGoogleLogin() {
        ensureInitialized()

        val current = session.value
        val demoUser = current.user ?: AuthenticatedUser(
            uid = "tic-demo-uid-001",
            gmail = TicConstants.demoGmail,
            displayName = "Enumerator Demo TIC",
            photoUrl = null,
            firebaseIdToken = "demo-firebase-id-token",
        )

        sessionDao.upsert(
            SessionEntity(
                isAuthenticated = true,
                uid = demoUser.uid,
                gmail = demoUser.gmail,
                displayName = demoUser.displayName,
                photoUrl = demoUser.photoUrl,
                firebaseIdToken = demoUser.firebaseIdToken,
            ),
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

        val ktpUpload = TicBackendHttpClient.uploadRegistrationAsset(
            uid = draft.uid,
            gmail = draft.gmail,
            assetType = "ktp",
            filePath = draft.ktpLocalPath,
        )
        val selfieUpload = TicBackendHttpClient.uploadRegistrationAsset(
            uid = draft.uid,
            gmail = draft.gmail,
            assetType = "selfie",
            filePath = draft.selfieLocalPath,
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
                    _session.value = SessionState()
                    _currentRegistrationDraft.value = null
                    _submissions.value = emptyList()
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

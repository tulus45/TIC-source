package com.timindonesiacerdas.ticcollect.registration

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.timindonesiacerdas.ticcollect.data.local.InMemorySessionStore
import com.timindonesiacerdas.ticcollect.data.model.LocalRegistrationDraft
import com.timindonesiacerdas.ticcollect.data.model.RegistrationDraft
import com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus
import com.timindonesiacerdas.ticcollect.utils.TimeFormatter
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.io.File
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

private val workAreaOptions = listOf(
    "Kab. Sumba Barat",
    "Kab. Sumba Barat Daya",
    "Kab. Sumba Tengah",
    "Kab. Sumba Timur",
    "Kab. Timor Tengah Selatan",
    "Kab. Timor Tengah Utara",
    "Kota Kupang",
)

data class RegistrationUiState(
    val uid: String = "",
    val gmail: String = "",
    val displayName: String = "",
    val nik: String = "",
    val nama: String = "",
    val alamat: String = "",
    val noHp: String = "",
    val noRekening: String = "",
    val namaBank: String = "",
    val namaPemilik: String = "",
    val areaKerja: String = "",
    val ktpLocalPath: String? = null,
    val selfieLocalPath: String? = null,
    val isSubmitting: Boolean = false,
    val isSubmitted: Boolean = false,
    val errorMessage: String? = null,
    val isAuthenticated: Boolean = false,
    val currentStatus: RegistrationStatus? = null,
    val rejectionReason: String? = null,
    val isKtpOcrProcessing: Boolean = false,
    val ktpOcrMessage: String? = null,
    val isRefreshingStatus: Boolean = false,
    val statusSyncMessage: String? = null,
    val availableAreaKerja: List<String> = workAreaOptions,
)

class RegistrationViewModel(
    application: Application,
) : AndroidViewModel(application) {
    private val _uiState = MutableStateFlow(RegistrationUiState())
    val uiState: StateFlow<RegistrationUiState> = _uiState.asStateFlow()
    private val textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    val sessionState = InMemorySessionStore.session.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = InMemorySessionStore.session.value,
    )

    init {
        viewModelScope.launch {
            combine(
                InMemorySessionStore.session,
                InMemorySessionStore.currentRegistrationDraft,
            ) { session, draft ->
                session to draft
            }.collect { (session, draft) ->
                val user = session.user
                val profile = session.profile
                val resolvedStatus = draft?.status ?: profile?.status

                _uiState.update { current ->
                    if (user == null) {
                        RegistrationUiState()
                    } else {
                        current.copy(
                            uid = user.uid,
                            gmail = user.gmail,
                            displayName = user.displayName,
                            nik = current.nik.ifBlank { draft?.nik ?: profile?.nik.orEmpty() },
                            nama = current.nama.ifBlank {
                                preferredRegistrationName(
                                    draftName = draft?.nama,
                                    profileName = profile?.nama,
                                    loginDisplayName = user.displayName,
                                    status = resolvedStatus,
                                )
                            },
                            alamat = current.alamat.ifBlank { draft?.alamat ?: profile?.alamat.orEmpty() },
                            noHp = current.noHp.ifBlank { draft?.noHp ?: profile?.noHp.orEmpty() },
                            noRekening = current.noRekening.ifBlank { draft?.noRekening ?: profile?.noRekening.orEmpty() },
                            namaBank = current.namaBank.ifBlank { draft?.namaBank ?: profile?.namaBank.orEmpty() },
                            namaPemilik = current.namaPemilik.ifBlank { draft?.namaPemilik ?: profile?.namaPemilik.orEmpty() },
                            areaKerja = current.areaKerja.ifBlank { draft?.areaKerja ?: profile?.areaKerja.orEmpty() },
                            ktpLocalPath = current.ktpLocalPath ?: draft?.ktpLocalPath,
                            selfieLocalPath = current.selfieLocalPath ?: draft?.selfieLocalPath,
                            isAuthenticated = session.isAuthenticated,
                            currentStatus = resolvedStatus,
                            rejectionReason = draft?.rejectionReason ?: profile?.rejectionReason,
                        )
                    }
                }
            }
        }
    }

    fun onNikChanged(value: String) {
        _uiState.update { it.copy(nik = value, errorMessage = null) }
        persistWorkingDraft()
    }

    fun onNamaChanged(value: String) {
        _uiState.update { it.copy(nama = value, errorMessage = null) }
        persistWorkingDraft()
    }

    fun onAlamatChanged(value: String) {
        _uiState.update { it.copy(alamat = value, errorMessage = null) }
        persistWorkingDraft()
    }

    fun onNoHpChanged(value: String) {
        _uiState.update { it.copy(noHp = value, errorMessage = null) }
        persistWorkingDraft()
    }

    fun onNoRekeningChanged(value: String) {
        _uiState.update { it.copy(noRekening = value, errorMessage = null) }
        persistWorkingDraft()
    }

    fun onNamaBankChanged(value: String) {
        _uiState.update { it.copy(namaBank = value, errorMessage = null) }
        persistWorkingDraft()
    }

    fun onNamaPemilikChanged(value: String) {
        _uiState.update { it.copy(namaPemilik = value, errorMessage = null) }
        persistWorkingDraft()
    }

    fun onAreaKerjaChanged(value: String) {
        _uiState.update { it.copy(areaKerja = value, errorMessage = null) }
        persistWorkingDraft()
    }

    fun onKtpCaptured(path: String) {
        _uiState.update {
            it.copy(
                ktpLocalPath = path,
                nama = clearLoginNamePlaceholder(
                    value = it.nama,
                    loginDisplayName = it.displayName,
                    status = it.currentStatus,
                ),
                errorMessage = null,
                isKtpOcrProcessing = true,
                ktpOcrMessage = "Membaca data KTP...",
            )
        }
        persistWorkingDraft()
        runKtpOcr(path)
    }

    fun onSelfieCaptured(path: String) {
        _uiState.update { it.copy(selfieLocalPath = path, errorMessage = null) }
        persistWorkingDraft()
    }

    fun submitRegistration() {
        val current = _uiState.value
        val error = validate(current)

        if (error != null) {
            _uiState.update { it.copy(errorMessage = error) }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            val existingDraft = InMemorySessionStore.currentRegistrationDraft.value
            val createdAt = existingDraft?.createdAt ?: TimeFormatter.nowStorage()
            val updatedAt = TimeFormatter.nowStorage()
            val draft = RegistrationDraft(
                uid = current.uid,
                gmail = current.gmail,
                displayName = current.displayName,
                nik = current.nik.trim(),
                nama = current.nama.trim(),
                alamat = current.alamat.trim(),
                rtRw = "",
                kelDesa = "",
                kecamatan = "",
                kabupaten = "",
                noHp = current.noHp.trim(),
                noRekening = current.noRekening.trim(),
                namaBank = current.namaBank.trim(),
                namaPemilik = current.namaPemilik.trim(),
                areaKerja = current.areaKerja,
                ktpLocalPath = requireNotNull(current.ktpLocalPath),
                selfieLocalPath = requireNotNull(current.selfieLocalPath),
                ktpDriveFileId = existingDraft?.ktpDriveFileId,
                selfieDriveFileId = existingDraft?.selfieDriveFileId,
                status = RegistrationStatus.PENDING,
                rejectionReason = null,
                createdAt = createdAt,
                updatedAt = updatedAt,
            )

            runCatching {
                InMemorySessionStore.submitRegistrationToBackend(draft)
            }.onSuccess { response ->
                runCatching {
                    InMemorySessionStore.refreshRegistrationFromBackend()
                }

                _uiState.update {
                    it.copy(
                        isSubmitting = false,
                        isSubmitted = true,
                        currentStatus = registrationStatusFromServer(response.status),
                        statusSyncMessage = "Registrasi berhasil dikirim ke server. Status saat ini: ${response.status}.",
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isSubmitting = false,
                        errorMessage = error.message ?: "Registrasi belum berhasil dikirim ke server.",
                    )
                }
            }
        }
    }

    fun onSubmissionHandled() {
        _uiState.update { it.copy(isSubmitted = false) }
    }

    fun simulateApproved() {
        InMemorySessionStore.setApprovalStatus(RegistrationStatus.APPROVED)
    }

    fun simulateRejected() {
        InMemorySessionStore.setApprovalStatus(
            status = RegistrationStatus.REJECTED,
            rejectionReason = "Dokumen KTP atau selfie belum cukup jelas untuk diverifikasi.",
        )
    }

    fun refreshRegistrationStatus() {
        val current = _uiState.value
        if (!current.isAuthenticated || current.uid.isBlank()) return
        if (current.isRefreshingStatus) return

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isRefreshingStatus = true,
                    statusSyncMessage = "Memeriksa status terbaru dari server...",
                )
            }

            runCatching {
                InMemorySessionStore.refreshRegistrationFromBackend()
            }.onSuccess { profile ->
                val status = profile?.status ?: _uiState.value.currentStatus ?: RegistrationStatus.NOT_REGISTERED
                val message = when (status) {
                    RegistrationStatus.APPROVED -> "Registrasi Anda sudah disetujui. Akses Home akan dibuka."
                    RegistrationStatus.REJECTED -> profile?.rejectionReason
                        ?: "Registrasi ditolak. Silakan periksa catatan admin."
                    RegistrationStatus.PENDING -> "Status terbaru: masih menunggu review admin."
                    RegistrationStatus.NOT_REGISTERED -> "Registrasi belum ditemukan di server."
                }

                _uiState.update {
                    it.copy(
                        isRefreshingStatus = false,
                        currentStatus = status,
                        rejectionReason = profile?.rejectionReason ?: it.rejectionReason,
                        statusSyncMessage = message,
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isRefreshingStatus = false,
                        statusSyncMessage = error.message ?: "Belum bisa mengambil status dari server.",
                    )
                }
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        textRecognizer.close()
    }

    private fun validate(state: RegistrationUiState): String? {
        if (!state.isAuthenticated) return "Login Gmail diperlukan sebelum registrasi."
        if (state.nik.length < 8) return "NIK minimal 8 digit untuk dummy tahap 1."
        if (state.nama.isBlank()) return "Nama wajib diisi."
        if (state.alamat.isBlank()) return "Alamat wajib diisi."
        if (state.noHp.isBlank()) return "No HP wajib diisi."
        if (state.noRekening.isBlank()) return "No rekening wajib diisi."
        if (state.namaBank.isBlank()) return "Nama bank wajib diisi."
        if (state.namaPemilik.isBlank()) return "Nama pemilik wajib diisi."
        if (state.areaKerja.isBlank()) return "Area kerja wajib dipilih."
        if (state.ktpLocalPath.isNullOrBlank()) return "Foto KTP wajib diambil."
        if (state.selfieLocalPath.isNullOrBlank()) return "Foto selfie wajib diambil."
        return null
    }

    private fun persistWorkingDraft() {
        val current = _uiState.value
        if (!current.isAuthenticated || current.uid.isBlank()) return

        val existingDraft = InMemorySessionStore.currentRegistrationDraft.value
        val now = TimeFormatter.nowStorage()
        val localDraft = LocalRegistrationDraft(
            uid = current.uid,
            gmail = current.gmail,
            displayName = current.displayName,
            nik = current.nik.trim(),
            nama = current.nama.trim(),
            alamat = current.alamat.trim(),
            rtRw = "",
            kelDesa = "",
            kecamatan = "",
            kabupaten = "",
            noHp = current.noHp.trim(),
            noRekening = current.noRekening.trim(),
            namaBank = current.namaBank.trim(),
            namaPemilik = current.namaPemilik.trim(),
            areaKerja = current.areaKerja,
            ktpLocalPath = current.ktpLocalPath,
            selfieLocalPath = current.selfieLocalPath,
            ktpDriveFileId = existingDraft?.ktpDriveFileId,
            selfieDriveFileId = existingDraft?.selfieDriveFileId,
            status = existingDraft?.status ?: current.currentStatus ?: RegistrationStatus.NOT_REGISTERED,
            rejectionReason = current.rejectionReason,
            createdAt = existingDraft?.createdAt ?: now,
            updatedAt = now,
        )

        viewModelScope.launch {
            InMemorySessionStore.saveRegistrationDraft(localDraft)
        }
    }

    private fun runKtpOcr(path: String) {
        val image = runCatching {
            InputImage.fromFilePath(
                getApplication(),
                Uri.fromFile(File(path)),
            )
        }.getOrElse { error ->
            _uiState.update { current ->
                if (current.ktpLocalPath != path) {
                    current
                } else {
                    current.copy(
                        isKtpOcrProcessing = false,
                        ktpOcrMessage = "Foto KTP tersimpan, tetapi OCR belum bisa dijalankan: ${error.message ?: "gagal memuat gambar"}",
                    )
                }
            }
            return
        }

        textRecognizer.process(image)
            .addOnSuccessListener { result ->
                val parsedResult = KtpOcrParser.parse(result.text)
                _uiState.update { current ->
                    if (current.ktpLocalPath != path) {
                        current
                    } else {
                        current.copy(
                            nik = parsedResult.nik ?: current.nik,
                            isKtpOcrProcessing = false,
                            ktpOcrMessage = parsedResult.message,
                        )
                    }
                }
                persistWorkingDraft()
            }
            .addOnFailureListener {
                _uiState.update { current ->
                    if (current.ktpLocalPath != path) {
                        current
                    } else {
                        current.copy(
                            isKtpOcrProcessing = false,
                            ktpOcrMessage = "Foto KTP tersimpan, tetapi OCR belum berhasil membaca data. Silakan isi manual.",
                        )
                    }
                }
                persistWorkingDraft()
            }
    }

    private fun preferredRegistrationName(
        draftName: String?,
        profileName: String?,
        loginDisplayName: String,
        status: RegistrationStatus?,
    ): String {
        val candidate = listOf(draftName, profileName)
            .firstOrNull { !it.isNullOrBlank() }
            .orEmpty()
            .trim()

        return clearLoginNamePlaceholder(
            value = candidate,
            loginDisplayName = loginDisplayName,
            status = status,
        )
    }

    private fun clearLoginNamePlaceholder(
        value: String,
        loginDisplayName: String,
        status: RegistrationStatus?,
    ): String {
        val normalizedValue = value.trim()
        if (normalizedValue.isBlank()) return ""

        return if (
            normalizedValue.equals(loginDisplayName.trim(), ignoreCase = true) &&
            (status == null || status == RegistrationStatus.NOT_REGISTERED)
        ) {
            ""
        } else {
            normalizedValue
        }
    }

    private fun registrationStatusFromServer(value: String): RegistrationStatus =
        runCatching { RegistrationStatus.valueOf(value.trim().uppercase()) }
            .getOrDefault(RegistrationStatus.PENDING)
}

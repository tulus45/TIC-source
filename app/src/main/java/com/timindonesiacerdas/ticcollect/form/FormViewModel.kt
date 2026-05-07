package com.timindonesiacerdas.ticcollect.form

import androidx.camera.core.CameraSelector
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.timindonesiacerdas.ticcollect.data.local.InMemorySessionStore
import com.timindonesiacerdas.ticcollect.data.model.SubmissionFile
import com.timindonesiacerdas.ticcollect.data.model.SubmissionFileType
import com.timindonesiacerdas.ticcollect.data.model.SubmissionRecord
import com.timindonesiacerdas.ticcollect.data.model.SubmissionStatus
import com.timindonesiacerdas.ticcollect.data.remote.SchoolMasterDataResponse
import com.timindonesiacerdas.ticcollect.data.remote.TicBackendHttpClient
import com.timindonesiacerdas.ticcollect.utils.TicConstants
import com.timindonesiacerdas.ticcollect.utils.TimeFormatter
import java.io.File
import java.util.UUID
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.json.JSONObject

enum class EvidenceStepKind {
    PHOTO,
    GPS,
}

data class EvidenceStepDefinition(
    val id: String,
    val title: String,
    val instruction: String,
    val kind: EvidenceStepKind,
    val filenamePrefix: String,
    val lensFacing: Int = CameraSelector.LENS_FACING_BACK,
)

data class EvidencePhotoRecord(
    val filePath: String,
    val timestamp: String,
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Float?,
    val address: String,
)

data class EvidenceGpsRecord(
    val timestamp: String,
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Float?,
    val address: String,
)

data class FormUiState(
    val isLoadingMasterData: Boolean = false,
    val masterData: SchoolMasterDataResponse? = null,
    val selectedValues: List<String> = emptyList(),
    val errorMessage: String? = null,
    val evidenceSteps: List<EvidenceStepDefinition> = defaultEvidenceSteps,
    val currentEvidenceStepIndex: Int = 0,
    val capturedPhotos: Map<String, EvidencePhotoRecord> = emptyMap(),
    val recordedGps: EvidenceGpsRecord? = null,
)

val defaultEvidenceSteps = listOf(
    EvidenceStepDefinition(
        id = "photo_plang_sekolah",
        title = "FOTO PLANG SEKOLAH",
        instruction = "Ambil foto plang atau identitas sekolah dengan jelas dan terbaca.",
        kind = EvidenceStepKind.PHOTO,
        filenamePrefix = "plang_sekolah",
    ),
    EvidenceStepDefinition(
        id = "photo_box_pic",
        title = "FOTO BOX DAN PIC",
        instruction = "Ambil foto box dan PIC dengan framing rapi dan objek utama terlihat utuh.",
        kind = EvidenceStepKind.PHOTO,
        filenamePrefix = "box_pic",
    ),
    EvidenceStepDefinition(
        id = "photo_kelengkapan_unit",
        title = "FOTO KELENGKAPAN UNIT",
        instruction = "Ambil foto kelengkapan unit agar semua komponen utama terlihat.",
        kind = EvidenceStepKind.PHOTO,
        filenamePrefix = "kelengkapan_unit",
    ),
    EvidenceStepDefinition(
        id = "photo_proses_instalasi",
        title = "FOTO PROSES INSTALASI",
        instruction = "Dokumentasikan proses instalasi saat pekerjaan sedang berlangsung.",
        kind = EvidenceStepKind.PHOTO,
        filenamePrefix = "proses_instalasi",
    ),
    EvidenceStepDefinition(
        id = "photo_serial_number",
        title = "FOTO SERIAL NUMBER",
        instruction = "Pastikan serial number terbaca jelas dan tidak blur.",
        kind = EvidenceStepKind.PHOTO,
        filenamePrefix = "serial_number",
    ),
    EvidenceStepDefinition(
        id = "photo_training",
        title = "FOTO TRAINING",
        instruction = "Ambil dokumentasi training setelah instalasi dengan peserta terlihat jelas.",
        kind = EvidenceStepKind.PHOTO,
        filenamePrefix = "training",
    ),
    EvidenceStepDefinition(
        id = "photo_bapp_1",
        title = "FOTO BAPP 1",
        instruction = "Ambil halaman pertama BAPP dengan isi dokumen terbaca.",
        kind = EvidenceStepKind.PHOTO,
        filenamePrefix = "bapp_1",
    ),
    EvidenceStepDefinition(
        id = "photo_bapp_2",
        title = "FOTO BAPP 2",
        instruction = "Ambil halaman kedua BAPP dan pastikan tanda tangan atau cap terlihat jelas.",
        kind = EvidenceStepKind.PHOTO,
        filenamePrefix = "bapp_2",
    ),
    EvidenceStepDefinition(
        id = "record_gps",
        title = "RECORD GPS",
        instruction = "Rekam GPS akhir lengkap dengan alamat lokasi sekolah.",
        kind = EvidenceStepKind.GPS,
        filenamePrefix = "gps",
    ),
)

class FormViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(FormUiState())
    val uiState: StateFlow<FormUiState> = _uiState.asStateFlow()

    init {
        loadMasterData()
    }

    fun loadMasterData(force: Boolean = false) {
        val current = _uiState.value
        if (current.isLoadingMasterData) return
        if (!force && current.masterData != null) return

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoadingMasterData = true,
                    errorMessage = null,
                )
            }

            runCatching {
                TicBackendHttpClient.getSchoolMasterData()
            }.onSuccess { response ->
                _uiState.update {
                    val currentSelections = if (it.selectedValues.size == response.columns.size) {
                        it.selectedValues
                    } else {
                        List(response.columns.size) { "" }
                    }

                    it.copy(
                        isLoadingMasterData = false,
                        masterData = response,
                        selectedValues = currentSelections,
                        errorMessage = null,
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoadingMasterData = false,
                        errorMessage = error.message ?: "Belum bisa memuat master data sekolah.",
                    )
                }
            }
        }
    }

    fun selectValue(levelIndex: Int, value: String) {
        val masterData = _uiState.value.masterData ?: return
        if (levelIndex !in masterData.columns.indices) return

        _uiState.update { current ->
            val updatedSelections = current.selectedValues.toMutableList()
            while (updatedSelections.size < masterData.columns.size) {
                updatedSelections += ""
            }
            updatedSelections[levelIndex] = value
            for (index in levelIndex + 1 until updatedSelections.size) {
                updatedSelections[index] = ""
            }
            current.copy(selectedValues = updatedSelections)
        }
    }

    fun clearSelections() {
        val masterData = _uiState.value.masterData ?: return
        _uiState.update {
            it.copy(selectedValues = List(masterData.columns.size) { "" })
        }
        resetEvidenceProgress()
    }

    fun resetEvidenceProgress() {
        _uiState.update {
            it.copy(
                currentEvidenceStepIndex = 0,
                capturedPhotos = emptyMap(),
                recordedGps = null,
            )
        }
    }

    fun goToNextEvidenceStep() {
        _uiState.update { current ->
            if (!isCurrentEvidenceStepCompleted(current)) {
                current
            } else {
                current.copy(
                    currentEvidenceStepIndex = (current.currentEvidenceStepIndex + 1)
                        .coerceAtMost(current.evidenceSteps.lastIndex),
                )
            }
        }
    }

    fun goToPreviousEvidenceStep() {
        _uiState.update { current ->
            current.copy(
                currentEvidenceStepIndex = (current.currentEvidenceStepIndex - 1).coerceAtLeast(0),
            )
        }
    }

    fun recordPhotoCapture(
        stepId: String,
        record: EvidencePhotoRecord,
    ) {
        _uiState.update { current ->
            current.copy(
                capturedPhotos = current.capturedPhotos + (stepId to record),
            )
        }
    }

    fun clearPhotoCapture(stepId: String) {
        _uiState.update { current ->
            current.copy(
                capturedPhotos = current.capturedPhotos - stepId,
            )
        }
    }

    fun recordGpsCapture(record: EvidenceGpsRecord) {
        _uiState.update { current ->
            current.copy(recordedGps = record)
        }
    }

    fun isSchoolSelectionComplete(): Boolean {
        val state = _uiState.value
        val masterData = state.masterData ?: return false
        return state.selectedValues.size >= masterData.columns.size &&
            state.selectedValues.take(masterData.columns.size).all { it.isNotBlank() }
    }

    fun currentEvidenceStep(): EvidenceStepDefinition? {
        val state = _uiState.value
        return state.evidenceSteps.getOrNull(state.currentEvidenceStepIndex)
    }

    fun selectedSchoolSummary(): String {
        val state = _uiState.value
        val columns = state.masterData?.columns.orEmpty()
        return columns.mapIndexedNotNull { index, column ->
            val value = state.selectedValues.getOrNull(index).orEmpty().trim()
            if (value.isBlank()) null else "$column: $value"
        }.joinToString(" > ")
    }

    fun isCurrentEvidenceStepCompleted(state: FormUiState = _uiState.value): Boolean {
        val step = state.evidenceSteps.getOrNull(state.currentEvidenceStepIndex) ?: return false
        return when (step.kind) {
            EvidenceStepKind.PHOTO -> state.capturedPhotos.containsKey(step.id)
            EvidenceStepKind.GPS -> state.recordedGps != null
        }
    }

    fun completeSubmission() {
        val state = _uiState.value
        val user = InMemorySessionStore.session.value.user ?: return
        val gps = state.recordedGps ?: return
        val schoolName = state.selectedValues.lastOrNull()?.takeIf { it.isNotBlank() } ?: return
        val createdAt = TimeFormatter.nowStorage()
        val submissionId = "sub-${UUID.randomUUID()}"

        val answersJson = JSONObject().apply {
            put(
                "selectedLocation",
                JSONObject().apply {
                    state.masterData?.columns.orEmpty().forEachIndexed { index, column ->
                        put(column, state.selectedValues.getOrNull(index).orEmpty())
                    }
                },
            )
            put(
                "evidencePhotos",
                org.json.JSONArray().apply {
                    state.evidenceSteps
                        .filter { it.kind == EvidenceStepKind.PHOTO }
                        .forEach { step ->
                            val photo = state.capturedPhotos[step.id] ?: return@forEach
                            put(
                                JSONObject().apply {
                                    put("stepId", step.id)
                                    put("title", step.title)
                                    put("filePath", photo.filePath)
                                    put("timestamp", photo.timestamp)
                                    put("latitude", photo.latitude)
                                    put("longitude", photo.longitude)
                                    put("accuracyMeters", photo.accuracyMeters)
                                    put("address", photo.address)
                                },
                            )
                        }
                },
            )
            put(
                "gpsRecord",
                JSONObject().apply {
                    put("timestamp", gps.timestamp)
                    put("latitude", gps.latitude)
                    put("longitude", gps.longitude)
                    put("accuracyMeters", gps.accuracyMeters)
                    put("address", gps.address)
                },
            )
        }.toString()

        val files = state.evidenceSteps
            .filter { it.kind == EvidenceStepKind.PHOTO }
            .mapNotNull { step ->
                val photo = state.capturedPhotos[step.id] ?: return@mapNotNull null
                SubmissionFile(
                    id = "file-${UUID.randomUUID()}",
                    submissionId = submissionId,
                    fileType = SubmissionFileType.PHOTO,
                    localPath = photo.filePath,
                    filename = File(photo.filePath).name,
                    createdAt = photo.timestamp,
                )
            }

        val submission = SubmissionRecord(
            submissionId = submissionId,
            uid = user.uid,
            gmail = user.gmail,
            projectName = TicConstants.defaultProjectName,
            formName = schoolName,
            answersJson = answersJson,
            gpsLat = gps.latitude,
            gpsLng = gps.longitude,
            gpsAccuracy = gps.accuracyMeters,
            driveFolderId = null,
            status = SubmissionStatus.COMPLETED_PENDING_UPLOAD,
            createdAt = createdAt,
            uploadedAt = null,
            files = files,
        )

        InMemorySessionStore.enqueueSubmission(submission)
        clearSelections()
        resetEvidenceProgress()
    }
}

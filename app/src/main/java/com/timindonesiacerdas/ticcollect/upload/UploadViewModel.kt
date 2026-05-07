package com.timindonesiacerdas.ticcollect.upload

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.timindonesiacerdas.ticcollect.data.local.InMemorySessionStore
import com.timindonesiacerdas.ticcollect.data.model.SubmissionRecord
import com.timindonesiacerdas.ticcollect.data.model.SubmissionStatus
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

data class PendingUploadUiState(
    val items: List<SubmissionRecord> = emptyList(),
)

class UploadViewModel : ViewModel() {
    val uiState: StateFlow<PendingUploadUiState> = InMemorySessionStore.submissions
        .map { items ->
            PendingUploadUiState(
                items = items.sortedByDescending { it.createdAt },
            )
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = PendingUploadUiState(),
        )

    fun retryUpload(submissionId: String) {
        if (submissionId.isBlank()) return
        InMemorySessionStore.uploadSubmission(submissionId)
    }

    fun uploadAll() {
        InMemorySessionStore.uploadAllSubmissions()
    }

    fun hasPendingUploads(items: List<SubmissionRecord>): Boolean {
        return items.any { it.status != SubmissionStatus.UPLOADED && it.status != SubmissionStatus.UPLOADING }
    }

    fun statusLabel(status: SubmissionStatus): String = when (status) {
        SubmissionStatus.DRAFT -> "Draft"
        SubmissionStatus.COMPLETED_PENDING_UPLOAD -> "Siap diupload"
        SubmissionStatus.UPLOADING -> "Sedang upload"
        SubmissionStatus.UPLOADED -> "Sudah upload"
        SubmissionStatus.FAILED_UPLOAD -> "Upload gagal"
    }
}

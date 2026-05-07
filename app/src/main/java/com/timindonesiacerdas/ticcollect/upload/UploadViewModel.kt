package com.timindonesiacerdas.ticcollect.upload

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.timindonesiacerdas.ticcollect.data.local.InMemorySessionStore
import com.timindonesiacerdas.ticcollect.data.model.SubmissionRecord
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

    fun deleteSubmission(submissionId: String) {
        if (submissionId.isBlank()) return
        InMemorySessionStore.deleteSubmission(submissionId)
    }
}

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
                items = items.filter { it.status != SubmissionStatus.UPLOADED },
            )
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = PendingUploadUiState(),
        )

    // TODO(stage-2): enqueue WorkManager retry job and update Room statuses.
    fun retryUpload(submissionId: String) {
        if (submissionId.isBlank()) return
    }
}

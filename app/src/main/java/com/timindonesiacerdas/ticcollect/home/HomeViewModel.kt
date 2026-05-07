package com.timindonesiacerdas.ticcollect.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.timindonesiacerdas.ticcollect.data.local.InMemorySessionStore
import com.timindonesiacerdas.ticcollect.data.model.SessionState
import com.timindonesiacerdas.ticcollect.data.model.SubmissionStatus
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn

data class HomeUiState(
    val session: SessionState = SessionState(),
    val pendingUploadCount: Int = 0,
    val draftCount: Int = 0,
    val selfieLocalPath: String? = null,
)

class HomeViewModel : ViewModel() {
    val uiState: StateFlow<HomeUiState> = combine(
        InMemorySessionStore.session,
        InMemorySessionStore.submissions,
        InMemorySessionStore.currentRegistrationDraft,
    ) { session, submissions, registrationDraft ->
        val pendingCount = submissions.count {
            it.status == SubmissionStatus.COMPLETED_PENDING_UPLOAD ||
                it.status == SubmissionStatus.FAILED_UPLOAD ||
                it.status == SubmissionStatus.UPLOADING
        }
        val draftCount = submissions.count { it.status != SubmissionStatus.UPLOADED }

        HomeUiState(
            session = session,
            pendingUploadCount = pendingCount,
            draftCount = draftCount,
            selfieLocalPath = registrationDraft?.selfieLocalPath,
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = HomeUiState(),
    )

}

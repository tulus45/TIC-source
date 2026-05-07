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
)

class HomeViewModel : ViewModel() {
    val uiState: StateFlow<HomeUiState> = combine(
        InMemorySessionStore.session,
        InMemorySessionStore.submissions,
    ) { session, submissions ->
        val pendingCount = submissions.count {
            it.status == SubmissionStatus.COMPLETED_PENDING_UPLOAD ||
                it.status == SubmissionStatus.FAILED_UPLOAD ||
                it.status == SubmissionStatus.UPLOADING
        }

        HomeUiState(
            session = session,
            pendingUploadCount = pendingCount,
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = HomeUiState(),
    )

    fun logout() {
        InMemorySessionStore.logout()
    }
}

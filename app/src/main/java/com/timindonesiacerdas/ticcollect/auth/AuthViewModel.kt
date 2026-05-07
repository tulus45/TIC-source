package com.timindonesiacerdas.ticcollect.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.timindonesiacerdas.ticcollect.data.local.InMemorySessionStore
import com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus
import com.timindonesiacerdas.ticcollect.data.model.SessionState
import com.timindonesiacerdas.ticcollect.navigation.TicRoutes
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

data class AuthUiState(
    val session: SessionState = SessionState(),
)

class AuthViewModel : ViewModel() {
    init {
        InMemorySessionStore.ensureLocalIdentity()
    }

    val uiState: StateFlow<AuthUiState> = InMemorySessionStore.session
        .map { session ->
            AuthUiState(session = session)
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = AuthUiState(session = InMemorySessionStore.session.value),
        )

    fun logout() {
        InMemorySessionStore.logout()
    }

    companion object {
        fun destinationFor(session: SessionState): String {
            val status = session.profile?.status ?: RegistrationStatus.NOT_REGISTERED
            return when (status) {
                RegistrationStatus.NOT_REGISTERED -> TicRoutes.Welcome
                RegistrationStatus.PENDING -> TicRoutes.WaitingApproval
                RegistrationStatus.APPROVED -> TicRoutes.Home
                RegistrationStatus.REJECTED -> TicRoutes.Rejected
            }
        }
    }
}

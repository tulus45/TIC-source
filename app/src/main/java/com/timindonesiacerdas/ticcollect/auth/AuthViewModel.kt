package com.timindonesiacerdas.ticcollect.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.timindonesiacerdas.ticcollect.data.local.InMemorySessionStore
import com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus
import com.timindonesiacerdas.ticcollect.data.model.SessionState
import com.timindonesiacerdas.ticcollect.navigation.TicRoutes
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class AuthUiState(
    val isLoading: Boolean = false,
    val session: SessionState = SessionState(),
)

class AuthViewModel : ViewModel() {
    private val isLoading = MutableStateFlow(false)

    val uiState: StateFlow<AuthUiState> = combine(
        isLoading,
        InMemorySessionStore.session,
    ) { loading, session ->
        AuthUiState(
            isLoading = loading,
            session = session,
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = AuthUiState(),
    )

    // TODO(stage-2): replace demo login with Firebase Authentication + Google Sign-In.
    fun simulateGoogleLogin() {
        if (isLoading.value) return

        viewModelScope.launch {
            isLoading.value = true
            delay(600)
            InMemorySessionStore.simulateGoogleLogin()
            runCatching {
                InMemorySessionStore.refreshRegistrationFromBackend()
            }
            isLoading.value = false
        }
    }

    fun logout() {
        InMemorySessionStore.logout()
    }

    companion object {
        fun destinationFor(session: SessionState): String {
            if (!session.isAuthenticated) return TicRoutes.Welcome

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

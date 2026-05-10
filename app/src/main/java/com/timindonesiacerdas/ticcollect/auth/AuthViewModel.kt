package com.timindonesiacerdas.ticcollect.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.timindonesiacerdas.ticcollect.data.local.InMemorySessionStore
import com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus
import com.timindonesiacerdas.ticcollect.data.model.SessionState
import com.timindonesiacerdas.ticcollect.navigation.TicRoutes
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class AuthUiState(
    val session: SessionState = SessionState(),
    val isBootstrapping: Boolean = true,
)

class AuthViewModel : ViewModel() {
    private val isBootstrappingFlow = MutableStateFlow(true)

    init {
        InMemorySessionStore.ensureLocalIdentity()
        viewModelScope.launch {
            runCatching {
                InMemorySessionStore.refreshRegistrationFromBackend()
            }
            isBootstrappingFlow.value = false
        }
    }

    val uiState: StateFlow<AuthUiState> = combine(
        InMemorySessionStore.session,
        isBootstrappingFlow.asStateFlow(),
    ) { session, isBootstrapping ->
        AuthUiState(
            session = session,
            isBootstrapping = isBootstrapping,
        )
    }
        .map { state ->
            state
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = AuthUiState(
                session = InMemorySessionStore.session.value,
                isBootstrapping = true,
            ),
        )

    fun logout() {
        InMemorySessionStore.logout()
    }

    fun refreshAccessStatus() {
        viewModelScope.launch {
            runCatching {
                InMemorySessionStore.refreshRegistrationFromBackend()
            }
        }
    }

    companion object {
        fun destinationFor(session: SessionState): String {
            val status = session.profile?.status ?: RegistrationStatus.NOT_REGISTERED
            return when (status) {
                RegistrationStatus.NOT_REGISTERED -> TicRoutes.Welcome
                RegistrationStatus.PENDING -> TicRoutes.WaitingApproval
                RegistrationStatus.APPROVED -> if (session.appAccess.requiresAppUpdate) {
                    TicRoutes.UpdateRequired
                } else {
                    TicRoutes.Home
                }
                RegistrationStatus.REJECTED -> TicRoutes.Rejected
                RegistrationStatus.SUSPENDED -> TicRoutes.Suspended
            }
        }
    }
}

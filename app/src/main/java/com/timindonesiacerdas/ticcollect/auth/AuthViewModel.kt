package com.timindonesiacerdas.ticcollect.auth

import android.util.Patterns
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.timindonesiacerdas.ticcollect.data.local.InMemorySessionStore
import com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus
import com.timindonesiacerdas.ticcollect.data.model.SessionState
import com.timindonesiacerdas.ticcollect.data.model.isApprovedAccess
import com.timindonesiacerdas.ticcollect.data.remote.TicBackendNotFoundException
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
    val loginEmail: String = "",
    val isLoggingIn: Boolean = false,
    val loginErrorMessage: String? = null,
    val loginResolvedDestination: String? = null,
)

private data class LoginFormState(
    val email: String = "",
    val isLoggingIn: Boolean = false,
    val errorMessage: String? = null,
    val resolvedDestination: String? = null,
)

class AuthViewModel : ViewModel() {
    private val isBootstrappingFlow = MutableStateFlow(true)
    private val loginFormState = MutableStateFlow(LoginFormState())

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
        loginFormState.asStateFlow(),
    ) { session, isBootstrapping, loginState ->
        AuthUiState(
            session = session,
            isBootstrapping = isBootstrapping,
            loginEmail = loginState.email.ifBlank { session.user?.gmail.orEmpty() },
            isLoggingIn = loginState.isLoggingIn,
            loginErrorMessage = loginState.errorMessage,
            loginResolvedDestination = loginState.resolvedDestination,
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
        loginFormState.value = LoginFormState()
    }

    fun refreshAccessStatus() {
        viewModelScope.launch {
            runCatching {
                InMemorySessionStore.refreshRegistrationFromBackend()
            }
        }
    }

    fun onLoginEmailChanged(value: String) {
        loginFormState.value = loginFormState.value.copy(
            email = value,
            errorMessage = null,
            resolvedDestination = null,
        )
    }

    fun loginWithEmail() {
        val email = loginFormState.value.email.trim()
        if (email.isBlank()) {
            loginFormState.value = loginFormState.value.copy(
                errorMessage = "Email wajib diisi.",
            )
            return
        }
        if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            loginFormState.value = loginFormState.value.copy(
                errorMessage = "Format email belum valid.",
            )
            return
        }

        viewModelScope.launch {
            loginFormState.value = loginFormState.value.copy(
                email = email,
                isLoggingIn = true,
                errorMessage = null,
                resolvedDestination = null,
            )

            runCatching {
                InMemorySessionStore.restoreRegistrationByEmail(email)
            }.onSuccess {
                loginFormState.value = loginFormState.value.copy(
                    isLoggingIn = false,
                    resolvedDestination = destinationFor(InMemorySessionStore.session.value),
                )
            }.onFailure { error ->
                val message = when (error) {
                    is TicBackendNotFoundException ->
                        "Email ini belum ditemukan di server. Gunakan Register jika ingin membuat registrasi baru."
                    else -> error.message ?: "Login belum berhasil. Coba lagi."
                }
                loginFormState.value = loginFormState.value.copy(
                    isLoggingIn = false,
                    errorMessage = message,
                )
            }
        }
    }

    fun onLoginNavigationHandled() {
        loginFormState.value = loginFormState.value.copy(
            resolvedDestination = null,
        )
    }

    companion object {
        fun destinationFor(session: SessionState): String {
            val status = session.profile?.status ?: RegistrationStatus.NOT_REGISTERED
            return when {
                status == RegistrationStatus.NOT_REGISTERED -> TicRoutes.Welcome
                status == RegistrationStatus.PENDING -> TicRoutes.WaitingApproval
                status.isApprovedAccess -> if (session.appAccess.requiresAppUpdate) {
                    TicRoutes.UpdateRequired
                } else {
                    TicRoutes.Home
                }
                status == RegistrationStatus.REJECTED -> TicRoutes.Rejected
                status == RegistrationStatus.SUSPENDED -> TicRoutes.Suspended
                else -> TicRoutes.WaitingApproval
            }
        }
    }
}

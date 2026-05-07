package com.timindonesiacerdas.ticcollect.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.ui.components.TicPrimaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicScreenContainer
import com.timindonesiacerdas.ticcollect.ui.components.TicSectionCard

@Composable
fun LoginScreen(
    uiState: AuthUiState,
    onBack: () -> Unit,
    onLoginClick: () -> Unit,
    onLoginResolved: (String) -> Unit,
) {
    LaunchedEffect(uiState.session.isAuthenticated, uiState.session.profile?.status) {
        if (uiState.session.isAuthenticated) {
            onLoginResolved(AuthViewModel.destinationFor(uiState.session))
        }
    }

    TicScreenContainer(
        title = "Login Gmail",
        subtitle = "Setelah login, aplikasi akan menyiapkan UID Firebase, Gmail, display name, dan photo URL untuk flow registrasi.",
        onBack = onBack,
    ) {
        TicSectionCard(
            title = "Data yang akan diambil",
            subtitle = "Semua data ini nantinya berasal dari Firebase Authentication.",
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(text = "- Firebase UID")
                Text(text = "- Gmail")
                Text(text = "- Display name")
                Text(text = "- Photo URL jika tersedia")
            }
        }

        TicSectionCard(
            title = "Google Sign-In",
            subtitle = "Tahap 1 masih memakai akun demo internal agar flow dan navigasi bisa diuji dulu.",
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator()
                }
                TicPrimaryButton(
                    text = if (uiState.isLoading) "Masuk..." else "Login with Gmail",
                    onClick = onLoginClick,
                    enabled = !uiState.isLoading,
                )
                Text(
                    text = "TODO tahap 2: hubungkan ke Firebase Auth + Google Credential Manager.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                )
            }
        }
    }
}

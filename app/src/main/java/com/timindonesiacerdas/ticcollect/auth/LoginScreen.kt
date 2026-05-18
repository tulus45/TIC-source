package com.timindonesiacerdas.ticcollect.auth

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.ui.components.TicPrimaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicScreenContainer
import com.timindonesiacerdas.ticcollect.ui.components.TicSecondaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicSectionCard

@Composable
fun LoginScreen(
    uiState: AuthUiState,
    onBack: () -> Unit,
    onEmailChanged: (String) -> Unit,
    onLoginClick: () -> Unit,
    onRegistrationClick: () -> Unit,
    onLoginResolved: (String) -> Unit,
    onLoginResolvedHandled: () -> Unit,
) {
    LaunchedEffect(uiState.loginResolvedDestination) {
        val destination = uiState.loginResolvedDestination
        if (!destination.isNullOrBlank()) {
            onLoginResolved(destination)
            onLoginResolvedHandled()
        }
    }

    TicScreenContainer(
        title = "Login",
        subtitle = "Masukkan email yang pernah dipakai saat register. Jika data ditemukan, aplikasi akan mengunduh ulang data registrasi ke device ini.",
        onBack = onBack,
    ) {
        if (!uiState.loginErrorMessage.isNullOrBlank()) {
            TicSectionCard(
                title = "Login belum berhasil",
                subtitle = uiState.loginErrorMessage,
            ) {}
        }

        TicSectionCard(
            title = "Pulihkan Registrasi",
            subtitle = "Login ini dipakai untuk mencari data registrasi lama berdasarkan email.",
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                OutlinedTextField(
                    value = uiState.loginEmail,
                    onValueChange = onEmailChanged,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Email") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    singleLine = true,
                )
                TicPrimaryButton(
                    text = if (uiState.isLoggingIn) "Mencari data..." else "Login & Ambil Data",
                    onClick = onLoginClick,
                    enabled = !uiState.isLoggingIn,
                )
                TicSecondaryButton(
                    text = "Register Baru",
                    onClick = onRegistrationClick,
                    enabled = !uiState.isLoggingIn,
                )
                Text(
                    text = "Jika email sudah pernah terdaftar, status approval dan data identitas akan dipulihkan dari server.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                )
            }
        }
    }
}

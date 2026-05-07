package com.timindonesiacerdas.ticcollect.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus
import com.timindonesiacerdas.ticcollect.ui.components.TicMenuCard
import com.timindonesiacerdas.ticcollect.ui.components.TicStatusPill

@Composable
fun HomeScreen(
    uiState: HomeUiState,
    onStartDataCollection: () -> Unit,
    onPendingUpload: () -> Unit,
    onHistory: () -> Unit,
    onProfile: () -> Unit,
) {
    val user = uiState.session.user
    val displayedEmail = uiState.session.profile?.gmail ?: user?.gmail.orEmpty()
    val displayName = uiState.session.profile?.nama
        ?.takeIf { it.isNotBlank() }
        ?: "Enumerator"

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Surface(
            shape = RoundedCornerShape(30.dp),
            color = MaterialTheme.colorScheme.primaryContainer,
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                TicStatusPill(status = RegistrationStatus.APPROVED)
                Text(
                    text = "Welcome, $displayName",
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                )
                Text(
                    text = displayedEmail,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f),
                )
                Text(
                    text = "Pilih menu kerja di bawah ini untuk mulai collect data lapangan.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.72f),
                )
            }
        }

        TicMenuCard(
            title = "Start Data Collection",
            description = "Masuk ke form logic satu pertanyaan per halaman.",
            actionLabel = "Buka",
            onActionClick = onStartDataCollection,
        )
        TicMenuCard(
            title = "Pending Upload",
            description = "${uiState.pendingUploadCount} item menunggu upload atau retry.",
            actionLabel = "Lihat",
            onActionClick = onPendingUpload,
        )
        TicMenuCard(
            title = "Submission History",
            description = "Riwayat submission dari device ini dan backend.",
            actionLabel = "Buka",
            onActionClick = onHistory,
        )
        TicMenuCard(
            title = "Profile",
            description = "Lihat identitas registrasi dan info perangkat.",
            actionLabel = "Buka",
            onActionClick = onProfile,
        )
    }
}

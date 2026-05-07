package com.timindonesiacerdas.ticcollect.registration

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus
import com.timindonesiacerdas.ticcollect.ui.components.TicPrimaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicScreenContainer
import com.timindonesiacerdas.ticcollect.ui.components.TicSecondaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicSectionCard

@Composable
fun WaitingApprovalScreen(
    currentStatus: RegistrationStatus?,
    statusSyncMessage: String?,
    isRefreshing: Boolean,
    onRefreshStatus: () -> Unit,
    onLogout: () -> Unit,
) {
    TicScreenContainer(
        title = "Waiting for Approval",
        subtitle = "Registrasi sudah dikirim ke backend. Tim admin akan memverifikasi data sebelum akses Home dibuka.",
    ) {
        TicSectionCard(
            title = "Status saat ini",
            subtitle = waitingStatusLabel(currentStatus),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = statusSyncMessage ?: "Tekan tombol refresh untuk mengambil status terbaru dari server.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                )
                Text(
                    text = "Selama status masih pending, Anda belum bisa masuk ke menu utama aplikasi.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                )
            }
        }

        TicPrimaryButton(
            text = if (isRefreshing) "Memeriksa Status..." else "Refresh Status",
            onClick = onRefreshStatus,
            enabled = !isRefreshing,
        )
        TicSecondaryButton(
            text = "Logout",
            onClick = onLogout,
        )
    }
}

private fun waitingStatusLabel(status: RegistrationStatus?): String = when (status) {
    RegistrationStatus.APPROVED -> "Approved"
    RegistrationStatus.REJECTED -> "Rejected"
    RegistrationStatus.PENDING -> "Pending review"
    RegistrationStatus.NOT_REGISTERED, null -> "Belum terkonfirmasi"
}

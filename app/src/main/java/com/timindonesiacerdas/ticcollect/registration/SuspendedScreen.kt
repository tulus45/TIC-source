package com.timindonesiacerdas.ticcollect.registration

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.ui.components.TicPrimaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicScreenContainer
import com.timindonesiacerdas.ticcollect.ui.components.TicSectionCard

@Composable
fun SuspendedScreen(
    suspensionReason: String?,
    onBackToWelcome: () -> Unit,
) {
    TicScreenContainer(
        title = "Akun Ditangguhkan",
        subtitle = "Akses ke menu utama aplikasi sedang diblokir. Silakan periksa catatan admin atau hubungi tim terkait.",
    ) {
        TicSectionCard(
            title = "Catatan admin",
            subtitle = suspensionReason ?: "Belum ada alasan detail yang dikirim dari backend.",
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Status suspend dipakai untuk menghentikan akses akun yang sebelumnya sudah approved.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                )
            }
        }
        TicPrimaryButton(
            text = "Kembali ke Halaman Awal",
            onClick = onBackToWelcome,
        )
    }
}

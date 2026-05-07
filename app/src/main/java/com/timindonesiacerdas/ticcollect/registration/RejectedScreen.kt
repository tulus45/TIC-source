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
fun RejectedScreen(
    rejectionReason: String?,
    onEditRegistration: () -> Unit,
) {
    TicScreenContainer(
        title = "Registration Rejected",
        subtitle = "Akun belum bisa masuk ke Home. Periksa alasan penolakan lalu perbarui data registrasi.",
    ) {
        TicSectionCard(
            title = "Alasan penolakan",
            subtitle = rejectionReason ?: "Belum ada alasan detail dari reviewer.",
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Tahap final akan menampilkan alasan dari backend jika tersedia.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                )
            }
        }
        TicPrimaryButton(
            text = "Perbaiki Registrasi",
            onClick = onEditRegistration,
        )
    }
}

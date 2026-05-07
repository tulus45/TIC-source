package com.timindonesiacerdas.ticcollect.upload

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.ui.components.TicScreenContainer
import com.timindonesiacerdas.ticcollect.ui.components.TicSecondaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicSectionCard

@Composable
fun PendingUploadScreen(
    uiState: PendingUploadUiState,
    onBack: () -> Unit,
    onRetry: (String) -> Unit,
) {
    TicScreenContainer(
        title = "Pending Upload",
        subtitle = "Semua hasil collect nantinya akan tersimpan lokal dulu lalu diupload via WorkManager.",
        onBack = onBack,
    ) {
        if (uiState.items.isEmpty()) {
            TicSectionCard(
                title = "Belum ada data",
                subtitle = "Submission yang gagal upload atau menunggu internet akan muncul di sini.",
            ) {}
        } else {
            uiState.items.forEach { item ->
                TicSectionCard(
                    title = item.formName,
                    subtitle = "Project: ${item.projectName}",
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(text = "Status: ${item.status}")
                        Text(text = "Created: ${item.createdAt}")
                        Text(
                            text = "TODO tahap 2: tombol ini akan enqueue retry upload via WorkManager.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                        )
                        TicSecondaryButton(
                            text = "Retry Upload",
                            onClick = { onRetry(item.submissionId) },
                        )
                    }
                }
            }
        }
    }
}

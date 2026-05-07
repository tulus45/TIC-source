package com.timindonesiacerdas.ticcollect.upload

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.data.model.SubmissionStatus
import com.timindonesiacerdas.ticcollect.ui.components.TicPrimaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicScreenContainer
import com.timindonesiacerdas.ticcollect.ui.components.TicSecondaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicSectionCard
import com.timindonesiacerdas.ticcollect.utils.TimeFormatter

@Composable
fun PendingUploadScreen(
    uiState: PendingUploadUiState,
    onBack: () -> Unit,
    onRetry: (String) -> Unit,
    onUploadAll: () -> Unit,
) {
    TicScreenContainer(
        title = "Upload Data",
        subtitle = "Semua hasil data collection tersimpan lokal dulu, lalu bisa diupload per data atau sekaligus.",
        onBack = onBack,
    ) {
        val hasPendingUploads = uiState.items.any {
            it.status != SubmissionStatus.UPLOADED && it.status != SubmissionStatus.UPLOADING
        }

        TicPrimaryButton(
            text = "Upload Semua",
            onClick = onUploadAll,
            enabled = hasPendingUploads,
        )

        if (uiState.items.isEmpty()) {
            TicSectionCard(
                title = "Belum ada data",
                subtitle = "Hasil data collection akan muncul di sini setelah proses evidence selesai.",
            ) {}
        } else {
            uiState.items.forEach { item ->
                TicSectionCard(
                    title = item.formName,
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(text = "Status: ${statusLabel(item.status)}")
                        Text(text = "Tanggal disimpan: ${TimeFormatter.storageToDisplay(item.createdAt)}")
                        item.uploadedAt?.let { uploadedAt ->
                            Text(text = "Tanggal diupload: ${TimeFormatter.storageToDisplay(uploadedAt)}")
                        }
                        TicSecondaryButton(
                            text = when (item.status) {
                                SubmissionStatus.UPLOADED -> "Sudah Uploaded"
                                SubmissionStatus.UPLOADING -> "Sedang Upload"
                                SubmissionStatus.FAILED_UPLOAD -> "Upload Ulang"
                                else -> "Upload"
                            },
                            onClick = { onRetry(item.submissionId) },
                            enabled = item.status != SubmissionStatus.UPLOADED && item.status != SubmissionStatus.UPLOADING,
                        )
                    }
                }
            }
        }
    }
}

private fun statusLabel(status: SubmissionStatus): String = when (status) {
    SubmissionStatus.DRAFT -> "Draft"
    SubmissionStatus.COMPLETED_PENDING_UPLOAD -> "Siap diupload"
    SubmissionStatus.UPLOADING -> "Sedang upload"
    SubmissionStatus.UPLOADED -> "Sudah upload"
    SubmissionStatus.FAILED_UPLOAD -> "Upload gagal"
}

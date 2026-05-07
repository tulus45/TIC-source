package com.timindonesiacerdas.ticcollect.upload

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.data.model.SubmissionRecord
import com.timindonesiacerdas.ticcollect.data.model.SubmissionStatus
import com.timindonesiacerdas.ticcollect.utils.TimeFormatter

@Composable
fun PendingUploadScreen(
    uiState: PendingUploadUiState,
    onBack: () -> Unit,
    onRetry: (String) -> Unit,
    onUploadAll: () -> Unit,
) {
    val hasUploadableItems = uiState.items.any {
        it.status == SubmissionStatus.DRAFT ||
            it.status == SubmissionStatus.COMPLETED_PENDING_UPLOAD ||
            it.status == SubmissionStatus.FAILED_UPLOAD
    }
    val statusSummaries = buildUploadStatusSummaries(uiState.items)

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                TextButton(onClick = onBack) {
                    Text(text = "Kembali")
                }
            }

            item {
                Text(
                    text = "Upload Data",
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                )
            }

            if (uiState.items.isNotEmpty()) {
                item {
                    UploadStatusSummaryRow(
                        summaries = statusSummaries,
                    )
                }
            }

            item {
                UploadPrimaryButton(
                    text = "Upload Semua",
                    onClick = onUploadAll,
                    enabled = hasUploadableItems,
                )
            }

            if (uiState.items.isEmpty()) {
                item {
                    UploadEmptyStateCard(
                        title = "Belum ada data",
                        subtitle = "Hasil data collection akan muncul di sini setelah proses evidence selesai.",
                    )
                }
            } else {
                items(
                    items = uiState.items,
                    key = { item -> item.submissionId },
                ) { item ->
                    UploadListItem(
                        item = item,
                        onRetry = onRetry,
                    )
                }
            }
        }
    }
}

@Composable
private fun UploadPrimaryButton(
    text: String,
    onClick: () -> Unit,
    enabled: Boolean,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp),
        shape = RoundedCornerShape(18.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
        ),
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelLarge,
        )
    }
}

@Composable
private fun UploadEmptyStateCard(
    title: String,
    subtitle: String,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
        shape = RoundedCornerShape(20.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
            )
        }
    }
}

@Composable
private fun UploadStatusSummaryRow(
    summaries: List<UploadStatusSummary>,
) {
    Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        summaries.forEach { summary ->
            UploadStatusSummaryCard(summary = summary)
        }
    }
}

@Composable
private fun UploadStatusSummaryCard(
    summary: UploadStatusSummary,
) {
    val containerColor = summaryContainerColor(summary.status)
    val contentColor = summaryContentColor(summary.status)

    Card(
        modifier = Modifier.width(104.dp),
        colors = CardDefaults.cardColors(
            containerColor = containerColor,
        ),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = summary.count.toString(),
                style = MaterialTheme.typography.titleLarge,
                color = contentColor,
                maxLines = 1,
            )
            Text(
                text = summary.label,
                style = MaterialTheme.typography.labelLarge,
                color = contentColor,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun UploadListItem(
    item: SubmissionRecord,
    onRetry: (String) -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
        shape = RoundedCornerShape(18.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = item.formName,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = "Disimpan ${TimeFormatter.storageToDisplay(item.createdAt)}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                uploadMetaText(item)?.let { metaText ->
                    Text(
                        text = metaText,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }

            OutlinedButton(
                onClick = { onRetry(item.submissionId) },
                enabled = item.status != SubmissionStatus.UPLOADED && item.status != SubmissionStatus.UPLOADING,
                modifier = Modifier
                    .width(128.dp)
                    .height(40.dp),
                shape = RoundedCornerShape(14.dp),
            ) {
                Text(
                    text = uploadButtonLabel(item.status),
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
    }
}

private fun uploadMetaText(item: SubmissionRecord): String? {
    return item.uploadedAt?.let { uploadedAt ->
        "Upload ${TimeFormatter.storageToDisplay(uploadedAt)}"
    }
}

private data class UploadStatusSummary(
    val status: SubmissionStatus,
    val label: String,
    val count: Int,
)

private fun buildUploadStatusSummaries(items: List<SubmissionRecord>): List<UploadStatusSummary> {
    val counts = items.groupingBy { it.status }.eachCount()

    return listOf(
        UploadStatusSummary(
            status = SubmissionStatus.UPLOADED,
            label = "Uploaded",
            count = counts[SubmissionStatus.UPLOADED] ?: 0,
        ),
        UploadStatusSummary(
            status = SubmissionStatus.COMPLETED_PENDING_UPLOAD,
            label = "Pending",
            count = counts[SubmissionStatus.COMPLETED_PENDING_UPLOAD] ?: 0,
        ),
        UploadStatusSummary(
            status = SubmissionStatus.FAILED_UPLOAD,
            label = "Failed",
            count = counts[SubmissionStatus.FAILED_UPLOAD] ?: 0,
        ),
    )
}

@Composable
private fun summaryContainerColor(status: SubmissionStatus): Color = when (status) {
    SubmissionStatus.UPLOADED -> Color(0x1F256C52)
    SubmissionStatus.COMPLETED_PENDING_UPLOAD -> MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
    SubmissionStatus.UPLOADING -> Color(0x248A5A00)
    SubmissionStatus.FAILED_UPLOAD -> Color(0x1F9D2F38)
    SubmissionStatus.DRAFT -> Color(0x1A68748B)
}

@Composable
private fun summaryContentColor(status: SubmissionStatus): Color = when (status) {
    SubmissionStatus.UPLOADED -> Color(0xFF256C52)
    SubmissionStatus.COMPLETED_PENDING_UPLOAD -> MaterialTheme.colorScheme.primary
    SubmissionStatus.UPLOADING -> Color(0xFF8A5A00)
    SubmissionStatus.FAILED_UPLOAD -> Color(0xFF9D2F38)
    SubmissionStatus.DRAFT -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f)
}

private fun uploadButtonLabel(status: SubmissionStatus): String = when (status) {
    SubmissionStatus.UPLOADED -> "Uploaded"
    SubmissionStatus.UPLOADING -> "Sedang Upload"
    SubmissionStatus.FAILED_UPLOAD -> "Upload Ulang"
    SubmissionStatus.DRAFT, SubmissionStatus.COMPLETED_PENDING_UPLOAD -> "Upload"
}

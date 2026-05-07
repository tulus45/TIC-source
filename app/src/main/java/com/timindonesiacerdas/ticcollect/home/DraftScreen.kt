package com.timindonesiacerdas.ticcollect.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.data.model.SubmissionRecord
import com.timindonesiacerdas.ticcollect.data.model.SubmissionStatus
import com.timindonesiacerdas.ticcollect.utils.TimeFormatter

@Composable
fun DraftScreen(
    items: List<SubmissionRecord>,
    onBack: () -> Unit,
    onEdit: (String) -> Unit,
    onDelete: (String) -> Unit,
) {
    var pendingDeleteRecord by remember { mutableStateOf<SubmissionRecord?>(null) }
    val visibleItems = remember(items) {
        items.filterNot { it.status == SubmissionStatus.UPLOADED }
    }

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
                    text = "Draft",
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onBackground,
                )
            }

            if (visibleItems.isEmpty()) {
                item {
                    DraftEmptyStateCard()
                }
            } else {
                items(
                    items = visibleItems,
                    key = { item -> item.submissionId },
                ) { item ->
                    DraftListItem(
                        item = item,
                        onEdit = onEdit,
                        onDelete = { pendingDeleteRecord = item },
                    )
                }
            }
        }
    }

    pendingDeleteRecord?.let { record ->
        AlertDialog(
            onDismissRequest = { pendingDeleteRecord = null },
            title = {
                Text(text = "Hapus data?")
            },
            text = {
                Text(text = "Data ${record.formName} akan dihapus dari penyimpanan lokal.")
            },
            confirmButton = {
                Button(
                    onClick = {
                        onDelete(record.submissionId)
                        pendingDeleteRecord = null
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF9D2F38),
                        contentColor = Color.White,
                    ),
                ) {
                    Text(text = "Hapus")
                }
            },
            dismissButton = {
                TextButton(onClick = { pendingDeleteRecord = null }) {
                    Text(text = "Batal")
                }
            },
        )
    }
}

@Composable
private fun DraftEmptyStateCard() {
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
                text = "Belum ada data",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = "Data yang belum selesai uploaded akan muncul di sini dan bisa diedit atau dihapus.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
            )
        }
    }
}

@Composable
private fun DraftListItem(
    item: SubmissionRecord,
    onEdit: (String) -> Unit,
    onDelete: (String) -> Unit,
) {
    val isActionEnabled = item.status != SubmissionStatus.UPLOADING
    val statusStyle = draftStatusStyle(item.status)

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
        shape = RoundedCornerShape(18.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
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
                    item.uploadedAt?.let { uploadedAt ->
                        Text(
                            text = "Upload ${TimeFormatter.storageToDisplay(uploadedAt)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.64f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }

                Surface(
                    color = statusStyle.containerColor,
                    shape = RoundedCornerShape(999.dp),
                ) {
                    Text(
                        text = statusStyle.label,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        style = MaterialTheme.typography.bodySmall,
                        color = statusStyle.contentColor,
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Button(
                    onClick = { onEdit(item.submissionId) },
                    enabled = isActionEnabled,
                    modifier = Modifier
                        .width(108.dp)
                        .height(40.dp),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Text(text = "Edit")
                }
                OutlinedButton(
                    onClick = { onDelete(item.submissionId) },
                    enabled = isActionEnabled,
                    modifier = Modifier
                        .width(108.dp)
                        .height(40.dp),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Text(text = "Hapus")
                }
            }
        }
    }
}

private data class DraftStatusStyle(
    val label: String,
    val containerColor: Color,
    val contentColor: Color,
)

@Composable
private fun draftStatusStyle(status: SubmissionStatus): DraftStatusStyle = when (status) {
    SubmissionStatus.DRAFT -> DraftStatusStyle(
        label = "Draft",
        containerColor = Color(0x1A68748B),
        contentColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
    )
    SubmissionStatus.COMPLETED_PENDING_UPLOAD -> DraftStatusStyle(
        label = "Pending",
        containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
        contentColor = MaterialTheme.colorScheme.primary,
    )
    SubmissionStatus.UPLOADING -> DraftStatusStyle(
        label = "Uploading",
        containerColor = Color(0x248A5A00),
        contentColor = Color(0xFF8A5A00),
    )
    SubmissionStatus.UPLOADED -> DraftStatusStyle(
        label = "Uploaded",
        containerColor = Color(0x1F256C52),
        contentColor = Color(0xFF256C52),
    )
    SubmissionStatus.FAILED_UPLOAD -> DraftStatusStyle(
        label = "Failed",
        containerColor = Color(0x1F9D2F38),
        contentColor = Color(0xFF9D2F38),
    )
}

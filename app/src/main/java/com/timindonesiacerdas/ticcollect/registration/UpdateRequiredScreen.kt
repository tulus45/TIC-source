package com.timindonesiacerdas.ticcollect.registration

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.data.model.AppAccessState
import com.timindonesiacerdas.ticcollect.ui.components.TicPrimaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicScreenContainer
import com.timindonesiacerdas.ticcollect.ui.components.TicSecondaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicSectionCard

@Composable
fun UpdateRequiredScreen(
    appAccess: AppAccessState,
    isRefreshing: Boolean,
    onRefreshStatus: () -> Unit,
) {
    val uriHandler = LocalUriHandler.current
    val releasePolicy = appAccess.releasePolicy
    val latestVersionLabel = releasePolicy.latestVersionName
        ?.takeIf { it.isNotBlank() }
        ?: releasePolicy.latestVersionCode.takeIf { it > 0 }?.let { "v$it" }
        ?: "versi terbaru"
    val updateUrl = releasePolicy.updateUrl?.takeIf { it.isNotBlank() }
    val updateMessage = releasePolicy.updateMessage
        ?.takeIf { it.isNotBlank() }
        ?: "Registrasi Anda sudah approved, tetapi APK harus diperbarui dulu sebelum menu utama dibuka."

    TicScreenContainer(
        title = "Update APK Diperlukan",
        subtitle = "Akses Home hanya dibuka untuk user approved yang sudah memakai APK release terbaru.",
    ) {
        TicSectionCard(
            title = "Status akses",
            subtitle = "Akun Anda sudah disetujui, tetapi versi aplikasi masih perlu diperbarui.",
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = updateMessage,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                )
                Text(
                    text = "Versi APK saat ini: ${appAccess.currentVersionName} (${appAccess.currentVersionCode})",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                )
                Text(
                    text = "Versi minimal untuk akses approved: ${releasePolicy.minimumApprovedVersionCode}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                )
                Text(
                    text = "Release yang diharapkan: $latestVersionLabel",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                )
            }
        }

        if (updateUrl != null) {
            TicPrimaryButton(
                text = "Buka Link Update",
                onClick = { uriHandler.openUri(updateUrl) },
            )
        }

        TicSecondaryButton(
            text = if (isRefreshing) "Memeriksa Status..." else "Refresh Status",
            onClick = onRefreshStatus,
            enabled = !isRefreshing,
        )
    }
}

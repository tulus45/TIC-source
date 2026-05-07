package com.timindonesiacerdas.ticcollect.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun TicPlaceholderScreen(
    title: String,
    subtitle: String,
    message: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    primaryActionLabel: String? = null,
    onPrimaryAction: (() -> Unit)? = null,
) {
    TicScreenContainer(
        title = title,
        subtitle = subtitle,
        modifier = modifier,
        onBack = onBack,
    ) {
        TicSectionCard(
            title = "Stage 1 Placeholder",
            subtitle = message,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "Screen ini sudah masuk navigasi, tetapi implementasi finalnya akan kita sambungkan di tahap berikutnya.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                )
                if (primaryActionLabel != null && onPrimaryAction != null) {
                    TicPrimaryButton(
                        text = primaryActionLabel,
                        onClick = onPrimaryAction,
                    )
                }
            }
        }
    }
}

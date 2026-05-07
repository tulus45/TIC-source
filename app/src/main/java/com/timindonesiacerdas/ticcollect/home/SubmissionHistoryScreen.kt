package com.timindonesiacerdas.ticcollect.home

import androidx.compose.runtime.Composable
import com.timindonesiacerdas.ticcollect.ui.components.TicPlaceholderScreen

@Composable
fun SubmissionHistoryScreen(
    onBack: () -> Unit,
) {
    TicPlaceholderScreen(
        title = "Submission History",
        subtitle = "Riwayat upload akan dibaca dari Room dan backend.",
        message = "Tahap 2 akan menambahkan daftar submission lengkap, status upload, dan detail file evidence.",
        onBack = onBack,
    )
}

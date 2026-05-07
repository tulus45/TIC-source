package com.timindonesiacerdas.ticcollect.location

import androidx.compose.runtime.Composable
import com.timindonesiacerdas.ticcollect.ui.components.TicPlaceholderScreen

@Composable
fun GpsCaptureScreen(
    onBack: () -> Unit,
) {
    TicPlaceholderScreen(
        title = "GPS Capture",
        subtitle = "Lokasi akan memakai Fused Location Provider dengan izin yang jelas.",
        message = "Tahap 2 akan menambahkan permission flow, akurasi, timestamp, dan refresh lokasi terakhir.",
        onBack = onBack,
    )
}

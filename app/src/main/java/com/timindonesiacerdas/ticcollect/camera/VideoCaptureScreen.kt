package com.timindonesiacerdas.ticcollect.camera

import androidx.compose.runtime.Composable
import com.timindonesiacerdas.ticcollect.ui.components.TicPlaceholderScreen

@Composable
fun VideoCaptureScreen(
    onBack: () -> Unit,
) {
    TicPlaceholderScreen(
        title = "Video Capture",
        subtitle = "Evidence video pendek akan dibatasi maksimal 30 detik.",
        message = "Tahap 2 akan menambahkan CameraX video capture, batas durasi, dan penyimpanan lokal sebelum upload.",
        onBack = onBack,
    )
}

package com.timindonesiacerdas.ticcollect.camera

import androidx.compose.runtime.Composable
import com.timindonesiacerdas.ticcollect.ui.components.TicPlaceholderScreen

@Composable
fun PhotoCaptureScreen(
    onBack: () -> Unit,
) {
    TicPlaceholderScreen(
        title = "Photo Capture",
        subtitle = "Foto evidence akan diberi watermark timestamp dan GPS.",
        message = "Tahap 2 akan menggabungkan CameraX, GPS terbaru, watermark JPG, dan kompresi upload.",
        onBack = onBack,
    )
}

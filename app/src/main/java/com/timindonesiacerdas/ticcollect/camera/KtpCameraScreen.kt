package com.timindonesiacerdas.ticcollect.camera

import androidx.camera.core.CameraSelector
import androidx.compose.runtime.Composable

@Composable
fun KtpCameraScreen(
    onBack: () -> Unit,
    onPhotoCaptured: (String) -> Unit,
) {
    RegistrationCameraScreen(
        title = "KTP Camera",
        subtitle = "Ambil foto KTP asli dengan kamera belakang. Hasilnya langsung disimpan ke draft registrasi.",
        captureHint = "Posisikan KTP rata, penuh di frame, dan pastikan tulisan tetap terbaca.",
        filenamePrefix = "ktp",
        lensFacing = CameraSelector.LENS_FACING_BACK,
        onBack = onBack,
        onPhotoCaptured = onPhotoCaptured,
    )
}

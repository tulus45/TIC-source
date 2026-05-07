package com.timindonesiacerdas.ticcollect.camera

import androidx.camera.core.CameraSelector
import androidx.compose.runtime.Composable

@Composable
fun SelfieCameraScreen(
    onBack: () -> Unit,
    onPhotoCaptured: (String) -> Unit,
) {
    RegistrationCameraScreen(
        title = "Selfie Camera",
        subtitle = "Ambil selfie verifikasi dengan kamera depan. Hasilnya langsung disimpan ke draft registrasi.",
        captureHint = "Pastikan wajah terlihat jelas, tanpa backlight, dan berada di tengah frame.",
        filenamePrefix = "selfie",
        lensFacing = CameraSelector.LENS_FACING_FRONT,
        onBack = onBack,
        onPhotoCaptured = onPhotoCaptured,
    )
}

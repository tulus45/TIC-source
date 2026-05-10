package com.timindonesiacerdas.ticcollect.registration

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import androidx.compose.foundation.clickable
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.Image
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.exifinterface.media.ExifInterface
import com.timindonesiacerdas.ticcollect.ui.components.TicPrimaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicScreenContainer
import com.timindonesiacerdas.ticcollect.ui.components.TicSecondaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicSectionCard
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun RegistrationScreen(
    uiState: RegistrationUiState,
    onBack: () -> Unit,
    onCaptureKtp: () -> Unit,
    onCaptureSelfie: () -> Unit,
    onGmailChanged: (String) -> Unit,
    onNikChanged: (String) -> Unit,
    onNamaChanged: (String) -> Unit,
    onAlamatChanged: (String) -> Unit,
    onNoHpChanged: (String) -> Unit,
    onNoRekeningChanged: (String) -> Unit,
    onNamaBankChanged: (String) -> Unit,
    onNamaPemilikChanged: (String) -> Unit,
    onAreaKerjaChanged: (String) -> Unit,
    onSubmit: () -> Unit,
    onSubmitted: () -> Unit,
) {
    var currentStep by rememberSaveable { mutableStateOf(RegistrationStep.KtpPhoto) }

    LaunchedEffect(uiState.isSubmitted) {
        if (uiState.isSubmitted) {
            onSubmitted()
        }
    }

    val stepConfig = when (currentStep) {
        RegistrationStep.KtpPhoto -> Triple(
            "Langkah 1 dari 3",
            "Foto KTP",
            "Ambil foto KTP yang jelas dan penuh di dalam frame sebelum melanjutkan ke tahap berikutnya.",
        )

        RegistrationStep.SelfiePhoto -> Triple(
            "Langkah 2 dari 3",
            "Foto Selfie",
            "Ambil selfie verifikasi dengan wajah yang jelas sebelum masuk ke data identitas.",
        )

        RegistrationStep.IdentityForm -> Triple(
            "Langkah 3 dari 3",
            "Data Identitas",
            null,
        )
    }
    val (subtitle, stepTitle, stepDescription) = stepConfig

    TicScreenContainer(
        title = "Registration",
        subtitle = subtitle,
        onBack = {
            currentStep = when (currentStep) {
                RegistrationStep.KtpPhoto -> {
                    onBack()
                    RegistrationStep.KtpPhoto
                }

                RegistrationStep.SelfiePhoto -> RegistrationStep.KtpPhoto
                RegistrationStep.IdentityForm -> RegistrationStep.SelfiePhoto
            }
        },
    ) {
        if (!uiState.errorMessage.isNullOrBlank()) {
            TicSectionCard(
                title = "Perlu diperbaiki",
                subtitle = uiState.errorMessage,
            ) {}
        }

        TicSectionCard(
            title = stepTitle,
            subtitle = stepDescription,
        ) {
            when (currentStep) {
                RegistrationStep.KtpPhoto -> {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        TicSecondaryButton(
                            text = if (uiState.ktpLocalPath.isNullOrBlank()) "Ambil Foto KTP" else "Ambil Ulang Foto KTP",
                            onClick = onCaptureKtp,
                        )
                        RegistrationDocumentPreview(
                            label = "Foto KTP",
                            filePath = uiState.ktpLocalPath,
                        )
                        TicPrimaryButton(
                            text = "Lanjut ke Foto Selfie",
                            onClick = { currentStep = RegistrationStep.SelfiePhoto },
                            enabled = !uiState.ktpLocalPath.isNullOrBlank(),
                        )
                    }
                }

                RegistrationStep.SelfiePhoto -> {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        TicSecondaryButton(
                            text = if (uiState.selfieLocalPath.isNullOrBlank()) "Ambil Selfie" else "Ambil Ulang Selfie",
                            onClick = onCaptureSelfie,
                        )
                        RegistrationDocumentPreview(
                            label = "Selfie",
                            filePath = uiState.selfieLocalPath,
                        )
                        TicSecondaryButton(
                            text = "Kembali ke Foto KTP",
                            onClick = { currentStep = RegistrationStep.KtpPhoto },
                        )
                        TicPrimaryButton(
                            text = "Lanjut ke Data Identitas",
                            onClick = { currentStep = RegistrationStep.IdentityForm },
                            enabled = !uiState.selfieLocalPath.isNullOrBlank(),
                        )
                    }
                }

                RegistrationStep.IdentityForm -> {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedTextField(
                            value = uiState.gmail,
                            onValueChange = onGmailChanged,
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Email") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        )
                        OutlinedTextField(
                            value = uiState.nik,
                            onValueChange = onNikChanged,
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("NIK KTP") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        )
                        OutlinedTextField(
                            value = uiState.nama,
                            onValueChange = onNamaChanged,
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Nama Lengkap") },
                        )
                        OutlinedTextField(
                            value = uiState.alamat,
                            onValueChange = onAlamatChanged,
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = 88.dp),
                            label = { Text("Alamat") },
                            minLines = 2,
                        )
                        OutlinedTextField(
                            value = uiState.noHp,
                            onValueChange = onNoHpChanged,
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("No HP") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        )
                        OutlinedTextField(
                            value = uiState.noRekening,
                            onValueChange = onNoRekeningChanged,
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("No Rekening") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        )
                        OutlinedTextField(
                            value = uiState.namaBank,
                            onValueChange = onNamaBankChanged,
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Nama Bank") },
                        )
                        OutlinedTextField(
                            value = uiState.namaPemilik,
                            onValueChange = onNamaPemilikChanged,
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Nama Pemilik") },
                        )
                        RegistrationAreaKerjaSelector(
                            selectedArea = uiState.areaKerja,
                            options = uiState.availableAreaKerja,
                            onAreaSelected = onAreaKerjaChanged,
                        )
                        TicSecondaryButton(
                            text = "Kembali ke Foto Selfie",
                            onClick = { currentStep = RegistrationStep.SelfiePhoto },
                        )
                        TicPrimaryButton(
                            text = if (uiState.isSubmitting) "Mengirim..." else "Submit Registration",
                            onClick = onSubmit,
                            enabled = !uiState.isSubmitting,
                        )
                    }
                }
            }
        }
    }
}

private enum class RegistrationStep {
    KtpPhoto,
    SelfiePhoto,
    IdentityForm,
}

@Composable
private fun RegistrationAreaKerjaSelector(
    selectedArea: String,
    options: List<String>,
    onAreaSelected: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            text = "Area Kerja",
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.onSurface,
        )
        options.forEach { option ->
            val isSelected = option == selectedArea
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onAreaSelected(option) }
                    .padding(vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                RadioButton(
                    selected = isSelected,
                    onClick = { onAreaSelected(option) },
                )
                Text(
                    text = option,
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}

@Composable
private fun RegistrationDocumentPreview(
    label: String,
    filePath: String?,
) {
    if (filePath.isNullOrBlank()) {
        Text(
            text = "$label belum diambil.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
        )
        return
    }

    val previewState by produceState<RegistrationPreviewState>(
        initialValue = RegistrationPreviewState.Loading,
        key1 = filePath,
    ) {
        value = withContext(Dispatchers.IO) {
            decodePreviewBitmap(filePath)
                ?.let { bitmap ->
                    RegistrationPreviewState.Ready(
                        bitmap = bitmap.asImageBitmap(),
                        aspectRatio = bitmap.width.toFloat() / bitmap.height.toFloat(),
                    )
                }
                ?: RegistrationPreviewState.Unavailable
        }
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.32f),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (previewState is RegistrationPreviewState.Ready) {
                Image(
                    bitmap = (previewState as RegistrationPreviewState.Ready).bitmap,
                    contentDescription = label,
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio((previewState as RegistrationPreviewState.Ready).aspectRatio),
                    contentScale = ContentScale.Fit,
                )
            }
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = File(filePath).name,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                )
                when (previewState) {
                    RegistrationPreviewState.Loading -> {
                        Text(
                            text = "Menyiapkan preview...",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.64f),
                        )
                    }

                    RegistrationPreviewState.Unavailable -> {
                        Text(
                            text = "Preview belum bisa dibaca, tetapi file sudah tersimpan.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.64f),
                        )
                    }

                    is RegistrationPreviewState.Ready -> Unit
                }
            }
        }
    }
}

private sealed interface RegistrationPreviewState {
    data object Loading : RegistrationPreviewState
    data object Unavailable : RegistrationPreviewState
    data class Ready(
        val bitmap: ImageBitmap,
        val aspectRatio: Float,
    ) : RegistrationPreviewState
}

private fun decodePreviewBitmap(filePath: String): Bitmap? {
    val boundsOptions = BitmapFactory.Options().apply {
        inJustDecodeBounds = true
    }
    BitmapFactory.decodeFile(filePath, boundsOptions)

    if (boundsOptions.outWidth <= 0 || boundsOptions.outHeight <= 0) {
        return null
    }

    val targetSize = 1280
    var inSampleSize = 1
    var width = boundsOptions.outWidth
    var height = boundsOptions.outHeight

    while (width > targetSize || height > targetSize) {
        width /= 2
        height /= 2
        inSampleSize *= 2
    }

    val decodeOptions = BitmapFactory.Options().apply {
        this.inSampleSize = inSampleSize
    }
    val rawBitmap = BitmapFactory.decodeFile(filePath, decodeOptions) ?: return null
    return rawBitmap.applyExifRotation(filePath)
}

private fun Bitmap.applyExifRotation(filePath: String): Bitmap {
    val exif = runCatching { ExifInterface(filePath) }.getOrNull() ?: return this
    val orientation = exif.getAttributeInt(
        ExifInterface.TAG_ORIENTATION,
        ExifInterface.ORIENTATION_NORMAL,
    )

    val rotationDegrees = when (orientation) {
        ExifInterface.ORIENTATION_ROTATE_90 -> 90f
        ExifInterface.ORIENTATION_ROTATE_180 -> 180f
        ExifInterface.ORIENTATION_ROTATE_270 -> 270f
        else -> 0f
    }

    if (rotationDegrees == 0f) return this

    val matrix = Matrix().apply {
        postRotate(rotationDegrees)
    }
    val rotatedBitmap = Bitmap.createBitmap(
        this,
        0,
        0,
        width,
        height,
        matrix,
        true,
    )
    if (rotatedBitmap != this) {
        recycle()
    }
    return rotatedBitmap.unmirrorSelfieIfNeeded(filePath)
}

private fun Bitmap.unmirrorSelfieIfNeeded(filePath: String): Bitmap {
    val fileName = File(filePath).name.lowercase()
    if (!fileName.contains("selfie")) return this

    val matrix = Matrix().apply {
        preScale(-1f, 1f)
    }
    val unmirroredBitmap = Bitmap.createBitmap(
        this,
        0,
        0,
        width,
        height,
        matrix,
        true,
    )
    if (unmirroredBitmap != this) {
        recycle()
    }
    return unmirroredBitmap
}

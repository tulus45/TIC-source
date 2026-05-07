package com.timindonesiacerdas.ticcollect.form

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.os.Environment
import android.view.Surface as AndroidSurface
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.exifinterface.media.ExifInterface
import com.timindonesiacerdas.ticcollect.camera.stampPhotoWithLocation
import com.timindonesiacerdas.ticcollect.location.LocationStamp
import com.timindonesiacerdas.ticcollect.location.hasLocationPermission
import com.timindonesiacerdas.ticcollect.location.resolveCurrentLocationStamp
import com.timindonesiacerdas.ticcollect.ui.components.TicPrimaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicSecondaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicSectionCard
import androidx.compose.material3.Surface
import com.timindonesiacerdas.ticcollect.utils.TimeFormatter
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun EvidenceWorkflowScreen(
    uiState: FormUiState,
    onBack: () -> Unit,
    onPreviousStep: () -> Unit,
    onNextStep: () -> Unit,
    onFinish: () -> Unit,
    onPhotoRecorded: (String, EvidencePhotoRecord) -> Unit,
    onPhotoCleared: (String) -> Unit,
    onGpsRecorded: (EvidenceGpsRecord) -> Unit,
) {
    val step = uiState.evidenceSteps.getOrNull(uiState.currentEvidenceStepIndex) ?: return
    val capturedPhoto = uiState.capturedPhotos[step.id]
    val recordedGps = if (step.kind == EvidenceStepKind.GPS) uiState.recordedGps else null

    when (step.kind) {
        EvidenceStepKind.PHOTO -> EvidencePhotoStepScreen(
            step = step,
            stepIndex = uiState.currentEvidenceStepIndex,
            totalSteps = uiState.evidenceSteps.size,
            capturedPhoto = capturedPhoto,
            onBack = onBack,
            onPreviousStep = onPreviousStep,
            onNextStep = onNextStep,
            onPhotoRecorded = { record -> onPhotoRecorded(step.id, record) },
            onPhotoCleared = { onPhotoCleared(step.id) },
        )

        EvidenceStepKind.GPS -> EvidenceGpsStepScreen(
            step = step,
            stepIndex = uiState.currentEvidenceStepIndex,
            totalSteps = uiState.evidenceSteps.size,
            recordedGps = recordedGps,
            onBack = onBack,
            onPreviousStep = onPreviousStep,
            onFinish = onFinish,
            onGpsRecorded = onGpsRecorded,
        )
    }
}

@Composable
private fun EvidencePhotoStepScreen(
    step: EvidenceStepDefinition,
    stepIndex: Int,
    totalSteps: Int,
    capturedPhoto: EvidencePhotoRecord?,
    onBack: () -> Unit,
    onPreviousStep: () -> Unit,
    onNextStep: () -> Unit,
    onPhotoRecorded: (EvidencePhotoRecord) -> Unit,
    onPhotoCleared: () -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    val mainExecutor = remember(context) { ContextCompat.getMainExecutor(context) }
    val previewView = remember(context) {
        PreviewView(context).apply {
            scaleType = PreviewView.ScaleType.FILL_CENTER
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
        }
    }

    var hasCameraPermission by remember { mutableStateOf(context.hasCameraPermission()) }
    var hasLocationPermission by remember { mutableStateOf(context.hasLocationPermission()) }
    var hasRequestedPermissions by rememberSaveable(step.id) { mutableStateOf(false) }
    var isCapturing by rememberSaveable(step.id) { mutableStateOf(false) }
    var statusMessage by rememberSaveable(step.id) { mutableStateOf<String?>(null) }
    var imageCapture by remember(step.id) { mutableStateOf<ImageCapture?>(null) }
    var locationStamp by remember(step.id) { mutableStateOf<LocationStamp?>(null) }
    var isRefreshingLocation by rememberSaveable(step.id) { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions(),
    ) { result ->
        hasCameraPermission = result[Manifest.permission.CAMERA] == true || context.hasCameraPermission()
        hasLocationPermission =
            result[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            result[Manifest.permission.ACCESS_COARSE_LOCATION] == true ||
            context.hasLocationPermission()
        hasRequestedPermissions = true
        if (!hasCameraPermission || !hasLocationPermission) {
            statusMessage = "Izin kamera dan lokasi diperlukan agar foto bisa diberi timestamp dan GPS stamp."
        } else {
            statusMessage = null
        }
    }

    fun refreshLocation() {
        if (!hasLocationPermission) {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                ),
            )
            return
        }

        scope.launch {
            isRefreshingLocation = true
            statusMessage = "Mengambil titik GPS dan alamat..."
            runCatching {
                resolveCurrentLocationStamp(context)
            }.onSuccess { stamp ->
                locationStamp = stamp
                statusMessage = null
            }.onFailure { error ->
                statusMessage = error.message ?: "GPS belum berhasil didapatkan."
            }
            isRefreshingLocation = false
        }
    }

    LaunchedEffect(step.id, hasCameraPermission, hasLocationPermission, hasRequestedPermissions) {
        if ((!hasCameraPermission || !hasLocationPermission) && !hasRequestedPermissions) {
            hasRequestedPermissions = true
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.CAMERA,
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                ),
            )
        } else if (capturedPhoto == null && hasLocationPermission && locationStamp == null && !isRefreshingLocation) {
            refreshLocation()
        }
    }

    DisposableEffect(lifecycleOwner, hasCameraPermission, step.lensFacing, previewView, capturedPhoto) {
        if (!hasCameraPermission || capturedPhoto != null) {
            imageCapture = null
            onDispose {}
        } else {
            val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
            val listener = Runnable {
                runCatching {
                    val cameraProvider = cameraProviderFuture.get()
                    val selector = androidx.camera.core.CameraSelector.Builder()
                        .requireLensFacing(step.lensFacing)
                        .build()

                    check(cameraProvider.hasCamera(selector)) {
                        "Kamera yang dibutuhkan tidak tersedia di perangkat ini."
                    }

                    val preview = Preview.Builder().build().also { useCase ->
                        useCase.setSurfaceProvider(previewView.getSurfaceProvider())
                    }
                    val capture = ImageCapture.Builder()
                        .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                        .build()

                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(lifecycleOwner, selector, preview, capture)
                    imageCapture = capture
                }.onFailure { throwable ->
                    imageCapture = null
                    statusMessage = throwable.message ?: "Kamera gagal dibuka."
                }
            }

            cameraProviderFuture.addListener(listener, mainExecutor)

            onDispose {
                imageCapture = null
                if (cameraProviderFuture.isDone) {
                    runCatching { cameraProviderFuture.get().unbindAll() }
                }
            }
        }
    }

    Scaffold(
        containerColor = Color(0xFF101218),
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 20.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            TextButton(
                onClick = {
                    if (stepIndex == 0) onBack() else onPreviousStep()
                },
            ) {
                Text(text = "Kembali")
            }

            Text(
                text = "Langkah ${stepIndex + 1} dari $totalSteps",
                style = MaterialTheme.typography.labelLarge,
                color = Color.White.copy(alpha = 0.7f),
            )
            Text(
                text = step.title,
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
            )
            Text(
                text = step.instruction,
                style = MaterialTheme.typography.bodyLarge,
                color = Color.White.copy(alpha = 0.76f),
            )

            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                shape = RoundedCornerShape(28.dp),
                color = Color.Black,
            ) {
                Box(modifier = Modifier.fillMaxSize()) {
                    when {
                        capturedPhoto != null -> {
                            PhotoPreview(filePath = capturedPhoto.filePath, title = step.title)
                        }

                        hasCameraPermission -> {
                            AndroidView(
                                factory = { previewView },
                                modifier = Modifier.fillMaxSize(),
                            )
                        }

                        else -> {
                            PermissionState(
                                message = "Izin kamera dan lokasi dibutuhkan sebelum mengambil foto evidence.",
                                onRequestPermission = {
                                    permissionLauncher.launch(
                                        arrayOf(
                                            Manifest.permission.CAMERA,
                                            Manifest.permission.ACCESS_FINE_LOCATION,
                                            Manifest.permission.ACCESS_COARSE_LOCATION,
                                        ),
                                    )
                                },
                            )
                        }
                    }
                }
            }

            Surface(
                shape = RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.surface,
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    when {
                        capturedPhoto != null -> {
                            Text(
                                text = "Foto tersimpan dengan stamp waktu dan GPS.",
                                style = MaterialTheme.typography.bodyMedium,
                            )
                            Text(
                                text = "Waktu: ${capturedPhoto.timestamp}\nGPS: ${"%.6f".format(capturedPhoto.latitude)}, ${"%.6f".format(capturedPhoto.longitude)}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.76f),
                            )
                        }

                        locationStamp != null -> {
                            Text(
                                text = "GPS siap untuk stamp foto.",
                                style = MaterialTheme.typography.bodyMedium,
                            )
                            Text(
                                text = "${"%.6f".format(locationStamp!!.latitude)}, ${"%.6f".format(locationStamp!!.longitude)}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.76f),
                            )
                        }
                    }

                    if (!statusMessage.isNullOrBlank()) {
                        Text(
                            text = statusMessage.orEmpty(),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }

                    if (capturedPhoto != null) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            TicSecondaryButton(
                                text = "Ambil Ulang",
                                onClick = {
                                    runCatching { File(capturedPhoto.filePath).delete() }
                                    onPhotoCleared()
                                },
                                modifier = Modifier.weight(1f),
                            )
                            TicPrimaryButton(
                                text = "Next",
                                onClick = onNextStep,
                                modifier = Modifier.weight(1f),
                            )
                        }
                    } else {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            TicSecondaryButton(
                                text = if (isRefreshingLocation) "Memuat GPS..." else "Refresh GPS",
                                onClick = { refreshLocation() },
                                enabled = !isRefreshingLocation && !isCapturing,
                                modifier = Modifier.weight(1f),
                            )
                            TicPrimaryButton(
                                text = if (isCapturing) "Menyimpan..." else "Ambil Foto",
                                onClick = {
                                    val capture = imageCapture
                                    val stamp = locationStamp
                                    if (capture == null) {
                                        statusMessage = "Kamera belum siap."
                                        return@TicPrimaryButton
                                    }
                                    if (stamp == null) {
                                        statusMessage = "GPS belum siap. Refresh lokasi dulu."
                                        return@TicPrimaryButton
                                    }

                                    val outputFile = createEvidenceOutputFile(
                                        context = context,
                                        filenamePrefix = step.filenamePrefix,
                                    )
                                    val captureTimestamp = TimeFormatter.nowDisplay()
                                    capture.targetRotation = previewView.display?.rotation ?: AndroidSurface.ROTATION_0
                                    isCapturing = true
                                    statusMessage = "Menyimpan foto dan menambahkan stamp..."

                                    capture.takePicture(
                                        ImageCapture.OutputFileOptions.Builder(outputFile).build(),
                                        mainExecutor,
                                        object : ImageCapture.OnImageSavedCallback {
                                            override fun onImageSaved(outputFileResults: ImageCapture.OutputFileResults) {
                                                scope.launch {
                                                    runCatching {
                                                        withContext(Dispatchers.IO) {
                                                            stampPhotoWithLocation(
                                                                filePath = outputFile.absolutePath,
                                                                locationStamp = stamp.copy(timestampDisplay = captureTimestamp),
                                                            )
                                                        }
                                                    }.onSuccess {
                                                        onPhotoRecorded(
                                                            EvidencePhotoRecord(
                                                                filePath = outputFile.absolutePath,
                                                                timestamp = captureTimestamp,
                                                                latitude = stamp.latitude,
                                                                longitude = stamp.longitude,
                                                                accuracyMeters = stamp.accuracyMeters,
                                                                address = stamp.address,
                                                            ),
                                                        )
                                                        statusMessage = null
                                                    }.onFailure { error ->
                                                        outputFile.delete()
                                                        statusMessage = error.message ?: "Foto gagal diproses."
                                                    }
                                                    isCapturing = false
                                                }
                                            }

                                            override fun onError(exception: ImageCaptureException) {
                                                isCapturing = false
                                                outputFile.delete()
                                                statusMessage = exception.message ?: "Foto gagal diambil."
                                            }
                                        },
                                    )
                                },
                                enabled = !isRefreshingLocation &&
                                    !isCapturing &&
                                    hasCameraPermission &&
                                    hasLocationPermission &&
                                    imageCapture != null &&
                                    locationStamp != null,
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EvidenceGpsStepScreen(
    step: EvidenceStepDefinition,
    stepIndex: Int,
    totalSteps: Int,
    recordedGps: EvidenceGpsRecord?,
    onBack: () -> Unit,
    onPreviousStep: () -> Unit,
    onFinish: () -> Unit,
    onGpsRecorded: (EvidenceGpsRecord) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var hasLocationPermission by remember { mutableStateOf(context.hasLocationPermission()) }
    var hasRequestedPermission by rememberSaveable(step.id) { mutableStateOf(false) }
    var statusMessage by rememberSaveable(step.id) { mutableStateOf<String?>(null) }
    var currentLocationStamp by remember(step.id) { mutableStateOf<LocationStamp?>(null) }
    var isRefreshingLocation by rememberSaveable(step.id) { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions(),
    ) { result ->
        hasLocationPermission =
            result[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                result[Manifest.permission.ACCESS_COARSE_LOCATION] == true ||
                context.hasLocationPermission()
        hasRequestedPermission = true
    }

    fun refreshLocation() {
        if (!hasLocationPermission) {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                ),
            )
            return
        }

        scope.launch {
            isRefreshingLocation = true
            statusMessage = "Mengambil GPS akhir..."
            runCatching {
                resolveCurrentLocationStamp(context)
            }.onSuccess { stamp ->
                currentLocationStamp = stamp
                statusMessage = null
            }.onFailure { error ->
                statusMessage = error.message ?: "GPS belum berhasil direkam."
            }
            isRefreshingLocation = false
        }
    }

    LaunchedEffect(step.id, hasLocationPermission, hasRequestedPermission) {
        if (!hasLocationPermission && !hasRequestedPermission) {
            hasRequestedPermission = true
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                ),
            )
        } else if (hasLocationPermission && currentLocationStamp == null && recordedGps == null && !isRefreshingLocation) {
            refreshLocation()
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 20.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            TextButton(
                onClick = {
                    if (stepIndex == 0) onBack() else onPreviousStep()
                },
            ) {
                Text(text = "Kembali")
            }

            Text(
                text = "Langkah ${stepIndex + 1} dari $totalSteps",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f),
            )
            Text(
                text = step.title,
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onBackground,
            )
            Text(
                text = step.instruction,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.72f),
            )

            TicSectionCard(
                title = "GPS dan Alamat",
                subtitle = if (recordedGps == null) {
                    "Rekam GPS akhir untuk melengkapi evidence lokasi."
                } else {
                    "GPS akhir sudah terekam."
                },
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    val infoText = when {
                        recordedGps != null -> {
                            "Waktu: ${recordedGps.timestamp}\nGPS: ${"%.6f".format(recordedGps.latitude)}, ${"%.6f".format(recordedGps.longitude)}\nAlamat: ${recordedGps.address}"
                        }

                        currentLocationStamp != null -> {
                            "Siap direkam:\n${currentLocationStamp!!.address}\n${"%.6f".format(currentLocationStamp!!.latitude)}, ${"%.6f".format(currentLocationStamp!!.longitude)}"
                        }

                        else -> "GPS belum tersedia."
                    }

                    Text(
                        text = infoText,
                        style = MaterialTheme.typography.bodyMedium,
                    )

                    if (!statusMessage.isNullOrBlank()) {
                        Text(
                            text = statusMessage.orEmpty(),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        TicSecondaryButton(
                            text = if (isRefreshingLocation) "Memuat GPS..." else "Refresh GPS",
                            onClick = { refreshLocation() },
                            enabled = !isRefreshingLocation,
                            modifier = Modifier.weight(1f),
                        )
                        TicPrimaryButton(
                            text = if (recordedGps == null) "Record GPS" else "Selesai",
                            onClick = {
                                if (recordedGps != null) {
                                    onFinish()
                                    return@TicPrimaryButton
                                }

                                val stamp = currentLocationStamp
                                if (stamp == null) {
                                    statusMessage = "GPS belum siap. Refresh lokasi dulu."
                                    return@TicPrimaryButton
                                }

                                onGpsRecorded(
                                    EvidenceGpsRecord(
                                        timestamp = stamp.timestampDisplay,
                                        latitude = stamp.latitude,
                                        longitude = stamp.longitude,
                                        accuracyMeters = stamp.accuracyMeters,
                                        address = stamp.address,
                                    ),
                                )
                            },
                            enabled = recordedGps != null || currentLocationStamp != null,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PhotoPreview(
    filePath: String,
    title: String,
) {
    val previewBitmap by produceState<Bitmap?>(
        initialValue = null,
        key1 = filePath,
    ) {
        value = withContext(Dispatchers.IO) {
            decodePreviewBitmap(filePath)
        }
    }

    if (previewBitmap != null) {
        Image(
            bitmap = previewBitmap!!.asImageBitmap(),
            contentDescription = title,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Fit,
        )
    } else {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF161A22)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "Preview foto belum tersedia",
                color = Color.White.copy(alpha = 0.72f),
            )
        }
    }
}

@Composable
private fun PermissionState(
    message: String,
    onRequestPermission: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF161A22))
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "Izin dibutuhkan",
            style = MaterialTheme.typography.titleMedium,
            color = Color.White,
        )
        Text(
            text = message,
            modifier = Modifier.padding(top = 8.dp, bottom = 20.dp),
            style = MaterialTheme.typography.bodyMedium,
            color = Color.White.copy(alpha = 0.76f),
        )
        TicSecondaryButton(
            text = "Izinkan",
            onClick = onRequestPermission,
        )
    }
}

private fun Context.hasCameraPermission(): Boolean {
    return ContextCompat.checkSelfPermission(
        this,
        Manifest.permission.CAMERA,
    ) == PackageManager.PERMISSION_GRANTED
}

private fun createEvidenceOutputFile(
    context: Context,
    filenamePrefix: String,
): File {
    val directory = File(
        context.getExternalFilesDir(Environment.DIRECTORY_PICTURES) ?: context.filesDir,
        "evidence",
    ).apply {
        mkdirs()
    }

    val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
    return File(directory, "${filenamePrefix}_${timestamp}.jpg")
}

private fun decodePreviewBitmap(filePath: String): Bitmap? {
    val boundsOptions = BitmapFactory.Options().apply {
        inJustDecodeBounds = true
    }
    BitmapFactory.decodeFile(filePath, boundsOptions)
    if (boundsOptions.outWidth <= 0 || boundsOptions.outHeight <= 0) return null

    val targetSize = 1440
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
    return rotatedBitmap
}

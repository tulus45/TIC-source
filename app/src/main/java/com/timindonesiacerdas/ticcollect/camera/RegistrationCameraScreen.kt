package com.timindonesiacerdas.ticcollect.camera

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Environment
import android.view.Surface
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.timindonesiacerdas.ticcollect.ui.components.TicPrimaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicSecondaryButton
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
internal fun RegistrationCameraScreen(
    title: String,
    subtitle: String,
    captureHint: String,
    filenamePrefix: String,
    lensFacing: Int,
    onBack: () -> Unit,
    onPhotoCaptured: (String) -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val mainExecutor = remember(context) { ContextCompat.getMainExecutor(context) }
    val previewView = remember(context) {
        PreviewView(context).apply {
            scaleType = PreviewView.ScaleType.FILL_CENTER
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
        }
    }

    var hasPermission by remember { mutableStateOf(context.hasCameraPermission()) }
    var hasRequestedPermission by rememberSaveable { mutableStateOf(false) }
    var isCapturing by rememberSaveable { mutableStateOf(false) }
    var statusMessage by rememberSaveable { mutableStateOf<String?>(null) }
    var imageCapture by remember { mutableStateOf<ImageCapture?>(null) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
    ) { granted ->
        hasPermission = granted
        hasRequestedPermission = true
        statusMessage = if (granted) {
            null
        } else {
            "Izin kamera diperlukan untuk mengambil foto registrasi."
        }
    }

    LaunchedEffect(hasPermission, hasRequestedPermission) {
        if (!hasPermission && !hasRequestedPermission) {
            hasRequestedPermission = true
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    DisposableEffect(lifecycleOwner, hasPermission, lensFacing, previewView) {
        if (!hasPermission) {
            imageCapture = null
            onDispose {}
        } else {
            val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
            val listener = Runnable {
                runCatching {
                    val cameraProvider = cameraProviderFuture.get()
                    val selector = CameraSelector.Builder()
                        .requireLensFacing(lensFacing)
                        .build()

                    check(cameraProvider.hasCamera(selector)) {
                        when (lensFacing) {
                            CameraSelector.LENS_FACING_FRONT ->
                                "Kamera depan tidak tersedia di perangkat ini."

                            else -> "Kamera belakang tidak tersedia di perangkat ini."
                        }
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
                    statusMessage = null
                }.onFailure { throwable ->
                    imageCapture = null
                    statusMessage = throwable.message ?: "Kamera gagal dibuka."
                }
            }

            cameraProviderFuture.addListener(listener, mainExecutor)

            onDispose {
                imageCapture = null
                if (cameraProviderFuture.isDone) {
                    runCatching {
                        cameraProviderFuture.get().unbindAll()
                    }
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
                .padding(horizontal = 20.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            TextButton(onClick = onBack) {
                Text(text = "Kembali")
            }

            Text(
                text = title,
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
            )
            Text(
                text = subtitle,
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
                Box(
                    modifier = Modifier.fillMaxSize(),
                ) {
                    if (hasPermission) {
                        AndroidView(
                            factory = { previewView },
                            modifier = Modifier.fillMaxSize(),
                        )
                    } else {
                        PermissionState(
                            onRequestPermission = {
                                permissionLauncher.launch(Manifest.permission.CAMERA)
                            },
                        )
                    }

                    Surface(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .padding(16.dp),
                        shape = RoundedCornerShape(18.dp),
                        color = Color.Black.copy(alpha = 0.56f),
                    ) {
                        Text(
                            text = captureHint,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White,
                        )
                    }
                }
            }

            Surface(
                shape = RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.surface,
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text(
                        text = "Hasil foto akan disimpan lokal di folder aplikasi dan langsung dipakai untuk registrasi.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.76f),
                    )
                    if (!statusMessage.isNullOrBlank()) {
                        Text(
                            text = statusMessage.orEmpty(),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.error,
                        )
                    } else if (hasPermission && imageCapture == null) {
                        Text(
                            text = "Menyiapkan kamera...",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.76f),
                        )
                    }
                    TicPrimaryButton(
                        text = if (isCapturing) "Menyimpan foto..." else "Ambil Foto",
                        enabled = hasPermission && imageCapture != null && !isCapturing,
                        onClick = {
                            val capture = imageCapture
                            if (capture == null) {
                                statusMessage = "Kamera belum siap. Coba lagi sebentar."
                                return@TicPrimaryButton
                            }

                            val outputFile = createImageOutputFile(
                                context = context,
                                filenamePrefix = filenamePrefix,
                            )

                            capture.targetRotation = previewView.display?.rotation ?: Surface.ROTATION_0
                            isCapturing = true
                            statusMessage = null
                            capture.takePicture(
                                ImageCapture.OutputFileOptions.Builder(outputFile).build(),
                                mainExecutor,
                                object : ImageCapture.OnImageSavedCallback {
                                    override fun onImageSaved(
                                        outputFileResults: ImageCapture.OutputFileResults,
                                    ) {
                                        isCapturing = false
                                        onPhotoCaptured(outputFile.absolutePath)
                                    }

                                    override fun onError(exception: ImageCaptureException) {
                                        isCapturing = false
                                        outputFile.delete()
                                        statusMessage =
                                            exception.message ?: "Foto gagal disimpan."
                                    }
                                },
                            )
                        },
                    )
                    TicSecondaryButton(
                        text = if (hasPermission) "Ambil Ulang Nanti" else "Izinkan Kamera",
                        onClick = {
                            if (hasPermission) {
                                onBack()
                            } else {
                                permissionLauncher.launch(Manifest.permission.CAMERA)
                            }
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun PermissionState(
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
            text = "Izin kamera dibutuhkan",
            style = MaterialTheme.typography.titleMedium,
            color = Color.White,
        )
        Text(
            text = "Aktifkan izin kamera agar foto KTP atau selfie bisa diambil langsung dari aplikasi.",
            modifier = Modifier.padding(top = 8.dp, bottom = 20.dp),
            style = MaterialTheme.typography.bodyMedium,
            color = Color.White.copy(alpha = 0.76f),
        )
        TicSecondaryButton(
            text = "Izinkan Kamera",
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

private fun createImageOutputFile(
    context: Context,
    filenamePrefix: String,
): File {
    val directory = File(
        context.getExternalFilesDir(Environment.DIRECTORY_PICTURES) ?: context.filesDir,
        "registrations",
    ).apply {
        mkdirs()
    }

    val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
    return File(directory, "${filenamePrefix}_${timestamp}.jpg")
}

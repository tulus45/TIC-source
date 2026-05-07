package com.timindonesiacerdas.ticcollect.home

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.FactCheck
import androidx.compose.material.icons.rounded.CloudUpload
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.ui.components.TicMenuCard
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.exifinterface.media.ExifInterface

private val HomeHeroStart = Color(0xFF122545)
private val HomeHeroMiddle = Color(0xFF203A67)
private val HomeHeroEnd = Color(0xFF3E629B)
private val HomeDraftAccent = Color(0xFF2A4F86)
private val HomeUploadAccent = Color(0xFF23624B)
private val HomeProfileAccent = Color(0xFF7C5A22)
private val HomeSurfaceTint = Color(0xFFF1F4FA)

@Composable
fun HomeScreen(
    uiState: HomeUiState,
    onStartDataCollection: () -> Unit,
    onPendingUpload: () -> Unit,
    onDraft: () -> Unit,
    onProfile: () -> Unit,
) {
    val menuIconContainerColor = Color(0xFFE3EAF8)
    val menuIconTint = Color(0xFF16284C)
    val user = uiState.session.user
    val displayedEmail = uiState.session.profile?.gmail ?: user?.gmail.orEmpty()
    val displayName = uiState.session.profile?.nama
        ?.takeIf { it.isNotBlank() }
        ?: "Enumerator"
    val backgroundBrush = Brush.verticalGradient(
        colors = listOf(
            Color(0xFFF5F7FC),
            HomeSurfaceTint,
            MaterialTheme.colorScheme.background,
        ),
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(backgroundBrush),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            HomeHeroCard(
                displayName = displayName,
                displayedEmail = displayedEmail,
                draftCount = uiState.draftCount,
                pendingUploadCount = uiState.pendingUploadCount,
                selfieLocalPath = uiState.selfieLocalPath,
            )

            TicMenuCard(
                title = "Start Data Collection",
                subtitle = "Mulai input dokumentasi lapangan",
                onActionClick = onStartDataCollection,
                actionIcon = Icons.AutoMirrored.Rounded.FactCheck,
                iconContainerColor = menuIconContainerColor,
                iconTint = menuIconTint,
                accentColor = Color(0xFF243B6B),
            )
            TicMenuCard(
                title = "Draft",
                subtitle = "Lihat, edit atau hapus data yang tidak dipakai",
                onActionClick = onDraft,
                badge = uiState.draftCount.takeIf { it > 0 }?.toString(),
                actionIcon = Icons.Rounded.Description,
                iconContainerColor = menuIconContainerColor,
                iconTint = menuIconTint,
                accentColor = HomeDraftAccent,
            )
            TicMenuCard(
                title = "Upload Data",
                subtitle = "Kirim data pending dan pantau progres upload yang masih berjalan.",
                onActionClick = onPendingUpload,
                badge = uiState.pendingUploadCount.takeIf { it > 0 }?.toString(),
                actionIcon = Icons.Rounded.CloudUpload,
                iconContainerColor = menuIconContainerColor,
                iconTint = menuIconTint,
                accentColor = HomeUploadAccent,
            )
            TicMenuCard(
                title = "Profile",
                subtitle = "Cek identitas akun dan detail registrasi",
                onActionClick = onProfile,
                actionIcon = Icons.Rounded.Person,
                iconContainerColor = menuIconContainerColor,
                iconTint = menuIconTint,
                accentColor = HomeProfileAccent,
            )

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp, bottom = 4.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = "\u00A9 The Alus 2026",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.48f),
                )
            }
        }
    }
}

@Composable
private fun HomeHeroCard(
    displayName: String,
    displayedEmail: String,
    draftCount: Int,
    pendingUploadCount: Int,
    selfieLocalPath: String?,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(HomeHeroStart, HomeHeroMiddle, HomeHeroEnd),
                ),
                shape = RoundedCornerShape(32.dp),
            )
            .padding(1.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(
                            Color.White.copy(alpha = 0.06f),
                            Color.Transparent,
                        ),
                    ),
                    shape = RoundedCornerShape(31.dp),
                )
                .padding(horizontal = 20.dp, vertical = 18.dp),
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                HomeTopBadge(label = "TIC Collect")

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text(
                            text = "Hello, $displayName",
                            style = MaterialTheme.typography.headlineMedium,
                            color = Color.White,
                        )
                        Text(
                            text = displayedEmail,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White.copy(alpha = 0.72f),
                        )
                    }
                    HomeSelfieAvatar(
                        displayName = displayName,
                        selfieLocalPath = selfieLocalPath,
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    HomeMetricCard(
                        modifier = Modifier.weight(1f),
                        value = draftCount.toString(),
                        label = "Draft Aktif",
                    )
                    HomeMetricCard(
                        modifier = Modifier.weight(1f),
                        value = pendingUploadCount.toString(),
                        label = "Need Upload",
                    )
                }
            }
        }
    }
}

@Composable
private fun HomeTopBadge(label: String) {
    Surface(
        color = Color.White.copy(alpha = 0.12f),
        shape = RoundedCornerShape(999.dp),
        border = BorderStroke(
            width = 1.dp,
            color = Color.White.copy(alpha = 0.10f),
        ),
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
            style = MaterialTheme.typography.labelLarge.copy(
                fontWeight = FontWeight.SemiBold,
            ),
            color = Color.White,
        )
    }
}

@Composable
private fun HomeSelfieAvatar(
    displayName: String,
    selfieLocalPath: String?,
) {
    val avatarBitmap by produceState<Bitmap?>(
        initialValue = null,
        key1 = selfieLocalPath,
    ) {
        value = withContext(Dispatchers.IO) {
            if (selfieLocalPath.isNullOrBlank()) {
                null
            } else {
                decodeSelfieAvatar(selfieLocalPath)
            }
        }
    }

    Surface(
        modifier = Modifier.size(90.dp),
        shape = CircleShape,
        color = Color.White.copy(alpha = 0.12f),
        border = BorderStroke(
            width = 2.dp,
            color = Color.White.copy(alpha = 0.24f),
        ),
    ) {
        if (avatarBitmap != null) {
            Image(
                bitmap = avatarBitmap!!.asImageBitmap(),
                contentDescription = "Foto selfie $displayName",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
        } else {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.White.copy(alpha = 0.10f)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = displayName.firstOrNull()?.uppercase() ?: "U",
                    style = MaterialTheme.typography.headlineMedium,
                    color = Color.White,
                )
            }
        }
    }
}

@Composable
private fun HomeMetricCard(
    value: String,
    label: String,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        color = Color.White.copy(alpha = 0.10f),
        shape = RoundedCornerShape(22.dp),
        border = BorderStroke(
            width = 1.dp,
            color = Color.White.copy(alpha = 0.10f),
        ),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                text = value,
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
            )
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.74f),
            )
        }
    }
}

private fun decodeSelfieAvatar(filePath: String): Bitmap? {
    if (!File(filePath).exists()) return null

    val boundsOptions = BitmapFactory.Options().apply {
        inJustDecodeBounds = true
    }
    BitmapFactory.decodeFile(filePath, boundsOptions)
    if (boundsOptions.outWidth <= 0 || boundsOptions.outHeight <= 0) return null

    val targetSize = 720
    var inSampleSize = 1
    var width = boundsOptions.outWidth
    var height = boundsOptions.outHeight
    while (width > targetSize || height > targetSize) {
        width /= 2
        height /= 2
        inSampleSize *= 2
    }

    val bitmap = BitmapFactory.decodeFile(
        filePath,
        BitmapFactory.Options().apply {
            this.inSampleSize = inSampleSize
        },
    ) ?: return null

    val rotated = bitmap.applyExifRotation(filePath)
    return rotated.createFaceFocusedCircleCrop()
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

private fun Bitmap.createFaceFocusedCircleCrop(): Bitmap {
    val cropSize = minOf(width, height)
    val xOffset = ((width - cropSize) / 2).coerceAtLeast(0)
    val yBias = ((height - cropSize) * 0.22f).toInt()
    val yOffset = yBias.coerceIn(0, (height - cropSize).coerceAtLeast(0))

    val croppedBitmap = Bitmap.createBitmap(
        this,
        xOffset,
        yOffset,
        cropSize,
        cropSize,
    )
    if (croppedBitmap != this) {
        recycle()
    }
    return croppedBitmap
}

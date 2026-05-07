package com.timindonesiacerdas.ticcollect.camera

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import androidx.exifinterface.media.ExifInterface
import com.timindonesiacerdas.ticcollect.location.LocationStamp
import java.io.FileOutputStream

fun stampPhotoWithLocation(
    filePath: String,
    locationStamp: LocationStamp,
) {
    val sourceBitmap = BitmapFactory.decodeFile(filePath)
        ?: error("Foto tidak bisa dibaca untuk proses stamping.")
    val rotatedBitmap = sourceBitmap.applyExifRotation(filePath)
    val mutableBitmap = rotatedBitmap.copy(Bitmap.Config.ARGB_8888, true)
    if (mutableBitmap != rotatedBitmap) {
        rotatedBitmap.recycle()
    }

    val canvas = Canvas(mutableBitmap)
    val padding = (mutableBitmap.width * 0.032f).coerceAtLeast(24f)
    val textWidth = (mutableBitmap.width * 0.78f).toInt().coerceAtLeast(280)
    val textSize = (mutableBitmap.width * 0.028f).coerceIn(24f, 52f)

    val textPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        this.textSize = textSize
    }

    val stampText = buildString {
        append("Waktu: ").append(locationStamp.timestampDisplay)
        append('\n')
        append(
            "GPS: %.6f, %.6f".format(
                locationStamp.latitude,
                locationStamp.longitude,
            ),
        )
        locationStamp.accuracyMeters?.let { accuracy ->
            append(" (akurasi %.1f m)".format(accuracy))
        }
        append('\n')
        append("Alamat: ").append(locationStamp.address)
    }

    val textLayout = StaticLayout.Builder
        .obtain(stampText, 0, stampText.length, textPaint, textWidth)
        .setAlignment(Layout.Alignment.ALIGN_NORMAL)
        .setIncludePad(false)
        .setLineSpacing(0f, 1.15f)
        .build()

    val boxWidth = textWidth + padding * 2
    val boxHeight = textLayout.height + padding * 2
    val left = padding
    val top = mutableBitmap.height - boxHeight - padding
    val rect = RectF(
        left,
        top,
        left + boxWidth,
        top + boxHeight,
    )

    val backgroundPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(190, 10, 16, 26)
    }
    canvas.drawRoundRect(rect, padding * 0.6f, padding * 0.6f, backgroundPaint)

    canvas.save()
    canvas.translate(left + padding, top + padding)
    textLayout.draw(canvas)
    canvas.restore()

    FileOutputStream(filePath).use { output ->
        mutableBitmap.compress(Bitmap.CompressFormat.JPEG, 92, output)
    }
    mutableBitmap.recycle()
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

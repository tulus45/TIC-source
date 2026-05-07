package com.timindonesiacerdas.ticcollect.utils

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import androidx.exifinterface.media.ExifInterface
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import kotlin.math.max
import kotlin.math.roundToInt

private const val defaultMaxUploadBytes = 950 * 1024
private const val defaultMaxLongEdgePx = 1280
private const val minLongEdgePx = 640
private const val minBitmapSidePx = 480
private val jpegQualitySteps = intArrayOf(84, 76, 68, 60, 52, 44, 36, 28)

data class OptimizedImageUpload(
    val file: File,
    val mimeType: String,
    val wasOptimized: Boolean,
)

object ImageUploadOptimizer {
    fun prepareForUpload(
        context: Context,
        filePath: String,
        uploadLabel: String,
        maxBytes: Int = defaultMaxUploadBytes,
        maxLongEdgePx: Int = defaultMaxLongEdgePx,
    ): OptimizedImageUpload {
        val sourceFile = File(filePath)
        require(sourceFile.exists()) { "File $uploadLabel tidak ditemukan." }

        if (sourceFile.length() <= maxBytes) {
            return OptimizedImageUpload(
                file = sourceFile,
                mimeType = guessMimeType(sourceFile),
                wasOptimized = false,
            )
        }

        val decodedBitmap = decodeScaledBitmap(sourceFile, maxLongEdgePx)
            ?: return OptimizedImageUpload(
                file = sourceFile,
                mimeType = guessMimeType(sourceFile),
                wasOptimized = false,
            )

        val orientedBitmap = applyExifOrientation(sourceFile, decodedBitmap)
        val optimizedBytes = compressToTarget(orientedBitmap, maxBytes)

        if (orientedBitmap !== decodedBitmap) {
            decodedBitmap.recycle()
        }
        orientedBitmap.recycle()

        val targetDir = File(context.cacheDir, "optimized-uploads").apply { mkdirs() }
        val outputFile = File(
            targetDir,
            "${sourceFile.nameWithoutExtension}_upload.jpg",
        )
        FileOutputStream(outputFile).use { output ->
            output.write(optimizedBytes)
        }

        return OptimizedImageUpload(
            file = outputFile,
            mimeType = "image/jpeg",
            wasOptimized = true,
        )
    }

    private fun decodeScaledBitmap(
        sourceFile: File,
        maxLongEdgePx: Int,
    ): Bitmap? {
        val bounds = BitmapFactory.Options().apply {
            inJustDecodeBounds = true
        }
        BitmapFactory.decodeFile(sourceFile.absolutePath, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

        val sampleSize = calculateInSampleSize(bounds.outWidth, bounds.outHeight, maxLongEdgePx)
        val options = BitmapFactory.Options().apply {
            inSampleSize = sampleSize
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        return BitmapFactory.decodeFile(sourceFile.absolutePath, options)
    }

    private fun calculateInSampleSize(
        width: Int,
        height: Int,
        maxLongEdgePx: Int,
    ): Int {
        var inSampleSize = 1
        var longEdge = max(width, height)

        while (longEdge / inSampleSize > maxLongEdgePx) {
            inSampleSize *= 2
        }

        return inSampleSize.coerceAtLeast(1)
    }

    private fun applyExifOrientation(sourceFile: File, bitmap: Bitmap): Bitmap {
        val exif = FileInputStream(sourceFile).use { input ->
            ExifInterface(input)
        }
        val orientation = exif.getAttributeInt(
            ExifInterface.TAG_ORIENTATION,
            ExifInterface.ORIENTATION_NORMAL,
        )

        val matrix = Matrix()
        when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
            ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
            ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
            ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
            ExifInterface.ORIENTATION_TRANSPOSE -> {
                matrix.postRotate(90f)
                matrix.postScale(-1f, 1f)
            }
            ExifInterface.ORIENTATION_TRANSVERSE -> {
                matrix.postRotate(270f)
                matrix.postScale(-1f, 1f)
            }
            else -> return bitmap
        }

        return Bitmap.createBitmap(
            bitmap,
            0,
            0,
            bitmap.width,
            bitmap.height,
            matrix,
            true,
        )
    }

    private fun compressToTarget(
        sourceBitmap: Bitmap,
        maxBytes: Int,
    ): ByteArray {
        var workingBitmap = sourceBitmap
        var bestBytes = compressBitmap(workingBitmap, jpegQualitySteps.last())

        while (true) {
            for (quality in jpegQualitySteps) {
                val candidate = compressBitmap(workingBitmap, quality)
                if (candidate.size <= maxBytes) {
                    if (workingBitmap !== sourceBitmap) {
                        workingBitmap.recycle()
                    }
                    return candidate
                }

                if (candidate.size < bestBytes.size) {
                    bestBytes = candidate
                }
            }

            val longEdge = max(workingBitmap.width, workingBitmap.height)
            if (longEdge <= minLongEdgePx) {
                if (workingBitmap !== sourceBitmap) {
                    workingBitmap.recycle()
                }
                return bestBytes
            }

            val nextScale = 0.85f
            val nextWidth = (workingBitmap.width * nextScale).roundToInt().coerceAtLeast(minBitmapSidePx)
            val nextHeight = (workingBitmap.height * nextScale).roundToInt().coerceAtLeast(minBitmapSidePx)
            val scaledBitmap = Bitmap.createScaledBitmap(
                workingBitmap,
                nextWidth,
                nextHeight,
                true,
            )

            if (workingBitmap !== sourceBitmap) {
                workingBitmap.recycle()
            }
            workingBitmap = scaledBitmap
        }
    }

    private fun compressBitmap(
        bitmap: Bitmap,
        quality: Int,
    ): ByteArray {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
        return outputStream.toByteArray()
    }

    private fun guessMimeType(file: File): String {
        return when (file.extension.lowercase()) {
            "png" -> "image/png"
            "webp" -> "image/webp"
            else -> "image/jpeg"
        }
    }
}

package com.timindonesiacerdas.ticcollect.data.model

enum class SubmissionStatus {
    DRAFT,
    COMPLETED_PENDING_UPLOAD,
    UPLOADING,
    UPLOADED,
    FAILED_UPLOAD,
}

enum class SubmissionFileType {
    PHOTO,
    VIDEO,
    JSON,
}

data class GpsCapture(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float,
    val timestamp: String,
)

data class SubmissionFile(
    val id: String,
    val submissionId: String,
    val fileType: SubmissionFileType,
    val localPath: String,
    val driveFileId: String? = null,
    val filename: String,
    val createdAt: String,
)

data class SubmissionRecord(
    val submissionId: String,
    val uid: String,
    val gmail: String,
    val projectName: String,
    val formName: String,
    val answersJson: String,
    val gpsLat: Double? = null,
    val gpsLng: Double? = null,
    val gpsAccuracy: Float? = null,
    val driveFolderId: String? = null,
    val status: SubmissionStatus,
    val createdAt: String,
    val uploadedAt: String? = null,
    val files: List<SubmissionFile> = emptyList(),
)

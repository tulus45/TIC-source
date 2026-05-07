package com.timindonesiacerdas.ticcollect.data.remote

import com.timindonesiacerdas.ticcollect.data.model.RegistrationDraft
import com.timindonesiacerdas.ticcollect.data.model.SubmissionRecord
import com.timindonesiacerdas.ticcollect.data.model.UserProfile

object TicApiRoutes {
    const val verifyAuth = "/api/auth/verify"
    const val currentUser = "/api/users/me"
    const val schoolMaster = "/api/master-data/schools"
    const val registrations = "/api/registrations"
    const val registrationStatus = "/api/registrations/status"
    const val submissions = "/api/submissions"
    const val mySubmissions = "/api/submissions/me"
    const val retryUpload = "/api/uploads/retry"
}

data class VerifyAuthRequest(
    val firebaseIdToken: String,
)

data class VerifyAuthResponse(
    val uid: String,
    val gmail: String,
    val displayName: String,
)

data class RegistrationUploadResponse(
    val registrationId: String? = null,
    val status: String,
    val ktpDriveFileId: String? = null,
    val selfieDriveFileId: String? = null,
)

data class RegistrationAssetUploadResponse(
    val assetType: String,
    val fileName: String,
    val fileUrl: String,
)

data class RegistrationStatusResponse(
    val registrationId: String? = null,
    val status: String,
    val rejectionReason: String? = null,
    val updatedAt: String? = null,
)

data class SchoolMasterDataResponse(
    val datasetId: String,
    val title: String,
    val columns: List<String>,
    val rows: List<List<String>>,
    val updatedAt: String? = null,
)

data class SubmissionUploadResponse(
    val submissionId: String,
    val driveFolderId: String? = null,
    val driveFileIds: List<String> = emptyList(),
    val uploadStatus: String,
)

interface TicBackendApiContract {
    // TODO(stage-2): convert this contract into a Retrofit interface with
    // multipart support and Firebase Bearer token injection via OkHttp.
    suspend fun verifyFirebaseToken(request: VerifyAuthRequest): VerifyAuthResponse
    suspend fun getCurrentUser(
        uid: String? = null,
        gmail: String? = null,
        registrationId: String? = null,
    ): UserProfile
    suspend fun getSchoolMasterData(): SchoolMasterDataResponse
    suspend fun getRegistrationStatus(
        uid: String? = null,
        gmail: String? = null,
        registrationId: String? = null,
    ): RegistrationStatusResponse
    suspend fun uploadRegistrationAsset(
        uid: String,
        gmail: String,
        assetType: String,
        filePath: String,
    ): RegistrationAssetUploadResponse
    suspend fun submitRegistration(draft: RegistrationDraft): RegistrationUploadResponse
    suspend fun submitSubmission(record: SubmissionRecord): SubmissionUploadResponse
    suspend fun getMySubmissions(): List<SubmissionRecord>
}

package com.timindonesiacerdas.ticcollect.data.model

enum class RegistrationStatus {
    NOT_REGISTERED,
    PENDING,
    APPROVED,
    REJECTED,
    SUSPENDED,
}

data class AuthenticatedUser(
    val uid: String,
    val gmail: String,
    val displayName: String,
    val photoUrl: String? = null,
    val firebaseIdToken: String? = null,
)

data class UserProfile(
    val uid: String,
    val gmail: String,
    val displayName: String,
    val nik: String? = null,
    val nama: String? = null,
    val alamat: String? = null,
    val rtRw: String? = null,
    val kelDesa: String? = null,
    val kecamatan: String? = null,
    val kabupaten: String? = null,
    val noHp: String? = null,
    val noRekening: String? = null,
    val namaBank: String? = null,
    val namaPemilik: String? = null,
    val areaKerja: String? = null,
    val status: RegistrationStatus = RegistrationStatus.NOT_REGISTERED,
    val rejectionReason: String? = null,
    val ktpDriveFileId: String? = null,
    val selfieDriveFileId: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

data class AppReleasePolicy(
    val minimumApprovedVersionCode: Int = 0,
    val latestVersionCode: Int = 0,
    val latestVersionName: String? = null,
    val updateUrl: String? = null,
    val updateMessage: String? = null,
    val updatedAt: String? = null,
)

data class AppAccessState(
    val currentVersionCode: Int = 0,
    val currentVersionName: String = "",
    val releasePolicy: AppReleasePolicy = AppReleasePolicy(),
) {
    val requiresAppUpdate: Boolean
        get() = releasePolicy.minimumApprovedVersionCode > 0 &&
            currentVersionCode < releasePolicy.minimumApprovedVersionCode
}

data class SessionState(
    val isAuthenticated: Boolean = false,
    val user: AuthenticatedUser? = null,
    val profile: UserProfile? = null,
    val appAccess: AppAccessState = AppAccessState(),
)

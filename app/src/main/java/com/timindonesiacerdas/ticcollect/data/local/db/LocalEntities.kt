package com.timindonesiacerdas.ticcollect.data.local.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.timindonesiacerdas.ticcollect.data.model.AuthenticatedUser
import com.timindonesiacerdas.ticcollect.data.model.LocalRegistrationDraft
import com.timindonesiacerdas.ticcollect.data.model.RegistrationDraft
import com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus
import com.timindonesiacerdas.ticcollect.data.model.UserProfile

@Entity(tableName = "session_state")
data class SessionEntity(
    @PrimaryKey val id: Int = 1,
    val isAuthenticated: Boolean,
    val uid: String? = null,
    val gmail: String? = null,
    val displayName: String? = null,
    val photoUrl: String? = null,
    val firebaseIdToken: String? = null,
)

@Entity(tableName = "registration_drafts")
data class RegistrationDraftEntity(
    @PrimaryKey val uid: String,
    val gmail: String,
    val displayName: String,
    val nik: String,
    val nama: String,
    val alamat: String,
    val rtRw: String,
    val kelDesa: String,
    val kecamatan: String,
    val kabupaten: String,
    val noHp: String,
    val noRekening: String,
    val namaBank: String,
    val namaPemilik: String,
    val areaKerja: String,
    val ktpLocalPath: String?,
    val selfieLocalPath: String?,
    val ktpDriveFileId: String?,
    val selfieDriveFileId: String?,
    val status: String,
    val rejectionReason: String?,
    val createdAt: String,
    val updatedAt: String,
)

fun SessionEntity.toAuthenticatedUser(): AuthenticatedUser? {
    val safeUid = uid.orEmpty()
    val safeDisplayName = displayName.orEmpty()
    if (!isAuthenticated || safeUid.isBlank()) return null

    return AuthenticatedUser(
        uid = safeUid,
        gmail = gmail.orEmpty(),
        displayName = safeDisplayName,
        photoUrl = photoUrl,
        firebaseIdToken = firebaseIdToken,
    )
}

fun RegistrationDraftEntity.toLocalDraft(): LocalRegistrationDraft = LocalRegistrationDraft(
    uid = uid,
    gmail = gmail,
    displayName = displayName,
    nik = nik,
    nama = nama,
    alamat = alamat,
    rtRw = rtRw,
    kelDesa = kelDesa,
    kecamatan = kecamatan,
    kabupaten = kabupaten,
    noHp = noHp,
    noRekening = noRekening,
    namaBank = namaBank,
    namaPemilik = namaPemilik,
    areaKerja = areaKerja,
    ktpLocalPath = ktpLocalPath,
    selfieLocalPath = selfieLocalPath,
    ktpDriveFileId = ktpDriveFileId,
    selfieDriveFileId = selfieDriveFileId,
    status = registrationStatusFromStorage(status),
    rejectionReason = rejectionReason,
    createdAt = createdAt,
    updatedAt = updatedAt,
)

fun RegistrationDraftEntity.toUserProfile(): UserProfile = UserProfile(
    uid = uid,
    gmail = gmail,
    displayName = displayName,
    nik = nik.ifBlank { null },
    nama = nama.ifBlank { null },
    alamat = alamat.ifBlank { null },
    rtRw = rtRw.ifBlank { null },
    kelDesa = kelDesa.ifBlank { null },
    kecamatan = kecamatan.ifBlank { null },
    kabupaten = kabupaten.ifBlank { null },
    noHp = noHp.ifBlank { null },
    noRekening = noRekening.ifBlank { null },
    namaBank = namaBank.ifBlank { null },
    namaPemilik = namaPemilik.ifBlank { null },
    areaKerja = areaKerja.ifBlank { null },
    status = registrationStatusFromStorage(status),
    rejectionReason = rejectionReason,
    ktpDriveFileId = ktpDriveFileId,
    selfieDriveFileId = selfieDriveFileId,
    createdAt = createdAt,
    updatedAt = updatedAt,
)

fun LocalRegistrationDraft.toEntity(): RegistrationDraftEntity = RegistrationDraftEntity(
    uid = uid,
    gmail = gmail,
    displayName = displayName,
    nik = nik,
    nama = nama,
    alamat = alamat,
    rtRw = rtRw,
    kelDesa = kelDesa,
    kecamatan = kecamatan,
    kabupaten = kabupaten,
    noHp = noHp,
    noRekening = noRekening,
    namaBank = namaBank,
    namaPemilik = namaPemilik,
    areaKerja = areaKerja,
    ktpLocalPath = ktpLocalPath,
    selfieLocalPath = selfieLocalPath,
    ktpDriveFileId = ktpDriveFileId,
    selfieDriveFileId = selfieDriveFileId,
    status = status.name,
    rejectionReason = rejectionReason,
    createdAt = createdAt,
    updatedAt = updatedAt,
)

fun RegistrationDraft.toLocalDraft(
    createdAt: String? = null,
    updatedAt: String? = null,
): LocalRegistrationDraft = LocalRegistrationDraft(
    uid = uid,
    gmail = gmail,
    displayName = displayName,
    nik = nik,
    nama = nama,
    alamat = alamat,
    rtRw = rtRw,
    kelDesa = kelDesa,
    kecamatan = kecamatan,
    kabupaten = kabupaten,
    noHp = noHp,
    noRekening = noRekening,
    namaBank = namaBank,
    namaPemilik = namaPemilik,
    areaKerja = areaKerja,
    ktpLocalPath = ktpLocalPath,
    selfieLocalPath = selfieLocalPath,
    ktpDriveFileId = ktpDriveFileId,
    selfieDriveFileId = selfieDriveFileId,
    status = status,
    rejectionReason = rejectionReason,
    createdAt = createdAt ?: this.createdAt,
    updatedAt = updatedAt ?: this.updatedAt,
)

private fun registrationStatusFromStorage(value: String): RegistrationStatus =
    runCatching { RegistrationStatus.valueOf(value) }.getOrDefault(RegistrationStatus.NOT_REGISTERED)

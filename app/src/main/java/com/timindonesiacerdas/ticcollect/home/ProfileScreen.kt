package com.timindonesiacerdas.ticcollect.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus
import com.timindonesiacerdas.ticcollect.ui.components.TicPrimaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicScreenContainer
import com.timindonesiacerdas.ticcollect.ui.components.TicSectionCard
import com.timindonesiacerdas.ticcollect.ui.components.TicStatusPill

@Composable
fun ProfileScreen(
    uiState: HomeUiState,
    onBack: () -> Unit,
    onLogout: () -> Unit,
) {
    val user = uiState.session.user
    val profile = uiState.session.profile

    TicScreenContainer(
        title = "Profile",
        subtitle = "Ringkasan akun login dan metadata registrasi yang sudah tersimpan pada device.",
        onBack = onBack,
    ) {
        TicSectionCard(
            title = "Status Akun",
        ) {
            TicStatusPill(status = profile?.status ?: RegistrationStatus.NOT_REGISTERED)
        }

        TicSectionCard(
            title = "Identitas Login",
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(text = "UID: ${user?.uid.orEmpty()}")
                Text(text = "Gmail: ${user?.gmail.orEmpty()}")
                Text(text = "Display Name: ${user?.displayName.orEmpty()}")
            }
        }

        TicSectionCard(
            title = "Metadata Registrasi",
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(text = "Nama: ${profile?.nama.orEmpty()}")
                Text(text = "Alamat: ${profile?.alamat.orEmpty()}")
                Text(text = "No HP: ${profile?.noHp.orEmpty()}")
                Text(text = "No Rekening: ${profile?.noRekening.orEmpty()}")
                Text(text = "Nama Bank: ${profile?.namaBank.orEmpty()}")
                Text(text = "Nama Pemilik: ${profile?.namaPemilik.orEmpty()}")
                Text(text = "Area Kerja: ${profile?.areaKerja.orEmpty()}")
                Text(
                    text = "Catatan keamanan: NIK penuh tidak ditampilkan di profile screen untuk mengurangi risiko paparan.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                )
            }
        }

        TicPrimaryButton(
            text = "Logout",
            onClick = onLogout,
        )
    }
}

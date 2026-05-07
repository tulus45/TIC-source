package com.timindonesiacerdas.ticcollect.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.ui.components.TicAppLogo
import com.timindonesiacerdas.ticcollect.ui.components.TicPrimaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicSectionCard
import com.timindonesiacerdas.ticcollect.utils.TicConstants

@Composable
fun WelcomeScreen(
    uiState: AuthUiState,
    onLoginClick: () -> Unit,
    onRegistrationClick: () -> Unit,
) {
    var hasAgreed by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(uiState.session.isAuthenticated) {
        if (!uiState.session.isAuthenticated) {
            hasAgreed = false
        }
    }

    if (!uiState.session.isAuthenticated) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            Color(0xFFF8FBFF),
                            Color(0xFFE9F0FF),
                            Color(0xFFF7F1EE),
                        ),
                    ),
                )
                .padding(horizontal = 24.dp, vertical = 28.dp),
            contentAlignment = Alignment.Center,
        ) {
            LoginBackgroundDecoration()

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 320.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                TicAppLogo(size = 184.dp)
                if (uiState.isLoading) {
                    CircularProgressIndicator(
                        color = MaterialTheme.colorScheme.primary,
                        strokeWidth = 3.dp,
                    )
                }
                TicPrimaryButton(
                    text = if (uiState.isLoading) "Masuk..." else "Login with Gmail",
                    onClick = onLoginClick,
                    enabled = !uiState.isLoading,
                )
            }
        }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 28.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            TicAppLogo(size = 116.dp)
            Text(
                text = TicConstants.appTitle,
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.onBackground,
                textAlign = TextAlign.Center,
            )
        }

        TicSectionCard(
            title = "Syarat Pemasangan IFP",
            subtitle = null,
        ) {
            JustifiedRequirementText(
                text = "Interactive Flat Panel (IFP) yang akan dipasang merupakan aset milik Negara Republik Indonesia, digunakan sesuai peruntukannya di tempat yang telah ditentukan, dan tidak boleh diperjualbelikan atau dipindahtangankan.",
            )
            JustifiedRequirementText(
                text = "Berikut hal-hal yang harus diperhatikan untuk pemasang / teknisi:",
                fontWeight = FontWeight.SemiBold,
            )

            requirementItems.forEachIndexed { index, item ->
                JustifiedRequirementText(
                    text = "${index + 1}. $item",
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top,
            ) {
                Checkbox(
                    checked = hasAgreed,
                    onCheckedChange = { hasAgreed = it },
                )
                Text(
                    text = "Saya sudah membaca dan setuju dengan syarat pemasangan IFP.",
                    modifier = Modifier
                        .weight(1f)
                        .padding(top = 12.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }

            TicPrimaryButton(
                text = "Registrasi",
                onClick = onRegistrationClick,
                enabled = hasAgreed,
            )
            if (!hasAgreed) {
                Text(
                    text = "Centang persetujuan terlebih dahulu untuk melanjutkan registrasi.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                )
            }
        }
    }
}

@Composable
private fun JustifiedRequirementText(
    text: String,
    fontWeight: FontWeight? = null,
) {
    Text(
        text = text,
        modifier = Modifier.fillMaxWidth(),
        style = MaterialTheme.typography.bodyMedium.copy(
            fontWeight = fontWeight ?: FontWeight.Normal,
        ),
        color = MaterialTheme.colorScheme.onSurface,
        textAlign = TextAlign.Justify,
    )
}

private val requirementItems = listOf(
    "Setiap tukang / pemasang dan koordinator wilayah harus terdaftar dengan menyertakan identitas masing-masing.",
    "Untuk pemasangan di tempat, teknisi / tukang akan dibekali surat jalan atau surat perintah pengerjaan sesuai dengan nama yang terdaftar.",
    "Tempat yang telah dipilih sebelumnya dan kemudian mendapat working order harus dikerjakan seluruhnya tanpa alasan apa pun, sesuai periode bulan berjalan.",
    "Target 1 hari pemasangan per tukang adalah 15 unit. Apabila mencapai 25 unit, akan mendapatkan insentif tambahan per unitnya.",
    "Perhitungan akhir jumlah pemasangan adalah di tanggal 22 setiap bulannya. Jika selesai pemasangannya di atas tanggal 22, maka perhitungan akan dikalkulasikan di bulan berikutnya.",
    "Pembayaran jasa pemasangan akan diterima setiap tanggal 1 tiap bulannya.",
    "Biaya akomodasi awal, termasuk makan dan transport, tukang / pemasang / teknisi dan koordinator wilayah ditanggung sendiri oleh yang bersangkutan sampai selesai di tempat pemasangan.",
    "Teknisi mempersiapkan alat-alat yang mendukung pemasangan IFP tersebut, seperti obeng dan kunci pas ring, secara mandiri.",
    "Setelah selesai pemasangan di tiap sekolah, tukang / pemasang wajib menyelesaikan proses laporan yang telah disediakan sesuai format, termasuk cap dan tanda tangan kepala sekolah dari tempat yang telah terpasang, serta wajib mendokumentasikannya secara lengkap untuk masuk ke tahap selanjutnya.",
    "Perhitungan keseluruhan jumlah pembayaran jasa akan dilakukan setelah semua berkas pelaporan dianggap lengkap dan telah dikumpulkan ke kantor tanpa kecuali.",
)

@Composable
private fun LoginBackgroundDecoration() {
    Box(modifier = Modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .size(280.dp)
                .align(Alignment.TopStart)
                .offset(x = (-96).dp, y = (-72).dp)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            Color(0x55228AD6),
                            Color(0x00228AD6),
                        ),
                    ),
                    shape = CircleShape,
                ),
        )
        Box(
            modifier = Modifier
                .size(320.dp)
                .align(Alignment.TopEnd)
                .offset(x = 112.dp, y = (-104).dp)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            Color(0x55F04A56),
                            Color(0x00F04A56),
                        ),
                    ),
                    shape = CircleShape,
                ),
        )
        Box(
            modifier = Modifier
                .size(286.dp)
                .align(Alignment.Center)
                .graphicsLayer {
                    rotationZ = -16f
                    alpha = 0.2f
                }
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(
                            Color.White,
                            Color(0xFFDCE6FF),
                        ),
                    ),
                    shape = RoundedCornerShape(72.dp),
                ),
        )
        Box(
            modifier = Modifier
                .size(width = 240.dp, height = 92.dp)
                .align(Alignment.BottomCenter)
                .offset(y = (-32).dp)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            Color(0x44243B6B),
                            Color.Transparent,
                        ),
                    ),
                    shape = RoundedCornerShape(999.dp),
                ),
        )
    }
}

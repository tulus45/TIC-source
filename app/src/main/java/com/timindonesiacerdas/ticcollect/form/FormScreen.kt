package com.timindonesiacerdas.ticcollect.form

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.ui.components.TicPrimaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicScreenContainer
import com.timindonesiacerdas.ticcollect.ui.components.TicSectionCard
import com.timindonesiacerdas.ticcollect.ui.components.TicSecondaryButton

@Composable
fun FormScreen(
    onBack: () -> Unit,
    onPhotoCapture: () -> Unit,
    onVideoCapture: () -> Unit,
    onGpsCapture: () -> Unit,
) {
    TicScreenContainer(
        title = "Data Collection",
        subtitle = "Stage 1 menyiapkan struktur form dan tombol menuju modul evidence. Logic per pertanyaan akan kita kerjakan di tahap berikutnya.",
        onBack = onBack,
    ) {
        TicSectionCard(
            title = "Contoh alur form",
            subtitle = "Target alur final: relevance logic, required validation, screen out, GPS, foto watermark, dan video evidence.",
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(text = "Q1. Apakah responden bersedia diwawancara?")
                Text(text = "Q2. Nama responden")
                Text(text = "Q4. Apakah memiliki usaha?")
                Text(text = "Q7. Foto tempat usaha")
                Text(text = "Q9. Ambil GPS responden")
            }
        }

        TicPrimaryButton(
            text = "Buka Placeholder Foto",
            onClick = onPhotoCapture,
        )
        TicSecondaryButton(
            text = "Buka Placeholder Video",
            onClick = onVideoCapture,
        )
        TicSecondaryButton(
            text = "Buka Placeholder GPS",
            onClick = onGpsCapture,
        )
        Text(
            text = "TODO tahap 2: bangun engine one-question-per-screen dan simpan jawaban ke Room.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.72f),
        )
    }
}

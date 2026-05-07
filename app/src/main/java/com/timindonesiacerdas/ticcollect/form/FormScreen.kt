package com.timindonesiacerdas.ticcollect.form

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.data.remote.SchoolMasterDataResponse
import com.timindonesiacerdas.ticcollect.ui.components.TicPrimaryButton
import com.timindonesiacerdas.ticcollect.ui.components.TicScreenContainer
import com.timindonesiacerdas.ticcollect.ui.components.TicSectionCard
import com.timindonesiacerdas.ticcollect.ui.components.TicSecondaryButton

@Composable
fun FormScreen(
    uiState: FormUiState,
    onBack: () -> Unit,
    onPhotoCapture: () -> Unit,
    onVideoCapture: () -> Unit,
    onGpsCapture: () -> Unit,
    onRetryLoadMasterData: () -> Unit,
    onSelectValue: (Int, String) -> Unit,
    onClearSelections: () -> Unit,
) {
    val masterData = uiState.masterData
    val selectedPath = buildSelectedPath(
        columns = masterData?.columns.orEmpty(),
        values = uiState.selectedValues,
    )
    val isSelectionComplete = masterData != null &&
        uiState.selectedValues.size >= masterData.columns.size &&
        uiState.selectedValues.take(masterData.columns.size).all { it.isNotBlank() }

    TicScreenContainer(
        title = "Data Collection",
        subtitle = "Pilih lokasi kerja terlebih dahulu. Struktur level mengikuti master data backend dan bisa berubah tanpa perlu hardcode ulang di aplikasi.",
        onBack = onBack,
    ) {
        TicSectionCard(
            title = masterData?.title ?: "Pilih Lokasi Sekolah",
            subtitle = when {
                uiState.isLoadingMasterData -> "Memuat master data lokasi dari backend..."
                !uiState.errorMessage.isNullOrBlank() -> uiState.errorMessage
                masterData != null -> "Level pilihan mengikuti header data. Jika nanti jumlah kolom berubah, layar ini akan ikut menyesuaikan."
                else -> "Master data sekolah belum tersedia."
            },
        ) {
            when {
                uiState.isLoadingMasterData -> {
                    Text(
                        text = "Mohon tunggu, daftar lokasi sedang disiapkan.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }

                !uiState.errorMessage.isNullOrBlank() -> {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(
                            text = "Belum bisa memuat daftar lokasi. Pastikan backend online, lalu coba lagi.",
                            style = MaterialTheme.typography.bodyMedium,
                        )
                        TicPrimaryButton(
                            text = "Muat Ulang Daftar Lokasi",
                            onClick = onRetryLoadMasterData,
                        )
                    }
                }

                masterData != null -> {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        masterData.columns.forEachIndexed { index, columnName ->
                            CascadingSelectorField(
                                label = columnName,
                                selectedValue = uiState.selectedValues.getOrNull(index).orEmpty(),
                                options = availableOptionsForLevel(
                                    masterData = masterData,
                                    selectedValues = uiState.selectedValues,
                                    levelIndex = index,
                                ),
                                enabled = index == 0 || uiState.selectedValues.getOrNull(index - 1).orEmpty().isNotBlank(),
                                onValueSelected = { value -> onSelectValue(index, value) },
                            )
                        }

                        if (selectedPath.isNotBlank()) {
                            Text(
                                text = "Pilihan saat ini: $selectedPath",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.78f),
                            )
                        }

                        Text(
                            text = "${masterData.rows.size} baris master data tersedia.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.68f),
                        )

                        TicSecondaryButton(
                            text = "Reset Pilihan",
                            onClick = onClearSelections,
                            enabled = uiState.selectedValues.any { it.isNotBlank() },
                        )
                    }
                }
            }
        }

        TicSectionCard(
            title = "Modul Evidence",
            subtitle = if (isSelectionComplete) {
                "Lokasi sudah dipilih. Anda bisa lanjut ke placeholder evidence sambil kita bangun flow form finalnya."
            } else {
                "Selesaikan pilihan lokasi sampai sekolah terlebih dahulu agar konteks pengisian jelas."
            },
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                TicPrimaryButton(
                    text = "Buka Placeholder Foto",
                    onClick = onPhotoCapture,
                    enabled = isSelectionComplete,
                )
                TicSecondaryButton(
                    text = "Buka Placeholder Video",
                    onClick = onVideoCapture,
                    enabled = isSelectionComplete,
                )
                TicSecondaryButton(
                    text = "Buka Placeholder GPS",
                    onClick = onGpsCapture,
                    enabled = isSelectionComplete,
                )
                Text(
                    text = "Tahap berikutnya kita bisa sambungkan pilihan lokasi ini ke form one-question-per-screen dan penyimpanan jawaban.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.72f),
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CascadingSelectorField(
    label: String,
    selectedValue: String,
    options: List<String>,
    enabled: Boolean,
    onValueSelected: (String) -> Unit,
) {
    var expanded by remember(label, options, enabled) { mutableStateOf(false) }

    ExposedDropdownMenuBox(
        expanded = expanded && enabled,
        onExpandedChange = { shouldExpand ->
            if (enabled && options.isNotEmpty()) {
                expanded = shouldExpand
            }
        },
    ) {
        OutlinedTextField(
            value = selectedValue,
            onValueChange = {},
            modifier = Modifier
                .menuAnchor()
                .fillMaxWidth(),
            readOnly = true,
            enabled = enabled,
            label = { Text(label) },
            placeholder = {
                Text(
                    if (enabled) "Pilih $label" else "Pilih level sebelumnya dulu",
                )
            },
            trailingIcon = {
                ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded && enabled)
            },
        )

        ExposedDropdownMenu(
            expanded = expanded && enabled,
            onDismissRequest = { expanded = false },
        ) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option) },
                    onClick = {
                        expanded = false
                        onValueSelected(option)
                    },
                )
            }
        }
    }
}

private fun availableOptionsForLevel(
    masterData: SchoolMasterDataResponse,
    selectedValues: List<String>,
    levelIndex: Int,
): List<String> {
    val results = linkedSetOf<String>()
    masterData.rows.forEach { row ->
        if (row.size <= levelIndex) return@forEach

        val previousLevelsMatch = (0 until levelIndex).all { previousIndex ->
            row.getOrNull(previousIndex).orEmpty() == selectedValues.getOrNull(previousIndex).orEmpty()
        }
        if (!previousLevelsMatch) return@forEach

        val candidate = row[levelIndex].trim()
        if (candidate.isNotBlank()) {
            results += candidate
        }
    }
    return results.toList()
}

private fun buildSelectedPath(
    columns: List<String>,
    values: List<String>,
): String {
    return columns.mapIndexedNotNull { index, column ->
        val value = values.getOrNull(index).orEmpty().trim()
        if (value.isBlank()) null else "$column: $value"
    }.joinToString(" > ")
}

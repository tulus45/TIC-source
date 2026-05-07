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
    onNext: () -> Unit,
    onRetryLoadMasterData: () -> Unit,
    onSelectValue: (Int, String) -> Unit,
    onClearSelections: () -> Unit,
) {
    val masterData = uiState.masterData
    val isSelectionComplete = masterData != null &&
        uiState.selectedValues.size >= masterData.columns.size &&
        uiState.selectedValues.take(masterData.columns.size).all { it.isNotBlank() }

    TicScreenContainer(
        title = "Data Collection",
        subtitle = "",
        onBack = onBack,
    ) {
        TicSectionCard(
            title = "Pilih Sekolah",
            subtitle = when {
                uiState.isLoadingMasterData -> "Memuat master data lokasi dari backend..."
                !uiState.errorMessage.isNullOrBlank() -> uiState.errorMessage
                masterData != null -> null
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

                        TicSecondaryButton(
                            text = "Reset Pilihan",
                            onClick = onClearSelections,
                            enabled = uiState.selectedValues.any { it.isNotBlank() },
                        )
                        TicPrimaryButton(
                            text = "Next",
                            onClick = onNext,
                            enabled = isSelectionComplete,
                        )
                    }
                }
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

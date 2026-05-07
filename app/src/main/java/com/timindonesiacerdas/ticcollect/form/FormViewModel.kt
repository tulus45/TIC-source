package com.timindonesiacerdas.ticcollect.form

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.timindonesiacerdas.ticcollect.data.remote.SchoolMasterDataResponse
import com.timindonesiacerdas.ticcollect.data.remote.TicBackendHttpClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class FormUiState(
    val isLoadingMasterData: Boolean = false,
    val masterData: SchoolMasterDataResponse? = null,
    val selectedValues: List<String> = emptyList(),
    val errorMessage: String? = null,
)

class FormViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(FormUiState())
    val uiState: StateFlow<FormUiState> = _uiState.asStateFlow()

    init {
        loadMasterData()
    }

    fun loadMasterData(force: Boolean = false) {
        val current = _uiState.value
        if (current.isLoadingMasterData) return
        if (!force && current.masterData != null) return

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoadingMasterData = true,
                    errorMessage = null,
                )
            }

            runCatching {
                TicBackendHttpClient.getSchoolMasterData()
            }.onSuccess { response ->
                _uiState.update {
                    it.copy(
                        isLoadingMasterData = false,
                        masterData = response,
                        selectedValues = List(response.columns.size) { "" },
                        errorMessage = null,
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoadingMasterData = false,
                        errorMessage = error.message ?: "Belum bisa memuat master data sekolah.",
                    )
                }
            }
        }
    }

    fun selectValue(levelIndex: Int, value: String) {
        val masterData = _uiState.value.masterData ?: return
        if (levelIndex !in masterData.columns.indices) return

        _uiState.update { current ->
            val updatedSelections = current.selectedValues.toMutableList()
            while (updatedSelections.size < masterData.columns.size) {
                updatedSelections += ""
            }
            updatedSelections[levelIndex] = value
            for (index in levelIndex + 1 until updatedSelections.size) {
                updatedSelections[index] = ""
            }
            current.copy(selectedValues = updatedSelections)
        }
    }

    fun clearSelections() {
        val masterData = _uiState.value.masterData ?: return
        _uiState.update {
            it.copy(selectedValues = List(masterData.columns.size) { "" })
        }
    }
}

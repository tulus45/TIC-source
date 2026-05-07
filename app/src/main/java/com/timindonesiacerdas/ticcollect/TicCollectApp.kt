package com.timindonesiacerdas.ticcollect

import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.lifecycle.viewmodel.compose.viewModel
import com.timindonesiacerdas.ticcollect.auth.AuthViewModel
import com.timindonesiacerdas.ticcollect.home.HomeViewModel
import com.timindonesiacerdas.ticcollect.navigation.TicNavGraph
import com.timindonesiacerdas.ticcollect.registration.RegistrationViewModel
import com.timindonesiacerdas.ticcollect.ui.theme.TicCollectTheme
import com.timindonesiacerdas.ticcollect.upload.UploadViewModel

@Composable
fun TicCollectApp() {
    val authViewModel: AuthViewModel = viewModel()
    val registrationViewModel: RegistrationViewModel = viewModel()
    val homeViewModel: HomeViewModel = viewModel()
    val uploadViewModel: UploadViewModel = viewModel()

    TicCollectTheme {
        Surface {
            TicNavGraph(
                authViewModel = authViewModel,
                registrationViewModel = registrationViewModel,
                homeViewModel = homeViewModel,
                uploadViewModel = uploadViewModel,
            )
        }
    }
}

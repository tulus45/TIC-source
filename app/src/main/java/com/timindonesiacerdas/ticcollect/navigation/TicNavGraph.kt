package com.timindonesiacerdas.ticcollect.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.timindonesiacerdas.ticcollect.auth.AuthViewModel
import com.timindonesiacerdas.ticcollect.auth.LoginScreen
import com.timindonesiacerdas.ticcollect.auth.WelcomeScreen
import com.timindonesiacerdas.ticcollect.camera.KtpCameraScreen
import com.timindonesiacerdas.ticcollect.camera.PhotoCaptureScreen
import com.timindonesiacerdas.ticcollect.camera.SelfieCameraScreen
import com.timindonesiacerdas.ticcollect.camera.VideoCaptureScreen
import com.timindonesiacerdas.ticcollect.form.FormScreen
import com.timindonesiacerdas.ticcollect.home.HomeScreen
import com.timindonesiacerdas.ticcollect.home.HomeViewModel
import com.timindonesiacerdas.ticcollect.home.ProfileScreen
import com.timindonesiacerdas.ticcollect.home.SubmissionHistoryScreen
import com.timindonesiacerdas.ticcollect.location.GpsCaptureScreen
import com.timindonesiacerdas.ticcollect.registration.RegistrationScreen
import com.timindonesiacerdas.ticcollect.registration.RegistrationViewModel
import com.timindonesiacerdas.ticcollect.registration.RejectedScreen
import com.timindonesiacerdas.ticcollect.registration.WaitingApprovalScreen
import com.timindonesiacerdas.ticcollect.upload.PendingUploadScreen
import com.timindonesiacerdas.ticcollect.upload.UploadViewModel

@Composable
fun TicNavGraph(
    authViewModel: AuthViewModel,
    registrationViewModel: RegistrationViewModel,
    homeViewModel: HomeViewModel,
    uploadViewModel: UploadViewModel,
    navController: NavHostController = rememberNavController(),
) {
    val authUiState = authViewModel.uiState.collectAsStateWithLifecycle().value
    val registrationUiState = registrationViewModel.uiState.collectAsStateWithLifecycle().value
    val homeUiState = homeViewModel.uiState.collectAsStateWithLifecycle().value
    val pendingUploadUiState = uploadViewModel.uiState.collectAsStateWithLifecycle().value

    NavHost(
        navController = navController,
        startDestination = TicRoutes.Welcome,
    ) {
        composable(TicRoutes.Welcome) {
            WelcomeScreen(
                uiState = authUiState,
                onLoginClick = authViewModel::simulateGoogleLogin,
                onRegistrationClick = {
                    val nextRoute = if (
                        authUiState.session.isAuthenticated &&
                        (authUiState.session.profile?.status
                            ?: com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus.NOT_REGISTERED) ==
                        com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus.NOT_REGISTERED
                    ) {
                        TicRoutes.Registration
                    } else {
                        AuthViewModel.destinationFor(authUiState.session)
                    }
                    navController.navigate(nextRoute)
                },
            )
        }

        composable(TicRoutes.Login) {
            LoginScreen(
                uiState = authUiState,
                onBack = { navController.popBackStack() },
                onLoginClick = authViewModel::simulateGoogleLogin,
                onLoginResolved = { route ->
                    navController.navigateClearingBackStack(route)
                },
            )
        }

        composable(TicRoutes.Registration) {
            RegistrationScreen(
                uiState = registrationUiState,
                onBack = { navController.popBackStack() },
                onCaptureKtp = { navController.navigate(TicRoutes.KtpCamera) },
                onCaptureSelfie = { navController.navigate(TicRoutes.SelfieCamera) },
                onNikChanged = registrationViewModel::onNikChanged,
                onNamaChanged = registrationViewModel::onNamaChanged,
                onAlamatChanged = registrationViewModel::onAlamatChanged,
                onNoHpChanged = registrationViewModel::onNoHpChanged,
                onNoRekeningChanged = registrationViewModel::onNoRekeningChanged,
                onNamaBankChanged = registrationViewModel::onNamaBankChanged,
                onNamaPemilikChanged = registrationViewModel::onNamaPemilikChanged,
                onAreaKerjaChanged = registrationViewModel::onAreaKerjaChanged,
                onSubmit = registrationViewModel::submitRegistration,
                onSubmitted = {
                    registrationViewModel.onSubmissionHandled()
                    navController.navigateClearingBackStack(TicRoutes.WaitingApproval)
                },
            )
        }

        composable(TicRoutes.KtpCamera) {
            KtpCameraScreen(
                onBack = { navController.popBackStack() },
                onPhotoCaptured = { path ->
                    registrationViewModel.onKtpCaptured(path)
                    navController.popBackStack()
                },
            )
        }

        composable(TicRoutes.SelfieCamera) {
            SelfieCameraScreen(
                onBack = { navController.popBackStack() },
                onPhotoCaptured = { path ->
                    registrationViewModel.onSelfieCaptured(path)
                    navController.popBackStack()
                },
            )
        }

        composable(TicRoutes.WaitingApproval) {
            LaunchedEffect(Unit) {
                registrationViewModel.refreshRegistrationStatus()
            }

            LaunchedEffect(registrationUiState.currentStatus) {
                when (registrationUiState.currentStatus) {
                    com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus.APPROVED -> {
                        navController.navigateClearingBackStack(TicRoutes.Home)
                    }
                    com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus.REJECTED -> {
                        navController.navigateClearingBackStack(TicRoutes.Rejected)
                    }
                    else -> Unit
                }
            }

            WaitingApprovalScreen(
                currentStatus = registrationUiState.currentStatus,
                statusSyncMessage = registrationUiState.statusSyncMessage,
                isRefreshing = registrationUiState.isRefreshingStatus,
                onRefreshStatus = registrationViewModel::refreshRegistrationStatus,
                onLogout = {
                    authViewModel.logout()
                    navController.navigateClearingBackStack(TicRoutes.Welcome)
                },
            )
        }

        composable(TicRoutes.Rejected) {
            RejectedScreen(
                rejectionReason = registrationUiState.rejectionReason,
                onEditRegistration = {
                    navController.navigateClearingBackStack(TicRoutes.Registration)
                },
                onLogout = {
                    authViewModel.logout()
                    navController.navigateClearingBackStack(TicRoutes.Welcome)
                },
            )
        }

        composable(TicRoutes.Home) {
            HomeScreen(
                uiState = homeUiState,
                onStartDataCollection = { navController.navigate(TicRoutes.Form) },
                onPendingUpload = { navController.navigate(TicRoutes.PendingUpload) },
                onHistory = { navController.navigate(TicRoutes.SubmissionHistory) },
                onProfile = { navController.navigate(TicRoutes.Profile) },
                onLogout = {
                    homeViewModel.logout()
                    navController.navigateClearingBackStack(TicRoutes.Welcome)
                },
            )
        }

        composable(TicRoutes.Form) {
            FormScreen(
                onBack = { navController.popBackStack() },
                onPhotoCapture = { navController.navigate(TicRoutes.PhotoCapture) },
                onVideoCapture = { navController.navigate(TicRoutes.VideoCapture) },
                onGpsCapture = { navController.navigate(TicRoutes.GpsCapture) },
            )
        }

        composable(TicRoutes.PhotoCapture) {
            PhotoCaptureScreen(
                onBack = { navController.popBackStack() },
            )
        }

        composable(TicRoutes.VideoCapture) {
            VideoCaptureScreen(
                onBack = { navController.popBackStack() },
            )
        }

        composable(TicRoutes.GpsCapture) {
            GpsCaptureScreen(
                onBack = { navController.popBackStack() },
            )
        }

        composable(TicRoutes.PendingUpload) {
            PendingUploadScreen(
                uiState = pendingUploadUiState,
                onBack = { navController.popBackStack() },
                onRetry = uploadViewModel::retryUpload,
            )
        }

        composable(TicRoutes.SubmissionHistory) {
            SubmissionHistoryScreen(
                onBack = { navController.popBackStack() },
            )
        }

        composable(TicRoutes.Profile) {
            ProfileScreen(
                uiState = homeUiState,
                onBack = { navController.popBackStack() },
                onLogout = {
                    homeViewModel.logout()
                    navController.navigateClearingBackStack(TicRoutes.Welcome)
                },
            )
        }
    }
}

private fun NavHostController.navigateClearingBackStack(route: String) {
    navigate(route) {
        popUpTo(graph.startDestinationId) {
            inclusive = true
        }
        launchSingleTop = true
    }
}

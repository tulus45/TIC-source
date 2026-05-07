package com.timindonesiacerdas.ticcollect.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.timindonesiacerdas.ticcollect.auth.*
import com.timindonesiacerdas.ticcollect.camera.KtpCameraScreen
import com.timindonesiacerdas.ticcollect.camera.SelfieCameraScreen
import com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus
import com.timindonesiacerdas.ticcollect.form.EvidenceWorkflowScreen
import com.timindonesiacerdas.ticcollect.form.FormScreen
import com.timindonesiacerdas.ticcollect.form.FormViewModel
import com.timindonesiacerdas.ticcollect.home.*
import com.timindonesiacerdas.ticcollect.registration.*
import com.timindonesiacerdas.ticcollect.splash.SplashScreen
import com.timindonesiacerdas.ticcollect.upload.*

@Composable
fun TicNavGraph(
    authViewModel: AuthViewModel,
    registrationViewModel: RegistrationViewModel,
    formViewModel: FormViewModel,
    homeViewModel: HomeViewModel,
    uploadViewModel: UploadViewModel,
    navController: NavHostController = rememberNavController(),
) {
    val authUiState = authViewModel.uiState.collectAsStateWithLifecycle().value
    val registrationUiState = registrationViewModel.uiState.collectAsStateWithLifecycle().value
    val formUiState = formViewModel.uiState.collectAsStateWithLifecycle().value
    val homeUiState = homeViewModel.uiState.collectAsStateWithLifecycle().value
    val pendingUploadUiState = uploadViewModel.uiState.collectAsStateWithLifecycle().value

    NavHost(
        navController = navController,
        startDestination = TicRoutes.Splash,
    ) {
        composable(TicRoutes.Splash) {
            LaunchedEffect(authUiState.isBootstrapping, authUiState.session.profile?.status) {
                if (!authUiState.isBootstrapping) {
                    navController.navigateClearingBackStack(
                        AuthViewModel.destinationFor(authUiState.session),
                    )
                }
            }

            SplashScreen()
        }

        composable(TicRoutes.Welcome) {
            LaunchedEffect(authUiState.session.profile?.status) {
                val destination = AuthViewModel.destinationFor(authUiState.session)
                if (destination != TicRoutes.Welcome) {
                    navController.navigateClearingBackStack(destination)
                }
            }

            WelcomeScreen(
                onRegistrationClick = {
                    navController.navigate(TicRoutes.Registration)
                },
            )
        }

        composable(TicRoutes.Registration) {
            LaunchedEffect(registrationUiState.currentStatus) {
                when (registrationUiState.currentStatus) {
                    com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus.PENDING -> {
                        navController.navigateClearingBackStack(TicRoutes.WaitingApproval)
                    }
                    com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus.APPROVED -> {
                        navController.navigateClearingBackStack(TicRoutes.Home)
                    }
                    com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus.REJECTED -> {
                        navController.navigateClearingBackStack(TicRoutes.Rejected)
                    }
                    com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus.SUSPENDED -> {
                        navController.navigateClearingBackStack(TicRoutes.Suspended)
                    }
                    else -> Unit
                }
            }

            RegistrationScreen(
                uiState = registrationUiState,
                onBack = { navController.popBackStack() },
                onCaptureKtp = { navController.navigate(TicRoutes.KtpCamera) },
                onCaptureSelfie = { navController.navigate(TicRoutes.SelfieCamera) },
                onGmailChanged = registrationViewModel::onGmailChanged,
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
                registrationViewModel.refreshRegistrationStatus(showFailureMessage = false)
            }

            LaunchedEffect(registrationUiState.currentStatus) {
                when (registrationUiState.currentStatus) {
                    com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus.APPROVED -> {
                        navController.navigateClearingBackStack(TicRoutes.Home)
                    }
                    com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus.REJECTED -> {
                        navController.navigateClearingBackStack(TicRoutes.Rejected)
                    }
                    com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus.SUSPENDED -> {
                        navController.navigateClearingBackStack(TicRoutes.Suspended)
                    }
                    else -> Unit
                }
            }

            WaitingApprovalScreen(
                currentStatus = registrationUiState.currentStatus,
                statusSyncMessage = registrationUiState.statusSyncMessage,
                isRefreshing = registrationUiState.isRefreshingStatus,
                onRefreshStatus = registrationViewModel::refreshRegistrationStatus,
            )
        }

        composable(TicRoutes.Rejected) {
            RejectedScreen(
                rejectionReason = registrationUiState.rejectionReason,
                onEditRegistration = {
                    navController.navigateClearingBackStack(TicRoutes.Registration)
                },
            )
        }

        composable(TicRoutes.Suspended) {
            SuspendedScreen(
                suspensionReason = registrationUiState.rejectionReason,
                onBackToWelcome = {
                    navController.navigateClearingBackStack(TicRoutes.Welcome)
                },
            )
        }

        composable(TicRoutes.Home) {
            ProtectedRouteGuard(
                navController = navController,
                status = authUiState.session.profile?.status,
                onRefreshStatus = authViewModel::refreshAccessStatus,
            )
            HomeScreen(
                uiState = homeUiState,
                onStartDataCollection = { navController.navigate(TicRoutes.Form) },
                onPendingUpload = { navController.navigate(TicRoutes.PendingUpload) },
                onHistory = { navController.navigate(TicRoutes.SubmissionHistory) },
                onProfile = { navController.navigate(TicRoutes.Profile) },
            )
        }

        composable(TicRoutes.Form) {
            ProtectedRouteGuard(
                navController = navController,
                status = authUiState.session.profile?.status,
                onRefreshStatus = authViewModel::refreshAccessStatus,
            )
            FormScreen(
                uiState = formUiState,
                onBack = { navController.popBackStack() },
                onNext = {
                    formViewModel.resetEvidenceProgress()
                    navController.navigate(TicRoutes.EvidenceWorkflow)
                },
                onRetryLoadMasterData = { formViewModel.loadMasterData(force = true) },
                onSelectValue = formViewModel::selectValue,
                onClearSelections = formViewModel::clearSelections,
            )
        }

        composable(TicRoutes.EvidenceWorkflow) {
            ProtectedRouteGuard(
                navController = navController,
                status = authUiState.session.profile?.status,
                onRefreshStatus = authViewModel::refreshAccessStatus,
            )
            EvidenceWorkflowScreen(
                uiState = formUiState,
                onBack = { navController.popBackStack() },
                onPreviousStep = formViewModel::goToPreviousEvidenceStep,
                onNextStep = formViewModel::goToNextEvidenceStep,
                onFinish = {
                    formViewModel.completeSubmission()
                    navController.navigateClearingBackStack(TicRoutes.PendingUpload)
                },
                onPhotoRecorded = formViewModel::recordPhotoCapture,
                onPhotoCleared = formViewModel::clearPhotoCapture,
                onGpsRecorded = formViewModel::recordGpsCapture,
            )
        }

        composable(TicRoutes.PendingUpload) {
            ProtectedRouteGuard(
                navController = navController,
                status = authUiState.session.profile?.status,
                onRefreshStatus = authViewModel::refreshAccessStatus,
            )
            PendingUploadScreen(
                uiState = pendingUploadUiState,
                onBack = { navController.popBackStack() },
                onRetry = uploadViewModel::retryUpload,
                onUploadAll = uploadViewModel::uploadAll,
            )
        }

        composable(TicRoutes.SubmissionHistory) {
            ProtectedRouteGuard(
                navController = navController,
                status = authUiState.session.profile?.status,
                onRefreshStatus = authViewModel::refreshAccessStatus,
            )
            SubmissionHistoryScreen(
                onBack = { navController.popBackStack() },
            )
        }

        composable(TicRoutes.Profile) {
            ProtectedRouteGuard(
                navController = navController,
                status = authUiState.session.profile?.status,
                onRefreshStatus = authViewModel::refreshAccessStatus,
            )
            ProfileScreen(
                uiState = homeUiState,
                onBack = { navController.popBackStack() },
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

@Composable
private fun ProtectedRouteGuard(
    navController: NavHostController,
    status: RegistrationStatus?,
    onRefreshStatus: () -> Unit,
) {
    LaunchedEffect(Unit) {
        onRefreshStatus()
    }

    LaunchedEffect(status) {
        when (status ?: RegistrationStatus.NOT_REGISTERED) {
            RegistrationStatus.APPROVED -> Unit
            RegistrationStatus.NOT_REGISTERED -> {
                navController.navigateClearingBackStack(TicRoutes.Welcome)
            }
            RegistrationStatus.PENDING -> {
                navController.navigateClearingBackStack(TicRoutes.WaitingApproval)
            }
            RegistrationStatus.REJECTED -> {
                navController.navigateClearingBackStack(TicRoutes.Rejected)
            }
            RegistrationStatus.SUSPENDED -> {
                navController.navigateClearingBackStack(TicRoutes.Suspended)
            }
        }
    }
}

package com.timindonesiacerdas.ticcollect.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.timindonesiacerdas.ticcollect.auth.AuthViewModel
import com.timindonesiacerdas.ticcollect.auth.WelcomeScreen
import com.timindonesiacerdas.ticcollect.camera.KtpCameraScreen
import com.timindonesiacerdas.ticcollect.camera.SelfieCameraScreen
import com.timindonesiacerdas.ticcollect.data.model.isApprovedAccess
import com.timindonesiacerdas.ticcollect.form.EvidenceWorkflowScreen
import com.timindonesiacerdas.ticcollect.form.FormScreen
import com.timindonesiacerdas.ticcollect.form.FormViewModel
import com.timindonesiacerdas.ticcollect.home.DraftScreen
import com.timindonesiacerdas.ticcollect.home.HomeScreen
import com.timindonesiacerdas.ticcollect.home.HomeViewModel
import com.timindonesiacerdas.ticcollect.home.ProfileScreen
import com.timindonesiacerdas.ticcollect.registration.RegistrationScreen
import com.timindonesiacerdas.ticcollect.registration.RegistrationViewModel
import com.timindonesiacerdas.ticcollect.registration.RejectedScreen
import com.timindonesiacerdas.ticcollect.registration.SuspendedScreen
import com.timindonesiacerdas.ticcollect.registration.UpdateRequiredScreen
import com.timindonesiacerdas.ticcollect.registration.WaitingApprovalScreen
import com.timindonesiacerdas.ticcollect.splash.SplashScreen
import com.timindonesiacerdas.ticcollect.upload.PendingUploadScreen
import com.timindonesiacerdas.ticcollect.upload.UploadViewModel

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
            LaunchedEffect(registrationUiState.currentStatus, authUiState.session.appAccess.requiresAppUpdate) {
                when {
                    registrationUiState.currentStatus == com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus.PENDING -> {
                        navController.navigateClearingBackStack(TicRoutes.WaitingApproval)
                    }
                    registrationUiState.currentStatus?.isApprovedAccess == true -> {
                        navController.navigateClearingBackStack(
                            AuthViewModel.destinationFor(authUiState.session),
                        )
                    }
                    registrationUiState.currentStatus == com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus.REJECTED -> {
                        navController.navigateClearingBackStack(TicRoutes.Rejected)
                    }
                    registrationUiState.currentStatus == com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus.SUSPENDED -> {
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

            LaunchedEffect(registrationUiState.currentStatus, authUiState.session.appAccess.requiresAppUpdate) {
                when {
                    registrationUiState.currentStatus?.isApprovedAccess == true -> {
                        navController.navigateClearingBackStack(
                            AuthViewModel.destinationFor(authUiState.session),
                        )
                    }
                    registrationUiState.currentStatus == com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus.REJECTED -> {
                        navController.navigateClearingBackStack(TicRoutes.Rejected)
                    }
                    registrationUiState.currentStatus == com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus.SUSPENDED -> {
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

        composable(TicRoutes.UpdateRequired) {
            ProtectedRouteGuard(
                navController = navController,
                session = authUiState.session,
                allowedRoute = TicRoutes.UpdateRequired,
                onRefreshStatus = authViewModel::refreshAccessStatus,
            )
            UpdateRequiredScreen(
                appAccess = authUiState.session.appAccess,
                isRefreshing = registrationUiState.isRefreshingStatus,
                onRefreshStatus = registrationViewModel::refreshRegistrationStatus,
            )
        }

        composable(TicRoutes.Home) {
            ProtectedRouteGuard(
                navController = navController,
                session = authUiState.session,
                allowedRoute = TicRoutes.Home,
                onRefreshStatus = authViewModel::refreshAccessStatus,
            )
            HomeScreen(
                uiState = homeUiState,
                onStartDataCollection = {
                    formViewModel.startNewSubmission()
                    navController.navigate(TicRoutes.Form)
                },
                onPendingUpload = { navController.navigate(TicRoutes.PendingUpload) },
                onDraft = { navController.navigate(TicRoutes.Draft) },
                onProfile = { navController.navigate(TicRoutes.Profile) },
            )
        }

        composable(TicRoutes.Form) {
            ProtectedRouteGuard(
                navController = navController,
                session = authUiState.session,
                allowedRoute = TicRoutes.Home,
                onRefreshStatus = authViewModel::refreshAccessStatus,
            )
            FormScreen(
                uiState = formUiState,
                onBack = { navController.popBackStack() },
                onNext = { navController.navigate(TicRoutes.EvidenceWorkflow) },
                onRetryLoadMasterData = { formViewModel.loadMasterData(force = true) },
                onSelectValue = formViewModel::selectValue,
                onClearSelections = formViewModel::clearSelections,
            )
        }

        composable(TicRoutes.EvidenceWorkflow) {
            ProtectedRouteGuard(
                navController = navController,
                session = authUiState.session,
                allowedRoute = TicRoutes.Home,
                onRefreshStatus = authViewModel::refreshAccessStatus,
            )
            EvidenceWorkflowScreen(
                uiState = formUiState,
                onBack = { navController.popBackStack() },
                onPreviousStep = formViewModel::goToPreviousEvidenceStep,
                onNextStep = formViewModel::goToNextEvidenceStep,
                onFinish = {
                    val wasEditingSubmission = formUiState.editingSubmissionId != null
                    formViewModel.completeSubmission()
                    if (wasEditingSubmission) {
                        navController.navigate(TicRoutes.Draft) {
                            popUpTo(TicRoutes.Draft) {
                                inclusive = false
                            }
                            launchSingleTop = true
                        }
                    } else {
                        navController.navigateClearingBackStack(TicRoutes.PendingUpload)
                    }
                },
                onPhotoRecorded = formViewModel::recordPhotoCapture,
                onPhotoCleared = formViewModel::clearPhotoCapture,
                onSharedPhotoGpsUpdated = formViewModel::updateSharedPhotoGps,
                onGpsRecorded = formViewModel::recordGpsCapture,
            )
        }

        composable(TicRoutes.PendingUpload) {
            ProtectedRouteGuard(
                navController = navController,
                session = authUiState.session,
                allowedRoute = TicRoutes.Home,
                onRefreshStatus = authViewModel::refreshAccessStatus,
            )
            PendingUploadScreen(
                uiState = pendingUploadUiState,
                onBack = { navController.popBackStack() },
                onRetry = uploadViewModel::retryUpload,
                onUploadAll = uploadViewModel::uploadAll,
            )
        }

        composable(TicRoutes.Draft) {
            ProtectedRouteGuard(
                navController = navController,
                session = authUiState.session,
                allowedRoute = TicRoutes.Home,
                onRefreshStatus = authViewModel::refreshAccessStatus,
            )
            DraftScreen(
                items = pendingUploadUiState.items,
                onBack = { navController.popBackStack() },
                onEdit = { submissionId ->
                    formViewModel.startEditingSubmission(submissionId)
                    navController.navigate(TicRoutes.Form)
                },
                onDelete = uploadViewModel::deleteSubmission,
            )
        }

        composable(TicRoutes.Profile) {
            ProtectedRouteGuard(
                navController = navController,
                session = authUiState.session,
                allowedRoute = TicRoutes.Home,
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
    session: com.timindonesiacerdas.ticcollect.data.model.SessionState,
    allowedRoute: String,
    onRefreshStatus: () -> Unit,
) {
    LaunchedEffect(Unit) {
        onRefreshStatus()
    }

    LaunchedEffect(session.profile?.status, session.appAccess.requiresAppUpdate) {
        val destination = AuthViewModel.destinationFor(session)
        if (destination != allowedRoute) {
            navController.navigateClearingBackStack(destination)
        }
    }
}

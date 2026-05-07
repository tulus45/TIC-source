package com.timindonesiacerdas.ticcollect.home

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.FactCheck
import androidx.compose.material.icons.rounded.CloudUpload
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Person
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus
import com.timindonesiacerdas.ticcollect.ui.components.TicMenuCard
import com.timindonesiacerdas.ticcollect.ui.components.TicStatusPill
import com.timindonesiacerdas.ticcollect.ui.theme.TicPrimaryDark
import com.timindonesiacerdas.ticcollect.ui.theme.TicPrimarySoft

@Composable
fun HomeScreen(
    uiState: HomeUiState,
    onStartDataCollection: () -> Unit,
    onPendingUpload: () -> Unit,
    onHistory: () -> Unit,
    onProfile: () -> Unit,
) {
    val user = uiState.session.user
    val displayedEmail = uiState.session.profile?.gmail ?: user?.gmail.orEmpty()
    val displayName = uiState.session.profile?.nama
        ?.takeIf { it.isNotBlank() }
        ?: "Enumerator"
    val currentStatus = uiState.session.profile?.status ?: RegistrationStatus.NOT_REGISTERED

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Surface(
            shape = RoundedCornerShape(30.dp),
            color = MaterialTheme.colorScheme.primaryContainer,
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                TicStatusPill(status = currentStatus)
                Text(
                    text = "Welcome, $displayName",
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                )
                Text(
                    text = displayedEmail,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f),
                )
            }
        }

        TicMenuCard(
            title = "Start Data Collection",
            onActionClick = onStartDataCollection,
            actionIcon = Icons.AutoMirrored.Rounded.FactCheck,
            iconContainerColor = TicPrimarySoft,
            iconTint = TicPrimaryDark,
        )
        TicMenuCard(
            title = "Upload Data",
            onActionClick = onPendingUpload,
            actionIcon = Icons.Rounded.CloudUpload,
            iconContainerColor = TicPrimarySoft,
            iconTint = TicPrimaryDark,
        )
        TicMenuCard(
            title = "Submission History",
            onActionClick = onHistory,
            actionIcon = Icons.Rounded.History,
            iconContainerColor = TicPrimarySoft,
            iconTint = TicPrimaryDark,
        )
        TicMenuCard(
            title = "Profile",
            onActionClick = onProfile,
            actionIcon = Icons.Rounded.Person,
            iconContainerColor = TicPrimarySoft,
            iconTint = TicPrimaryDark,
        )

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp, bottom = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                text = "\u00A9 The Alus 2026",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.48f),
            )
        }
    }
}

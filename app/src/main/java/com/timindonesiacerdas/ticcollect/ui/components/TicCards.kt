package com.timindonesiacerdas.ticcollect.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus
import com.timindonesiacerdas.ticcollect.ui.theme.TicError
import com.timindonesiacerdas.ticcollect.ui.theme.TicPrimarySoft
import com.timindonesiacerdas.ticcollect.ui.theme.TicSuccess
import com.timindonesiacerdas.ticcollect.ui.theme.TicWarning

@Composable
fun TicSectionCard(
    title: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
        shape = RoundedCornerShape(24.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            content = {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                if (!subtitle.isNullOrBlank()) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                    )
                }
                content()
            },
        )
    }
}

@Composable
fun TicMenuCard(
    title: String,
    onActionClick: () -> Unit,
    modifier: Modifier = Modifier,
    actionIcon: ImageVector = Icons.AutoMirrored.Rounded.ArrowForward,
    iconContainerColor: Color = TicPrimarySoft,
    iconTint: Color = MaterialTheme.colorScheme.primary,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(24.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 18.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                )
            }
            Surface(
                color = iconContainerColor,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.clickable(onClick = onActionClick),
            ) {
                Row(
                    modifier = Modifier
                        .padding(horizontal = 14.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                ) {
                    Icon(
                        imageVector = actionIcon,
                        contentDescription = "Buka menu $title",
                        tint = iconTint,
                        modifier = Modifier.size(22.dp),
                    )
                }
            }
        }
    }
}

@Composable
fun TicStatusPill(
    status: RegistrationStatus,
    modifier: Modifier = Modifier,
) {
    val (backgroundColor, label) = when (status) {
        RegistrationStatus.NOT_REGISTERED -> TicPrimarySoft to "Belum Registrasi"
        RegistrationStatus.PENDING -> TicWarning.copy(alpha = 0.16f) to "Pending"
        RegistrationStatus.APPROVED -> TicSuccess.copy(alpha = 0.16f) to "Approved"
        RegistrationStatus.REJECTED -> TicError.copy(alpha = 0.14f) to "Rejected"
        RegistrationStatus.SUSPENDED -> TicError.copy(alpha = 0.14f) to "Suspended"
    }

    val textColor = when (status) {
        RegistrationStatus.NOT_REGISTERED -> MaterialTheme.colorScheme.primary
        RegistrationStatus.PENDING -> TicWarning
        RegistrationStatus.APPROVED -> TicSuccess
        RegistrationStatus.REJECTED -> TicError
        RegistrationStatus.SUSPENDED -> TicError
    }

    Surface(
        modifier = modifier,
        color = backgroundColor,
        shape = RoundedCornerShape(16.dp),
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            style = MaterialTheme.typography.labelLarge,
            color = textColor,
        )
    }
}

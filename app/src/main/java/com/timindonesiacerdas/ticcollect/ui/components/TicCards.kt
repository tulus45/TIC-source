package com.timindonesiacerdas.ticcollect.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.heightIn
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.data.model.RegistrationStatus
import com.timindonesiacerdas.ticcollect.data.model.isApprovedAccess

private val LocalPrimary = Color(0xFF243B6B)
private val LocalPrimarySoft = Color(0xFFDEE6F8)
private val LocalSuccess = Color(0xFF256C52)
private val LocalWarning = Color(0xFF8A5A00)
private val LocalError = Color(0xFF9D2F38)
private val LocalTextSecondary = Color(0xFF68748B)

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
    subtitle: String? = null,
    badge: String? = null,
    actionIcon: ImageVector = Icons.AutoMirrored.Rounded.ArrowForward,
    iconContainerColor: Color = LocalPrimarySoft,
    iconTint: Color? = null,
    accentColor: Color = LocalPrimary,
) {
    val resolvedIconTint = iconTint ?: accentColor
    val backgroundBrush = Brush.linearGradient(
        colors = listOf(
            accentColor.copy(alpha = 0.10f),
            MaterialTheme.colorScheme.surface,
            MaterialTheme.colorScheme.surface,
        ),
    )

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(28.dp),
        border = BorderStroke(
            width = 1.dp,
            color = accentColor.copy(alpha = 0.10f),
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Box(
            modifier = Modifier
                .background(backgroundBrush)
                .heightIn(min = 92.dp)
                .padding(horizontal = 18.dp, vertical = 14.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    Surface(
                        color = iconContainerColor,
                        shape = RoundedCornerShape(18.dp),
                    ) {
                        Box(
                            modifier = Modifier.padding(12.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = actionIcon,
                                contentDescription = "Buka menu $title",
                                tint = resolvedIconTint,
                                modifier = Modifier.size(22.dp),
                            )
                        }
                    }

                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text(
                            text = title,
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        if (!subtitle.isNullOrBlank()) {
                            Text(
                                text = subtitle,
                                style = MaterialTheme.typography.bodyMedium,
                                color = LocalTextSecondary,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                }

                Column(
                    horizontalAlignment = Alignment.End,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    if (!badge.isNullOrBlank()) {
                        Surface(
                            color = accentColor.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(999.dp),
                        ) {
                            Text(
                                text = badge,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                style = MaterialTheme.typography.labelLarge.copy(
                                    fontWeight = FontWeight.SemiBold,
                                ),
                                color = accentColor,
                            )
                        }
                    }

                    Surface(
                        color = MaterialTheme.colorScheme.surface,
                        shape = RoundedCornerShape(18.dp),
                        border = BorderStroke(
                            width = 1.dp,
                            color = accentColor.copy(alpha = 0.12f),
                        ),
                        modifier = Modifier.clickable(onClick = onActionClick),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center,
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Rounded.ArrowForward,
                                contentDescription = "Masuk ke $title",
                                tint = accentColor,
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    }
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
    val (backgroundColor, label, textColor) = when {
        status == RegistrationStatus.NOT_REGISTERED -> Triple(
            LocalPrimarySoft,
            "Belum Registrasi",
            MaterialTheme.colorScheme.primary,
        )
        status == RegistrationStatus.PENDING -> Triple(
            LocalWarning.copy(alpha = 0.16f),
            "Pending",
            LocalWarning,
        )
        status.isApprovedAccess -> Triple(
            LocalSuccess.copy(alpha = 0.16f),
            "Approved",
            LocalSuccess,
        )
        status == RegistrationStatus.REJECTED -> Triple(
            LocalError.copy(alpha = 0.14f),
            "Rejected",
            LocalError,
        )
        else -> Triple(
            LocalError.copy(alpha = 0.14f),
            "Suspended",
            LocalError,
        )
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

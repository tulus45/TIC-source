package com.timindonesiacerdas.ticcollect.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val TicLightColorScheme = lightColorScheme(
    primary = TicPrimary,
    onPrimary = TicSurface,
    primaryContainer = TicPrimarySoft,
    onPrimaryContainer = TicPrimaryDark,
    secondary = TicSecondary,
    background = TicBackground,
    onBackground = TicTextPrimary,
    surface = TicSurface,
    onSurface = TicTextPrimary,
    error = TicError,
)

@Composable
fun TicCollectTheme(
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = TicLightColorScheme,
        typography = TicTypography,
        content = content,
    )
}

package com.timindonesiacerdas.ticcollect.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.timindonesiacerdas.ticcollect.R

@Composable
fun TicAppLogo(
    size: Dp = 120.dp,
    modifier: Modifier = Modifier,
) {
    Image(
        painter = painterResource(id = R.drawable.tic_logo),
        contentDescription = "Logo Tim Indonesia Cerdas",
        modifier = modifier.size(size),
        contentScale = ContentScale.Fit,
    )
}

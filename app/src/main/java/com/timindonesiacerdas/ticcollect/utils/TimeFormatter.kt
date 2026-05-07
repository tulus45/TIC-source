package com.timindonesiacerdas.ticcollect.utils

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object TimeFormatter {
    fun nowDisplay(): String {
        val formatter = SimpleDateFormat("dd MMM yyyy HH:mm", Locale.US)
        return formatter.format(Date())
    }

    fun nowStorage(): String {
        val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssZ", Locale.US)
        return formatter.format(Date())
    }
}

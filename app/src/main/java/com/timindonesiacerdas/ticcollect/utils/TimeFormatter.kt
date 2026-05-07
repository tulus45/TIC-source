package com.timindonesiacerdas.ticcollect.utils

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object TimeFormatter {
    private fun displayFormatter() = SimpleDateFormat("dd MMM yyyy HH:mm:ss", Locale("id", "ID"))
    private fun storageFormatter() = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssZ", Locale.US)

    fun nowDisplay(): String {
        return displayFormatter().format(Date())
    }

    fun nowStorage(): String {
        return storageFormatter().format(Date())
    }

    fun storageToDisplay(value: String?): String {
        val rawValue = value?.trim().orEmpty()
        if (rawValue.isBlank()) return "-"

        return runCatching {
            val parsedDate = storageFormatter().parse(rawValue) ?: return rawValue
            displayFormatter().format(parsedDate)
        }.getOrDefault(rawValue)
    }
}

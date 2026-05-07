package com.timindonesiacerdas.ticcollect.registration

data class KtpOcrParsedResult(
    val nik: String? = null,
    val message: String,
)

object KtpOcrParser {
    fun parse(rawText: String): KtpOcrParsedResult {
        val lines = rawText
            .lines()
            .map(::normalizeSpacing)
            .filter { it.isNotBlank() }

        val nik = extractNik(lines)

        val message = if (nik.isNullOrBlank()) {
            "Foto KTP tersimpan, tetapi OCR belum menemukan NIK. Silakan isi manual."
        } else {
            "NIK berhasil diisi otomatis dari KTP. Field lain silakan isi manual."
        }

        return KtpOcrParsedResult(
            nik = nik,
            message = message,
        )
    }

    private fun extractNik(lines: List<String>): String? {
        val labeledLine = lines.firstNotNullOfOrNull { line ->
            if (!line.uppercase().contains("NIK")) return@firstNotNullOfOrNull null
            normalizeNikCandidate(substringAfterLabelIgnoreCase(line, "NIK"))
        }
        if (!labeledLine.isNullOrBlank() && labeledLine.length >= 16) {
            return labeledLine.take(16)
        }

        return lines.firstNotNullOfOrNull { line ->
            val digits = normalizeNikCandidate(line)
            if (digits.length >= 16) digits.take(16) else null
        }
    }

    private fun normalizeNikCandidate(value: String): String {
        return value.uppercase()
            .replace('O', '0')
            .replace('D', '0')
            .replace('I', '1')
            .replace('L', '1')
            .replace('|', '1')
            .replace('B', '8')
            .filter(Char::isDigit)
    }

    private fun cleanFieldValue(value: String): String {
        return normalizeSpacing(
            value
                .removePrefix(":")
                .removePrefix("-")
                .trim(),
        )
    }

    private fun substringAfterLabelIgnoreCase(
        value: String,
        label: String,
    ): String {
        val startIndex = value.uppercase().indexOf(label.uppercase())
        if (startIndex < 0) return value
        return value.substring(startIndex + label.length)
    }

    private fun normalizeSpacing(value: String): String {
        return value.replace(Regex("\\s+"), " ").trim()
    }
}

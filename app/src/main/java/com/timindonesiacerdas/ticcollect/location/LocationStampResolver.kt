package com.timindonesiacerdas.ticcollect.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.os.Build
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
import androidx.core.os.CancellationSignal
import com.timindonesiacerdas.ticcollect.utils.TimeFormatter
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

data class LocationStamp(
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Float?,
    val timestampDisplay: String,
    val address: String,
)

class LocationStampException(
    message: String,
    cause: Throwable? = null,
) : IllegalStateException(message, cause)

suspend fun resolveCurrentLocationStamp(context: Context): LocationStamp {
    if (!context.hasLocationPermission()) {
        throw LocationStampException("Izin lokasi diperlukan untuk memberi GPS stamp pada evidence.")
    }

    val location = resolveCurrentLocation(context)
    val address = resolveAddress(
        context = context,
        latitude = location.latitude,
        longitude = location.longitude,
    )

    return LocationStamp(
        latitude = location.latitude,
        longitude = location.longitude,
        accuracyMeters = if (location.hasAccuracy()) location.accuracy else null,
        timestampDisplay = TimeFormatter.nowDisplay(),
        address = address.ifBlank { "Alamat belum tersedia" },
    )
}

fun Context.hasLocationPermission(): Boolean {
    return ContextCompat.checkSelfPermission(
        this,
        Manifest.permission.ACCESS_FINE_LOCATION,
    ) == PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
}

private suspend fun resolveCurrentLocation(context: Context): Location {
    val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        ?: throw LocationStampException("Location manager tidak tersedia di perangkat ini.")

    val provider = listOf(
        LocationManager.GPS_PROVIDER,
        LocationManager.NETWORK_PROVIDER,
        LocationManager.PASSIVE_PROVIDER,
    ).firstOrNull { candidate ->
        runCatching { locationManager.isProviderEnabled(candidate) }.getOrDefault(false)
    } ?: throw LocationStampException("Aktifkan GPS atau jaringan lokasi terlebih dahulu.")

    return suspendCancellableCoroutine { continuation ->
        val cancellationSignal = CancellationSignal()
        continuation.invokeOnCancellation {
            cancellationSignal.cancel()
        }

        LocationManagerCompat.getCurrentLocation(
            locationManager,
            provider,
            cancellationSignal,
            ContextCompat.getMainExecutor(context),
        ) { location ->
            if (location != null) {
                continuation.resume(location)
            } else {
                continuation.resumeWithException(
                    LocationStampException("Lokasi belum berhasil didapatkan. Coba refresh GPS lagi."),
                )
            }
        }
    }
}

private suspend fun resolveAddress(
    context: Context,
    latitude: Double,
    longitude: Double,
): String {
    if (!Geocoder.isPresent()) return ""

    val geocoder = Geocoder(context, Locale("id", "ID"))

    return runCatching {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            suspendCancellableCoroutine { continuation ->
                geocoder.getFromLocation(latitude, longitude, 1) { addresses ->
                    val firstAddress = addresses.firstOrNull()
                    continuation.resume(formatAddress(firstAddress))
                }
            }
        } else {
            @Suppress("DEPRECATION")
            withContext(Dispatchers.IO) {
                val address = geocoder.getFromLocation(latitude, longitude, 1)?.firstOrNull()
                formatAddress(address)
            }
        }
    }.getOrDefault("")
}

private fun formatAddress(address: android.location.Address?): String {
    if (address == null) return ""

    val line0 = address.getAddressLine(0)?.trim().orEmpty()
    if (line0.isNotBlank()) return line0

    return listOfNotNull(
        address.subLocality?.takeIf { it.isNotBlank() },
        address.locality?.takeIf { it.isNotBlank() },
        address.subAdminArea?.takeIf { it.isNotBlank() },
        address.adminArea?.takeIf { it.isNotBlank() },
    ).joinToString(", ")
}

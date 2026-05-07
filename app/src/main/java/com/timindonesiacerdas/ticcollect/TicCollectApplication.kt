package com.timindonesiacerdas.ticcollect

import android.app.Application
import com.timindonesiacerdas.ticcollect.data.local.InMemorySessionStore

class TicCollectApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        InMemorySessionStore.initialize(this)
    }
}

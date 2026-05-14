package com.timindonesiacerdas.ticcollect.data.local.db

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

@Dao
interface SessionDao {
    @Query("SELECT * FROM session_state WHERE id = 1")
    fun observeSession(): Flow<SessionEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: SessionEntity)

    @Query("DELETE FROM session_state")
    suspend fun clear()
}

@Dao
interface RegistrationDraftDao {
    @Query("SELECT * FROM registration_drafts WHERE uid = :uid LIMIT 1")
    fun observeByUid(uid: String): Flow<RegistrationDraftEntity?>

    @Query("SELECT * FROM registration_drafts WHERE uid = :uid LIMIT 1")
    suspend fun getByUid(uid: String): RegistrationDraftEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: RegistrationDraftEntity)

    @Query("DELETE FROM registration_drafts WHERE uid = :uid")
    suspend fun deleteByUid(uid: String)

    @Query(
        """
        UPDATE registration_drafts
        SET status = :status,
            rejectionReason = :rejectionReason,
            updatedAt = :updatedAt
        WHERE uid = :uid
        """,
    )
    suspend fun updateStatus(
        uid: String,
        status: String,
        rejectionReason: String?,
        updatedAt: String,
    )
}

@Database(
    entities = [
        SessionEntity::class,
        RegistrationDraftEntity::class,
    ],
    version = 3,
    exportSchema = false,
)
abstract class TicLocalDatabase : RoomDatabase() {
    abstract fun sessionDao(): SessionDao
    abstract fun registrationDraftDao(): RegistrationDraftDao
}

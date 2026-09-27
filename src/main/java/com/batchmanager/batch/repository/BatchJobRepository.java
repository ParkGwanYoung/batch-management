package com.batchmanager.batch.repository;

import com.batchmanager.batch.domain.BatchJob;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BatchJobRepository extends JpaRepository<BatchJob, Long> {

    Page<BatchJob> findByNameContaining(
            String keyword,
            Pageable pageable
    );

    List<BatchJob> findByIsActiveTrue();

    long countByIsActiveTrue();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT j
            FROM BatchJob j
            WHERE j.id = :id
            """)
    Optional<BatchJob> findByIdForUpdate(@Param("id") Long id);
}
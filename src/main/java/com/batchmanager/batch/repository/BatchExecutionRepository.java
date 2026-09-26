package com.batchmanager.batch.repository;

import com.batchmanager.batch.domain.BatchExecution;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BatchExecutionRepository extends JpaRepository<BatchExecution, Long> {

    @Query("""
        SELECT e
        FROM BatchExecution e
        JOIN FETCH e.batchJob
        WHERE e.batchJob.id = :batchJobId
    """)
    Page<BatchExecution> findExecutions(
            @Param("batchJobId") Long batchJobId,
            Pageable pageable
    );

    Page<BatchExecution> findByBatchJobIdAndStatus(
            Long batchJobId,
            BatchExecution.ExecutionStatus status,
            Pageable pageable
    );

    @Query("""
        SELECT e
        FROM BatchExecution e
        JOIN FETCH e.batchJob
        WHERE e.id = :id
    """)
    Optional<BatchExecution> findByIdWithBatchJob(
            @Param("id") Long id
    );

    Optional<BatchExecution> findTopByBatchJobIdAndTriggerTypeOrderByStartTimeDesc(
            Long batchJobId,
            String triggerType
    );

    boolean existsByBatchJobIdAndStatus(
            Long batchJobId,
            BatchExecution.ExecutionStatus status
    );

    @Query("""
    SELECT e.status, COUNT(e.id)
    FROM BatchExecution e
    GROUP BY e.status
    """)
    List<Object[]> countGroupByStatus();
}

package com.batchmanager.batch.repository;

import com.batchmanager.batch.domain.BatchExecutionError;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BatchExecutionErrorRepository
        extends JpaRepository<BatchExecutionError, Long> {

    List<BatchExecutionError> findByBatchExecutionId(Long batchExecutionId);
}
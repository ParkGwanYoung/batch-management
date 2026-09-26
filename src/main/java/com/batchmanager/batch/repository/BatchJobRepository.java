package com.batchmanager.batch.repository;

import com.batchmanager.batch.domain.BatchJob;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BatchJobRepository extends JpaRepository<BatchJob, Long> {

    Page<BatchJob> findByNameContaining(String keyword, Pageable pageable);
    List<BatchJob> findByIsActiveTrue();

    long countByIsActiveTrue();
}
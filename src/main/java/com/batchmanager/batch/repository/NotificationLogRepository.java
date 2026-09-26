package com.batchmanager.batch.repository;

import com.batchmanager.batch.domain.NotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationLogRepository
        extends JpaRepository<NotificationLog, Long> {

    List<NotificationLog> findByBatchExecutionIdOrderBySentAtDesc(
            Long batchExecutionId
    );
}
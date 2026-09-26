package com.batchmanager.batch.dto;

import com.batchmanager.batch.domain.BatchExecution;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class BatchExecutionResponse {

    private final Long id;
    private final Long batchJobId;
    private final String batchJobName;
    private final String status;
    private final LocalDateTime startTime;
    private final LocalDateTime endTime;
    private final Long successCount;
    private final Long failCount;
    private final String triggerType;

    public BatchExecutionResponse(BatchExecution execution) {
        this.id = execution.getId();
        this.batchJobId = execution.getBatchJob().getId();
        this.batchJobName = execution.getBatchJob().getName();
        this.status = execution.getStatus().name();
        this.startTime = execution.getStartTime();
        this.endTime = execution.getEndTime();
        this.successCount = execution.getSuccessCount();
        this.failCount = execution.getFailCount();
        this.triggerType = execution.getTriggerType();
    }
}
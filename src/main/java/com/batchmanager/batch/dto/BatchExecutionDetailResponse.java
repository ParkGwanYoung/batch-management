package com.batchmanager.batch.dto;

import com.batchmanager.batch.domain.BatchExecution;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class BatchExecutionDetailResponse {

    private final Long id;
    private final Long batchJobId;
    private final String batchJobName;
    private final String status;
    private final LocalDateTime startTime;
    private final LocalDateTime endTime;
    private final Long successCount;
    private final Long failCount;
    private final String logMessage;
    private final String triggerType;
    private final Long executedById;

    public BatchExecutionDetailResponse(BatchExecution execution) {
        this.id = execution.getId();
        this.batchJobId = execution.getBatchJob().getId();
        this.batchJobName = execution.getBatchJob().getName();
        this.status = execution.getStatus().name();
        this.startTime = execution.getStartTime();
        this.endTime = execution.getEndTime();
        this.successCount = execution.getSuccessCount();
        this.failCount = execution.getFailCount();
        this.logMessage = execution.getLogMessage();
        this.triggerType = execution.getTriggerType();

        this.executedById = execution.getExecutedBy() != null
                ? execution.getExecutedBy().getId()
                : null;
    }
}
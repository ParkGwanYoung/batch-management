package com.batchmanager.batch.dto;

import com.batchmanager.batch.domain.BatchJob;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class BatchJobResponse {

    private final Long id;
    private final String name;
    private final String description;
    private final String cronExpression;
    private final Boolean isActive;
    private final LocalDateTime createDt;
    private final LocalDateTime auditDt;

    public BatchJobResponse(BatchJob batchJob) {
        this.id = batchJob.getId();
        this.name = batchJob.getName();
        this.description = batchJob.getDescription();
        this.cronExpression = batchJob.getCronExpression();
        this.isActive = batchJob.getIsActive();
        this.createDt = batchJob.getCreateDt();
        this.auditDt = batchJob.getAuditDt();
    }
}
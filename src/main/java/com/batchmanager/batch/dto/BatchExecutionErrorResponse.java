package com.batchmanager.batch.dto;

import com.batchmanager.batch.domain.BatchExecutionError;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class BatchExecutionErrorResponse {

    private final Long id;
    private final Long batchExecutionId;
    private final Long itemId;
    private final String exceptionType;
    private final String errorMessage;
    private final LocalDateTime createdAt;

    public BatchExecutionErrorResponse(BatchExecutionError error) {
        this.id = error.getId();
        this.batchExecutionId =
                error.getBatchExecution().getId();
        this.itemId = error.getItemId();
        this.exceptionType = error.getExceptionType();
        this.errorMessage = error.getErrorMessage();
        this.createdAt = error.getCreatedAt();
    }
}
package com.batchmanager.batch.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "batch_execution_error")
@Getter
@NoArgsConstructor
public class BatchExecutionError {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_execution_id", nullable = false)
    private BatchExecution batchExecution;

    @Column(name = "item_id")
    private Long itemId;

    @Column(name = "exception_type", length = 200)
    private String exceptionType;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public BatchExecutionError(
            BatchExecution batchExecution,
            Long itemId,
            Throwable throwable
    ) {
        this.batchExecution = batchExecution;
        this.itemId = itemId;
        this.exceptionType = throwable.getClass().getSimpleName();
        this.errorMessage = throwable.getMessage();
        this.createdAt = LocalDateTime.now();
    }
}
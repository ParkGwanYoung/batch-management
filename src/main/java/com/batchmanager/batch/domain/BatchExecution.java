package com.batchmanager.batch.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "batch_execution")
@Getter
@Setter
@NoArgsConstructor
public class BatchExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_job_id", nullable = false)
    private BatchJob batchJob;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ExecutionStatus status;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "success_count")
    private Long successCount;

    @Column(name = "fail_count")
    private Long failCount;

    @Lob
    @Column(name = "log_message")
    private String logMessage;

    @Column(name = "trigger_type", length = 10)
    private String triggerType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "executed_by")
    private Admin executedBy;

    public enum ExecutionStatus {
        WAITING, RUNNING, SUCCESS, FAILED
    }
}

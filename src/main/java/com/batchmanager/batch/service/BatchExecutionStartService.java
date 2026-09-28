package com.batchmanager.batch.service;

import com.batchmanager.batch.domain.BatchExecution;
import com.batchmanager.batch.domain.BatchJob;
import com.batchmanager.batch.repository.BatchExecutionRepository;
import com.batchmanager.batch.repository.BatchJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class BatchExecutionStartService {

    private final BatchExecutionRepository batchExecutionRepository;
    private final BatchJobRepository batchJobRepository;

    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED
    )
    public BatchExecution start(Long executionId) {
        Long batchJobId = batchExecutionRepository
                .findBatchJobIdByExecutionId(executionId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "실행 이력을 찾을 수 없습니다. id=" + executionId
                ));

        lockActiveJob(batchJobId);

        BatchExecution execution = batchExecutionRepository
                .findByIdWithBatchJob(executionId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "실행 이력을 찾을 수 없습니다. id=" + executionId
                ));

        if (execution.getStatus() != BatchExecution.ExecutionStatus.WAITING) {
            throw new IllegalStateException(
                    "대기 상태의 실행 이력만 실행할 수 있습니다."
                            + " executionId=" + executionId
                            + ", status=" + execution.getStatus()
            );
        }

        ensureNotRunning(batchJobId);
        markRunning(execution);
        return execution;
    }

    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED
    )
    public BatchExecution startScheduled(
            Long batchJobId,
            String expectedCronExpression
    ) {
        BatchJob job = lockActiveJob(batchJobId);

        if (!Objects.equals(job.getCronExpression(), expectedCronExpression)) {
            throw new IllegalStateException(
                    "Cron이 변경되어 이전 예약 실행을 건너뜁니다."
            );
        }

        ensureNotRunning(batchJobId);

        // 실행권을 확보한 경우에만 예약 실행 이력을 생성한다.
        BatchExecution execution = new BatchExecution();
        execution.setBatchJob(job);
        execution.setTriggerType("SCHEDULE");
        markRunning(execution);

        return batchExecutionRepository.save(execution);
    }

    private BatchJob lockActiveJob(Long batchJobId) {
        BatchJob job = batchJobRepository.findByIdForUpdate(batchJobId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "배치를 찾을 수 없습니다. id=" + batchJobId
                ));

        if (!Boolean.TRUE.equals(job.getIsActive())) {
            throw new IllegalStateException(
                    "비활성화된 배치는 실행할 수 없습니다."
            );
        }
        return job;
    }

    private void ensureNotRunning(Long batchJobId) {
        boolean running = batchExecutionRepository.existsByBatchJobIdAndStatus(
                batchJobId,
                BatchExecution.ExecutionStatus.RUNNING
        );

        if (running) {
            throw new IllegalStateException(
                    "이미 실행 중인 배치입니다. batchJobId=" + batchJobId
            );
        }
    }

    private void markRunning(BatchExecution execution) {
        execution.setStatus(BatchExecution.ExecutionStatus.RUNNING);
        execution.setStartTime(LocalDateTime.now());
        execution.setEndTime(null);
        execution.setSuccessCount(0L);
        execution.setFailCount(0L);
        execution.setLogMessage(null);
    }
}


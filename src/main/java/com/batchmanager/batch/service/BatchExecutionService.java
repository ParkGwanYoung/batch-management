package com.batchmanager.batch.service;

import com.batchmanager.batch.domain.BatchExecution;
import com.batchmanager.batch.domain.BatchJob;
import com.batchmanager.batch.dto.BatchExecutionCreateRequest;
import com.batchmanager.batch.dto.BatchExecutionDetailResponse;
import com.batchmanager.batch.dto.BatchExecutionResponse;
import com.batchmanager.batch.dto.BatchExecutionErrorResponse;
import com.batchmanager.batch.repository.BatchExecutionErrorRepository;
import com.batchmanager.batch.repository.BatchExecutionRepository;
import com.batchmanager.batch.repository.BatchJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.batch.core.job.Job;
import org.springframework.batch.core.job.JobExecution;
import org.springframework.batch.core.job.parameters.JobParameters;
import org.springframework.batch.core.job.parameters.JobParametersBuilder;
import org.springframework.batch.core.launch.JobOperator;
import org.springframework.batch.core.step.StepExecution;

import java.util.List;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class BatchExecutionService {

    private final BatchExecutionRepository batchExecutionRepository;
    private final BatchJobRepository batchJobRepository;
    private final JobOperator jobOperator;
    private final Job batchJob;
    private final BatchExecutionErrorRepository batchExecutionErrorRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public Page<BatchExecutionResponse> getExecutions(
            Long batchJobId,
            Pageable pageable
    ) {
        Page<BatchExecution> executions =
                batchExecutionRepository.findExecutions(
                        batchJobId,
                        pageable
                );

        return executions.map(BatchExecutionResponse::new);
    }

    @Transactional(readOnly = true)
    public BatchExecutionDetailResponse getExecution(Long id) {

        BatchExecution execution = batchExecutionRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "실행 이력을 찾을 수 없습니다. id=" + id
                        ));

        return new BatchExecutionDetailResponse(execution);
    }

    @Transactional
    public BatchExecutionDetailResponse createExecution(
            BatchExecutionCreateRequest request
    ) {
        BatchJob batchJob = batchJobRepository.findById(request.getBatchJobId())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "배치를 찾을 수 없습니다. id=" + request.getBatchJobId()
                        ));

        BatchExecution execution = new BatchExecution();
        execution.setBatchJob(batchJob);
        execution.setStatus(BatchExecution.ExecutionStatus.WAITING);
        execution.setStartTime(LocalDateTime.now());
        execution.setTriggerType("MANUAL");
        execution.setSuccessCount(0L);
        execution.setFailCount(0L);

        BatchExecution savedExecution =
                batchExecutionRepository.save(execution);

        return new BatchExecutionDetailResponse(savedExecution);
    }

    public BatchExecutionDetailResponse execute(Long executionId) {

        BatchExecution execution =
                batchExecutionRepository.findByIdWithBatchJob(executionId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "실행 이력을 찾을 수 없습니다. id=" + executionId
                        ));

        boolean running =
                batchExecutionRepository.existsByBatchJobIdAndStatus(
                        execution.getBatchJob().getId(),
                        BatchExecution.ExecutionStatus.RUNNING
                );

        if (running) {
            throw new IllegalStateException(
                    "이미 실행 중인 배치입니다. batchJobId="
                            + execution.getBatchJob().getId()
            );
        }

        // 실행 시작 상태 초기화
        execution.setStatus(BatchExecution.ExecutionStatus.RUNNING);
        execution.setStartTime(LocalDateTime.now());
        execution.setSuccessCount(0L);
        execution.setFailCount(0L);

        batchExecutionRepository.save(execution);

        try {
            JobParameters jobParameters = new JobParametersBuilder()
                    .addLong("executionId", execution.getId())
                    .addLong("batchJobId", execution.getBatchJob().getId())
                    .toJobParameters();

            JobExecution jobExecution =
                    jobOperator.start(batchJob, jobParameters);

            StepExecution stepExecution =
                    jobExecution.getStepExecutions()
                            .stream()
                            .findFirst()
                            .orElseThrow(() ->
                                    new IllegalStateException(
                                            "Step 실행 정보를 찾을 수 없습니다."
                                    ));

            long readCount = stepExecution.getReadCount();
            long writeCount = stepExecution.getWriteCount();
            long skipCount = stepExecution.getSkipCount();

            if (jobExecution.getStatus().isUnsuccessful()) {

                execution.setStatus(
                        BatchExecution.ExecutionStatus.FAILED
                );

            } else {

                execution.setStatus(
                        BatchExecution.ExecutionStatus.SUCCESS
                );
            }

            execution.setSuccessCount(writeCount);
            execution.setFailCount(skipCount);

            execution.setEndTime(LocalDateTime.now());

            execution.setLogMessage(
                    "Spring Batch 실행 완료"
                            + " / 읽기: " + readCount
                            + " / 쓰기: " + writeCount
                            + " / Skip: " + skipCount
            );

        } catch (Exception e) {

            execution.setStatus(
                    BatchExecution.ExecutionStatus.FAILED
            );

            execution.setSuccessCount(0L);
            execution.setFailCount(0L);

            execution.setEndTime(LocalDateTime.now());

            execution.setLogMessage(
                    "Spring Batch 실행 실패: " + e.getMessage()
            );
        }

        batchExecutionRepository.save(execution);

        notificationService.createBatchResultNotification(execution);

        return new BatchExecutionDetailResponse(execution);
    }

    @Transactional(readOnly = true)
    public List<BatchExecutionErrorResponse> getExecutionErrors(
            Long executionId
    ) {
        return batchExecutionErrorRepository
                .findByBatchExecutionId(executionId)
                .stream()
                .map(BatchExecutionErrorResponse::new)
                .toList();
    }

    public void executeScheduled(BatchJob batchJob) {

        BatchExecution execution = new BatchExecution();

        execution.setBatchJob(batchJob);
        execution.setStatus(BatchExecution.ExecutionStatus.WAITING);
        execution.setStartTime(LocalDateTime.now());
        execution.setTriggerType("SCHEDULE");
        execution.setSuccessCount(0L);
        execution.setFailCount(0L);

        BatchExecution savedExecution =
                batchExecutionRepository.save(execution);

        execute(savedExecution.getId());
    }

}
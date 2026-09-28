package com.batchmanager.batch.service;

import com.batchmanager.batch.domain.BatchExecution;
import com.batchmanager.batch.domain.BatchJob;
import com.batchmanager.batch.dto.BatchExecutionCreateRequest;
import com.batchmanager.batch.dto.BatchExecutionDetailResponse;
import com.batchmanager.batch.dto.BatchExecutionErrorResponse;
import com.batchmanager.batch.dto.BatchExecutionResponse;
import com.batchmanager.batch.repository.BatchExecutionErrorRepository;
import com.batchmanager.batch.repository.BatchExecutionRepository;
import com.batchmanager.batch.repository.BatchJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.job.Job;
import org.springframework.batch.core.job.JobExecution;
import org.springframework.batch.core.job.parameters.JobParameters;
import org.springframework.batch.core.job.parameters.JobParametersBuilder;
import org.springframework.batch.core.launch.JobOperator;
import org.springframework.batch.core.step.StepExecution;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BatchExecutionService {

    private final BatchExecutionRepository batchExecutionRepository;
    private final BatchJobRepository batchJobRepository;
    private final BatchExecutionErrorRepository batchExecutionErrorRepository;
    private final BatchExecutionStartService batchExecutionStartService;
    private final NotificationService notificationService;
    private final JobOperator jobOperator;
    private final Job batchJob;

    @Transactional(readOnly = true)
    public Page<BatchExecutionResponse> getExecutions(
            Long batchJobId,
            Pageable pageable
    ) {
        return batchExecutionRepository
                .findExecutions(batchJobId, pageable)
                .map(BatchExecutionResponse::new);
    }

    @Transactional(readOnly = true)
    public BatchExecutionDetailResponse getExecution(Long id) {
        BatchExecution execution = batchExecutionRepository
                .findByIdWithBatchJob(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "실행 이력을 찾을 수 없습니다. id=" + id
                ));

        return new BatchExecutionDetailResponse(execution);
    }

    @Transactional
    public BatchExecutionDetailResponse createExecution(
            BatchExecutionCreateRequest request
    ) {
        if (request.getBatchJobId() == null) {
            throw new IllegalArgumentException(
                    "배치 ID는 필수입니다."
            );
        }

        BatchJob targetJob = batchJobRepository
                .findById(request.getBatchJobId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "배치를 찾을 수 없습니다. id="
                                + request.getBatchJobId()
                ));

        validateActive(targetJob);

        BatchExecution execution =
                createWaitingExecution(targetJob, "MANUAL");

        BatchExecution savedExecution =
                batchExecutionRepository.save(execution);

        return new BatchExecutionDetailResponse(savedExecution);
    }

    public BatchExecutionDetailResponse execute(Long executionId) {
        BatchExecution execution = batchExecutionStartService.start(executionId);
        return executeStarted(execution);
    }

    // 시작 상태 커밋 이후 실행한다. 배치 전체를 하나의 트랜잭션으로 감싸지 않는다.
    private BatchExecutionDetailResponse executeStarted(BatchExecution execution) {
        Long executionId = execution.getId();

        try {
            JobParameters jobParameters = new JobParametersBuilder()
                    .addLong("executionId", execution.getId())
                    .addLong(
                            "batchJobId",
                            execution.getBatchJob().getId()
                    )
                    .toJobParameters();

            // 현재 프로젝트의 동기 실행 설정을 전제로 한다.
            JobExecution jobExecution =
                    jobOperator.start(batchJob, jobParameters);

            long readCount = jobExecution.getStepExecutions()
                    .stream()
                    .mapToLong(StepExecution::getReadCount)
                    .sum();

            long writeCount = jobExecution.getStepExecutions()
                    .stream()
                    .mapToLong(StepExecution::getWriteCount)
                    .sum();

            long skipCount = jobExecution.getStepExecutions()
                    .stream()
                    .mapToLong(StepExecution::getSkipCount)
                    .sum();

            boolean completed =
                    "COMPLETED".equals(jobExecution.getStatus().name());

            execution.setStatus(
                    completed
                            ? BatchExecution.ExecutionStatus.SUCCESS
                            : BatchExecution.ExecutionStatus.FAILED
            );

            execution.setSuccessCount(writeCount);
            execution.setFailCount(skipCount);
            execution.setEndTime(LocalDateTime.now());

            String resultMessage =
                    "Spring Batch 실행 결과"
                            + " / 상태: " + jobExecution.getStatus()
                            + " / 읽기: " + readCount
                            + " / 쓰기: " + writeCount
                            + " / Skip: " + skipCount;

            if (!completed) {
                String failureMessage = jobExecution
                        .getAllFailureExceptions()
                        .stream()
                        .map(this::describeException)
                        .distinct()
                        .collect(Collectors.joining(" | "));

                if (!failureMessage.isBlank()) {
                    resultMessage += " / 원인: " + failureMessage;
                }
            }

            execution.setLogMessage(resultMessage);

        } catch (Exception e) {
            log.error(
                    "배치 실행 요청 처리 실패. executionId={}",
                    executionId,
                    e
            );

            execution.setStatus(BatchExecution.ExecutionStatus.FAILED);
            execution.setEndTime(LocalDateTime.now());

            // JobExecution 결과를 확보하지 못한 경우 건수를 확정하지 않는다.
            execution.setSuccessCount(null);
            execution.setFailCount(null);

            execution.setLogMessage(
                    "Spring Batch 실행 결과 확인 실패: "
                            + describeException(e)
                            + " / 처리 건수는 Spring Batch 메타데이터 확인 필요"
            );
        }

        batchExecutionRepository.save(execution);

        try {
            notificationService.createBatchResultNotification(execution);
        } catch (Exception e) {
            // 알림 처리 실패가 이미 저장된 배치 결과를 바꾸지 않도록 분리한다.
            log.error(
                    "배치 결과 알림 처리 실패. executionId={}",
                    executionId,
                    e
            );
        }

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

    public void executeScheduled(BatchJob targetJob) {
        BatchExecution execution = batchExecutionStartService.startScheduled(
                targetJob.getId(),
                targetJob.getCronExpression()
        );
        executeStarted(execution);
    }

    private BatchExecution createWaitingExecution(
            BatchJob targetJob,
            String triggerType
    ) {
        BatchExecution execution = new BatchExecution();

        execution.setBatchJob(targetJob);
        execution.setStatus(BatchExecution.ExecutionStatus.WAITING);
        execution.setTriggerType(triggerType);
        execution.setSuccessCount(0L);
        execution.setFailCount(0L);

        // 실제 시작 시각은 실행권 확보 시 기록한다.
        execution.setStartTime(null);
        execution.setEndTime(null);

        return execution;
    }

    private void validateActive(BatchJob targetJob) {
        if (!Boolean.TRUE.equals(targetJob.getIsActive())) {
            throw new IllegalStateException(
                    "비활성화된 배치는 실행할 수 없습니다."
            );
        }
    }

    private String describeException(Throwable throwable) {
        String message = throwable.getMessage();

        return throwable.getClass().getSimpleName()
                + (message == null ? "" : ": " + message);
    }
}

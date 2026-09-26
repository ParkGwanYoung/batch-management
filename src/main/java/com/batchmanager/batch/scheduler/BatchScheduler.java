package com.batchmanager.batch.scheduler;

import com.batchmanager.batch.domain.BatchExecution;
import com.batchmanager.batch.domain.BatchJob;
import com.batchmanager.batch.repository.BatchExecutionRepository;
import com.batchmanager.batch.repository.BatchJobRepository;
import com.batchmanager.batch.service.BatchExecutionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class BatchScheduler {

    private final BatchJobRepository batchJobRepository;
    private final BatchExecutionRepository batchExecutionRepository;
    private final BatchExecutionService batchExecutionService;

//    @Scheduled(fixedDelay = 1000)
    public void schedule() {

        List<BatchJob> batchJobs =
                batchJobRepository.findByIsActiveTrue();

        LocalDateTime now = LocalDateTime.now();

        for (BatchJob batchJob : batchJobs) {

            if (isScheduledTime(batchJob, now)) {
                executeBatch(batchJob);
            }
        }
    }

    private boolean isScheduledTime(
            BatchJob batchJob,
            LocalDateTime now
    ) {

        CronExpression cronExpression;

        try {
            cronExpression =
                    CronExpression.parse(
                            batchJob.getCronExpression()
                    );

        } catch (IllegalArgumentException e) {

            log.warn(
                    "잘못된 Cron 표현식입니다. batchJobId={}, cron={}",
                    batchJob.getId(),
                    batchJob.getCronExpression()
            );

            return false;
        }

        /*
         * 현재 초를 기준으로 바로 이전 시점부터
         * 다음 Cron 실행 시각을 계산한다.
         *
         * 예:
         * 현재 10:00:01
         * Cron = 0 * * * * *
         * → 다음 실행 시각 = 10:01:00
         *
         * 현재 10:00:00
         * → 다음 실행 시각 = 10:00:00
         */
        LocalDateTime baseTime =
                now.withNano(0)
                        .minusSeconds(1);

        LocalDateTime scheduledTime =
                cronExpression.next(baseTime);

        if (scheduledTime == null) {

            log.warn(
                    "다음 Cron 실행 시각을 계산할 수 없습니다. "
                            + "batchJobId={}, cron={}",
                    batchJob.getId(),
                    batchJob.getCronExpression()
            );

            return false;
        }

        if (scheduledTime.isAfter(now)) {
            return false;
        }

        Optional<BatchExecution> lastExecution =
                batchExecutionRepository
                        .findTopByBatchJobIdAndTriggerTypeOrderByStartTimeDesc(
                                batchJob.getId(),
                                "SCHEDULE"
                        );

        /*
         * 이미 이번 Cron 시점에 실행했다면
         * 다시 실행하지 않는다.
         */
        if (lastExecution.isPresent()) {

            LocalDateTime lastExecutionTime =
                    lastExecution.get().getStartTime();

            if (lastExecutionTime != null
                    && !lastExecutionTime.isBefore(scheduledTime)) {

                log.debug(
                        "이미 처리된 스케줄입니다. "
                                + "batchJobId={}, scheduledTime={}, lastExecutionTime={}",
                        batchJob.getId(),
                        scheduledTime,
                        lastExecutionTime
                );

                return false;
            }
        }

        return true;
    }

    private void executeBatch(BatchJob batchJob) {

        try {

            log.info(
                    "스케줄 배치 실행 시작. "
                            + "batchJobId={}, name={}, cron={}",
                    batchJob.getId(),
                    batchJob.getName(),
                    batchJob.getCronExpression()
            );

            batchExecutionService.executeScheduled(batchJob);

            log.info(
                    "스케줄 배치 실행 요청 완료. "
                            + "batchJobId={}, name={}",
                    batchJob.getId(),
                    batchJob.getName()
            );

        } catch (IllegalStateException e) {

            log.info(
                    "스케줄 실행 건너뜀. "
                            + "batchJobId={}, name={}, reason={}",
                    batchJob.getId(),
                    batchJob.getName(),
                    e.getMessage()
            );

        } catch (Exception e) {

            log.error(
                    "스케줄 배치 실행 중 예상하지 못한 오류 발생. "
                            + "batchJobId={}, name={}",
                    batchJob.getId(),
                    batchJob.getName(),
                    e
            );
        }
    }
}
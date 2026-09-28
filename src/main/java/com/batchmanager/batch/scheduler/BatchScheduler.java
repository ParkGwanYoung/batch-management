package com.batchmanager.batch.scheduler;

import com.batchmanager.batch.domain.BatchJob;
import com.batchmanager.batch.repository.BatchJobRepository;
import com.batchmanager.batch.service.BatchExecutionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Component
@ConditionalOnProperty(
        prefix = "app.scheduler",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = false
)
public class BatchScheduler {

    private final BatchJobRepository batchJobRepository;
    private final BatchExecutionService batchExecutionService;
    private final Clock clock;
    private final Map<Long, ScheduleState> schedules = new HashMap<>();

    @Autowired
    public BatchScheduler(
            BatchJobRepository batchJobRepository,
            BatchExecutionService batchExecutionService,
            @Value("${app.scheduler.zone:Asia/Seoul}") String zone
    ) {
        this(
                batchJobRepository,
                batchExecutionService,
                Clock.system(ZoneId.of(zone))
        );
    }

    // 테스트에서 실제 대기 없이 시간을 이동시킬 수 있도록 Clock을 주입한다.
    BatchScheduler(
            BatchJobRepository batchJobRepository,
            BatchExecutionService batchExecutionService,
            Clock clock
    ) {
        this.batchJobRepository = batchJobRepository;
        this.batchExecutionService = batchExecutionService;
        this.clock = clock;
    }

    @Scheduled(
            fixedDelayString = "${app.scheduler.poll-delay-ms:1000}",
            initialDelayString = "${app.scheduler.initial-delay-ms:10000}"
    )
    public synchronized void schedule() {
        List<BatchJob> activeJobs = batchJobRepository.findByIsActiveTrue();
        Set<Long> activeIds = activeJobs.stream()
                .map(BatchJob::getId)
                .collect(Collectors.toSet());

        schedules.keySet().removeIf(id -> !activeIds.contains(id));

        for (BatchJob job : activeJobs) {
            try {
                checkAndExecute(job);
            } catch (Exception e) {
                log.error("스케줄 확인 실패. batchJobId={}", job.getId(), e);
            }
        }
    }

    private void checkAndExecute(BatchJob job) {
        ZonedDateTime now = ZonedDateTime.now(clock);
        ScheduleState state = schedules.get(job.getId());

        if (state == null
                || !state.expression().equals(job.getCronExpression())) {
            CronExpression cron = CronExpression.parse(job.getCronExpression());
            state = new ScheduleState(job.getCronExpression(), cron, cron.next(now));
            schedules.put(job.getId(), state);

            log.info(
                    "예약 일정 반영. batchJobId={}, cron={}, nextRun={}",
                    job.getId(), state.expression(), state.nextRun()
            );
        }

        if (state.nextRun() == null || now.isBefore(state.nextRun())) {
            return;
        }

        try {
            log.info(
                    "예약 실행 요청. batchJobId={}, scheduledAt={}, requestedAt={}",
                    job.getId(), state.nextRun(), now
            );

            // DB에서 활성 여부, Cron 변경, 중복 실행을 다시 확인한다.
            batchExecutionService.executeScheduled(job);

            // SUCCESS 여부는 실행 이력에 기록된다.
            log.info("예약 실행 처리 종료. batchJobId={}", job.getId());

        } catch (IllegalStateException e) {
            log.info(
                    "예약 실행 건너뜀. batchJobId={}, reason={}",
                    job.getId(), e.getMessage()
            );
        } finally {
            // 지연된 예약은 한 번 처리하고, 완료 시각 이후의 다음 예약으로 이동한다.
            // 지나간 모든 Cron 시각을 연속 재실행하지 않는다.
            schedules.put(
                    job.getId(),
                    new ScheduleState(
                            state.expression(),
                            state.cron(),
                            state.cron().next(ZonedDateTime.now(clock))
                    )
            );
        }
    }

    private record ScheduleState(
            String expression,
            CronExpression cron,
            ZonedDateTime nextRun
    ) {
    }
}


package com.batchmanager.batch.scheduler;

import com.batchmanager.batch.domain.BatchJob;
import com.batchmanager.batch.repository.BatchJobRepository;
import com.batchmanager.batch.service.BatchExecutionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

import static org.mockito.Mockito.*;

class BatchSchedulerTest {

    private final BatchJobRepository repository = mock(BatchJobRepository.class);
    private final BatchExecutionService service = mock(BatchExecutionService.class);
    private final Clock clock = mock(Clock.class);
    private BatchScheduler scheduler;
    private BatchJob job;

    @BeforeEach
    void setUp() {
        when(clock.getZone()).thenReturn(ZoneId.of("Asia/Seoul"));
        scheduler = new BatchScheduler(repository, service, clock);
        job = new BatchJob();
        job.setId(1L);
        job.setName("예약 테스트");
        job.setIsActive(true);
        job.setCronExpression("0 * * * * *");
        when(repository.findByIsActiveTrue()).thenReturn(List.of(job));
    }

    private void at(String time) {
        when(clock.instant()).thenReturn(
                ZonedDateTime.parse(time + "+09:00[Asia/Seoul]").toInstant()
        );
    }

    @Test
    void delayedPollRunsOnceWithoutReplayingTheSameSchedule() {
        at("2026-09-28T10:00:01");
        scheduler.schedule();
        verifyNoInteractions(service);

        at("2026-09-28T10:01:03");
        scheduler.schedule();
        scheduler.schedule();

        verify(service, times(1)).executeScheduled(job);
    }

    @Test
    void changedCronReplacesThePreviousDeadline() {
        at("2026-09-28T10:00:01");
        scheduler.schedule();

        job.setCronExpression("0 0 12 * * *");
        at("2026-09-28T10:00:20");
        scheduler.schedule();

        at("2026-09-28T10:01:03");
        scheduler.schedule();
        verifyNoInteractions(service);

        at("2026-09-28T12:00:01");
        scheduler.schedule();
        verify(service).executeScheduled(job);
    }

    @Test
    void disablingAndEnablingStartsWithANewFutureDeadline() {
        at("2026-09-28T10:00:01");
        scheduler.schedule();

        when(repository.findByIsActiveTrue()).thenReturn(List.of());
        at("2026-09-28T10:00:30");
        scheduler.schedule();

        when(repository.findByIsActiveTrue()).thenReturn(List.of(job));
        at("2026-09-28T10:01:30");
        scheduler.schedule();
        verifyNoInteractions(service);

        at("2026-09-28T10:02:01");
        scheduler.schedule();
        verify(service).executeScheduled(job);
    }

    @Test
    void longExecutionSkipsElapsedIntervalsAndUsesNextFutureTime() {
        at("2026-09-28T10:00:01");
        scheduler.schedule();

        doAnswer(invocation -> {
            at("2026-09-28T10:02:33");
            return null;
        }).when(service).executeScheduled(job);

        at("2026-09-28T10:01:03");
        scheduler.schedule();

        at("2026-09-28T10:02:34");
        scheduler.schedule();

        verify(service, times(1)).executeScheduled(job);
    }
}


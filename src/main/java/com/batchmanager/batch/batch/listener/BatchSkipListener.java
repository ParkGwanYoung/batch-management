package com.batchmanager.batch.batch.listener;

import com.batchmanager.batch.domain.BatchExecution;
import com.batchmanager.batch.domain.BatchExecutionError;
import com.batchmanager.batch.domain.Member;
import com.batchmanager.batch.repository.BatchExecutionErrorRepository;
import com.batchmanager.batch.repository.BatchExecutionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.batch.core.step.StepExecution;
import org.springframework.batch.core.configuration.annotation.StepScope;
import org.springframework.batch.core.listener.SkipListener;
import org.springframework.batch.core.listener.StepExecutionListener;
import org.springframework.stereotype.Component;

@StepScope
@Component
@RequiredArgsConstructor
public class BatchSkipListener
        implements SkipListener<Member, Member>, StepExecutionListener {

    private final BatchExecutionRepository batchExecutionRepository;
    private final BatchExecutionErrorRepository batchExecutionErrorRepository;

    private StepExecution stepExecution;

    @Override
    public void beforeStep(StepExecution stepExecution) {
        this.stepExecution = stepExecution;
    }

    @Override
    public void onSkipInRead(Throwable t) {

        System.out.println(
                "Read Skip 발생: " + t.getMessage()
        );
    }

    @Override
    public void onSkipInProcess(Member item, Throwable t) {

        System.out.println(
                "Process Skip 발생"
                        + " / memberId=" + item.getId()
                        + " / 원인=" + t.getMessage()
        );

        saveError(item.getId(), t);
    }

    @Override
    public void onSkipInWrite(Member item, Throwable t) {

        System.out.println(
                "Write Skip 발생"
                        + " / memberId=" + item.getId()
                        + " / 원인=" + t.getMessage()
        );

        saveError(item.getId(), t);
    }

    private void saveError(Long itemId, Throwable throwable) {

        Long executionId = stepExecution
                .getJobExecution()
                .getJobParameters()
                .getLong("executionId");

        BatchExecution execution =
                batchExecutionRepository.findById(executionId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "BatchExecution을 찾을 수 없습니다. id=" + executionId
                                ));

        BatchExecutionError error =
                new BatchExecutionError(
                        execution,
                        itemId,
                        throwable
                );

        batchExecutionErrorRepository.save(error);
    }
}
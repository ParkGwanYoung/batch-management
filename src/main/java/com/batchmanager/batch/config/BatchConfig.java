package com.batchmanager.batch.config;

import com.batchmanager.batch.batch.listener.BatchSkipListener;
import com.batchmanager.batch.domain.Member;
import com.batchmanager.batch.exception.InvalidMemberDataException;
import jakarta.persistence.EntityManagerFactory;
import org.springframework.batch.core.configuration.annotation.EnableBatchProcessing;
import org.springframework.batch.core.configuration.annotation.EnableJdbcJobRepository;
import org.springframework.batch.core.configuration.annotation.StepScope;
import org.springframework.batch.core.job.Job;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.Step;
import org.springframework.batch.core.step.builder.ChunkOrientedStepBuilder;
import org.springframework.batch.infrastructure.item.ItemProcessor;
import org.springframework.batch.infrastructure.item.ItemReader;
import org.springframework.batch.infrastructure.item.ItemWriter;
import org.springframework.batch.infrastructure.item.database.JpaItemWriter;
import org.springframework.batch.infrastructure.item.database.JpaPagingItemReader;
import org.springframework.batch.infrastructure.item.database.builder.JpaItemWriterBuilder;
import org.springframework.batch.infrastructure.item.database.builder.JpaPagingItemReaderBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.util.Assert;

@Configuration
@EnableBatchProcessing
@EnableJdbcJobRepository
public class BatchConfig {

    private final int chunkSize;
    private final int pageSize;
    private final int retryLimit;
    private final int skipLimit;

    public BatchConfig(
            @Value("${app.batch.chunk-size}") int chunkSize,
            @Value("${app.batch.page-size}") int pageSize,
            @Value("${app.batch.retry-limit}") int retryLimit,
            @Value("${app.batch.skip-limit}") int skipLimit
    ) {
        Assert.isTrue(chunkSize > 0, "chunk-size는 1 이상이어야 합니다.");
        Assert.isTrue(pageSize > 0, "page-size는 1 이상이어야 합니다.");
        Assert.isTrue(retryLimit >= 0, "retry-limit는 0 이상이어야 합니다.");
        Assert.isTrue(skipLimit >= 0, "skip-limit는 0 이상이어야 합니다.");

        this.chunkSize = chunkSize;
        this.pageSize = pageSize;
        this.retryLimit = retryLimit;
        this.skipLimit = skipLimit;
    }

    @Bean
    public Job batchJob(
            JobRepository jobRepository,
            Step batchStep
    ) {
        return new JobBuilder("batchJob", jobRepository)
                .start(batchStep)
                .build();
    }

    @Bean
    public Step batchStep(
            JobRepository jobRepository,
            PlatformTransactionManager transactionManager,
            ItemReader<Member> memberReader,
            ItemProcessor<Member, Member> memberProcessor,
            ItemWriter<Member> memberWriter,
            BatchSkipListener batchSkipListener
    ) {
        return new ChunkOrientedStepBuilder<Member, Member>(
                "batchStep",
                jobRepository,
                chunkSize
        )
                .transactionManager(transactionManager)
                .reader(memberReader)
                .processor(memberProcessor)
                .writer(memberWriter)
                .faultTolerant()

                // DB 잠금 획득 실패만 제한적으로 재시도한다.
                .retry(CannotAcquireLockException.class)
                .retryLimit(retryLimit)

                // 재시도로 해결되지 않는 데이터 오류는 건너뛴다.
                .skip(InvalidMemberDataException.class)
                .skipLimit(skipLimit)

                .listener(batchSkipListener)
                .skipListener(batchSkipListener)
                .build();
    }

    @Bean
    @StepScope
    public JpaPagingItemReader<Member> memberReader(
            EntityManagerFactory entityManagerFactory
    ) {
        return new JpaPagingItemReaderBuilder<Member>()
                .name("memberReader")
                .entityManagerFactory(entityManagerFactory)
                .queryString("""
                        SELECT m
                        FROM Member m
                        WHERE m.active = true
                        ORDER BY m.id
                        """)
                .pageSize(pageSize)
                .build();
    }

    @Bean
    public JpaItemWriter<Member> memberWriter(
            EntityManagerFactory entityManagerFactory
    ) {
        return new JpaItemWriterBuilder<Member>()
                .entityManagerFactory(entityManagerFactory)
                .build();
    }
}
package com.batchmanager.batch.config;

import com.batchmanager.batch.batch.listener.BatchSkipListener;
import com.batchmanager.batch.domain.Member;
import jakarta.persistence.EntityManagerFactory;
import org.springframework.batch.core.configuration.annotation.EnableBatchProcessing;
import org.springframework.batch.core.configuration.annotation.EnableJdbcJobRepository;
import org.springframework.batch.core.job.Job;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.Step;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.infrastructure.item.ItemProcessor;
import org.springframework.batch.infrastructure.item.ItemReader;
import org.springframework.batch.infrastructure.item.ItemWriter;
import org.springframework.batch.infrastructure.item.database.JpaItemWriter;
import org.springframework.batch.infrastructure.item.database.JpaPagingItemReader;
import org.springframework.batch.infrastructure.item.database.builder.JpaItemWriterBuilder;
import org.springframework.batch.infrastructure.item.database.builder.JpaPagingItemReaderBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.batch.core.step.builder.ChunkOrientedStepBuilder;

@Configuration
@EnableBatchProcessing
@EnableJdbcJobRepository
public class BatchConfig {

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
                3
        )
                .transactionManager(transactionManager)
                .reader(memberReader)
                .processor(memberProcessor)
                .writer(memberWriter)

                .faultTolerant()

                .retry(IllegalArgumentException.class)
                .retryLimit(3)

                .skip(IllegalArgumentException.class)
                .skipLimit(5)

                .listener(batchSkipListener)
                .skipListener(batchSkipListener)

                .build();
    }

    @Bean
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
                .pageSize(3)
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
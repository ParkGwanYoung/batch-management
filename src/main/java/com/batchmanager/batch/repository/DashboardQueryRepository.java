package com.batchmanager.batch.repository;

import com.batchmanager.batch.domain.BatchExecution;
import com.batchmanager.batch.dto.DashboardExecutionSearchCondition;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

import static com.batchmanager.batch.domain.QBatchExecution.batchExecution;
import static com.batchmanager.batch.domain.QBatchJob.batchJob;

@Repository
@RequiredArgsConstructor
public class DashboardQueryRepository {

    private final JPAQueryFactory queryFactory;


    // =========================================================
    // 실행 분석 동적 조회
    // =========================================================

    public Page<BatchExecution> searchExecutions(
            DashboardExecutionSearchCondition condition
    ) {

        // -----------------------------------------------------
        // 1. 동적 WHERE 조건 생성
        // -----------------------------------------------------

        BooleanBuilder builder =
                createCondition(condition);


        // -----------------------------------------------------
        // 2. page / size 보정
        // -----------------------------------------------------

        int page =
                condition.getPage() == null
                        ? 0
                        : Math.max(condition.getPage(), 0);


        int size =
                condition.getSize() == null
                        ? 10
                        : Math.max(
                        1,
                        Math.min(
                                condition.getSize(),
                                100
                        )
                );


        long offset =
                (long) page * size;


        // -----------------------------------------------------
        // 3. 정렬
        // -----------------------------------------------------

        OrderSpecifier<?> orderSpecifier =
                createOrderSpecifier(condition);


        // -----------------------------------------------------
        // 4. 실제 데이터 조회
        // -----------------------------------------------------

        List<BatchExecution> content =
                queryFactory
                        .selectFrom(batchExecution)

                        // 배치명 사용 때문에 BatchJob 같이 조회
                        .join(
                                batchExecution.batchJob,
                                batchJob
                        )
                        .fetchJoin()

                        .where(builder)

                        .orderBy(orderSpecifier)

                        .offset(offset)

                        .limit(size)

                        .fetch();


        // -----------------------------------------------------
        // 5. 전체 건수 조회
        // -----------------------------------------------------

        Long total =
                queryFactory
                        .select(
                                batchExecution.id.count()
                        )
                        .from(batchExecution)

                        .join(
                                batchExecution.batchJob,
                                batchJob
                        )

                        .where(builder)

                        .fetchOne();


        long totalCount =
                total == null
                        ? 0L
                        : total;


        return new PageImpl<>(
                content,
                org.springframework.data.domain.PageRequest.of(
                        page,
                        size
                ),
                totalCount
        );
    }


    // =========================================================
    // 동적 조건 생성
    // =========================================================

    private BooleanBuilder createCondition(
            DashboardExecutionSearchCondition condition
    ) {

        BooleanBuilder builder =
                new BooleanBuilder();


        // -----------------------------------------------------
        // 시작일
        // -----------------------------------------------------

        if (condition.getStartDate() != null) {

            LocalDateTime startDateTime =
                    condition
                            .getStartDate()
                            .atStartOfDay();


            builder.and(
                    batchExecution
                            .startTime
                            .goe(startDateTime)
            );
        }


        // -----------------------------------------------------
        // 종료일
        //
        // 2026-09-24를 선택했다면
        // 2026-09-25 00:00 미만으로 조회
        // -----------------------------------------------------

        if (condition.getEndDate() != null) {

            LocalDateTime endDateTime =
                    condition
                            .getEndDate()
                            .plusDays(1)
                            .atStartOfDay();


            builder.and(
                    batchExecution
                            .startTime
                            .lt(endDateTime)
            );
        }


        // -----------------------------------------------------
        // BatchJob ID
        // -----------------------------------------------------

        if (condition.getBatchJobId() != null) {

            builder.and(
                    batchExecution
                            .batchJob
                            .id
                            .eq(
                                    condition.getBatchJobId()
                            )
            );
        }


        // -----------------------------------------------------
        // 배치명 부분 검색
        // -----------------------------------------------------

        if (
                StringUtils.hasText(
                        condition.getBatchJobName()
                )
        ) {

            builder.and(
                    batchJob
                            .name
                            .containsIgnoreCase(
                                    condition
                                            .getBatchJobName()
                                            .trim()
                            )
            );
        }


        // -----------------------------------------------------
        // 실행 상태
        //
        // Entity의 status는 Enum이므로
        // String 변환 후 검색
        // -----------------------------------------------------

        if (
                StringUtils.hasText(
                        condition.getStatus()
                )
        ) {

            builder.and(
                    batchExecution
                            .status
                            .stringValue()
                            .eq(
                                    condition
                                            .getStatus()
                                            .trim()
                                            .toUpperCase()
                            )
            );
        }


        // -----------------------------------------------------
        // 실행 방식
        // -----------------------------------------------------

        if (
                StringUtils.hasText(
                        condition.getTriggerType()
                )
        ) {

            builder.and(
                    batchExecution
                            .triggerType
                            .upper()
                            .eq(
                                    condition
                                            .getTriggerType()
                                            .trim()
                                            .toUpperCase()
                            )
            );
        }


        // -----------------------------------------------------
        // 최소 실패 건수
        //
        // 예)
        // minFailCount = 1
        //
        // SUCCESS여도 Skip이 발생한
        // 9 성공 / 1 실패 같은 실행 검색 가능
        // -----------------------------------------------------

        if (condition.getMinFailCount() != null) {

            builder.and(
                    batchExecution
                            .failCount
                            .goe(
                                    condition.getMinFailCount()
                            )
            );
        }


        return builder;
    }


    // =========================================================
    // 동적 정렬
    // =========================================================

    private OrderSpecifier<?> createOrderSpecifier(
            DashboardExecutionSearchCondition condition
    ) {

        boolean ascending =
                "asc".equalsIgnoreCase(
                        condition.getDirection()
                );


        String sortBy =
                StringUtils.hasText(
                        condition.getSortBy()
                )
                        ? condition.getSortBy()
                        : "id";


        return switch (sortBy) {

            case "startTime" ->

                    ascending
                            ? batchExecution.startTime.asc()
                            : batchExecution.startTime.desc();


            case "failCount" ->

                    ascending
                            ? batchExecution.failCount.asc()
                            : batchExecution.failCount.desc();


            case "successCount" ->

                    ascending
                            ? batchExecution.successCount.asc()
                            : batchExecution.successCount.desc();


            default ->

                    ascending
                            ? batchExecution.id.asc()
                            : batchExecution.id.desc();
        };
    }
}
package com.batchmanager.batch.service;

import com.batchmanager.batch.domain.BatchExecution;
import com.batchmanager.batch.dto.BatchExecutionResponse;
import com.batchmanager.batch.dto.DashboardExecutionSearchCondition;
import com.batchmanager.batch.dto.DashboardSummaryResponse;
import com.batchmanager.batch.repository.BatchExecutionRepository;
import com.batchmanager.batch.repository.BatchJobRepository;
import com.batchmanager.batch.repository.DashboardQueryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final BatchJobRepository batchJobRepository;

    private final BatchExecutionRepository
            batchExecutionRepository;

    private final DashboardQueryRepository
            dashboardQueryRepository;


    // =========================================================
    // 1. 단순 현황
    //
    // QueryDSL을 사용하지 않는다.
    // =========================================================

    public DashboardSummaryResponse getSummary() {

        long totalJobCount =
                batchJobRepository.count();


        long activeJobCount =
                batchJobRepository
                        .countByIsActiveTrue();


        // JPQL GROUP BY 결과
        List<Object[]> rows =
                batchExecutionRepository
                        .countGroupByStatus();


        Map<String, Long> statusCounts =
                new HashMap<>();


        for (Object[] row : rows) {

            String status =
                    String.valueOf(row[0]);

            Long count =
                    (Long) row[1];


            statusCounts.put(
                    status,
                    count
            );
        }


        return new DashboardSummaryResponse(

                totalJobCount,

                activeJobCount,

                statusCounts.getOrDefault(
                        "WAITING",
                        0L
                ),

                statusCounts.getOrDefault(
                        "RUNNING",
                        0L
                ),

                statusCounts.getOrDefault(
                        "SUCCESS",
                        0L
                ),

                statusCounts.getOrDefault(
                        "FAILED",
                        0L
                )
        );
    }


    // =========================================================
    // 2. 실행 분석
    //
    // QueryDSL
    // =========================================================

    public Page<BatchExecutionResponse>
    searchExecutions(
            DashboardExecutionSearchCondition condition
    ) {

        Page<BatchExecution> result =
                dashboardQueryRepository
                        .searchExecutions(condition);


        return result.map(
                BatchExecutionResponse::new
        );
    }
}
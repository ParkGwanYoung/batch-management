package com.batchmanager.batch.controller;

import com.batchmanager.batch.dto.BatchExecutionResponse;
import com.batchmanager.batch.dto.DashboardExecutionSearchCondition;
import com.batchmanager.batch.dto.DashboardSummaryResponse;
import com.batchmanager.batch.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;


    // =========================================================
    // 운영 현황
    // =========================================================

    @GetMapping("/summary")
    public DashboardSummaryResponse getSummary() {

        return dashboardService
                .getSummary();
    }


    // =========================================================
    // 실행 분석
    //
    // QueryDSL 동적 검색
    // =========================================================

    @GetMapping("/executions")
    public Page<BatchExecutionResponse> searchExecutions(

            @ModelAttribute
            DashboardExecutionSearchCondition condition

    ) {

        return dashboardService
                .searchExecutions(condition);
    }
}
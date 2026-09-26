package com.batchmanager.batch.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class DashboardSummaryResponse {

    private long totalJobCount;

    private long activeJobCount;

    private long waitingExecutionCount;

    private long runningExecutionCount;

    private long successExecutionCount;

    private long failedExecutionCount;
}
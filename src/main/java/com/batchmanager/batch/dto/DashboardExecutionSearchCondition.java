package com.batchmanager.batch.dto;

import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

@Getter
@Setter
public class DashboardExecutionSearchCondition {

    // 조회 시작일
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate startDate;

    // 조회 종료일
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate endDate;

    // 특정 BatchJob
    private Long batchJobId;

    // 배치명 부분 검색
    private String batchJobName;

    // WAITING / RUNNING / SUCCESS / FAILED
    private String status;

    // MANUAL / AUTO
    private String triggerType;

    // 실패 건수가 이 값 이상인 실행만
    private Long minFailCount;

    // 페이징
    private Integer page = 0;

    private Integer size = 10;

    // id / startTime / failCount / successCount
    private String sortBy = "id";

    // asc / desc
    private String direction = "desc";
}
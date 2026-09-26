package com.batchmanager.batch.controller;

import com.batchmanager.batch.dto.*;
import com.batchmanager.batch.service.BatchExecutionService;
import com.batchmanager.batch.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/batch-executions")
@RequiredArgsConstructor
public class BatchExecutionController {

    private final BatchExecutionService batchExecutionService;
    private final NotificationService notificationService;

    @GetMapping
    public Page<BatchExecutionResponse> getExecutions(
            @RequestParam Long batchJobId,
            Pageable pageable
    ) {
        return batchExecutionService.getExecutions(
                batchJobId,
                pageable
        );
    }


    @GetMapping("/{id}")
    public BatchExecutionDetailResponse getExecution(
            @PathVariable Long id
    ) {
        return batchExecutionService.getExecution(id);
    }

    @PostMapping
    public BatchExecutionDetailResponse createExecution(
            @RequestBody BatchExecutionCreateRequest request
    ) {
        return batchExecutionService.createExecution(request);
    }

    @PostMapping("/{id}/execute")
    public BatchExecutionDetailResponse execute(
            @PathVariable Long id
    ) {
        return batchExecutionService.execute(id);
    }

    @GetMapping("/{id}/errors")
    public List<BatchExecutionErrorResponse> getExecutionErrors(
            @PathVariable Long id
    ) {
        return batchExecutionService.getExecutionErrors(id);
    }

    @GetMapping("/{id}/notifications")
    public List<NotificationLogResponse> getNotifications(
            @PathVariable Long id
    ) {
        return notificationService.getNotifications(id);
    }

}
package com.batchmanager.batch.controller;

import com.batchmanager.batch.domain.BatchJob;
import com.batchmanager.batch.service.BatchJobService;
import com.batchmanager.batch.dto.CreateRequest;
import com.batchmanager.batch.dto.UpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/batch-jobs")
@RequiredArgsConstructor
public class BatchJobController {

    private final BatchJobService batchJobService;

    // 목록 조회
    @GetMapping
    public Page<BatchJob> getList(
            @RequestParam(required = false) String keyword,
            Pageable pageable) {
        return batchJobService.getList(keyword, pageable);
    }

    // 상세 조회
    @GetMapping("/{id}")
    public BatchJob getDetail(@PathVariable Long id) {
        return batchJobService.getDetail(id);
    }

    // 신규 등록
    @PostMapping
    public BatchJob create(@RequestBody CreateRequest request) {
        return batchJobService.create(
                request.getName(), request.getDescription(), request.getCronExpression());
    }

    // 수정
    @PutMapping("/{id}")
    public BatchJob update(@PathVariable Long id, @RequestBody UpdateRequest request) {
        return batchJobService.update(
                id, request.getName(), request.getDescription(),
                request.getCronExpression(), request.getIsActive());
    }

    // 삭제(비활성화)
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        batchJobService.deactivate(id);
    }

    @GetMapping("/me")
    public String me(Authentication authentication) {
        return authentication.getName();
    }
}
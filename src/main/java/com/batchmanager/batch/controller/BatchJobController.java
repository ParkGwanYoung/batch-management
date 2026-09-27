package com.batchmanager.batch.controller;

import com.batchmanager.batch.dto.BatchJobResponse;
import com.batchmanager.batch.dto.CreateRequest;
import com.batchmanager.batch.dto.UpdateRequest;
import com.batchmanager.batch.service.BatchJobService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/batch-jobs")
@RequiredArgsConstructor
public class BatchJobController {

    private final BatchJobService batchJobService;

    @GetMapping
    public Page<BatchJobResponse> getList(
            @RequestParam(required = false) String keyword,
            @PageableDefault(
                    size = 10,
                    sort = "id",
                    direction = Sort.Direction.DESC
            ) Pageable pageable
    ) {
        return batchJobService.getList(keyword, pageable);
    }

    @GetMapping("/{id}")
    public BatchJobResponse getDetail(@PathVariable Long id) {
        return batchJobService.getDetail(id);
    }

    @PostMapping
    public BatchJobResponse create(
            @RequestBody CreateRequest request
    ) {
        return batchJobService.create(
                request.getName(),
                request.getDescription(),
                request.getCronExpression()
        );
    }

    @PutMapping("/{id}")
    public BatchJobResponse update(
            @PathVariable Long id,
            @RequestBody UpdateRequest request
    ) {
        return batchJobService.update(
                id,
                request.getName(),
                request.getDescription(),
                request.getCronExpression(),
                request.getIsActive()
        );
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        batchJobService.deactivate(id);
    }

    @GetMapping("/me")
    public String me(Authentication authentication) {
        return authentication.getName();
    }
}
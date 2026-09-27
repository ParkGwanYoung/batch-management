package com.batchmanager.batch.service;

import com.batchmanager.batch.domain.Admin;
import com.batchmanager.batch.domain.BatchJob;
import com.batchmanager.batch.dto.BatchJobResponse;
import com.batchmanager.batch.repository.AdminRepository;
import com.batchmanager.batch.repository.BatchJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BatchJobService {

    private final BatchJobRepository batchJobRepository;
    private final AdminRepository adminRepository;

    public Page<BatchJobResponse> getList(
            String keyword,
            Pageable pageable
    ) {
        Page<BatchJob> batchJobs;

        if (keyword == null || keyword.isBlank()) {
            batchJobs = batchJobRepository.findAll(pageable);
        } else {
            batchJobs = batchJobRepository.findByNameContaining(
                    keyword.trim(),
                    pageable
            );
        }

        return batchJobs.map(BatchJobResponse::new);
    }

    public BatchJobResponse getDetail(Long id) {
        BatchJob batchJob = findBatchJob(id);
        return new BatchJobResponse(batchJob);
    }

    @Transactional
    public BatchJobResponse create(
            String name,
            String description,
            String cronExpression
    ) {
        validateCronExpression(cronExpression);

        Admin admin = getCurrentAdmin();

        BatchJob batchJob = new BatchJob();
        batchJob.setName(name);
        batchJob.setDescription(description);
        batchJob.setCronExpression(cronExpression);
        batchJob.setIsActive(true);
        batchJob.setCreatedBy(admin);
        batchJob.setUpdatedBy(admin);

        BatchJob savedBatchJob = batchJobRepository.save(batchJob);

        return new BatchJobResponse(savedBatchJob);
    }

    @Transactional
    public BatchJobResponse update(
            Long id,
            String name,
            String description,
            String cronExpression,
            Boolean isActive
    ) {
        validateCronExpression(cronExpression);

        if (isActive == null) {
            throw new IllegalArgumentException(
                    "활성화 여부는 필수입니다."
            );
        }

        Admin admin = getCurrentAdmin();
        BatchJob batchJob = findBatchJob(id);

        batchJob.setName(name);
        batchJob.setDescription(description);
        batchJob.setCronExpression(cronExpression);
        batchJob.setIsActive(isActive);
        batchJob.setUpdatedBy(admin);

        // 변경 내용을 반영하고 @PreUpdate의 수정 시각도 응답에 담는다.
        batchJobRepository.flush();

        return new BatchJobResponse(batchJob);
    }

    @Transactional
    public void deactivate(Long id) {
        Admin admin = getCurrentAdmin();
        BatchJob batchJob = findBatchJob(id);

        batchJob.setIsActive(false);
        batchJob.setUpdatedBy(admin);
    }

    private BatchJob findBatchJob(Long id) {
        return batchJobRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "배치를 찾을 수 없습니다. id=" + id
                ));
    }

    private Admin getCurrentAdmin() {
        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException(
                    "로그인이 필요합니다."
            );
        }

        return adminRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException(
                        "관리자를 찾을 수 없습니다."
                ));
    }

    private void validateCronExpression(String cronExpression) {
        if (cronExpression == null || cronExpression.isBlank()) {
            throw new IllegalArgumentException(
                    "Cron 표현식은 필수입니다."
            );
        }

        try {
            CronExpression.parse(cronExpression);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "잘못된 Cron 표현식입니다. cronExpression="
                            + cronExpression
            );
        }
    }
}
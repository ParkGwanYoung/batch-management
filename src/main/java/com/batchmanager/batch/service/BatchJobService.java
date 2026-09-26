package com.batchmanager.batch.service;

import com.batchmanager.batch.domain.Admin;
import com.batchmanager.batch.domain.BatchJob;
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

    // 목록 조회 (검색어 있으면 검색, 없으면 전체)
    public Page<BatchJob> getList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isBlank()) {
            return batchJobRepository.findAll(pageable);
        }
        return batchJobRepository.findByNameContaining(keyword, pageable);
    }

    // 상세 조회
    public BatchJob getDetail(Long id) {
        return batchJobRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("배치를 찾을 수 없습니다. id=" + id));
    }

    // 신규 등록
    @Transactional
    public BatchJob create(
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

        return batchJobRepository.save(batchJob);
    }

    // 수정
    @Transactional
    public BatchJob update(
            Long id,
            String name,
            String description,
            String cronExpression,
            Boolean isActive
    ) {

        validateCronExpression(cronExpression);

        Admin admin = getCurrentAdmin();

        BatchJob batchJob = getDetail(id);

        batchJob.setName(name);
        batchJob.setDescription(description);
        batchJob.setCronExpression(cronExpression);
        batchJob.setIsActive(isActive);
        batchJob.setUpdatedBy(admin);

        return batchJob;
    }

    // 삭제 (비활성화)
    @Transactional
    public void deactivate(Long id) {

        Admin admin = getCurrentAdmin();

        BatchJob batchJob = getDetail(id);
        batchJob.setIsActive(false);
        batchJob.setUpdatedBy(admin);
    }

    public Admin getCurrentAdmin() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String username = authentication.getName();

        return adminRepository.findByUsername(username)
                .orElseThrow(() ->
                        new IllegalArgumentException("관리자를 찾을 수 없습니다."));
    }

    private void validateCronExpression(String cronExpression) {

        if (cronExpression == null || cronExpression.isBlank()) {
            throw new IllegalArgumentException("Cron 표현식은 필수입니다.");
        }

        try {
            CronExpression.parse(cronExpression);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "잘못된 Cron 표현식입니다. cronExpression=" + cronExpression
            );
        }
    }
}

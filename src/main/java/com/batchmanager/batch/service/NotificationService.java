package com.batchmanager.batch.service;

import com.batchmanager.batch.domain.BatchExecution;
import com.batchmanager.batch.domain.NotificationLog;
import com.batchmanager.batch.dto.NotificationLogResponse;
import com.batchmanager.batch.notification.SlackNotificationClient;
import com.batchmanager.batch.repository.NotificationLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationLogRepository notificationLogRepository;
    private final SlackNotificationClient slackNotificationClient;

    public void createBatchResultNotification(
            BatchExecution execution
    ) {

        boolean failed =
                execution.getStatus()
                        == BatchExecution.ExecutionStatus.FAILED;

        boolean hasSkip =
                execution.getFailCount() != null
                        && execution.getFailCount() > 0;

        if (!failed && !hasSkip) {
            return;
        }

        String message = buildMessage(execution);

        try {
            slackNotificationClient.send(message);

            saveNotificationLog(
                    execution,
                    message,
                    "SUCCESS"
            );

        } catch (Exception e) {

            saveNotificationLog(
                    execution,
                    message + " / Slack 전송 실패: " + e.getMessage(),
                    "FAILED"
            );
        }
    }

    private void saveNotificationLog(
            BatchExecution execution,
            String message,
            String status
    ) {

        NotificationLog notificationLog =
                new NotificationLog(
                        execution,
                        "SLACK",
                        message,
                        status
                );

        notificationLogRepository.save(notificationLog);
    }

    private String buildMessage(BatchExecution execution) {

        return "배치 실행 알림"
                + " / batchJob=" + execution.getBatchJob().getName()
                + " / executionId=" + execution.getId()
                + " / status=" + execution.getStatus()
                + " / successCount=" + execution.getSuccessCount()
                + " / failCount=" + execution.getFailCount();
    }

    public List<NotificationLogResponse> getNotifications(
            Long batchExecutionId
    ) {

        return notificationLogRepository
                .findByBatchExecutionIdOrderBySentAtDesc(batchExecutionId)
                .stream()
                .map(NotificationLogResponse::new)
                .toList();
    }
}
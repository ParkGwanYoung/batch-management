package com.batchmanager.batch.dto;

import com.batchmanager.batch.domain.NotificationLog;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class NotificationLogResponse {

    private final Long id;
    private final Long batchExecutionId;
    private final String channel;
    private final String message;
    private final String status;
    private final LocalDateTime sentAt;

    public NotificationLogResponse(NotificationLog notificationLog) {
        this.id = notificationLog.getId();
        this.batchExecutionId =
                notificationLog.getBatchExecution().getId();
        this.channel = notificationLog.getChannel();
        this.message = notificationLog.getMessage();
        this.status = notificationLog.getStatus();
        this.sentAt = notificationLog.getSentAt();
    }
}
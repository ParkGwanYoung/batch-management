package com.batchmanager.batch.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification_log")
@Getter
@NoArgsConstructor
public class NotificationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_execution_id", nullable = false)
    private BatchExecution batchExecution;

    @Column(nullable = false, length = 10)
    private String channel;

    @Lob
    @Column(nullable = false)
    private String message;

    @Column(nullable = false, length = 10)
    private String status;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    public NotificationLog(
            BatchExecution batchExecution,
            String channel,
            String message,
            String status
    ) {
        this.batchExecution = batchExecution;
        this.channel = channel;
        this.message = message;
        this.status = status;
        this.sentAt = LocalDateTime.now();
    }
}
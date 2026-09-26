package com.batchmanager.batch.notification;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class SlackNotificationClient {

    private final RestClient restClient;
    private final String webhookUrl;

    public SlackNotificationClient(
            RestClient.Builder restClientBuilder,
            @Value("${slack.webhook-url}") String webhookUrl
    ) {
        this.restClient = restClientBuilder.build();
        this.webhookUrl = webhookUrl;
    }

    public void send(String message) {

        if (webhookUrl == null || webhookUrl.isBlank()) {
            throw new IllegalStateException(
                    "Slack Webhook URL이 설정되지 않았습니다."
            );
        }

        restClient.post()
                .uri(webhookUrl)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("text", message))
                .retrieve()
                .toBodilessEntity();
    }
}
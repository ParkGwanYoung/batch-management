package com.batchmanager.batch.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateRequest {
    private String name;
    private String description;
    private String cronExpression;
    private Boolean isActive;
}

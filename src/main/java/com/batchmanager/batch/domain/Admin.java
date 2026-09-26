package com.batchmanager.batch.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin")
@Getter
@Setter
@NoArgsConstructor
public class Admin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(name = "create_dt", nullable = false, updatable = false)
    private LocalDateTime createDt;

    @Column(name = "audit_dt")
    private LocalDateTime auditDt;

    @PrePersist
    public void prePersist() {
        this.createDt = LocalDateTime.now();
        this.auditDt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.auditDt = LocalDateTime.now();
    }
}

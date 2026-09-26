package com.batchmanager.batch.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "member")
@Getter
@NoArgsConstructor
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 100)
    private String email;

    @Column(nullable = false)
    private Boolean active;

    @Column(name = "last_sync_at")
    private LocalDateTime lastSyncAt;

    public Member(String name, String email) {
        this.name = name;
        this.email = email;
        this.active = true;
    }

    public void updateName(String name) {
        this.name = name;
    }

    public void sync() {
        this.lastSyncAt = LocalDateTime.now();
    }
}
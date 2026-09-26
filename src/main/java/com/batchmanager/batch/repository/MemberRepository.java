package com.batchmanager.batch.repository;

import com.batchmanager.batch.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Long> {
}
package com.batchmanager.batch.batch.processor;

import com.batchmanager.batch.domain.Member;
import com.batchmanager.batch.exception.InvalidMemberDataException;
import org.springframework.batch.infrastructure.item.ItemProcessor;
import org.springframework.stereotype.Component;

@Component
public class MemberItemProcessor implements ItemProcessor<Member, Member> {

    @Override
    public Member process(Member member) {

        if (member.getEmail() == null || member.getEmail().isBlank()) {
            throw new InvalidMemberDataException(
                    "이메일이 없는 회원입니다. memberId=" + member.getId()
            );
        }

        member.sync();

        return member;
    }
}
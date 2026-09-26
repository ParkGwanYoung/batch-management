package com.batchmanager.batch.batch.processor;

import com.batchmanager.batch.domain.Member;
import org.springframework.batch.infrastructure.item.ItemProcessor;
import org.springframework.stereotype.Component;

@Component
public class MemberItemProcessor implements ItemProcessor<Member, Member> {

    @Override
    public Member process(Member member) {

//        try {
//            Thread.sleep(2000);
//        } catch (InterruptedException e) {
//            Thread.currentThread().interrupt();
//            throw new IllegalStateException("배치 처리 중 인터럽트 발생");
//        }

//        if (member.getId() == 5L) {
//            throw new IllegalArgumentException(
//                    "테스트용 오류입니다. memberId=" + member.getId()
//            );
//        }

        if (member.getEmail() == null || member.getEmail().isBlank()) {
            throw new IllegalArgumentException(
                    "이메일이 없는 회원입니다. memberId=" + member.getId()
            );
        }

        member.sync();

        return member;
    }
}
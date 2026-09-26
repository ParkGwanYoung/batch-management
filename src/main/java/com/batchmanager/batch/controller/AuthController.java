package com.batchmanager.batch.controller;

import com.batchmanager.batch.config.JwtTokenProvider;
import com.batchmanager.batch.domain.Admin;
import com.batchmanager.batch.dto.LoginRequest;
import com.batchmanager.batch.dto.LoginResponse;
import com.batchmanager.batch.repository.AdminRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        Admin admin = adminRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("아이디 또는 비밀번호가 올바르지 않습니다."));

        if (!passwordEncoder.matches(request.getPassword(), admin.getPassword())) {
            throw new IllegalArgumentException("아이디 또는 비밀번호가 올바르지 않습니다.");
        }

        String token = jwtTokenProvider.createToken(admin.getUsername());
        return new LoginResponse(token);
    }
}
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL =
    __ENV.BASE_URL || 'http://13.125.211.52';

const PROFILE =
    __ENV.PROFILE || 'smoke';

const profiles = {

    // 1. 기능 확인용
    smoke: [
        { duration: '10s', target: 1 },
        { duration: '5s', target: 0 },
    ],

    // 2. 일반적인 부하
    load: [
        { duration: '30s', target: 5 },
        { duration: '30s', target: 20 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
    ],

    // 3. 한계 확인용
    stress: [
        { duration: '30s', target: 20 },
        { duration: '30s', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 150 },
        { duration: '1m', target: 150 },
        { duration: '30s', target: 0 },
    ],

    // 순간 트래픽 폭증 테스트
    spike: [
        // 평상시
        { duration: '30s', target: 10 },

        // 10 → 300명 즉시 증가
        { duration: '0s', target: 300 },

        // 폭증 상태 유지
        { duration: '1m', target: 300 },

        // 다시 평상시로 급감
        { duration: '0s', target: 10 },

        // 회복 여부 확인
        { duration: '30s', target: 10 },

        // 종료
        { duration: '10s', target: 0 },
    ],
};


export const options = {

    scenarios: {
        batch_api: {
            executor: 'ramping-vus',
            stages: profiles[PROFILE],
        },
    },

    thresholds: {

        // 전체 HTTP 실패율 1% 미만
        http_req_failed: [
            'rate<0.01',
        ],

        // 배치 목록 API의 95%가 1초 이내
        'http_req_duration{endpoint:batchJobs}': [
            'p(95)<1000',
        ],

        // check 성공률 99% 이상
        checks: [
            'rate>0.99',
        ],
    },
};


/*
 * 테스트 시작 전 딱 한 번 로그인
 */
export function setup() {

    const username = __ENV.K6_USERNAME;
    const password = __ENV.K6_PASSWORD;

    if (!username || !password) {
        throw new Error(
            'K6_USERNAME / K6_PASSWORD 환경변수가 필요합니다.'
        );
    }

    const response = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({
            username: username,
            password: password,
        }),
        {
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );

    const loginSuccess = check(response, {
        'login status is 200': (r) => r.status === 200,
    });

    if (!loginSuccess) {
        throw new Error(
            `로그인 실패 status=${response.status}`
        );
    }

    const body = response.json();

    // 응답 구조 변경에도 어느 정도 대응
    const accessToken =
        body.accessToken ??
        body.data?.accessToken;

    if (!accessToken) {
        throw new Error(
            '로그인 응답에서 accessToken을 찾지 못했습니다.'
        );
    }

    return {
        accessToken: accessToken,
    };
}


/*
 * VU가 반복 실행하는 실제 부하
 */
export default function (data) {

    const response = http.get(
        `${BASE_URL}/api/batch-jobs?page=0&size=10`,
        {
            headers: {
                Authorization:
                    `Bearer ${data.accessToken}`,
            },

            tags: {
                endpoint: 'batchJobs',
            },
        }
    );

    check(response, {

        'batch jobs status is 200':
            (r) => r.status === 200,

        'response time under 1s':
            (r) => r.timings.duration < 1000,
    });

    // 실제 사용자가 계속 초당 수십 번 클릭하지는 않으므로
    // 사용자 행동 간격 표현
    sleep(1);
}
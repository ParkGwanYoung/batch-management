import http from 'k6/http'
import { check } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://pgy-batch.duckdns.org'
const TARGET_RPS = Number(__ENV.RPS || 100)
const DURATION = __ENV.DURATION || '60s'
const MAX_VUS = Number(__ENV.MAX_VUS || 2000)

export const options = {
    scenarios: {
        breakpoint: {
            executor: 'constant-arrival-rate',

            rate: TARGET_RPS,

            timeUnit: '1s',

            duration: DURATION,

            preAllocatedVUs: Math.min(
                Math.max(
                    Math.ceil(TARGET_RPS * 0.5),
                    100
                ),
                1000
            ),

            maxVUs: MAX_VUS,
        },
    },

    thresholds: {
        http_req_failed: [
            'rate<0.01',
        ],

        'http_req_duration{endpoint:batchJobs}': [
            'p(95)<1000',
        ],

        checks: [
            'rate>0.99',
        ],
    },
}

export function setup() {

    const username =
        __ENV.K6_USERNAME

    const password =
        __ENV.K6_PASSWORD


    if (
        !username ||
        !password
    ) {
        throw new Error(
            'K6_USERNAME / K6_PASSWORD 환경변수를 설정해주세요.'
        )
    }


    const loginResponse =
        http.post(
            `${BASE_URL}/api/auth/login`,
            JSON.stringify({
                username,
                password,
            }),
            {
                headers: {
                    'Content-Type':
                        'application/json',
                },

                tags: {
                    endpoint: 'login',
                },
            }
        )


    const loginOk =
        check(
            loginResponse,
            {
                'login status is 200':
                    (response) =>
                        response.status === 200,
            }
        )


    if (!loginOk) {

        throw new Error(
            `로그인 실패: status=${loginResponse.status}`
        )
    }


    const body =
        loginResponse.json()


    const accessToken =
        body.accessToken ??
        body.data?.accessToken


    if (!accessToken) {

        throw new Error(
            '로그인 응답에서 accessToken을 찾지 못했습니다.'
        )
    }


    return {
        accessToken,
    }
}


export default function (data) {

    const response =
        http.get(
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
        )


    check(
        response,
        {
            'batch jobs status is 200':
                (res) =>
                    res.status === 200,

            'response time under 1s':
                (res) =>
                    res.timings.duration < 1000,
        }
    )
}
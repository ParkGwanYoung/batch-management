import {
    useCallback,
    useEffect,
    useState,
} from 'react'

import {
    useNavigate,
    useParams,
} from 'react-router'


function BatchExecutionDetailPage({
                                      accessToken,
                                      onLogout,
                                  }) {

    const { executionId } =
        useParams()

    const navigate =
        useNavigate()


    const [execution, setExecution] =
        useState(null)

    const [errors, setErrors] =
        useState([])

    const [notifications, setNotifications] =
        useState([])

    const [loading, setLoading] =
        useState(true)

    const [message, setMessage] =
        useState('')


    // =========================================================
    // 상세 조회
    // =========================================================

    const fetchDetail =
        useCallback(async () => {

            setLoading(true)
            setMessage('')


            try {

                const headers = {

                    Authorization:
                        `Bearer ${accessToken}`,
                }


                const [
                    detailResponse,
                    errorResponse,
                    notificationResponse,
                ] = await Promise.all([

                    fetch(
                        `/api/batch-executions/${executionId}`,
                        {
                            headers,
                        }
                    ),

                    fetch(
                        `/api/batch-executions/${executionId}/errors`,
                        {
                            headers,
                        }
                    ),

                    fetch(
                        `/api/batch-executions/${executionId}/notifications`,
                        {
                            headers,
                        }
                    ),
                ])


                if (
                    detailResponse.status === 401 ||
                    errorResponse.status === 401 ||
                    notificationResponse.status === 401
                ) {

                    onLogout()

                    return
                }


                if (!detailResponse.ok) {

                    throw new Error(
                        '실행 상세 조회에 실패했습니다.'
                    )
                }


                if (!errorResponse.ok) {

                    throw new Error(
                        '오류 이력 조회에 실패했습니다.'
                    )
                }


                if (!notificationResponse.ok) {

                    throw new Error(
                        '알림 이력 조회에 실패했습니다.'
                    )
                }


                const detailData =
                    await detailResponse.json()

                const errorData =
                    await errorResponse.json()

                const notificationData =
                    await notificationResponse.json()


                setExecution(
                    detailData
                )

                setErrors(
                    errorData
                )

                setNotifications(
                    notificationData
                )

            } catch (error) {

                setMessage(
                    error.message
                )

            } finally {

                setLoading(false)
            }

        }, [
            accessToken,
            executionId,
            onLogout,
        ])


    useEffect(() => {

        fetchDetail()

    }, [fetchDetail])


    const formatDateTime = (dateTime) => {

        if (!dateTime) {

            return '-'
        }


        return new Date(
            dateTime
        ).toLocaleString()
    }


    if (loading) {

        return (

            <div className="p-8">

                실행 상세 조회 중...

            </div>
        )
    }


    return (

        <div className="min-h-screen bg-gray-100">


            <header
                className="
                    bg-gray-900
                    text-white
                    px-8
                    py-4
                    flex
                    justify-between
                    items-center
                "
            >

                <h1 className="text-xl font-bold">

                    Batch Management

                </h1>


                <button
                    type="button"
                    onClick={onLogout}
                    className="
                        bg-gray-700
                        px-4
                        py-2
                        rounded-lg
                    "
                >

                    로그아웃

                </button>

            </header>


            <main className="p-8">

                <div className="max-w-6xl mx-auto">


                    {message && (

                        <div
                            className="
                                bg-red-50
                                text-red-600
                                border
                                border-red-200
                                rounded-lg
                                p-4
                                mb-6
                            "
                        >

                            {message}

                        </div>

                    )}


                    {execution && (

                        <>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate(
                                        `/batch-jobs/${execution.batchJobId}/executions`
                                    )
                                }
                                className="
                                    text-blue-600
                                    hover:underline
                                    mb-4
                                "
                            >

                                ← 실행 이력

                            </button>


                            <h2 className="text-3xl font-bold">

                                실행 상세

                            </h2>


                            <p className="text-gray-500 mt-2 mb-8">

                                {execution.batchJobName}

                                {' · '}

                                실행 #{execution.id}

                            </p>


                            {/* 실행 정보 */}

                            <section
                                className="
                                    bg-white
                                    rounded-xl
                                    shadow
                                    p-6
                                    mb-8
                                "
                            >

                                <h3
                                    className="
                                        text-xl
                                        font-bold
                                        mb-5
                                    "
                                >

                                    실행 정보

                                </h3>


                                <div
                                    className="
                                        grid
                                        grid-cols-2
                                        md:grid-cols-4
                                        gap-6
                                    "
                                >

                                    <Info
                                        label="상태"
                                        value={execution.status}
                                    />

                                    <Info
                                        label="실행 방식"
                                        value={execution.triggerType}
                                    />

                                    <Info
                                        label="성공 건수"
                                        value={execution.successCount}
                                    />

                                    <Info
                                        label="실패 건수"
                                        value={execution.failCount}
                                    />

                                    <Info
                                        label="시작 시간"
                                        value={
                                            formatDateTime(
                                                execution.startTime
                                            )
                                        }
                                    />

                                    <Info
                                        label="종료 시간"
                                        value={
                                            formatDateTime(
                                                execution.endTime
                                            )
                                        }
                                    />

                                    <Info
                                        label="실행 관리자 ID"
                                        value={
                                            execution.executedById
                                            ?? '-'
                                        }
                                    />

                                </div>


                                <div className="mt-6">

                                    <p
                                        className="
                                            text-sm
                                            text-gray-500
                                            mb-2
                                        "
                                    >

                                        실행 로그

                                    </p>


                                    <pre
                                        className="
                                            bg-gray-900
                                            text-gray-100
                                            rounded-lg
                                            p-4
                                            whitespace-pre-wrap
                                            overflow-x-auto
                                        "
                                    >

                                        {
                                            execution.logMessage
                                            || '로그가 없습니다.'
                                        }

                                    </pre>

                                </div>

                            </section>


                            {/* Error / Skip */}

                            <section
                                className="
                                    bg-white
                                    rounded-xl
                                    shadow
                                    p-6
                                    mb-8
                                "
                            >

                                <h3
                                    className="
                                        text-xl
                                        font-bold
                                        mb-5
                                    "
                                >

                                    오류 / Skip 이력

                                </h3>


                                {errors.length === 0 ? (

                                    <p className="text-gray-500">

                                        오류 이력이 없습니다.

                                    </p>

                                ) : (

                                    <div className="space-y-4">

                                        {errors.map(
                                            (error) => (

                                                <div
                                                    key={error.id}
                                                    className="
                                                        border
                                                        rounded-lg
                                                        p-4
                                                    "
                                                >

                                                    <p className="font-bold">

                                                        {
                                                            error
                                                                .exceptionType
                                                        }

                                                    </p>


                                                    <p
                                                        className="
                                                            text-sm
                                                            text-gray-600
                                                            mt-2
                                                        "
                                                    >

                                                        Item ID:
                                                        {' '}
                                                        {
                                                            error.itemId
                                                            ?? '-'
                                                        }

                                                    </p>


                                                    <p
                                                        className="
                                                            text-red-600
                                                            mt-2
                                                        "
                                                    >

                                                        {
                                                            error
                                                                .errorMessage
                                                        }

                                                    </p>


                                                    <p
                                                        className="
                                                            text-xs
                                                            text-gray-400
                                                            mt-2
                                                        "
                                                    >

                                                        {
                                                            formatDateTime(
                                                                error.createdAt
                                                            )
                                                        }

                                                    </p>

                                                </div>

                                            )
                                        )}

                                    </div>

                                )}

                            </section>


                            {/* Slack */}

                            <section
                                className="
                                    bg-white
                                    rounded-xl
                                    shadow
                                    p-6
                                "
                            >

                                <h3
                                    className="
                                        text-xl
                                        font-bold
                                        mb-5
                                    "
                                >

                                    알림 이력

                                </h3>


                                {notifications.length === 0 ? (

                                    <p className="text-gray-500">

                                        알림 이력이 없습니다.

                                    </p>

                                ) : (

                                    <div className="space-y-4">

                                        {notifications.map(
                                            (notification) => (

                                                <div
                                                    key={notification.id}
                                                    className="
                                                        border
                                                        rounded-lg
                                                        p-4
                                                    "
                                                >

                                                    <div
                                                        className="
                                                            flex
                                                            gap-4
                                                            mb-2
                                                        "
                                                    >

                                                        <span className="font-bold">

                                                            {
                                                                notification
                                                                    .channel
                                                            }

                                                        </span>


                                                        <span>

                                                            {
                                                                notification
                                                                    .status
                                                            }

                                                        </span>

                                                    </div>


                                                    <p>

                                                        {
                                                            notification
                                                                .message
                                                        }

                                                    </p>


                                                    <p
                                                        className="
                                                            text-xs
                                                            text-gray-400
                                                            mt-2
                                                        "
                                                    >

                                                        {
                                                            formatDateTime(
                                                                notification.sentAt
                                                            )
                                                        }

                                                    </p>

                                                </div>

                                            )
                                        )}

                                    </div>

                                )}

                            </section>

                        </>

                    )}

                </div>

            </main>

        </div>
    )
}


function Info({
                  label,
                  value,
              }) {

    return (

        <div>

            <p className="text-sm text-gray-500">

                {label}

            </p>


            <p className="font-bold mt-1">

                {value ?? '-'}

            </p>

        </div>
    )
}


export default BatchExecutionDetailPage
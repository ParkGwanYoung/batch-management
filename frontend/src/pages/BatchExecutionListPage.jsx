import {
    useCallback,
    useEffect,
    useState,
} from 'react'

import {
    useNavigate,
    useParams,
} from 'react-router'


function BatchExecutionListPage({
                                    accessToken,
                                    onLogout,
                                }) {

    const { jobId } = useParams()

    const navigate = useNavigate()


    const [batchJob, setBatchJob] =
        useState(null)

    const [executions, setExecutions] =
        useState([])

    const [loading, setLoading] =
        useState(true)

    const [message, setMessage] =
        useState('')


    const [page, setPage] =
        useState(0)

    const [totalPages, setTotalPages] =
        useState(0)

    const [totalElements, setTotalElements] =
        useState(0)


    // =========================================================
    // 실행 이력 조회
    // =========================================================

    const fetchData = useCallback(
        async (pageNumber) => {

            setLoading(true)
            setMessage('')


            try {

                const headers = {

                    Authorization:
                        `Bearer ${accessToken}`,
                }


                const [
                    jobResponse,
                    executionResponse,
                ] = await Promise.all([

                    fetch(
                        `/api/batch-jobs/${jobId}`,
                        {
                            headers,
                        }
                    ),

                    fetch(
                        `/api/batch-executions?batchJobId=${jobId}&page=${pageNumber}&size=10&sort=id,desc`,
                        {
                            headers,
                        }
                    ),
                ])


                if (
                    jobResponse.status === 401 ||
                    executionResponse.status === 401
                ) {

                    onLogout()

                    return
                }


                if (!jobResponse.ok) {

                    throw new Error(
                        '배치 정보를 조회할 수 없습니다.'
                    )
                }


                if (!executionResponse.ok) {

                    throw new Error(
                        '실행 이력 조회에 실패했습니다.'
                    )
                }


                const jobData =
                    await jobResponse.json()

                const executionData =
                    await executionResponse.json()


                setBatchJob(jobData)

                setExecutions(
                    executionData.content ?? []
                )

                setPage(
                    executionData.number ?? 0
                )

                setTotalPages(
                    executionData.totalPages ?? 0
                )

                setTotalElements(
                    executionData.totalElements ?? 0
                )

            } catch (error) {

                setMessage(error.message)

                setExecutions([])

            } finally {

                setLoading(false)
            }

        },
        [
            accessToken,
            jobId,
            onLogout,
        ]
    )


    useEffect(() => {

        fetchData(0)

    }, [fetchData])


    // =========================================================
    // 페이지 변경
    // =========================================================

    const handlePageChange = (newPage) => {

        if (
            newPage < 0 ||
            newPage >= totalPages
        ) {
            return
        }


        fetchData(newPage)
    }


    // =========================================================
    // 날짜
    // =========================================================

    const formatDateTime = (dateTime) => {

        if (!dateTime) {

            return '-'
        }


        return new Date(
            dateTime
        ).toLocaleString()
    }


    // =========================================================
    // 상태 Style
    // =========================================================

    const getStatusClass = (status) => {

        switch (status) {

            case 'SUCCESS':

                return 'text-green-600'


            case 'FAILED':

                return 'text-red-500'


            case 'RUNNING':

                return 'text-blue-500'


            case 'WAITING':

                return 'text-yellow-600'


            default:

                return 'text-gray-500'
        }
    }


    return (

        <div className="min-h-screen bg-gray-100">


            {/* Header */}

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


                <div className="flex gap-3">

                    <button
                        type="button"
                        onClick={() =>
                            navigate('/dashboard')
                        }
                        className="
                            bg-blue-600
                            px-4
                            py-2
                            rounded-lg
                        "
                    >

                        대시보드

                    </button>


                    <button
                        type="button"
                        onClick={() =>
                            navigate('/batch-jobs')
                        }
                        className="
                            bg-gray-600
                            px-4
                            py-2
                            rounded-lg
                        "
                    >

                        배치 관리

                    </button>


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

                </div>

            </header>


            <main className="p-8">

                <div className="max-w-7xl mx-auto">


                    <div className="mb-8">

                        <button
                            type="button"
                            onClick={() =>
                                navigate('/batch-jobs')
                            }
                            className="
                                text-blue-600
                                hover:underline
                                mb-4
                            "
                        >

                            ← 배치 관리

                        </button>


                        <h2 className="text-3xl font-bold">

                            실행 이력

                        </h2>


                        {batchJob && (

                            <p
                                className="
                                    text-gray-500
                                    mt-2
                                "
                            >

                                {batchJob.name}

                                {' · '}

                                총 {totalElements}건

                            </p>

                        )}

                    </div>


                    {message && (

                        <div
                            className="
                                bg-red-50
                                border
                                border-red-200
                                text-red-600
                                p-4
                                rounded-lg
                                mb-5
                            "
                        >

                            {message}

                        </div>

                    )}


                    {loading ? (

                        <p>
                            실행 이력 조회 중...
                        </p>

                    ) : (

                        <div
                            className="
                                bg-white
                                rounded-xl
                                shadow
                                overflow-x-auto
                            "
                        >

                            <table className="w-full">

                                <thead className="bg-gray-200">

                                <tr>

                                    <th className="text-left px-5 py-4">
                                        ID
                                    </th>

                                    <th className="text-left px-5 py-4">
                                        상태
                                    </th>

                                    <th className="text-left px-5 py-4">
                                        실행 방식
                                    </th>

                                    <th className="text-left px-5 py-4">
                                        시작 시간
                                    </th>

                                    <th className="text-left px-5 py-4">
                                        종료 시간
                                    </th>

                                    <th className="text-left px-5 py-4">
                                        성공
                                    </th>

                                    <th className="text-left px-5 py-4">
                                        실패
                                    </th>

                                    <th className="text-left px-5 py-4">
                                        관리
                                    </th>

                                </tr>

                                </thead>


                                <tbody>

                                {executions.map(
                                    (execution) => (

                                        <tr
                                            key={execution.id}
                                            className="
                                                    border-t
                                                    hover:bg-gray-50
                                                "
                                        >

                                            <td className="px-5 py-4">

                                                {execution.id}

                                            </td>


                                            <td className="px-5 py-4">

                                                    <span
                                                        className={`
                                                            font-bold
                                                            ${getStatusClass(
                                                            execution.status
                                                        )}
                                                        `}
                                                    >

                                                        {execution.status}

                                                    </span>

                                            </td>


                                            <td className="px-5 py-4">

                                                {
                                                    execution
                                                        .triggerType
                                                }

                                            </td>


                                            <td className="px-5 py-4">

                                                {formatDateTime(
                                                    execution.startTime
                                                )}

                                            </td>


                                            <td className="px-5 py-4">

                                                {formatDateTime(
                                                    execution.endTime
                                                )}

                                            </td>


                                            <td className="px-5 py-4">

                                                {
                                                    execution
                                                        .successCount
                                                    ?? '-'
                                                }

                                            </td>


                                            <td className="px-5 py-4">

                                                {
                                                    execution
                                                        .failCount
                                                    ?? '-'
                                                }

                                            </td>


                                            <td className="px-5 py-4">

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        navigate(
                                                            `/executions/${execution.id}`
                                                        )
                                                    }
                                                    className="
                                                            bg-gray-800
                                                            text-white
                                                            px-4
                                                            py-2
                                                            rounded-lg
                                                            hover:bg-gray-700
                                                        "
                                                >

                                                    상세

                                                </button>

                                            </td>

                                        </tr>

                                    )
                                )}


                                {executions.length === 0 && (

                                    <tr>

                                        <td
                                            colSpan="8"
                                            className="
                                                    text-center
                                                    py-10
                                                    text-gray-500
                                                "
                                        >

                                            실행 이력이 없습니다.

                                        </td>

                                    </tr>

                                )}

                                </tbody>

                            </table>

                        </div>

                    )}


                    {/* Pagination */}

                    {!loading &&
                        totalPages > 0 && (

                            <div
                                className="
                                    flex
                                    justify-center
                                    items-center
                                    gap-4
                                    mt-6
                                "
                            >

                                <button
                                    type="button"
                                    disabled={page === 0}
                                    onClick={() =>
                                        handlePageChange(
                                            page - 1
                                        )
                                    }
                                    className="
                                        bg-white
                                        border
                                        px-4
                                        py-2
                                        rounded-lg
                                        disabled:text-gray-300
                                    "
                                >

                                    이전

                                </button>


                                <span>

                                    {page + 1}
                                    {' / '}
                                    {totalPages}

                                </span>


                                <button
                                    type="button"
                                    disabled={
                                        page + 1
                                        >= totalPages
                                    }
                                    onClick={() =>
                                        handlePageChange(
                                            page + 1
                                        )
                                    }
                                    className="
                                        bg-white
                                        border
                                        px-4
                                        py-2
                                        rounded-lg
                                        disabled:text-gray-300
                                    "
                                >

                                    다음

                                </button>

                            </div>

                        )}

                </div>

            </main>

        </div>
    )
}


export default BatchExecutionListPage
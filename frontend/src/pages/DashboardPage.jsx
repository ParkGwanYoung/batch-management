import { useCallback, useEffect, useState } from 'react'


function DashboardPage({
                           accessToken,
                           onLogout,
                           onOpenBatchJobs,
                       }) {

    // =========================================================
    // Dashboard Summary
    // =========================================================

    const [summary, setSummary] = useState(null)


    // =========================================================
    // 배치 목록
    // - 검색조건 BatchJob 선택용
    // =========================================================

    const [batchJobs, setBatchJobs] = useState([])


    // =========================================================
    // QueryDSL 실행 분석 검색 조건
    // =========================================================

    const [searchCondition, setSearchCondition] = useState({

        startDate: '',
        endDate: '',

        batchJobId: '',
        batchJobName: '',

        status: '',
        triggerType: '',

        minFailCount: '',

        sortBy: 'id',
        direction: 'desc',

        page: 0,
        size: 10,
    })


    // =========================================================
    // 실행 분석 결과
    // =========================================================

    const [executions, setExecutions] = useState([])

    const [totalElements, setTotalElements] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [currentPage, setCurrentPage] = useState(0)


    // =========================================================
    // 화면 상태
    // =========================================================

    const [loading, setLoading] = useState(true)
    const [searchLoading, setSearchLoading] = useState(false)

    const [message, setMessage] = useState('')


    // =========================================================
    // 공통 인증 Header
    // =========================================================

    const authHeaders = {
        Authorization: `Bearer ${accessToken}`,
    }


    // =========================================================
    // 1. Dashboard Summary 조회
    // =========================================================

    const fetchSummary = useCallback(async () => {

        const response = await fetch(
            '/api/dashboard/summary',
            {
                method: 'GET',
                headers: authHeaders,
            }
        )


        if (response.status === 401) {

            onLogout()

            return null
        }


        if (response.status === 403) {

            throw new Error(
                '대시보드 조회 권한이 없습니다.'
            )
        }


        if (!response.ok) {

            throw new Error(
                '대시보드 요약 조회에 실패했습니다.'
            )
        }


        return response.json()

    }, [accessToken, onLogout])


    // =========================================================
    // 2. BatchJob 목록 조회
    //
    // 검색조건 Select에 사용
    // =========================================================

    const fetchBatchJobs = useCallback(async () => {

        const response = await fetch(
            '/api/batch-jobs?page=0&size=100',
            {
                method: 'GET',
                headers: authHeaders,
            }
        )


        if (response.status === 401) {

            onLogout()

            return null
        }


        if (!response.ok) {

            throw new Error(
                '배치 목록 조회에 실패했습니다.'
            )
        }


        const data = await response.json()

        return data.content

    }, [accessToken, onLogout])


    // =========================================================
    // 3. QueryDSL 실행 분석 조회
    // =========================================================

    const fetchExecutions = useCallback(
        async (condition) => {

            setSearchLoading(true)
            setMessage('')


            try {

                // ---------------------------------------------
                // URL Query Parameter 생성
                // ---------------------------------------------

                const params =
                    new URLSearchParams()


                if (condition.startDate) {

                    params.append(
                        'startDate',
                        condition.startDate
                    )
                }


                if (condition.endDate) {

                    params.append(
                        'endDate',
                        condition.endDate
                    )
                }


                if (condition.batchJobId) {

                    params.append(
                        'batchJobId',
                        condition.batchJobId
                    )
                }


                if (condition.batchJobName.trim()) {

                    params.append(
                        'batchJobName',
                        condition.batchJobName.trim()
                    )
                }


                if (condition.status) {

                    params.append(
                        'status',
                        condition.status
                    )
                }


                if (condition.triggerType) {

                    params.append(
                        'triggerType',
                        condition.triggerType
                    )
                }


                if (condition.minFailCount !== '') {

                    params.append(
                        'minFailCount',
                        condition.minFailCount
                    )
                }


                params.append(
                    'sortBy',
                    condition.sortBy
                )


                params.append(
                    'direction',
                    condition.direction
                )


                params.append(
                    'page',
                    condition.page
                )


                params.append(
                    'size',
                    condition.size
                )


                // ---------------------------------------------
                // QueryDSL API 호출
                // ---------------------------------------------

                const response = await fetch(
                    `/api/dashboard/executions?${params.toString()}`,
                    {
                        method: 'GET',
                        headers: authHeaders,
                    }
                )


                if (response.status === 401) {

                    onLogout()

                    return
                }


                if (response.status === 403) {

                    throw new Error(
                        '실행 분석 조회 권한이 없습니다.'
                    )
                }


                if (!response.ok) {

                    throw new Error(
                        `실행 분석 조회에 실패했습니다. status=${response.status}`
                    )
                }


                const data =
                    await response.json()


                setExecutions(
                    data.content ?? []
                )


                setTotalElements(
                    data.totalElements ?? 0
                )


                setTotalPages(
                    data.totalPages ?? 0
                )


                setCurrentPage(
                    data.number ?? 0
                )

            } catch (error) {

                setExecutions([])
                setTotalElements(0)
                setTotalPages(0)

                setMessage(
                    error.message
                )

            } finally {

                setSearchLoading(false)
            }

        },
        [accessToken, onLogout]
    )


    // =========================================================
    // 4. 최초 화면 진입
    // =========================================================

    useEffect(() => {

        const initDashboard = async () => {

            setLoading(true)
            setMessage('')


            try {

                // Summary + BatchJob 목록은 서로 독립적
                const [
                    summaryData,
                    batchJobData,
                ] = await Promise.all([

                    fetchSummary(),
                    fetchBatchJobs(),

                ])


                if (summaryData) {

                    setSummary(
                        summaryData
                    )
                }


                if (batchJobData) {

                    setBatchJobs(
                        batchJobData
                    )
                }


            } catch (error) {

                setMessage(
                    error.message
                )

            } finally {

                setLoading(false)
            }
        }


        initDashboard()

    }, [
        fetchSummary,
        fetchBatchJobs,
    ])


    // =========================================================
    // 최초 실행 분석 조회
    // =========================================================

    useEffect(() => {

        fetchExecutions(
            searchCondition
        )

        // 최초 1회만 조회
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])


    // =========================================================
    // 5. 검색 조건 변경
    // =========================================================

    const handleConditionChange = (event) => {

        const {
            name,
            value,
        } = event.target


        setSearchCondition(
            (prev) => ({

                ...prev,

                [name]: value,

            })
        )
    }


    // =========================================================
    // 6. 검색
    // =========================================================

    const handleSearch = async (event) => {

        event.preventDefault()


        // 새로운 검색이므로 무조건 0페이지부터
        const newCondition = {

            ...searchCondition,

            page: 0,
        }


        setSearchCondition(
            newCondition
        )


        await fetchExecutions(
            newCondition
        )
    }


    // =========================================================
    // 7. 검색조건 초기화
    // =========================================================

    const handleReset = async () => {

        const resetCondition = {

            startDate: '',
            endDate: '',

            batchJobId: '',
            batchJobName: '',

            status: '',
            triggerType: '',

            minFailCount: '',

            sortBy: 'id',
            direction: 'desc',

            page: 0,
            size: 10,
        }


        setSearchCondition(
            resetCondition
        )


        await fetchExecutions(
            resetCondition
        )
    }


    // =========================================================
    // 8. 페이지 이동
    // =========================================================

    const handlePageChange = async (page) => {

        if (
            page < 0 ||
            page >= totalPages
        ) {
            return
        }


        const newCondition = {

            ...searchCondition,

            page,
        }


        setSearchCondition(
            newCondition
        )


        await fetchExecutions(
            newCondition
        )
    }


    // =========================================================
    // 날짜 표시
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
    // 상태 Badge
    // =========================================================

    const getStatusClass = (status) => {

        switch (status) {

            case 'SUCCESS':

                return `
                    bg-green-100
                    text-green-700
                `


            case 'FAILED':

                return `
                    bg-red-100
                    text-red-700
                `


            case 'RUNNING':

                return `
                    bg-blue-100
                    text-blue-700
                `


            case 'WAITING':

                return `
                    bg-yellow-100
                    text-yellow-700
                `


            default:

                return `
                    bg-gray-100
                    text-gray-700
                `
        }
    }


    // =========================================================
    // Loading
    // =========================================================

    if (loading) {

        return (

            <div
                className="
                    min-h-screen
                    bg-gray-100
                    flex
                    items-center
                    justify-center
                "
            >

                <p className="text-gray-600">

                    대시보드 조회 중...

                </p>

            </div>
        )
    }


    // =========================================================
    // 화면
    // =========================================================

    return (

        <div className="min-h-screen bg-gray-100">


            {/* =================================================
                Header
            ================================================== */}

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

                <div>

                    <h1 className="text-xl font-bold">

                        Batch Management

                    </h1>

                </div>


                <div className="flex gap-3">


                    <button
                        onClick={onOpenBatchJobs}
                        className="
                            bg-blue-600
                            px-4
                            py-2
                            rounded-lg
                            hover:bg-blue-500
                        "
                    >

                        배치 관리

                    </button>


                    <button
                        onClick={onLogout}
                        className="
                            bg-gray-700
                            px-4
                            py-2
                            rounded-lg
                            hover:bg-gray-600
                        "
                    >

                        로그아웃

                    </button>

                </div>

            </header>


            <main className="p-8">


                <div className="max-w-7xl mx-auto">


                    {/* =================================================
                        Dashboard Title
                    ================================================== */}

                    <div className="mb-8">

                        <h2 className="text-3xl font-bold">

                            대시보드

                        </h2>


                        <p className="text-gray-500 mt-2">

                            배치 운영 현황 및 실행 이력을 분석합니다.

                        </p>

                    </div>


                    {/* =================================================
                        Error
                    ================================================== */}

                    {message && (

                        <div
                            className="
                                bg-red-50
                                border
                                border-red-200
                                text-red-600
                                rounded-lg
                                px-5
                                py-4
                                mb-6
                            "
                        >

                            {message}

                        </div>

                    )}


                    {/* =================================================
                        Summary
                    ================================================== */}

                    {summary && (

                        <div
                            className="
                                grid
                                grid-cols-2
                                md:grid-cols-3
                                xl:grid-cols-6
                                gap-4
                                mb-10
                            "
                        >


                            <SummaryCard
                                title="전체 배치"
                                value={summary.totalJobCount}
                            />


                            <SummaryCard
                                title="활성 배치"
                                value={summary.activeJobCount}
                                valueClass="text-green-600"
                            />


                            <SummaryCard
                                title="WAITING"
                                value={summary.waitingExecutionCount}
                                valueClass="text-yellow-600"
                            />


                            <SummaryCard
                                title="RUNNING"
                                value={summary.runningExecutionCount}
                                valueClass="text-blue-600"
                            />


                            <SummaryCard
                                title="SUCCESS"
                                value={summary.successExecutionCount}
                                valueClass="text-green-600"
                            />


                            <SummaryCard
                                title="FAILED"
                                value={summary.failedExecutionCount}
                                valueClass="text-red-500"
                            />

                        </div>

                    )}


                    {/* =================================================
                        실행 분석 검색 Form
                    ================================================== */}

                    <section
                        className="
                            bg-white
                            rounded-xl
                            shadow
                            p-6
                            mb-8
                        "
                    >

                        <div className="mb-6">

                            <h3 className="text-xl font-bold">

                                실행 분석

                            </h3>


                            <p className="text-sm text-gray-500 mt-1">

                                복합 조건을 조합하여 배치 실행 이력을 조회합니다.

                            </p>

                        </div>


                        <form onSubmit={handleSearch}>


                            <div
                                className="
                                    grid
                                    grid-cols-1
                                    md:grid-cols-2
                                    xl:grid-cols-4
                                    gap-5
                                "
                            >


                                {/* 시작일 */}

                                <div>

                                    <label
                                        className="
                                            block
                                            text-sm
                                            font-medium
                                            mb-2
                                        "
                                    >

                                        시작일

                                    </label>


                                    <input
                                        type="date"
                                        name="startDate"
                                        value={searchCondition.startDate}
                                        onChange={handleConditionChange}
                                        className="
                                            w-full
                                            border
                                            rounded-lg
                                            px-3
                                            py-2
                                        "
                                    />

                                </div>


                                {/* 종료일 */}

                                <div>

                                    <label
                                        className="
                                            block
                                            text-sm
                                            font-medium
                                            mb-2
                                        "
                                    >

                                        종료일

                                    </label>


                                    <input
                                        type="date"
                                        name="endDate"
                                        value={searchCondition.endDate}
                                        onChange={handleConditionChange}
                                        className="
                                            w-full
                                            border
                                            rounded-lg
                                            px-3
                                            py-2
                                        "
                                    />

                                </div>


                                {/* BatchJob */}

                                <div>

                                    <label
                                        className="
                                            block
                                            text-sm
                                            font-medium
                                            mb-2
                                        "
                                    >

                                        배치 작업

                                    </label>


                                    <select
                                        name="batchJobId"
                                        value={searchCondition.batchJobId}
                                        onChange={handleConditionChange}
                                        className="
                                            w-full
                                            border
                                            rounded-lg
                                            px-3
                                            py-2
                                            bg-white
                                        "
                                    >

                                        <option value="">
                                            전체
                                        </option>


                                        {batchJobs.map(
                                            (job) => (

                                                <option
                                                    key={job.id}
                                                    value={job.id}
                                                >

                                                    {job.name}

                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>


                                {/* 배치명 */}

                                <div>

                                    <label
                                        className="
                                            block
                                            text-sm
                                            font-medium
                                            mb-2
                                        "
                                    >

                                        배치명 검색

                                    </label>


                                    <input
                                        type="text"
                                        name="batchJobName"
                                        value={searchCondition.batchJobName}
                                        onChange={handleConditionChange}
                                        placeholder="예: 회원"
                                        className="
                                            w-full
                                            border
                                            rounded-lg
                                            px-3
                                            py-2
                                        "
                                    />

                                </div>


                                {/* Status */}

                                <div>

                                    <label
                                        className="
                                            block
                                            text-sm
                                            font-medium
                                            mb-2
                                        "
                                    >

                                        실행 상태

                                    </label>


                                    <select
                                        name="status"
                                        value={searchCondition.status}
                                        onChange={handleConditionChange}
                                        className="
                                            w-full
                                            border
                                            rounded-lg
                                            px-3
                                            py-2
                                            bg-white
                                        "
                                    >

                                        <option value="">
                                            전체
                                        </option>

                                        <option value="WAITING">
                                            WAITING
                                        </option>

                                        <option value="RUNNING">
                                            RUNNING
                                        </option>

                                        <option value="SUCCESS">
                                            SUCCESS
                                        </option>

                                        <option value="FAILED">
                                            FAILED
                                        </option>

                                    </select>

                                </div>


                                {/* Trigger */}

                                <div>

                                    <label
                                        className="
                                            block
                                            text-sm
                                            font-medium
                                            mb-2
                                        "
                                    >

                                        실행 방식

                                    </label>


                                    <select
                                        name="triggerType"
                                        value={searchCondition.triggerType}
                                        onChange={handleConditionChange}
                                        className="
                                            w-full
                                            border
                                            rounded-lg
                                            px-3
                                            py-2
                                            bg-white
                                        "
                                    >

                                        <option value="">
                                            전체
                                        </option>

                                        <option value="MANUAL">
                                            MANUAL
                                        </option>

                                        <option value="AUTO">
                                            AUTO
                                        </option>

                                    </select>

                                </div>


                                {/* 최소 실패 */}

                                <div>

                                    <label
                                        className="
                                            block
                                            text-sm
                                            font-medium
                                            mb-2
                                        "
                                    >

                                        최소 실패 건수

                                    </label>


                                    <input
                                        type="number"
                                        min="0"
                                        name="minFailCount"
                                        value={searchCondition.minFailCount}
                                        onChange={handleConditionChange}
                                        placeholder="예: 1"
                                        className="
                                            w-full
                                            border
                                            rounded-lg
                                            px-3
                                            py-2
                                        "
                                    />

                                </div>


                                {/* 정렬 */}

                                <div>

                                    <label
                                        className="
                                            block
                                            text-sm
                                            font-medium
                                            mb-2
                                        "
                                    >

                                        정렬

                                    </label>


                                    <select
                                        name="sortBy"
                                        value={searchCondition.sortBy}
                                        onChange={handleConditionChange}
                                        className="
                                            w-full
                                            border
                                            rounded-lg
                                            px-3
                                            py-2
                                            bg-white
                                        "
                                    >

                                        <option value="id">
                                            실행 ID
                                        </option>

                                        <option value="startTime">
                                            시작 시간
                                        </option>

                                        <option value="failCount">
                                            실패 건수
                                        </option>

                                        <option value="successCount">
                                            성공 건수
                                        </option>

                                    </select>

                                </div>

                            </div>


                            {/* 정렬 방향 */}

                            <div
                                className="
                                    flex
                                    flex-wrap
                                    justify-between
                                    items-end
                                    gap-4
                                    mt-6
                                "
                            >

                                <div>

                                    <label
                                        className="
                                            block
                                            text-sm
                                            font-medium
                                            mb-2
                                        "
                                    >

                                        정렬 방향

                                    </label>


                                    <select
                                        name="direction"
                                        value={searchCondition.direction}
                                        onChange={handleConditionChange}
                                        className="
                                            border
                                            rounded-lg
                                            px-4
                                            py-2
                                            bg-white
                                        "
                                    >

                                        <option value="desc">
                                            내림차순
                                        </option>

                                        <option value="asc">
                                            오름차순
                                        </option>

                                    </select>

                                </div>


                                <div className="flex gap-3">

                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="
                                            bg-gray-500
                                            text-white
                                            px-5
                                            py-2
                                            rounded-lg
                                            hover:bg-gray-400
                                        "
                                    >

                                        초기화

                                    </button>


                                    <button
                                        type="submit"
                                        disabled={searchLoading}
                                        className="
                                            bg-blue-600
                                            text-white
                                            px-6
                                            py-2
                                            rounded-lg
                                            hover:bg-blue-500
                                            disabled:bg-gray-400
                                        "
                                    >

                                        {searchLoading
                                            ? '조회 중...'
                                            : '검색'}

                                    </button>

                                </div>

                            </div>

                        </form>

                    </section>


                    {/* =================================================
                        검색 결과
                    ================================================== */}

                    <section>

                        <div
                            className="
                                flex
                                justify-between
                                items-center
                                mb-4
                            "
                        >

                            <div>

                                <h3 className="text-xl font-bold">

                                    검색 결과

                                </h3>


                                <p
                                    className="
                                        text-sm
                                        text-gray-500
                                        mt-1
                                    "
                                >

                                    총 {totalElements}건

                                </p>

                            </div>

                        </div>


                        <div
                            className="
                                bg-white
                                rounded-xl
                                shadow
                                overflow-x-auto
                            "
                        >

                            <table className="w-full min-w-[1100px]">

                                <thead className="bg-gray-200">

                                <tr>

                                    <th className="text-left px-5 py-4">
                                        ID
                                    </th>

                                    <th className="text-left px-5 py-4">
                                        배치명
                                    </th>

                                    <th className="text-left px-5 py-4">
                                        상태
                                    </th>

                                    <th className="text-left px-5 py-4">
                                        방식
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

                                </tr>

                                </thead>


                                <tbody>

                                {searchLoading ? (

                                    <tr>

                                        <td
                                            colSpan="8"
                                            className="
                                                    text-center
                                                    py-10
                                                    text-gray-500
                                                "
                                        >

                                            조회 중...

                                        </td>

                                    </tr>

                                ) : executions.length === 0 ? (

                                    <tr>

                                        <td
                                            colSpan="8"
                                            className="
                                                    text-center
                                                    py-10
                                                    text-gray-500
                                                "
                                        >

                                            조건에 맞는 실행 이력이 없습니다.

                                        </td>

                                    </tr>

                                ) : (

                                    executions.map(
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


                                                <td
                                                    className="
                                                            px-5
                                                            py-4
                                                            font-medium
                                                        "
                                                >

                                                    {execution.batchJobName}

                                                </td>


                                                <td className="px-5 py-4">

                                                        <span
                                                            className={`
                                                                px-3
                                                                py-1
                                                                rounded-full
                                                                text-sm
                                                                font-medium
                                                                ${getStatusClass(
                                                                execution.status
                                                            )}
                                                            `}
                                                        >

                                                            {execution.status}

                                                        </span>

                                                </td>


                                                <td className="px-5 py-4">

                                                    {execution.triggerType}

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


                                                <td
                                                    className="
                                                            px-5
                                                            py-4
                                                            text-green-600
                                                            font-medium
                                                        "
                                                >

                                                    {
                                                        execution
                                                            .successCount
                                                        ?? '-'
                                                    }

                                                </td>


                                                <td
                                                    className="
                                                            px-5
                                                            py-4
                                                            text-red-500
                                                            font-medium
                                                        "
                                                >

                                                    {
                                                        execution
                                                            .failCount
                                                        ?? '-'
                                                    }

                                                </td>

                                            </tr>

                                        )
                                    )

                                )}

                                </tbody>

                            </table>

                        </div>


                        {/* =================================================
                            Pagination
                        ================================================== */}

                        {totalPages > 0 && (

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
                                    onClick={() =>
                                        handlePageChange(
                                            currentPage - 1
                                        )
                                    }
                                    disabled={currentPage === 0}
                                    className="
                                        border
                                        bg-white
                                        px-4
                                        py-2
                                        rounded-lg
                                        disabled:text-gray-300
                                        disabled:cursor-not-allowed
                                    "
                                >

                                    이전

                                </button>


                                <span className="font-medium">

                                    {currentPage + 1}
                                    {' / '}
                                    {totalPages}

                                </span>


                                <button
                                    onClick={() =>
                                        handlePageChange(
                                            currentPage + 1
                                        )
                                    }
                                    disabled={
                                        currentPage + 1
                                        >= totalPages
                                    }
                                    className="
                                        border
                                        bg-white
                                        px-4
                                        py-2
                                        rounded-lg
                                        disabled:text-gray-300
                                        disabled:cursor-not-allowed
                                    "
                                >

                                    다음

                                </button>

                            </div>

                        )}

                    </section>

                </div>

            </main>

        </div>
    )
}


// =============================================================
// Summary Card
// =============================================================

function SummaryCard({
                         title,
                         value,
                         valueClass = '',
                     }) {

    return (

        <div
            className="
                bg-white
                rounded-xl
                shadow
                p-5
            "
        >

            <p className="text-sm text-gray-500">

                {title}

            </p>


            <p
                className={`
                    text-3xl
                    font-bold
                    mt-2
                    ${valueClass}
                `}
            >

                {value ?? 0}

            </p>

        </div>

    )
}


export default DashboardPage
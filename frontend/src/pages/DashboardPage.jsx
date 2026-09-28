import { useCallback, useEffect, useState } from 'react'

const INITIAL_SEARCH_CONDITION = {
    startDate: '',
    endDate: '',
    batchJobName: '',
    status: '',
    triggerType: '',
    minFailCount: '',
    sortBy: 'id',
    direction: 'desc',
    page: 0,
    size: 10,
}

function DashboardPage({
                           accessToken,
                           onLogout,
                           onOpenBatchJobs,
                       }) {
    const [summary, setSummary] = useState(null)
    const [searchCondition, setSearchCondition] = useState(
        INITIAL_SEARCH_CONDITION
    )

    const [executions, setExecutions] = useState([])
    const [totalElements, setTotalElements] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [currentPage, setCurrentPage] = useState(0)

    const [loading, setLoading] = useState(true)
    const [searchLoading, setSearchLoading] = useState(false)
    const [message, setMessage] = useState('')

    const fetchSummary = useCallback(async () => {
        const response = await fetch('/api/dashboard/summary', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })

        if (response.status === 401) {
            onLogout()
            return null
        }

        if (response.status === 403) {
            throw new Error('대시보드 조회 권한이 없습니다.')
        }

        if (!response.ok) {
            throw new Error('대시보드 요약 조회에 실패했습니다.')
        }

        return response.json()
    }, [accessToken, onLogout])

    const fetchExecutions = useCallback(
        async (condition) => {
            setSearchLoading(true)
            setMessage('')

            try {
                const params = new URLSearchParams()

                if (condition.startDate) {
                    params.set('startDate', condition.startDate)
                }

                if (condition.endDate) {
                    params.set('endDate', condition.endDate)
                }

                if (condition.batchJobName.trim()) {
                    params.set(
                        'batchJobName',
                        condition.batchJobName.trim()
                    )
                }

                if (condition.status) {
                    params.set('status', condition.status)
                }

                if (condition.triggerType) {
                    params.set('triggerType', condition.triggerType)
                }

                if (condition.minFailCount !== '') {
                    params.set('minFailCount', condition.minFailCount)
                }

                params.set('sortBy', condition.sortBy)
                params.set('direction', condition.direction)
                params.set('page', String(condition.page))
                params.set('size', String(condition.size))

                const response = await fetch(
                    `/api/dashboard/executions?${params.toString()}`,
                    {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                )

                if (response.status === 401) {
                    onLogout()
                    return
                }

                if (response.status === 403) {
                    throw new Error('실행 분석 조회 권한이 없습니다.')
                }

                if (!response.ok) {
                    throw new Error(
                        `실행 분석 조회에 실패했습니다. status=${response.status}`
                    )
                }

                const data = await response.json()

                setExecutions(data.content ?? [])
                setTotalElements(data.totalElements ?? 0)
                setTotalPages(data.totalPages ?? 0)
                setCurrentPage(data.number ?? 0)
            } catch (error) {
                setExecutions([])
                setTotalElements(0)
                setTotalPages(0)
                setCurrentPage(0)
                setMessage(error.message)
            } finally {
                setSearchLoading(false)
            }
        },
        [accessToken, onLogout]
    )

    useEffect(() => {
        let cancelled = false

        const initializeDashboard = async () => {
            setLoading(true)
            setMessage('')

            try {
                const summaryData = await fetchSummary()

                if (!cancelled && summaryData) {
                    setSummary(summaryData)
                }
            } catch (error) {
                if (!cancelled) {
                    setMessage(error.message)
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        initializeDashboard()

        return () => {
            cancelled = true
        }
    }, [fetchSummary])

    useEffect(() => {
        fetchExecutions(INITIAL_SEARCH_CONDITION)
    }, [fetchExecutions])

    const handleConditionChange = (event) => {
        const { name, value } = event.target

        setSearchCondition((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    const handleSearch = async (event) => {
        event.preventDefault()

        const nextCondition = {
            ...searchCondition,
            page: 0,
        }

        setSearchCondition(nextCondition)
        await fetchExecutions(nextCondition)
    }

    const handleReset = async () => {
        setSearchCondition(INITIAL_SEARCH_CONDITION)
        await fetchExecutions(INITIAL_SEARCH_CONDITION)
    }

    const handlePageChange = async (page) => {
        if (page < 0 || page >= totalPages || searchLoading) {
            return
        }

        const nextCondition = {
            ...searchCondition,
            page,
        }

        setSearchCondition(nextCondition)
        await fetchExecutions(nextCondition)
    }

    const formatDateTime = (dateTime) => {
        if (!dateTime) {
            return '-'
        }

        return new Date(dateTime).toLocaleString()
    }

    const getStatusClass = (status) => {
        switch (status) {
            case 'SUCCESS':
                return 'bg-green-100 text-green-700'
            case 'FAILED':
                return 'bg-red-100 text-red-700'
            case 'RUNNING':
                return 'bg-blue-100 text-blue-700'
            case 'WAITING':
                return 'bg-yellow-100 text-yellow-700'
            default:
                return 'bg-gray-100 text-gray-700'
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <p className="text-gray-600">
                    대시보드 조회 중...
                </p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-gray-900 text-white px-8 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold">
                    Batch Management
                </h1>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onOpenBatchJobs}
                        className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-500"
                    >
                        배치 관리
                    </button>

                    <button
                        type="button"
                        onClick={onLogout}
                        className="bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600"
                    >
                        로그아웃
                    </button>
                </div>
            </header>

            <main className="p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold">
                            대시보드
                        </h2>

                        <p className="text-gray-500 mt-2">
                            배치 운영 현황과 실행 이력을 확인합니다.
                        </p>
                    </div>

                    {message && (
                        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-5 py-4 mb-6">
                            {message}
                        </div>
                    )}

                    {summary && (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-10">
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

                    <section className="bg-white rounded-xl shadow p-6 mb-8">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold">
                                실행 분석
                            </h3>

                            <p className="text-sm text-gray-500 mt-1">
                                필요한 조건만 조합하여 배치 실행 이력을 조회합니다.
                            </p>
                        </div>

                        <form onSubmit={handleSearch}>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                                <SearchField label="시작일">
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={searchCondition.startDate}
                                        onChange={handleConditionChange}
                                        className={inputClass}
                                    />
                                </SearchField>

                                <SearchField label="종료일">
                                    <input
                                        type="date"
                                        name="endDate"
                                        value={searchCondition.endDate}
                                        onChange={handleConditionChange}
                                        className={inputClass}
                                    />
                                </SearchField>

                                <SearchField label="배치명">
                                    <input
                                        type="text"
                                        name="batchJobName"
                                        value={searchCondition.batchJobName}
                                        onChange={handleConditionChange}
                                        placeholder="예: 회원"
                                        className={inputClass}
                                    />
                                </SearchField>

                                <SearchField label="실행 상태">
                                    <select
                                        name="status"
                                        value={searchCondition.status}
                                        onChange={handleConditionChange}
                                        className={inputClass}
                                    >
                                        <option value="">전체</option>
                                        <option value="WAITING">WAITING</option>
                                        <option value="RUNNING">RUNNING</option>
                                        <option value="SUCCESS">SUCCESS</option>
                                        <option value="FAILED">FAILED</option>
                                    </select>
                                </SearchField>

                                <SearchField label="실행 방식">
                                    <select
                                        name="triggerType"
                                        value={searchCondition.triggerType}
                                        onChange={handleConditionChange}
                                        className={inputClass}
                                    >
                                        <option value="">전체</option>
                                        <option value="MANUAL">MANUAL</option>
                                        <option value="SCHEDULE">SCHEDULE</option>
                                    </select>
                                </SearchField>

                                <SearchField label="최소 실패 건수">
                                    <input
                                        type="number"
                                        min="0"
                                        name="minFailCount"
                                        value={searchCondition.minFailCount}
                                        onChange={handleConditionChange}
                                        placeholder="예: 1"
                                        className={inputClass}
                                    />
                                </SearchField>

                                <SearchField label="정렬 기준">
                                    <select
                                        name="sortBy"
                                        value={searchCondition.sortBy}
                                        onChange={handleConditionChange}
                                        className={inputClass}
                                    >
                                        <option value="id">실행 ID</option>
                                        <option value="startTime">시작 시간</option>
                                        <option value="failCount">실패 건수</option>
                                        <option value="successCount">성공 건수</option>
                                    </select>
                                </SearchField>

                                <SearchField label="정렬 방향">
                                    <select
                                        name="direction"
                                        value={searchCondition.direction}
                                        onChange={handleConditionChange}
                                        className={inputClass}
                                    >
                                        <option value="desc">내림차순</option>
                                        <option value="asc">오름차순</option>
                                    </select>
                                </SearchField>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    disabled={searchLoading}
                                    className="bg-gray-500 text-white px-5 py-2 rounded-lg hover:bg-gray-400 disabled:bg-gray-300"
                                >
                                    초기화
                                </button>

                                <button
                                    type="submit"
                                    disabled={searchLoading}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500 disabled:bg-gray-400"
                                >
                                    {searchLoading
                                        ? '조회 중...'
                                        : '검색'}
                                </button>
                            </div>
                        </form>
                    </section>

                    <section>
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <h3 className="text-xl font-bold">
                                    실행 이력
                                </h3>

                                <p className="text-sm text-gray-500 mt-1">
                                    총 {totalElements}건
                                </p>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow overflow-x-auto">
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
                                            className="text-center py-10 text-gray-500"
                                        >
                                            조회 중...
                                        </td>
                                    </tr>
                                ) : executions.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="8"
                                            className="text-center py-10 text-gray-500"
                                        >
                                            조건에 맞는 실행 이력이 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    executions.map((execution) => (
                                        <tr
                                            key={execution.id}
                                            className="border-t hover:bg-gray-50"
                                        >
                                            <td className="px-5 py-4">
                                                {execution.id}
                                            </td>

                                            <td className="px-5 py-4 font-medium">
                                                {execution.batchJobName}
                                            </td>

                                            <td className="px-5 py-4">
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(
                                                            execution.status
                                                        )}`}
                                                    >
                                                        {execution.status}
                                                    </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                {execution.triggerType}
                                            </td>

                                            <td className="px-5 py-4 whitespace-nowrap">
                                                {formatDateTime(
                                                    execution.startTime
                                                )}
                                            </td>

                                            <td className="px-5 py-4 whitespace-nowrap">
                                                {formatDateTime(
                                                    execution.endTime
                                                )}
                                            </td>

                                            <td className="px-5 py-4 text-green-600 font-medium">
                                                {execution.successCount ?? '-'}
                                            </td>

                                            <td className="px-5 py-4 text-red-500 font-medium">
                                                {execution.failCount ?? '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 0 && (
                            <div className="flex justify-center items-center gap-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() =>
                                        handlePageChange(currentPage - 1)
                                    }
                                    disabled={
                                        searchLoading ||
                                        currentPage === 0
                                    }
                                    className="border bg-white px-4 py-2 rounded-lg disabled:text-gray-300 disabled:cursor-not-allowed"
                                >
                                    이전
                                </button>

                                <span className="font-medium">
                                    {currentPage + 1} / {totalPages}
                                </span>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handlePageChange(currentPage + 1)
                                    }
                                    disabled={
                                        searchLoading ||
                                        currentPage + 1 >= totalPages
                                    }
                                    className="border bg-white px-4 py-2 rounded-lg disabled:text-gray-300 disabled:cursor-not-allowed"
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

const inputClass =
    'w-full border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'

function SearchField({ label, children }) {
    return (
        <div>
            <label className="block text-sm font-medium mb-2">
                {label}
            </label>
            {children}
        </div>
    )
}

function SummaryCard({
                         title,
                         value,
                         valueClass = '',
                     }) {
    return (
        <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-gray-500">
                {title}
            </p>

            <p className={`text-3xl font-bold mt-2 ${valueClass}`}>
                {value ?? 0}
            </p>
        </div>
    )
}

export default DashboardPage

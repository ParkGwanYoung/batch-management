import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'

function BatchJobListPage({ accessToken, onLogout, onOpenDashboard, onOpenExecutions, }) {

    // =========================================================
    // 배치 작업 목록
    // =========================================================

    const [batchJobs, setBatchJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState('')
    const [keywordInput, setKeywordInput] = useState('')
    const [query, setQuery] = useState({ page: 0, size: 10, keyword: '' })
    const [totalPages, setTotalPages] = useState(0)
    const [totalElements, setTotalElements] = useState(0)
    const listAbortRef = useRef(null)


    // =========================================================
    // 배치 등록 / 수정 Form
    // =========================================================

    // null | create | edit
    const [formMode, setFormMode] = useState(null)

    const [editingJobId, setEditingJobId] = useState(null)

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        cronExpression: '',
        isActive: true,
    })

    const [formLoading, setFormLoading] = useState(false)
    const [formMessage, setFormMessage] = useState('')


    // =========================================================
    // 배치 실행
    // =========================================================

    const [runningJobId, setRunningJobId] = useState(null)
    const [runMessage, setRunMessage] = useState('')


    // =========================================================
    // 실행 이력
    // =========================================================

    const [selectedJob, setSelectedJob] = useState(null)
    const [executions, setExecutions] = useState([])

    const [executionLoading, setExecutionLoading] = useState(false)
    const [executionMessage, setExecutionMessage] = useState('')


    // =========================================================
    // 실행 상세
    // =========================================================

    const [selectedExecution, setSelectedExecution] = useState(null)

    const [executionErrors, setExecutionErrors] = useState([])
    const [notifications, setNotifications] = useState([])

    const [detailLoading, setDetailLoading] = useState(false)
    const [detailMessage, setDetailMessage] = useState('')


    // =========================================================
    // 화면 자동 이동 Ref
    // =========================================================

    const formSectionRef = useRef(null)
    const executionSectionRef = useRef(null)
    const detailSectionRef = useRef(null)


    // =========================================================
    // 공통 Error Response 읽기
    // =========================================================

    const getErrorMessage = async (response, defaultMessage) => {

        try {

            const data = await response.json()

            return data.message || defaultMessage

        } catch {

            return defaultMessage
        }
    }


    // =========================================================
    // 1. 배치 작업 목록 조회
    // =========================================================

    const fetchBatchJobs = useCallback(async () => {
        listAbortRef.current?.abort()
        const controller = new AbortController()
        listAbortRef.current = controller
        setLoading(true)
        setMessage('')

        try {
            const params = new URLSearchParams({
                page: String(query.page),
                size: String(query.size),
                sort: 'id,desc',
            })
            if (query.keyword) params.set('keyword', query.keyword)

            const response = await fetch('/api/batch-jobs?' + params.toString(), {
                headers: { Authorization: `Bearer ${accessToken}` },
                signal: controller.signal,
            })

            if (controller.signal.aborted) return
            if (response.status === 401) {
                onLogout()
                return
            }
            if (!response.ok) {
                throw new Error(
                    response.status === 403
                        ? '배치 목록 조회 권한이 없습니다.'
                        : '배치 목록 조회에 실패했습니다.'
                )
            }

            const data = await response.json()
            if (controller.signal.aborted) return

            const pages = data.totalPages ?? 0
            const lastPage = Math.max(0, pages - 1)
            if (query.page > lastPage) {
                setQuery((prev) => ({ ...prev, page: lastPage }))
                return
            }

            setBatchJobs(data.content ?? [])
            setTotalPages(pages)
            setTotalElements(data.totalElements ?? 0)
        } catch (error) {
            if (controller.signal.aborted) return
            setBatchJobs([])
            setTotalPages(0)
            setTotalElements(0)
            setMessage(error.message)
        } finally {
            if (!controller.signal.aborted) setLoading(false)
        }
    }, [accessToken, onLogout, query])

    useEffect(() => {
        fetchBatchJobs()
        return () => listAbortRef.current?.abort()
    }, [fetchBatchJobs])

    const handleSearch = (event) => {
        event.preventDefault()
        setQuery((prev) => ({
            ...prev,
            page: 0,
            keyword: keywordInput.trim(),
        }))
    }

    const handlePageChange = (page) => {
        if (loading || page < 0 || page >= totalPages) return
        setQuery((prev) => ({ ...prev, page }))
    }

    // =========================================================
    // 2. 신규 등록 Form 열기
    // =========================================================

    const handleOpenCreate = () => {

        setFormMode('create')
        setEditingJobId(null)

        setFormData({
            name: '',
            description: '',
            cronExpression: '',
            isActive: true,
        })

        setFormMessage('')
    }


    // =========================================================
    // 3. 수정 Form 열기
    // =========================================================

    const handleOpenEdit = (job) => {

        setFormMode('edit')
        setEditingJobId(job.id)

        setFormData({
            name: job.name ?? '',
            description: job.description ?? '',
            cronExpression: job.cronExpression ?? '',
            isActive: job.isActive,
        })

        setFormMessage('')
    }


    // =========================================================
    // 4. Form 닫기
    // =========================================================

    const handleCloseForm = () => {

        setFormMode(null)
        setEditingJobId(null)

        setFormData({
            name: '',
            description: '',
            cronExpression: '',
            isActive: true,
        })

        setFormMessage('')
    }


    // =========================================================
    // 5. Input 변경
    // =========================================================

    const handleFormChange = (event) => {

        const { name, value, type, checked } = event.target

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox'
                ? checked
                : value,
        }))
    }


    // =========================================================
    // 6. 배치 등록 / 수정
    // =========================================================

    const handleSubmitJob = async (event) => {

        event.preventDefault()

        if (!formData.name.trim()) {
            setFormMessage('배치명을 입력해주세요.')
            return
        }

        if (!formData.cronExpression.trim()) {
            setFormMessage('Cron Expression을 입력해주세요.')
            return
        }

        setFormLoading(true)
        setFormMessage('')

        try {

            // -----------------------------------------------------
            // 신규 등록
            // -----------------------------------------------------

            if (formMode === 'create') {

                const response = await fetch(
                    '/api/batch-jobs',
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${accessToken}`,
                        },

                        body: JSON.stringify({
                            name: formData.name,
                            description: formData.description,
                            cronExpression: formData.cronExpression,
                        }),
                    }
                )

                if (response.status === 401) {
                    onLogout()
                    return
                }

                if (!response.ok) {

                    const errorMessage =
                        await getErrorMessage(
                            response,
                            '배치 등록에 실패했습니다.'
                        )

                    throw new Error(errorMessage)
                }

                handleCloseForm()

                setRunMessage(
                    '배치 작업이 등록되었습니다.'
                )

                setKeywordInput('')
                if (query.page === 0 && query.keyword === '') {
                    await fetchBatchJobs()
                } else {
                    setQuery((prev) => ({ ...prev, page: 0, keyword: '' }))
                }

                return
            }


            // -----------------------------------------------------
            // 수정
            // -----------------------------------------------------

            if (formMode === 'edit') {

                const response = await fetch(
                    `/api/batch-jobs/${editingJobId}`,
                    {
                        method: 'PUT',

                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${accessToken}`,
                        },

                        body: JSON.stringify({
                            name: formData.name,
                            description: formData.description,
                            cronExpression: formData.cronExpression,
                            isActive: formData.isActive,
                        }),
                    }
                )

                if (response.status === 401) {
                    onLogout()
                    return
                }

                if (!response.ok) {

                    const errorMessage =
                        await getErrorMessage(
                            response,
                            '배치 수정에 실패했습니다.'
                        )

                    throw new Error(errorMessage)
                }

                handleCloseForm()

                setRunMessage(
                    '배치 작업이 수정되었습니다.'
                )

                await fetchBatchJobs()
            }

        } catch (error) {

            setFormMessage(error.message)

        } finally {

            setFormLoading(false)
        }
    }


    // =========================================================
    // 7. 배치 비활성화
    // =========================================================

    const handleDeactivate = async (job) => {

        const confirmed = window.confirm(
            `"${job.name}" 배치를 비활성화하시겠습니까?`
        )

        if (!confirmed) {
            return
        }

        try {

            const response = await fetch(
                `/api/batch-jobs/${job.id}`,
                {
                    method: 'DELETE',

                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            )

            if (response.status === 401) {
                onLogout()
                return
            }

            if (!response.ok) {

                const errorMessage =
                    await getErrorMessage(
                        response,
                        '배치 비활성화에 실패했습니다.'
                    )

                throw new Error(errorMessage)
            }

            setRunMessage(
                `${job.name} 배치가 비활성화되었습니다.`
            )

            await fetchBatchJobs()

        } catch (error) {

            setRunMessage(error.message)
        }
    }


    // =========================================================
    // 8. 실행 이력 조회
    // =========================================================

    const fetchExecutions = async (job) => {

        setSelectedJob(job)

        setExecutionLoading(true)
        setExecutionMessage('')

        // 이전 상세 초기화
        setSelectedExecution(null)
        setExecutionErrors([])
        setNotifications([])
        setDetailMessage('')

        try {

            const response = await fetch(
                `/api/batch-executions?batchJobId=${job.id}&page=0&size=10&sort=id,desc`,
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
                throw new Error(
                    '실행 이력 조회 요청이 거부되었습니다.'
                )
            }

            if (!response.ok) {

                throw new Error(
                    `실행 이력 조회에 실패했습니다. status=${response.status}`
                )
            }

            const data = await response.json()

            setExecutions(data.content)

        } catch (error) {

            setExecutionMessage(error.message)
            setExecutions([])

        } finally {

            setExecutionLoading(false)
        }
    }


    // =========================================================
    // 9. 배치 수동 실행
    // =========================================================

    const handleRun = async (job) => {

        setRunningJobId(job.id)
        setRunMessage('')

        try {

            // -----------------------------------------------------
            // STEP 1. BatchExecution 생성
            // -----------------------------------------------------

            const createResponse = await fetch(
                '/api/batch-executions',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },

                    body: JSON.stringify({
                        batchJobId: job.id,
                    }),
                }
            )

            if (createResponse.status === 401) {
                onLogout()
                return
            }

            if (!createResponse.ok) {

                const errorMessage =
                    await getErrorMessage(
                        createResponse,
                        '배치 실행 이력 생성에 실패했습니다.'
                    )

                throw new Error(errorMessage)
            }

            const createdExecution =
                await createResponse.json()


            // -----------------------------------------------------
            // STEP 2. 실제 Spring Batch 실행
            // -----------------------------------------------------

            const executeResponse = await fetch(
                `/api/batch-executions/${createdExecution.id}/execute`,
                {
                    method: 'POST',

                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            )

            if (executeResponse.status === 401) {
                onLogout()
                return
            }

            if (executeResponse.status === 409) {

                const errorMessage =
                    await getErrorMessage(
                        executeResponse,
                        '이미 실행 중인 배치입니다.'
                    )

                throw new Error(errorMessage)
            }

            if (!executeResponse.ok) {

                const errorMessage =
                    await getErrorMessage(
                        executeResponse,
                        '배치 실행에 실패했습니다.'
                    )

                throw new Error(errorMessage)
            }


            // -----------------------------------------------------
            // STEP 3. 실행 완료
            // -----------------------------------------------------

            const result =
                await executeResponse.json()

            setRunMessage(
                `${job.name} 실행 완료 - 상태: ${result.status}, 성공: ${result.successCount}, 실패: ${result.failCount}`
            )


            // 현재 보고 있는 배치라면 실행 이력 즉시 갱신
            if (selectedJob?.id === job.id) {

                await fetchExecutions(job)
            }

        } catch (error) {

            setRunMessage(error.message)

        } finally {

            setRunningJobId(null)
        }
    }


    // =========================================================
    // 10. 실행 상세 조회
    // =========================================================

    const fetchExecutionDetail = async (execution) => {

        setSelectedExecution(execution)

        setDetailLoading(true)
        setDetailMessage('')

        setExecutionErrors([])
        setNotifications([])

        try {

            // Error와 Notification은 서로 독립적이므로 병렬 조회
            const [
                errorResponse,
                notificationResponse,
            ] = await Promise.all([

                fetch(
                    `/api/batch-executions/${execution.id}/errors`,
                    {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                ),

                fetch(
                    `/api/batch-executions/${execution.id}/notifications`,
                    {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                ),
            ])


            if (
                errorResponse.status === 401 ||
                notificationResponse.status === 401
            ) {
                onLogout()
                return
            }


            if (!errorResponse.ok) {

                throw new Error(
                    `오류 이력 조회 실패 (${errorResponse.status})`
                )
            }


            if (!notificationResponse.ok) {

                throw new Error(
                    `알림 이력 조회 실패 (${notificationResponse.status})`
                )
            }


            const errorData =
                await errorResponse.json()

            const notificationData =
                await notificationResponse.json()


            setExecutionErrors(errorData)
            setNotifications(notificationData)

        } catch (error) {

            setDetailMessage(error.message)

            setExecutionErrors([])
            setNotifications([])

        } finally {

            setDetailLoading(false)
        }
    }


    // =========================================================
    // 11. 날짜 표시
    // =========================================================

    const formatDateTime = (dateTime) => {

        if (!dateTime) {
            return '-'
        }

        return new Date(dateTime).toLocaleString()
    }


    // =========================================================
    // 12. Form 자동 스크롤
    // =========================================================

    useEffect(() => {

        if (
            formMode &&
            formSectionRef.current
        ) {

            formSectionRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            })
        }

    }, [formMode])


    // =========================================================
    // 13. 실행 이력 자동 스크롤
    // =========================================================

    useEffect(() => {

        if (
            selectedJob &&
            !executionLoading &&
            executionSectionRef.current
        ) {

            executionSectionRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            })
        }

    }, [selectedJob, executionLoading])


    // =========================================================
    // 14. 실행 상세 자동 스크롤
    // =========================================================

    useEffect(() => {

        if (
            selectedExecution &&
            !detailLoading &&
            detailSectionRef.current
        ) {

            detailSectionRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            })
        }

    }, [selectedExecution, detailLoading])


    // =========================================================
    // 화면
    // =========================================================

    return (

        <div className="min-h-screen bg-slate-50">

            {/* =====================================================
                Header
            ====================================================== */}

            <header
                className="
                    bg-slate-950
                    text-white
                    border-b
                    border-slate-800
                    px-8
                    py-4
                    flex
                    justify-between
                    items-center
                "
            >

                {/* 왼쪽 서비스명 */}
                <h1 className="text-xl font-bold">
                    Batch Management
                </h1>


                {/* 오른쪽 메뉴 */}
                <div className="flex items-center gap-3">

                    {/* 대시보드 이동 */}
                    <button
                        type="button"
                        onClick={onOpenDashboard}
                        className="
                            bg-white/10
                            text-slate-100
                            border
                            border-white/10
                            px-4
                            py-2
                            rounded-lg
                            hover:bg-white/15
                            transition-colors
                        "
                    >
                        대시보드
                    </button>


                    {/* 로그아웃 */}
                    <button
                        type="button"
                        onClick={onLogout}
                        className="
                            bg-transparent
                            text-slate-300
                            border
                            border-slate-700
                            px-4
                            py-2
                            rounded-lg
                            hover:bg-slate-800
                            hover:text-white
                            transition-colors
                        "
                    >
                        로그아웃
                    </button>

                </div>

            </header>


            <main className="p-8">

                <div className="max-w-7xl mx-auto">


                    {/* =================================================
                        배치 관리 Title
                    ================================================== */}

                    <div className="flex justify-between items-center mb-6">

                        <h2 className="text-2xl font-bold">
                            배치 작업 관리
                        </h2>


                        <button
                            onClick={handleOpenCreate}
                            className="
                                bg-slate-900
                                text-white
                                px-5
                                py-2
                                rounded-lg
                                shadow-sm
                                hover:bg-slate-800
                                transition-colors
                            "
                        >
                            + 배치 등록
                        </button>

                    </div>


                    {/* 공통 결과 메시지 */}

                    {runMessage && (

                        <div className="mb-5 bg-white border border-slate-200 text-slate-700 rounded-xl px-5 py-4 shadow-sm">
                            {runMessage}
                        </div>

                    )}


                    {/* =================================================
                        등록 / 수정 Form
                    ================================================== */}

                    {formMode && (

                        <div
                            ref={formSectionRef}
                            className="
                                bg-white
                                rounded-xl
                                border
                                border-slate-200
                                shadow-sm
                                p-6
                                mb-8
                                scroll-mt-6
                            "
                        >

                            <h3 className="text-xl font-bold mb-6">

                                {formMode === 'create'
                                    ? '배치 신규 등록'
                                    : '배치 수정'}

                            </h3>


                            <form onSubmit={handleSubmitJob}>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">


                                    {/* 배치명 */}

                                    <div>

                                        <label className="block font-medium mb-2">
                                            배치명
                                        </label>

                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleFormChange}
                                            className="
                                                w-full
                                                border
                                                rounded-lg
                                                px-4
                                                py-3
                                                focus:outline-none
                                                focus:ring-2
                                                focus:ring-slate-400
                                            "
                                            placeholder="회원 데이터 동기화"
                                        />

                                    </div>


                                    {/* Cron */}

                                    <div>

                                        <label className="block font-medium mb-2">
                                            Cron Expression
                                        </label>

                                        <input
                                            type="text"
                                            name="cronExpression"
                                            value={formData.cronExpression}
                                            onChange={handleFormChange}
                                            className="
                                                w-full
                                                border
                                                rounded-lg
                                                px-4
                                                py-3
                                                focus:outline-none
                                                focus:ring-2
                                                focus:ring-slate-400
                                            "
                                            placeholder="0 0 2 * * ?"
                                        />

                                    </div>


                                    {/* 설명 */}

                                    <div className="md:col-span-2">

                                        <label className="block font-medium mb-2">
                                            설명
                                        </label>

                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleFormChange}
                                            rows={3}
                                            className="
                                                w-full
                                                border
                                                rounded-lg
                                                px-4
                                                py-3
                                                focus:outline-none
                                                focus:ring-2
                                                focus:ring-slate-400
                                            "
                                            placeholder="배치 작업에 대한 설명"
                                        />

                                    </div>


                                    {/* 수정일 때만 활성 여부 */}

                                    {formMode === 'edit' && (

                                        <div className="md:col-span-2">

                                            <label className="inline-flex items-center gap-3 cursor-pointer">

                                                <input
                                                    type="checkbox"
                                                    name="isActive"
                                                    checked={formData.isActive}
                                                    onChange={handleFormChange}
                                                    className="w-5 h-5 accent-slate-900"
                                                />

                                                <span className="font-medium">
                                                    활성 상태
                                                </span>

                                            </label>

                                        </div>

                                    )}

                                </div>


                                {/* Form 오류 */}

                                {formMessage && (

                                    <p className="mt-4 text-rose-600">
                                        {formMessage}
                                    </p>

                                )}


                                {/* 버튼 */}

                                <div className="flex gap-3 mt-6">

                                    <button
                                        type="submit"
                                        disabled={formLoading}
                                        className="
                                            bg-slate-900
                                            text-white
                                            px-5
                                            py-2
                                            rounded-lg
                                            shadow-sm
                                            hover:bg-slate-800
                                            disabled:bg-slate-200
                                            disabled:text-slate-400
                                            transition-colors
                                        "
                                    >

                                        {formLoading
                                            ? '처리 중...'
                                            : formMode === 'create'
                                                ? '등록'
                                                : '수정'}

                                    </button>


                                    <button
                                        type="button"
                                        onClick={handleCloseForm}
                                        className="
                                            bg-white
                                            text-slate-700
                                            border
                                            border-slate-300
                                            px-5
                                            py-2
                                            rounded-lg
                                            hover:bg-slate-50
                                            transition-colors
                                        "
                                    >
                                        취소
                                    </button>

                                </div>

                            </form>

                        </div>

                    )}


                    {/* =================================================
                        배치 목록
                    ================================================== */}

                    <form
                        onSubmit={handleSearch}
                        className="flex flex-wrap items-center gap-3 mb-5 bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
                    >
                        <label htmlFor="job-keyword" className="font-medium text-slate-700">배치명</label>
                        <input
                            id="job-keyword"
                            value={keywordInput}
                            onChange={(event) => setKeywordInput(event.target.value)}
                            placeholder="배치명 검색"
                            className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-slate-900 text-white rounded-lg px-4 py-2 shadow-sm hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                        >
                            검색
                        </button>
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => {
                                setKeywordInput('')
                                setQuery((prev) => ({ ...prev, page: 0, keyword: '' }))
                            }}
                            className="border border-slate-300 rounded-lg px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        >
                            초기화
                        </button>
                        <label htmlFor="job-page-size" className="font-medium text-slate-700">표시 건수</label>
                        <select
                            id="job-page-size"
                            value={query.size}
                            disabled={loading}
                            onChange={(event) => setQuery((prev) => ({
                                ...prev,
                                page: 0,
                                size: Number(event.target.value),
                            }))}
                            className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        >
                            <option value={10}>10건</option>
                            <option value={20}>20건</option>
                            <option value={50}>50건</option>
                        </select>
                    </form>

                    {loading && (
                        <p>조회 중...</p>
                    )}


                    {message && (

                        <p className="text-rose-600 mb-4">
                            {message}
                        </p>

                    )}


                    {!loading && !message && batchJobs.length > 0 && (

                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">

                            <table className="w-full min-w-[1100px]">

                                <thead className="bg-slate-50 text-slate-600">

                                <tr>

                                    <th className="text-left px-5 py-4">
                                        ID
                                    </th>

                                    <th className="text-left px-5 py-4">
                                        배치명
                                    </th>

                                    <th className="text-left px-5 py-4">
                                        설명
                                    </th>

                                    <th className="text-left px-5 py-4">
                                        Cron
                                    </th>

                                    <th className="text-left px-5 py-4">
                                        상태
                                    </th>

                                    <th className="text-left px-5 py-4">
                                        작업
                                    </th>

                                </tr>

                                </thead>


                                <tbody>

                                {batchJobs.map((job) => (

                                    <tr
                                        key={job.id}
                                        className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors"
                                    >

                                        <td className="px-5 py-4">
                                            {job.id}
                                        </td>


                                        <td className="px-5 py-4 font-medium">
                                            {job.name}
                                        </td>


                                        <td className="px-5 py-4">
                                            {job.description}
                                        </td>


                                        <td className="px-5 py-4 whitespace-nowrap">
                                            {job.cronExpression}
                                        </td>


                                        <td className="px-5 py-4">

                                            {job.isActive ? (

                                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                                                    활성
                                                </span>

                                            ) : (

                                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
                                                    비활성
                                                </span>

                                            )}

                                        </td>


                                        <td className="px-5 py-4">

                                            <div className="flex gap-2 flex-wrap">

                                                {/* 실행 */}

                                                <button
                                                    onClick={() => handleRun(job)}
                                                    disabled={
                                                        runningJobId === job.id ||
                                                        !job.isActive
                                                    }
                                                    className="
                                                            bg-slate-900
                                                            text-white
                                                            px-3.5
                                                            py-2
                                                            rounded-lg
                                                            text-sm
                                                            font-medium
                                                            shadow-sm
                                                            hover:bg-slate-800
                                                            disabled:bg-slate-100
                                                            disabled:text-slate-400
                                                            disabled:border
                                                            disabled:border-slate-200
                                                            disabled:cursor-not-allowed
                                                            transition-colors
                                                        "
                                                >

                                                    {runningJobId === job.id
                                                        ? '실행 중...'
                                                        : '실행'}

                                                </button>


                                                {/* 이력 */}

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onOpenExecutions(job.id)
                                                    }
                                                    className="
                                                        bg-white
                                                        text-slate-700
                                                        border
                                                        border-slate-300
                                                        px-3.5
                                                        py-2
                                                        rounded-lg
                                                        text-sm
                                                        font-medium
                                                        hover:bg-slate-50
                                                        hover:border-slate-400
                                                        transition-colors
                                                    "
                                                >
                                                    이력
                                                </button>


                                                {/* 수정 */}

                                                <button
                                                    onClick={() => handleOpenEdit(job)}
                                                    className="
                                                            bg-white
                                                            text-slate-700
                                                            border
                                                            border-slate-300
                                                            px-3.5
                                                            py-2
                                                            rounded-lg
                                                            text-sm
                                                            font-medium
                                                            hover:bg-slate-50
                                                            hover:border-slate-400
                                                            transition-colors
                                                        "
                                                >
                                                    수정
                                                </button>


                                                {/* 비활성화 */}

                                                {job.isActive && (

                                                    <button
                                                        onClick={() =>
                                                            handleDeactivate(job)
                                                        }
                                                        className="
                                                                bg-rose-50
                                                                text-rose-700
                                                                border
                                                                border-rose-200
                                                                px-3.5
                                                                py-2
                                                                rounded-lg
                                                                text-sm
                                                                font-medium
                                                                hover:bg-rose-100
                                                                hover:border-rose-300
                                                                transition-colors
                                                            "
                                                    >
                                                        비활성화
                                                    </button>

                                                )}

                                            </div>

                                        </td>

                                    </tr>

                                ))}

                                </tbody>

                            </table>

                        </div>

                    )}


                    {!loading && !message && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-slate-600" aria-live="polite">
                                {totalElements === 0
                                    ? '조회된 배치 작업이 없습니다.'
                                    : `총 ${totalElements}건 · ${query.page * query.size + 1}–${query.page * query.size + batchJobs.length}건 표시`}
                            </p>
                            {totalPages > 0 && (
                                <nav aria-label="배치 작업 페이지" className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        disabled={query.page === 0}
                                        onClick={() => handlePageChange(query.page - 1)}
                                        className="border border-slate-300 rounded-lg bg-white text-slate-700 px-4 py-2 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                                    >
                                        이전
                                    </button>
                                    <span>{query.page + 1} / {totalPages}</span>
                                    <button
                                        type="button"
                                        disabled={query.page + 1 >= totalPages}
                                        onClick={() => handlePageChange(query.page + 1)}
                                        className="border border-slate-300 rounded-lg bg-white text-slate-700 px-4 py-2 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                                    >
                                        다음
                                    </button>
                                </nav>
                            )}
                        </div>
                    )}

                    {/* =================================================
                        실행 이력
                    ================================================== */}

                    {selectedJob && (

                        <div
                            ref={executionSectionRef}
                            className="mt-10 scroll-mt-6"
                        >

                            <h2 className="text-2xl font-bold mb-2">
                                최근 실행 이력 10건
                            </h2>

                            <p className="text-slate-600 mb-5">
                                {selectedJob.name}
                            </p>


                            {executionLoading && (
                                <p>실행 이력 조회 중...</p>
                            )}


                            {executionMessage && (

                                <p className="text-rose-600 mb-4">
                                    {executionMessage}
                                </p>

                            )}


                            {!executionLoading &&
                                executions.length > 0 && (

                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">

                                        <table className="w-full min-w-[1000px]">

                                            <thead className="bg-slate-50 text-slate-600">

                                            <tr>

                                                <th className="text-left px-5 py-4">
                                                    실행 ID
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
                                                    상세
                                                </th>

                                            </tr>

                                            </thead>


                                            <tbody>

                                            {executions.map((execution) => (

                                                <tr
                                                    key={execution.id}
                                                    className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors"
                                                >

                                                    <td className="px-5 py-4">
                                                        {execution.id}
                                                    </td>


                                                    <td className="px-5 py-4">

                                                        {execution.status === 'SUCCESS' ? (

                                                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                                                                    SUCCESS
                                                                </span>

                                                        ) : execution.status === 'FAILED' ? (

                                                            <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/15">
                                                                    FAILED
                                                                </span>

                                                        ) : execution.status === 'RUNNING' ? (

                                                            <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/15">
                                                                    RUNNING
                                                                </span>

                                                        ) : (

                                                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                                                                    {execution.status}
                                                                </span>

                                                        )}

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


                                                    <td className="px-5 py-4">
                                                        {execution.successCount ?? '-'}
                                                    </td>


                                                    <td className="px-5 py-4">
                                                        {execution.failCount ?? '-'}
                                                    </td>


                                                    <td className="px-5 py-4">

                                                        <button
                                                            onClick={() =>
                                                                fetchExecutionDetail(
                                                                    execution
                                                                )
                                                            }
                                                            className="
                                                                    bg-white
                                                                    text-slate-700
                                                                    border
                                                                    border-slate-300
                                                                    px-3.5
                                                                    py-2
                                                                    rounded-lg
                                                                    text-sm
                                                                    font-medium
                                                                    hover:bg-slate-50
                                                                    hover:border-slate-400
                                                                    transition-colors
                                                                "
                                                        >
                                                            상세
                                                        </button>

                                                    </td>

                                                </tr>

                                            ))}

                                            </tbody>

                                        </table>

                                    </div>

                                )}


                            {!executionLoading &&
                                !executionMessage &&
                                executions.length === 0 && (

                                    <div className="bg-white border border-slate-200 rounded-xl p-5 text-slate-600">
                                        실행 이력이 없습니다.
                                    </div>

                                )}


                            {/* =================================================
                                실행 상세
                            ================================================== */}

                            {selectedExecution && (

                                <div
                                    ref={detailSectionRef}
                                    className="
                                        mt-8
                                        bg-white
                                        rounded-xl
                                        border
                                        border-slate-200
                                        shadow-sm
                                        p-6
                                        scroll-mt-6
                                    "
                                >

                                    <h3 className="text-xl font-bold mb-6">
                                        실행 상세 #{selectedExecution.id}
                                    </h3>


                                    {detailLoading && (
                                        <p>상세 이력 조회 중...</p>
                                    )}


                                    {detailMessage && (

                                        <p className="text-rose-600 mb-4">
                                            {detailMessage}
                                        </p>

                                    )}


                                    {!detailLoading && (

                                        <>

                                            {/* 기본 정보 */}

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

                                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">

                                                    <p className="text-sm text-gray-500">
                                                        상태
                                                    </p>

                                                    <p className="font-bold mt-1">
                                                        {selectedExecution.status}
                                                    </p>

                                                </div>


                                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">

                                                    <p className="text-sm text-gray-500">
                                                        실행 방식
                                                    </p>

                                                    <p className="font-bold mt-1">
                                                        {selectedExecution.triggerType}
                                                    </p>

                                                </div>


                                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">

                                                    <p className="text-sm text-gray-500">
                                                        성공 건수
                                                    </p>

                                                    <p className="font-bold mt-1 text-emerald-700">
                                                        {selectedExecution.successCount ?? '-'}
                                                    </p>

                                                </div>


                                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">

                                                    <p className="text-sm text-gray-500">
                                                        실패 건수
                                                    </p>

                                                    <p className="font-bold mt-1 text-rose-600">
                                                        {selectedExecution.failCount ?? '-'}
                                                    </p>

                                                </div>

                                            </div>


                                            {/* 오류 이력 */}

                                            <h4 className="text-lg font-bold mb-3">
                                                오류 이력
                                            </h4>


                                            {executionErrors.length === 0 ? (

                                                <div className="bg-gray-50 p-4 rounded-lg mb-8 text-slate-600">
                                                    오류 이력이 없습니다.
                                                </div>

                                            ) : (

                                                <div className="overflow-x-auto border border-slate-200 rounded-xl mb-8">

                                                    <table className="w-full">

                                                        <thead className="bg-slate-50 text-slate-600">

                                                        <tr>

                                                            <th className="text-left px-4 py-3">
                                                                Item ID
                                                            </th>

                                                            <th className="text-left px-4 py-3">
                                                                Exception
                                                            </th>

                                                            <th className="text-left px-4 py-3">
                                                                오류 메시지
                                                            </th>

                                                            <th className="text-left px-4 py-3">
                                                                발생 시간
                                                            </th>

                                                        </tr>

                                                        </thead>

                                                        <tbody>

                                                        {executionErrors.map((error) => (

                                                            <tr
                                                                key={error.id}
                                                                className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors"
                                                            >

                                                                <td className="px-4 py-3">
                                                                    {error.itemId ?? '-'}
                                                                </td>

                                                                <td className="px-4 py-3">
                                                                    {error.exceptionType}
                                                                </td>

                                                                <td className="px-4 py-3 text-rose-600">
                                                                    {error.errorMessage}
                                                                </td>

                                                                <td className="px-4 py-3">
                                                                    {formatDateTime(
                                                                        error.createdAt
                                                                    )}
                                                                </td>

                                                            </tr>

                                                        ))}

                                                        </tbody>

                                                    </table>

                                                </div>

                                            )}


                                            {/* 알림 이력 */}

                                            <h4 className="text-lg font-bold mb-3">
                                                알림 이력
                                            </h4>


                                            {notifications.length === 0 ? (

                                                <div className="bg-gray-50 p-4 rounded-lg text-slate-600">
                                                    알림 이력이 없습니다.
                                                </div>

                                            ) : (

                                                <div className="overflow-x-auto border border-slate-200 rounded-xl">

                                                    <table className="w-full">

                                                        <thead className="bg-slate-50 text-slate-600">

                                                        <tr>

                                                            <th className="text-left px-4 py-3">
                                                                채널
                                                            </th>

                                                            <th className="text-left px-4 py-3">
                                                                상태
                                                            </th>

                                                            <th className="text-left px-4 py-3">
                                                                메시지
                                                            </th>

                                                            <th className="text-left px-4 py-3">
                                                                발송 시간
                                                            </th>

                                                        </tr>

                                                        </thead>

                                                        <tbody>

                                                        {notifications.map((notification) => (

                                                            <tr
                                                                key={notification.id}
                                                                className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors"
                                                            >

                                                                <td className="px-4 py-3">
                                                                    {notification.channel}
                                                                </td>

                                                                <td className="px-4 py-3">

                                                                    {notification.status === 'SUCCESS' ? (

                                                                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                                                                                SUCCESS
                                                                            </span>

                                                                    ) : (

                                                                        <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/15">
                                                                                {notification.status}
                                                                            </span>

                                                                    )}

                                                                </td>

                                                                <td className="px-4 py-3">
                                                                    {notification.message}
                                                                </td>

                                                                <td className="px-4 py-3">
                                                                    {formatDateTime(
                                                                        notification.sentAt
                                                                    )}
                                                                </td>

                                                            </tr>

                                                        ))}

                                                        </tbody>

                                                    </table>

                                                </div>

                                            )}

                                        </>

                                    )}

                                </div>

                            )}

                        </div>

                    )}

                </div>

            </main>

        </div>
    )
}

export default BatchJobListPage

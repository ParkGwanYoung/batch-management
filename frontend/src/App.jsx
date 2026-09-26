import { useState } from 'react'

import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
    useNavigate,
} from 'react-router'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import BatchJobListPage from './pages/BatchJobListPage'
import BatchExecutionListPage from './pages/BatchExecutionListPage'
import BatchExecutionDetailPage from './pages/BatchExecutionDetailPage'


function App() {

    const [accessToken, setAccessToken] =
        useState(
            localStorage.getItem('accessToken')
        )


    const handleLogin = (token) => {

        localStorage.setItem(
            'accessToken',
            token
        )

        setAccessToken(token)
    }


    const handleLogout = () => {

        localStorage.removeItem(
            'accessToken'
        )

        setAccessToken(null)
    }


    return (

        <BrowserRouter>

            <AppRoutes
                accessToken={accessToken}
                onLogin={handleLogin}
                onLogout={handleLogout}
            />

        </BrowserRouter>
    )
}


function AppRoutes({
                       accessToken,
                       onLogin,
                       onLogout,
                   }) {

    const navigate = useNavigate()


    // =========================================================
    // 로그인 전
    // =========================================================

    if (!accessToken) {

        return (

            <Routes>

                <Route
                    path="/login"
                    element={
                        <LoginPage
                            onLogin={onLogin}
                        />
                    }
                />


                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/login"
                            replace
                        />
                    }
                />

            </Routes>
        )
    }


    // =========================================================
    // 로그인 후
    // =========================================================

    return (

        <Routes>

            {/* 기본 주소 */}

            <Route
                path="/"
                element={
                    <Navigate
                        to="/dashboard"
                        replace
                    />
                }
            />


            {/* 로그인 주소로 다시 들어온 경우 */}

            <Route
                path="/login"
                element={
                    <Navigate
                        to="/dashboard"
                        replace
                    />
                }
            />


            {/* Dashboard */}

            <Route
                path="/dashboard"
                element={
                    <DashboardPage
                        accessToken={accessToken}
                        onLogout={onLogout}
                        onOpenBatchJobs={() =>
                            navigate('/batch-jobs')
                        }
                    />
                }
            />


            {/* BatchJob 목록 / 등록 / 수정 */}

            <Route
                path="/batch-jobs"
                element={
                    <BatchJobListPage
                        accessToken={accessToken}
                        onLogout={onLogout}
                        onOpenDashboard={() =>
                            navigate('/dashboard')
                        }
                        onOpenExecutions={(jobId) =>
                            navigate(
                                `/batch-jobs/${jobId}/executions`
                            )
                        }
                    />
                }
            />


            {/* 실행 이력 */}

            <Route
                path="/batch-jobs/:jobId/executions"
                element={
                    <BatchExecutionListPage
                        accessToken={accessToken}
                        onLogout={onLogout}
                    />
                }
            />


            {/* 실행 상세 */}

            <Route
                path="/executions/:executionId"
                element={
                    <BatchExecutionDetailPage
                        accessToken={accessToken}
                        onLogout={onLogout}
                    />
                }
            />


            {/* 잘못된 URL */}

            <Route
                path="*"
                element={
                    <Navigate
                        to="/dashboard"
                        replace
                    />
                }
            />

        </Routes>
    )
}


export default App
import { useState } from 'react'

function LoginPage({ onLogin }) {

    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState('')

    const handleLogin = async (e) => {
        e.preventDefault()

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',
                },

                body: JSON.stringify({
                    username,
                    password,
                }),
            })

            if (!response.ok) {
                throw new Error('아이디 또는 비밀번호를 확인해주세요.')
            }

            const data = await response.json()

            onLogin(data.accessToken)

        } catch (error) {
            setMessage(error.message)
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">

            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">

                <h1 className="text-3xl font-bold text-center text-gray-800">
                    Batch Management
                </h1>

                <p className="mt-2 text-center text-gray-500">
                    관리자 로그인
                </p>

                <form
                    onSubmit={handleLogin}
                    className="mt-8 space-y-5"
                >

                    <div>
                        <label className="block mb-2 text-sm font-medium">
                            아이디
                        </label>

                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full border rounded-lg px-4 py-3"
                        />
                    </div>

                    <div>
                        <label className="block mb-2 text-sm font-medium">
                            비밀번호
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border rounded-lg px-4 py-3"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-700"
                    >
                        로그인
                    </button>

                </form>

                {message && (
                    <p className="mt-4 text-center text-red-500">
                        {message}
                    </p>
                )}

            </div>

        </div>
    )
}

export default LoginPage
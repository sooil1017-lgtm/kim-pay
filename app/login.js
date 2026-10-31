"use client";

import { useState } from "react";
import { supabase } from "./supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError("이메일 또는 비밀번호가 맞지 않아요.");
  };

  return (
    <main className="app">
      <header className="title">
        <span className="title-star">★</span> 수일이의 가계부 <span className="title-star">★</span>
      </header>

      <form className="card" onSubmit={submit}>
        <h2 className="card-title">▶ 로그인</h2>

        <label className="field">
          <span>이메일</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>비밀번호</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="submit" disabled={busy}>
          들어가기
        </button>
      </form>
    </main>
  );
}

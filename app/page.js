"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Login from "./login";

const CATEGORIES = [
  { name: "식비", icon: "🍚", color: "#e8743b" },
  { name: "카페", icon: "☕", color: "#a8643c" },
  { name: "교통", icon: "🚌", color: "#2a9d8f" },
  { name: "쇼핑", icon: "🛍️", color: "#d6457a" },
  { name: "구독", icon: "📺", color: "#6b5bd2" },
  { name: "기타", icon: "📦", color: "#7a7a5c" },
];

const won = (n) => n.toLocaleString("ko-KR");

const dateLabel = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  const day = ["일", "월", "화", "수", "목", "금", "토"][new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${day})`;
};

const toIso = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function Home() {
  const [expenses, setExpenses] = useState([]);
  const [today, setToday] = useState("");
  const [amount, setAmount] = useState("");
  const [place, setPlace] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [date, setDate] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");
  const [session, setSession] = useState(undefined);
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const iso = toIso(new Date());
    setToday(iso);
    setDate(iso);

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return setExpenses([]);
    supabase
      .from("expenses")
      .select("id, amount, place, category, spent_on, memo")
      .order("spent_on", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) return setError("불러오기에 실패했어요.");
        setExpenses(data.map(({ spent_on, ...rest }) => ({ ...rest, date: spent_on })));
      });
  }, [session]);

  const month = today.slice(0, 7);
  const monthTotal = expenses
    .filter((e) => e.date.startsWith(month))
    .reduce((sum, e) => sum + e.amount, 0);

  const groups = Object.entries(
    expenses.reduce((acc, e) => {
      (acc[e.date] ||= []).push(e);
      return acc;
    }, {})
  ).sort(([a], [b]) => b.localeCompare(a));

  const submit = async (ev) => {
    ev.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0 || !place.trim() || !date) return;
    const { data, error } = await supabase
      .from("expenses")
      .insert({ amount: value, place: place.trim(), category, spent_on: date, memo: memo.trim() })
      .select("id, amount, place, category, spent_on, memo")
      .single();
    if (error) return setError("저장에 실패했어요.");
    setError("");
    const { spent_on, ...rest } = data;
    setExpenses((prev) => [{ ...rest, date: spent_on }, ...prev]);
    setAmount("");
    setPlace("");
    setMemo("");
  };

  const toJpeg = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

  const scanReceipt = async (ev) => {
    const file = ev.target.files[0];
    ev.target.value = "";
    if (!file) return;
    setScanning(true);
    setNotice("");
    setError("");
    try {
      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ image: await toJpeg(file), mimeType: "image/jpeg" }),
      });
      const result = await res.json();
      if (!res.ok) return setError(result.error || "영수증을 읽는 데 실패했어요.");
      if (result.amount) setAmount(String(result.amount));
      if (result.place) setPlace(result.place);
      if (result.date) setDate(result.date);
      const missing = [
        !result.amount && "금액",
        !result.place && "사용처",
        !result.date && "날짜",
      ].filter(Boolean);
      setNotice(
        missing.length
          ? `${missing.join(", ")}은(는) 읽지 못했어요. 직접 입력해 주세요.`
          : "영수증을 읽었어요. 내용을 확인하고 저장해 주세요."
      );
    } catch {
      setError("영수증을 읽는 데 실패했어요.");
    } finally {
      setScanning(false);
    }
  };

  const cat = (name) => CATEGORIES.find((c) => c.name === name);

  if (session === undefined) return null;
  if (!session) return <Login />;

  return (
    <main className="app">
      <header className="title">
        <span className="title-star">★</span> 수일이의 가계부 <span className="title-star">★</span>
      </header>
      <button type="button" className="logout" onClick={() => supabase.auth.signOut()}>
        로그아웃
      </button>

      <section className="total">
        <p className="total-label">{month ? `${Number(month.slice(5))}월 총 지출` : "이번 달 총 지출"}</p>
        <p className="total-amount">
          {won(monthTotal)}
          <span className="total-unit">원</span>
        </p>
      </section>

      <form className="card" onSubmit={submit}>
        <h2 className="card-title">▶ 지출 입력</h2>

        <label className="scan">
          {scanning ? "영수증 읽는 중..." : "📷 영수증으로 채우기"}
          <input type="file" accept="image/*" capture="environment" onChange={scanReceipt} disabled={scanning} hidden />
        </label>
        {notice && <p className="notice">{notice}</p>}

        <label className="field">
          <span>금액</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>사용처</span>
          <input
            type="text"
            placeholder="예: 편의점"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            required
          />
        </label>

        <div className="field">
          <span>카테고리</span>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button
                key={c.name}
                type="button"
                className={`chip ${category === c.name ? "chip-on" : ""}`}
                style={{ "--chip": c.color }}
                onClick={() => setCategory(c.name)}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>날짜</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>

        <label className="field">
          <span>메모</span>
          <input
            type="text"
            placeholder="선택 사항"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="submit">
          기록하기
        </button>
      </form>

      <section className="list">
        <h2 className="list-title">▶ 지출 내역</h2>
        {groups.length === 0 && (
          <p className="empty">
            아직 기록이 없어요.
            <br />
            첫 지출을 입력해 보세요!
          </p>
        )}
        {groups.map(([day, items]) => (
          <div key={day} className="day">
            <div className="day-head">
              <span>{dateLabel(day)}</span>
              <span>{won(items.reduce((s, e) => s + e.amount, 0))}원</span>
            </div>
            <ul>
              {items.map((e) => (
                <li key={e.id} className="item">
                  <span className="item-icon" style={{ background: cat(e.category).color }}>
                    {cat(e.category).icon}
                  </span>
                  <span className="item-main">
                    <span className="item-place">{e.place}</span>
                    <span className="item-sub">
                      {e.category}
                      {e.memo && ` · ${e.memo}`}
                    </span>
                  </span>
                  <span className="item-amount">-{won(e.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import readingPlanCsv from './data/bible_300_reading_plan.csv?raw';

const readingPlan = parseReadingPlan(readingPlanCsv);
const bookOrder = buildBookOrder(readingPlan);
const sessionKey = 'sacred_space_user';

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem(sessionKey);
    return saved ? JSON.parse(saved) : null;
  });
  const [screen, setScreen] = useState('steps');
  const [selectedStep, setSelectedStep] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(() => new Set());

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    async function loadHistory() {
      try {
        const steps = await fetchCompletedSteps(currentUser.id);
        if (!cancelled) {
          setCompletedSteps(new Set(steps));
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const handleLogin = (user) => {
    localStorage.setItem(sessionKey, JSON.stringify(user));
    setCurrentUser(user);
    setScreen('steps');
  };

  const goTo = (nextScreen) => {
    setScreen(nextScreen);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(sessionKey);
    setCurrentUser(null);
    setSelectedStep(null);
    setScreen('steps');
    setMenuOpen(false);
  };

  if (!currentUser) {
    return (
      <div className="app-shell">
        <LoginScreen onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar
        user={currentUser}
        onMenu={() => setMenuOpen(true)}
        onBack={screen === 'reader' ? () => setScreen('steps') : null}
        onLogout={handleLogout}
      />

      <main className="screen">
        {screen === 'reader' && selectedStep ? (
          <StepReader step={selectedStep} onComplete={() => setScreen('qt-write')} />
        ) : screen === 'qt-write' ? (
          <QtWriteScreen
            user={currentUser}
            step={selectedStep}
            onSaved={(savedStep) => {
              setCompletedSteps((prev) => new Set(prev).add(savedStep));
              setSelectedStep(savedStep);
              setScreen('qt-share');
            }}
          />
        ) : screen === 'qt-share' ? (
          <QtShareScreen
            user={currentUser}
            initialStep={selectedStep}
            onEdit={(step) => {
              setSelectedStep(step);
              setScreen('qt-write');
            }}
          />
        ) : (
          <StepList
            completedSteps={completedSteps}
            onSelect={(step) => {
              setSelectedStep(step);
              setScreen('reader');
            }}
          />
        )}
      </main>

      <MobileMenu
        open={menuOpen}
        active={screen}
        user={currentUser}
        onClose={() => setMenuOpen(false)}
        onSelect={(item) => {
          if (item === 'bible') {
            goTo(selectedStep ? 'reader' : 'steps');
            return;
          }
          goTo(item);
        }}
      />
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('이름을 입력하세요.');
      return;
    }

    try {
      setStatus('loading');
      setError('');
      const user = await fetchUserById(trimmedName);
      if (!user) {
        setError('등록된 이름이 아닙니다.');
        setStatus('idle');
        return;
      }
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 확인에 실패했습니다.');
      setStatus('idle');
    }
  }

  return (
    <section className="login-screen">
      <div className="hero-art" aria-hidden="true">
        <div className="mist" />
        <div className="hill hill-back" />
        <div className="hill hill-front" />
      </div>

      <div className="login-card panel">
        <div className="login-heading">
          <h2>Welcome</h2>
          <p>이름을 입력하고 오늘의 말씀을 시작하세요.</p>
        </div>

        <form className="login-form" onSubmit={submit}>
          <label className="text-field">
            <span>이름</span>
            <div>
              <Icon name="person" />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="이종욱"
                autoComplete="name"
              />
            </div>
          </label>

          {error && <p className="login-error">{error}</p>}

          <button className="primary-button" type="submit" disabled={status === 'loading'}>
            <span>{status === 'loading' ? '확인 중' : '입장하기'}</span>
            <Icon name="arrow_forward" />
          </button>
        </form>
      </div>
    </section>
  );
}

function TopBar({ user, onMenu, onBack, onLogout }) {
  return (
    <header className="top-bar">
      <button className="icon-button" type="button" aria-label={onBack ? '뒤로' : '메뉴'} onClick={onBack ?? onMenu}>
        <Icon name={onBack ? 'arrow_back' : 'menu'} />
      </button>
      <div className="top-title">
        <h1>Sacred Space</h1>
        <span>{user.id}</span>
      </div>
      <button className="logout-button" type="button" onClick={onLogout}>
        Logout
      </button>
    </header>
  );
}

function MobileMenu({ open, active, user, onClose, onSelect }) {
  if (!open) return null;

  const items = [
    { key: 'steps', icon: 'format_list_numbered', label: '회차 선택' },
    { key: 'qt-share', icon: 'forum', label: 'QT 공유' },
  ];

  return (
    <div className="menu-overlay" role="presentation" onClick={onClose}>
      <section
        className="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="화면 선택"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="menu-handle" />
        <div className="menu-title">
          <span className="eyebrow">{user.id}</span>
          <h2>이동할 화면</h2>
        </div>
        <div className="menu-actions">
          {items.map((item) => {
            const selected = active === item.key || (item.key === 'bible' && active === 'reader');
            return (
              <button key={item.key} className={selected ? 'active' : ''} type="button" onClick={() => onSelect(item.key)}>
                <Icon name={item.icon} fill={selected} />
                <span>{item.label}</span>
                <Icon name="chevron_right" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StepList({ completedSteps, onSelect }) {
  return (
    <section className="content padded plan-screen">
      <article className="continue-card panel">
        <span className="eyebrow">성경 읽기</span>
        <h2>{readingPlan.length}회차</h2>
        <p>회차를 선택하면 해당 범위의 성경 본문을 장 단위로 볼 수 있습니다.</p>
      </article>

      <section className="session-list">
        {readingPlan.map((item) => {
          const completed = completedSteps.has(item.step);
          return (
            <button
              className={completed ? 'session-item done' : 'session-item'}
              type="button"
              key={item.step}
              onClick={() => onSelect(item.step)}
            >
              {completed ? (
                <span className="done-check" aria-label="완료">
                  <Icon name="check" />
                </span>
              ) : (
                <Icon name="auto_stories" />
              )}
              <span className="session-copy">
                <strong>{item.step}회차</strong>
                <small>{formatRange(item)}</small>
              </span>
              {completed ? <span className="complete-badge">완료</span> : <Icon name="chevron_right" />}
            </button>
          );
        })}
      </section>
    </section>
  );
}

function StepReader({ step, onComplete }) {
  const [verses, setVerses] = useState([]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadVerses() {
      try {
        setStatus('loading');
        setChapterIndex(0);
        const rows = await fetchStepVerses(step);
        if (cancelled) return;
        setVerses(sortVerses(rows));
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '본문을 불러오지 못했습니다.');
        setStatus('error');
      }
    }

    loadVerses();
    return () => {
      cancelled = true;
    };
  }, [step]);

  const chapters = useMemo(() => groupByChapter(verses), [verses]);
  const currentChapter = chapters[chapterIndex];

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [chapterIndex]);

  if (status === 'loading') {
    return (
      <section className="reader-screen">
        <StateMessage icon="progress_activity" title={`${step}회차`} body="본문을 불러오는 중입니다." />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="reader-screen">
        <StateMessage icon="error" title="본문 로드 실패" body={error} />
      </section>
    );
  }

  if (!currentChapter) {
    return (
      <section className="reader-screen">
        <StateMessage icon="menu_book" title={`${step}회차`} body="이 step에 해당하는 본문이 없습니다." />
      </section>
    );
  }

  return (
    <section className="reader-screen">
      <div className="chapter-heading">
        <span className="eyebrow">{step}회차</span>
        <h2>{currentChapter.book}</h2>
        <p>{currentChapter.chapter}장</p>
      </div>

      <article className="scripture">
        {currentChapter.verses.map((verse) => (
          <p key={`${verse.book}-${verse.chapter}-${verse.verse}`}>
            <sup>{verse.verse}</sup>
            <span>{verse.text}</span>
          </p>
        ))}
      </article>

      <div className="chapter-controls">
        <button type="button" disabled={chapterIndex === 0} onClick={() => setChapterIndex((value) => value - 1)}>
          <Icon name="chevron_left" />
          <span>이전 장</span>
        </button>
        <strong>
          {chapterIndex + 1} / {chapters.length}
        </strong>
        {chapterIndex === chapters.length - 1 ? (
          <button type="button" className="complete" onClick={onComplete}>
            <span>QT 작성</span>
            <Icon name="edit_note" />
          </button>
        ) : (
          <button type="button" onClick={() => setChapterIndex((value) => value + 1)}>
            <span>다음 장</span>
            <Icon name="chevron_right" />
          </button>
        )}
      </div>
    </section>
  );
}

function QtWriteScreen({ user, step, onSaved }) {
  const [qt, setQt] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!step) {
      setQt('');
      return;
    }

    let cancelled = false;
    async function loadExistingQt() {
      try {
        const existing = await fetchUserStepHistory(user.id, step);
        if (!cancelled) {
          setQt(existing?.qt ?? '');
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadExistingQt();
    return () => {
      cancelled = true;
    };
  }, [step, user.id]);

  async function submit(event) {
    event.preventDefault();
    if (!step) {
      setError('QT를 저장할 회차가 없습니다. 먼저 회차를 선택해 주세요.');
      return;
    }
    if (!qt.trim()) {
      setError('QT 내용을 입력하세요.');
      return;
    }

    try {
      setStatus('saving');
      setError('');
      await saveQtHistory({
        user: user.id,
        step,
        date: formatKoreaMinute(new Date()),
        qt: qt.trim(),
      });
      onSaved(step);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'QT 저장에 실패했습니다.');
      setStatus('idle');
    }
  }

  return (
    <form className="content padded reflection-screen" onSubmit={submit}>
      <div className="study-hero">
        <div>
          <span className="eyebrow">{user.id}</span>
          <h2>QT 작성</h2>
        </div>
      </div>
      <article className="verse-card panel">
        <Icon name="format_quote" fill />
        <p>{step ? `${step}회차 말씀 중 마음에 남는 구절과 기도를 기록하세요.` : 'QT를 저장하려면 먼저 회차를 선택해 주세요.'}</p>
        <span />
        <strong>Sacred Space</strong>
      </article>
      <section className="thoughts">
        <h3>
          <Icon name="edit_note" fill /> 묵상 기록
        </h3>
        <textarea
          value={qt}
          onChange={(event) => setQt(event.target.value)}
          placeholder="묵상, 기도, 적용할 내용을 적어보세요."
        />
      </section>
      {error && <p className="login-error">{error}</p>}
      <div className="action-row">
        <button className="pill-button" type="submit" disabled={status === 'saving'}>
          <Icon name="done" />
          <span>{status === 'saving' ? '저장 중' : '저장'}</span>
        </button>
      </div>
    </form>
  );
}

function QtShareScreen({ user, initialStep, onEdit }) {
  const [selectedShareStep, setSelectedShareStep] = useState(initialStep ?? readingPlan[0]?.step ?? 1);
  const [histories, setHistories] = useState([]);
  const [likes, setLikes] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadHistories() {
      try {
        setStatus('loading');
        setError('');
        const [historyRows, likeRows] = await Promise.all([
          fetchShareHistories(selectedShareStep),
          fetchStepLikes(selectedShareStep),
        ]);
        if (!cancelled) {
          setHistories(historyRows);
          setLikes(likeRows);
          setStatus('ready');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '나눔을 불러오지 못했습니다.');
          setStatus('error');
        }
      }
    }

    loadHistories();
    return () => {
      cancelled = true;
    };
  }, [selectedShareStep]);

  const selectedPlan = readingPlan.find((item) => item.step === Number(selectedShareStep));

  async function toggleLike(targetUser) {
    const liked = hasLiked(likes, user.id, targetUser, selectedShareStep);
    const nextLikes = liked
      ? likes.filter((like) => !(like.user === user.id && like.target_user === targetUser && Number(like.step) === Number(selectedShareStep)))
      : [...likes, { user: user.id, target_user: targetUser, step: selectedShareStep }];

    setLikes(nextLikes);
    try {
      if (liked) {
        await deleteHistoryLike({ user: user.id, targetUser, step: selectedShareStep });
      } else {
        await saveHistoryLike({ user: user.id, targetUser, step: selectedShareStep });
      }
    } catch (err) {
      setLikes(likes);
      setError(err instanceof Error ? err.message : '좋아요 처리에 실패했습니다.');
      setStatus('error');
    }
  }

  return (
    <section className="content padded community-screen">
      <div className="community-heading">
        <h2 className="share-title">나눔 공유</h2>
      </div>

      <label className="step-select-card panel">
        <span className="eyebrow">회차 선택</span>
        <select value={selectedShareStep} onChange={(event) => setSelectedShareStep(Number(event.target.value))}>
          {readingPlan.map((item) => (
            <option key={item.step} value={item.step}>
              {item.step}회차 · {formatRange(item)}
            </option>
          ))}
        </select>
        {selectedPlan && <small>{formatRange(selectedPlan)}</small>}
      </label>

      <div className="reflection-list">
        {status === 'error' && <StateMessage icon="error" title="나눔 로드 실패" body={error} />}
        {status === 'ready' &&
          histories.map((history) => {
            const mine = history.user === user.id;
            const likeCount = countLikes(likes, history.user, selectedShareStep);
            const liked = hasLiked(likes, user.id, history.user, selectedShareStep);

            return (
              <article className="reflection-card panel" key={`${history.user}-${history.date}`}>
                {mine ? (
                  <button className="edit-share-button" type="button" onClick={() => onEdit(selectedShareStep)}>
                    <Icon name="edit" />
                    <span>수정</span>
                  </button>
                ) : (
                  <button
                    className={liked ? 'like-share-button active' : 'like-share-button'}
                    type="button"
                    aria-label={liked ? '좋아요 취소' : '좋아요'}
                    onClick={() => toggleLike(history.user)}
                  >
                    <Icon name="favorite" fill={liked} />
                    <span>{likeCount}</span>
                  </button>
                )}
                <div className="person-row">
                  <span className="avatar">{getInitial(history.user)}</span>
                  <span>
                    <strong>{history.user}</strong>
                    <small>{history.date}</small>
                  </span>
                </div>
                <p>{history.qt}</p>
              </article>
            );
          })}
      </div>
    </section>
  );
}

function StateMessage({ icon, title, body }) {
  return (
    <div className="state-message panel">
      <Icon name={icon} />
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

function Icon({ name, fill = false }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24` }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

async function fetchUserById(id) {
  const rows = await supabaseRequest(`/rest/v1/user?select=id&id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows[0] ?? null;
}

async function fetchCompletedSteps(userId) {
  const rows = await supabaseRequest(
    `/rest/v1/history?select=step&user=eq.${encodeURIComponent(userId)}&order=step.asc`,
  );
  return rows.map((row) => Number(row.step)).filter((step) => Number.isFinite(step));
}

async function fetchShareHistories(step) {
  return supabaseRequest(
    `/rest/v1/history?select=user,date,qt&step=eq.${step}&order=date.desc`,
  );
}

async function fetchStepLikes(step) {
  return supabaseRequest(
    `/rest/v1/history_like?select=user,target_user,step&step=eq.${step}`,
  );
}

async function fetchUserStepHistory(userId, step) {
  const rows = await supabaseRequest(
    `/rest/v1/history?select=qt&user=eq.${encodeURIComponent(userId)}&step=eq.${step}&limit=1`,
  );
  return rows[0] ?? null;
}

async function saveHistoryLike({ user, targetUser, step }) {
  await supabaseRequest('/rest/v1/history_like', {
    method: 'POST',
    body: JSON.stringify({
      user,
      target_user: targetUser,
      step,
    }),
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
  });
}

async function deleteHistoryLike({ user, targetUser, step }) {
  await supabaseRequest(
    `/rest/v1/history_like?user=eq.${encodeURIComponent(user)}&target_user=eq.${encodeURIComponent(targetUser)}&step=eq.${step}`,
    {
      method: 'DELETE',
      headers: {
        Prefer: 'return=minimal',
      },
    },
  );
}

async function saveQtHistory(record) {
  const existingRows = await supabaseRequest(
    `/rest/v1/history?select=step&user=eq.${encodeURIComponent(record.user)}&step=eq.${record.step}&limit=1`,
  );
  const existing = existingRows[0];

  if (existing) {
    await supabaseRequest(`/rest/v1/history?user=eq.${encodeURIComponent(record.user)}&step=eq.${record.step}`, {
      method: 'PATCH',
      body: JSON.stringify({
        date: record.date,
        qt: record.qt,
      }),
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
    });
    return;
  }

  await supabaseRequest('/rest/v1/history', {
    method: 'POST',
    body: JSON.stringify(record),
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
  });
}

async function fetchStepVerses(step) {
  const allRows = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const rows = await supabaseRequest(
      `/rest/v1/bible?select=book,chapter,verse,text,step&step=eq.${step}&limit=${pageSize}&offset=${offset}`,
    );
    allRows.push(...rows);
    if (rows.length < pageSize) break;
  }

  return allRows;
}

async function supabaseRequest(path, options = {}) {
  const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('frontend/.env.local에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정해야 합니다.');
  }

  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase 요청 실패: HTTP ${response.status}${body ? ` - ${body}` : ''}`);
  }

  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
}

function groupByChapter(rows) {
  const groups = [];
  const groupIndex = new Map();

  for (const row of rows) {
    const key = `${row.book}-${row.chapter}`;
    if (!groupIndex.has(key)) {
      groupIndex.set(key, groups.length);
      groups.push({
        book: row.book,
        chapter: row.chapter,
        verses: [],
      });
    }
    groups[groupIndex.get(key)].verses.push(row);
  }

  return groups;
}

function sortVerses(rows) {
  return [...rows].sort((a, b) => {
    const bookCompare = getBookIndex(a.book) - getBookIndex(b.book);
    if (bookCompare !== 0) return bookCompare;
    const chapterCompare = Number(a.chapter) - Number(b.chapter);
    if (chapterCompare !== 0) return chapterCompare;
    return Number(a.verse) - Number(b.verse);
  });
}

function getBookIndex(book) {
  const index = bookOrder.indexOf(book);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function buildBookOrder(plan) {
  const books = [];
  for (const item of plan) {
    if (!books.includes(item.startBook)) books.push(item.startBook);
    if (!books.includes(item.endBook)) books.push(item.endBook);
  }
  return books;
}

function parseReadingPlan(csv) {
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [step, startBook, startChapter, endBook, endChapter] = line.split(',');
      return {
        step: Number(step),
        startBook,
        startChapter: Number(startChapter),
        endBook,
        endChapter: Number(endChapter),
      };
    })
    .filter((item) => Number.isFinite(item.step));
}

function formatRange(session) {
  if (!session) return '';
  if (session.startBook === session.endBook) {
    return `${session.startBook} ${session.startChapter}장 - ${session.endChapter}장`;
  }
  return `${session.startBook} ${session.startChapter}장 - ${session.endBook} ${session.endChapter}장`;
}

function formatKoreaMinute(date) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

function getInitial(name) {
  return String(name || '?').trim().slice(0, 1).toUpperCase();
}

function countLikes(likes, targetUser, step) {
  return likes.filter((like) => like.target_user === targetUser && Number(like.step) === Number(step)).length;
}

function hasLiked(likes, user, targetUser, step) {
  return likes.some(
    (like) => like.user === user && like.target_user === targetUser && Number(like.step) === Number(step),
  );
}

export default App;

import React, { useEffect, useMemo, useState } from 'react';
import readingPlanCsv from './data/bible_300_reading_plan.csv?raw';

const readingPlan = parseReadingPlan(readingPlanCsv);
const bookOrder = buildBookOrder(readingPlan);

function App() {
  const [screen, setScreen] = useState('steps');
  const [selectedStep, setSelectedStep] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const goTo = (nextScreen) => {
    setScreen(nextScreen);
    setMenuOpen(false);
  };

  return (
    <div className="app-shell">
      <TopBar
        onMenu={() => setMenuOpen(true)}
        onBack={screen === 'reader' ? () => setScreen('steps') : null}
      />
      <main className="screen">
        {screen === 'reader' && selectedStep ? (
          <StepReader step={selectedStep} onComplete={() => setScreen('qt-write')} />
        ) : screen === 'qt-write' ? (
          <QtWriteScreen />
        ) : screen === 'qt-share' ? (
          <QtShareScreen />
        ) : (
          <StepList
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
        onClose={() => setMenuOpen(false)}
        onSelect={(item) => {
          if (item === 'bible') {
            if (selectedStep) {
              goTo('reader');
            } else {
              goTo('steps');
            }
            return;
          }
          goTo(item);
        }}
      />
    </div>
  );
}

function TopBar({ onMenu, onBack }) {
  return (
    <header className="top-bar">
      <button
        className="icon-button"
        type="button"
        aria-label={onBack ? '뒤로' : '메뉴'}
        onClick={onBack ?? onMenu}
      >
        <Icon name={onBack ? 'arrow_back' : 'menu'} />
      </button>
      <h1>Sacred Space</h1>
      <span className="top-bar-spacer" aria-hidden="true" />
    </header>
  );
}

function MobileMenu({ open, active, onClose, onSelect }) {
  if (!open) return null;

  const items = [
    { key: 'steps', icon: 'format_list_numbered', label: '회차 선택' },
    { key: 'bible', icon: 'auto_stories', label: '성경' },
    { key: 'qt-write', icon: 'edit_note', label: 'QT 작성' },
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
          <span className="eyebrow">Navigate</span>
          <h2>이동할 화면</h2>
        </div>
        <div className="menu-actions">
          {items.map((item) => (
            <button
              key={item.key}
              className={active === item.key || (item.key === 'bible' && active === 'reader') ? 'active' : ''}
              type="button"
              onClick={() => onSelect(item.key)}
            >
              <Icon name={item.icon} fill={active === item.key || (item.key === 'bible' && active === 'reader')} />
              <span>{item.label}</span>
              <Icon name="chevron_right" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function StepList({ onSelect }) {
  return (
    <section className="content padded plan-screen">
      <article className="continue-card panel">
        <span className="eyebrow">성경 읽기</span>
        <h2>{readingPlan.length} 회차</h2>
        <p>회차를 선택하면 성경을 불러옵니다.</p>
      </article>

      <section className="session-list">
        {readingPlan.map((item) => (
          <button className="session-item" type="button" key={item.step} onClick={() => onSelect(item.step)}>
            <Icon name="auto_stories" />
            <span className="session-copy">
              <strong>{item.step}회차</strong>
              <small>{formatRange(item)}</small>
            </span>
            <Icon name="chevron_right" />
          </button>
        ))}
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
        <strong>{chapterIndex + 1} / {chapters.length}</strong>
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

function QtWriteScreen() {
  return (
    <section className="content padded reflection-screen">
      <div className="study-hero">
        <div>
          <span className="eyebrow">Today's QT</span>
          <h2>QT 작성</h2>
        </div>
      </div>
      <article className="verse-card panel">
        <Icon name="format_quote" fill />
        <p>오늘 읽은 말씀 중 마음에 남는 구절을 적고, 그 말씀을 통해 느낀 점을 기록하세요.</p>
        <span />
        <strong>Sacred Space</strong>
      </article>
      <section className="thoughts">
        <h3><Icon name="edit_note" fill /> 나의 소감</h3>
        <textarea placeholder="소감을 적어보세요." />
      </section>
      <div className="action-row">
        <button className="pill-button" type="button">
          <Icon name="done" />
          <span>저장</span>
        </button>
      </div>
    </section>
  );
}

function QtShareScreen() {
  return (
    <section className="content padded community-screen">
      <div className="community-heading">
        <span className="eyebrow">Community</span>
        <h2>QT 공유</h2>
        <p>함께 나눈 묵상과 기도 제목을 살펴보는 공간입니다.</p>
      </div>
      <div className="reflection-list">
        {[
          ['ES', 'Eunji S.', '말씀이 오늘 하루의 방향을 다시 잡아주었습니다.'],
          ['MJ', 'Minjun K.', '본문을 천천히 읽으니 놓쳤던 표현이 보였습니다.'],
        ].map(([initials, name, body]) => (
          <article className="reflection-card panel" key={name}>
            <div className="person-row">
              <span className="avatar">{initials}</span>
              <span>
                <strong>{name}</strong>
                <small>방금 전</small>
              </span>
            </div>
            <p>{body}</p>
          </article>
        ))}
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

async function supabaseRequest(path) {
  const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('frontend/.env.local에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정해야 합니다.');
  }

  const response = await fetch(`${url}${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase 요청 실패: HTTP ${response.status}${body ? ` - ${body}` : ''}`);
  }

  return response.json();
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

export default App;

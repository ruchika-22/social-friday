import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { ref, set, update, onValue, remove } from 'firebase/database';
import { db } from './firebase';
import * as Guessing from './games/GuessingGames';
import * as Creative from './games/CreativeGames';
import * as Brain from './games/BrainGames';
import * as QuickFire from './games/QuickFireGames';
import * as Party from './games/PartyGames';
import { SECRET_QUESTIONS, STRENGTH_OPTIONS, WEAKNESS_OPTIONS, getPlayableMediaUrl } from './games/gameData';
import { generateDynamicQuestion, generateLeaderboardCommentary } from './gemini';
import './App.css';

const CLOUD_NAME = 'dsti0gxty';
const UPLOAD_PRESET = 'friday_game';

const CATEGORIES = [
  { ...Guessing.CONFIG, mod: Guessing },
  { ...Creative.CONFIG, mod: Creative },
  { ...Brain.CONFIG, mod: Brain },
  { ...QuickFire.CONFIG, mod: QuickFire },
  { ...Party.CONFIG, mod: Party },
];

function getCat(id) { return CATEGORIES.find(c => c.id === id); }

// ==============================
// HOME
// ==============================
function Home() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');

  const createRoom = () => {
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    set(ref(db, `rooms/${code}`), { gameState: 'category_select', currentActivity: { type: 'waiting' }, syncClicks: 0 });
    navigate(`/room/${code}/admin`);
  };

  const joinRoom = () => {
    if (joinCode.trim()) navigate(`/room/${joinCode.trim().toUpperCase()}/player`);
  };

  return (
    <div style={homeWrap}>
      <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎮</div>
      <h1 style={{ fontSize: '36px', background: 'linear-gradient(135deg, #ff5c35, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 8px' }}>NEXUS FRIDAY</h1>
      <p style={{ color: '#9090b0', marginBottom: '35px' }}>Team Games & Icebreakers</p>
      <button onClick={createRoom} style={{ ...bigBtn, background: 'linear-gradient(135deg, #ff5c35, #a855f7)' }}>🎯 Host New Game</button>
      <div style={{ margin: '30px 0', color: '#555' }}>— or join —</div>
      <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Enter room code" maxLength={6}
        style={{ ...inp, textAlign: 'center', textTransform: 'uppercase', fontSize: '20px', letterSpacing: '5px' }}
        onKeyDown={e => e.key === 'Enter' && joinRoom()} />
      <button onClick={joinRoom} style={{ ...bigBtn, background: '#252533', marginTop: '10px' }}>Join Game</button>
    </div>
  );
}

// ==============================
// ADMIN PANEL
// ==============================
function AdminPanel() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState(null);
  const [aiCommentary, setAiCommentary] = useState("Analyzing team dynamics...");

  useEffect(() => {
    return onValue(ref(db, `rooms/${code}`), s => setRoomData(s.val()));
  }, [code]);

  // Ask Gemini for a roast whenever the leaderboard is shown
  useEffect(() => {
    if (roomData?.gameState === 'finished') {
      async function fetchRoast() {
        const roast = await generateLeaderboardCommentary(playersArray);
        setAiCommentary(roast);
      }
      fetchRoast();
    }
  }, [roomData?.gameState]);

  if (!roomData) return <div style={centerMsg}>Loading room...</div>;

  const gs = roomData.gameState || 'category_select';
  const players = roomData.players || {};
  const playersArray = Object.entries(players).map(([id, d]) => ({ id, ...d }));
  const activity = roomData.currentActivity || { type: 'waiting' };
  const cat = getCat(roomData.selectedCategory);

  const selectCategory = (catId) => {
    update(ref(db, `rooms/${code}`), { gameState: 'lobby', selectedCategory: catId });
  };

  const startGame = () => {
    if (playersArray.length < 2) { alert('Need at least 2 players!'); return; }
    const roundCount = Math.min(12, Math.max(8, playersArray.length * 2));
    const rounds = cat.mod.buildRounds(players, roundCount);
    const roundsObj = {};
    rounds.forEach((r, i) => { roundsObj[`r${i}`] = r; });
    update(ref(db, `rooms/${code}`), {
      gameState: 'playing', totalRounds: rounds.length, currentRound: 0,
      rounds: roundsObj, currentActivity: rounds[0], revealResults: null,
      ...cat.mod.CLEAR_KEYS
    });
  };

  const revealResults = () => {
    update(ref(db, `rooms/${code}`), { revealResults: true });
  };

  const nextRound = () => {
    const nextIdx = (roomData.currentRound || 0) + 1;
    if (nextIdx >= (roomData.totalRounds || 0)) {
      update(ref(db, `rooms/${code}`), {
        gameState: 'finished', currentActivity: { type: 'leaderboard' },
        revealResults: null, ...cat.mod.CLEAR_KEYS
      });
    } else {
      const nextAct = roomData.rounds?.[`r${nextIdx}`];
      if (nextAct) {
        update(ref(db, `rooms/${code}`), {
          gameState: 'playing', currentRound: nextIdx, currentActivity: nextAct,
          revealResults: null, ...cat.mod.CLEAR_KEYS
        });
      }
    }
  };

  const clearRoom = () => {
    if (!window.confirm('Delete this room and all data?')) return;
    remove(ref(db, `rooms/${code}`));
    navigate('/');
  };

  const restart = () => {
    const clearKeys = cat ? cat.mod.CLEAR_KEYS : {};
    update(ref(db, `rooms/${code}`), {
      gameState: 'category_select', selectedCategory: null, currentRound: null,
      totalRounds: null, rounds: null, currentActivity: { type: 'waiting' },
      revealResults: null, ...clearKeys
    });
  };

  const targetPlayer = playersArray.find(p => p.id === activity.targetId);
  const sorted = [...playersArray].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div style={adminWrap}>
      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#ff5c35', margin: '0 0 5px', fontSize: '18px' }}>🎮 NEXUS FRIDAY — Admin</h2>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#35d4ff', letterSpacing: '6px' }}>{code}</div>
        {cat && <p style={{ color: cat.color, margin: '5px 0 0', fontSize: '14px' }}>{cat.label}</p>}
      </div>

      {/* === CATEGORY SELECT === */}
      {gs === 'category_select' && (
        <div>
          <h3 style={{ color: 'white', textAlign: 'center', marginBottom: '20px' }}>Pick a Game Category</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => selectCategory(c.id)} style={{
                padding: '20px', background: '#1c1c26', border: `2px solid ${c.color}33`,
                borderRadius: '15px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
              }}>
                <h3 style={{ color: c.color, margin: '0 0 6px' }}>{c.label}</h3>
                <p style={{ color: '#9090b0', margin: 0, fontSize: '13px' }}>{c.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* === LOBBY === */}
      {gs === 'lobby' && (
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ color: 'white' }}>Waiting for Players</h3>
          <p style={{ color: '#9090b0', fontSize: '13px' }}>
            Share code: <strong style={{ color: '#35d4ff', fontSize: '18px' }}>{code}</strong>
          </p>
          <div style={{ margin: '20px 0' }}>
            {playersArray.length === 0
              ? <p style={{ color: '#555' }}>No players yet...</p>
              : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  {playersArray.map(p => (
                    <span key={p.id} style={{
                      padding: '8px 16px', borderRadius: '20px', color: 'white', fontSize: '14px',
                      background: p.isReady ? '#1c3a2a' : '#252538',
                      border: p.isReady ? '1px solid #22c55e' : '1px solid #444'
                    }}>
                      {p.name} {p.isReady ? '✅' : '⏳'}
                    </span>
                  ))}
                </div>
              )
            }
          </div>
          <button onClick={startGame} style={{
            ...bigBtn, background: cat?.color || '#ff5c35',
            opacity: playersArray.length < 2 ? 0.4 : 1
          }}>
            🚀 Start Game ({playersArray.length} players)
          </button>
          <button onClick={restart} style={{ ...smBtn, marginTop: '15px' }}>← Change Category</button>
        </div>
      )}

      {/* === PLAYING / RESULTS === */}
      {(gs === 'playing' || gs === 'results') && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <p style={{ color: '#9090b0', margin: '0 0 4px', fontSize: '13px' }}>
              Round <strong style={{ color: 'white' }}>{(roomData.currentRound || 0) + 1}</strong> of{' '}
              <strong style={{ color: 'white' }}>{roomData.totalRounds}</strong>
            </p>
            <p style={{ color: cat?.color || '#fff', fontSize: '14px', margin: 0 }}>
              {activity.type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </p>
          </div>

          {/* Admin Monitor */}
          <div style={{ background: '#1c1c26', borderRadius: '12px', padding: '15px', marginBottom: '15px' }}>
            <h4 style={{ color: '#ffb347', margin: '0 0 10px', fontSize: '14px' }}>📊 Live Activity</h4>
            {cat && <cat.mod.AdminMonitor activity={activity} roomData={roomData} playersArray={playersArray} targetPlayer={targetPlayer} />}
          </div>

          {/* Scores */}
          <div style={{ background: '#1c1c26', borderRadius: '12px', padding: '15px', marginBottom: '15px' }}>
            <h4 style={{ color: '#a855f7', margin: '0 0 10px', fontSize: '14px' }}>🏆 Scores</h4>
            {sorted.map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', padding: '4px 8px',
                borderRadius: '6px', background: i < 3 ? '#252545' : 'transparent'
              }}>
                <span style={{ color: 'white', fontSize: '13px' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {p.name}
                </span>
                <span style={{ color: '#ffb347', fontWeight: 'bold', fontSize: '13px' }}>{p.score || 0}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {!roomData.revealResults && (
              <button onClick={revealResults} style={{ ...bigBtn, background: '#eab308', color: '#000', flex: 1 }}>
                📊 Reveal Results
              </button>
            )}
            <button onClick={nextRound} style={{
              ...bigBtn, flex: 1,
              background: (roomData.currentRound || 0) + 1 >= (roomData.totalRounds || 0) ? '#22c55e' : '#3b82f6'
            }}>
              {(roomData.currentRound || 0) + 1 >= (roomData.totalRounds || 0) ? '🏁 Finish Game' : '➡️ Next Round'}
            </button>
          </div>
        </div>
      )}

      {/* === FINISHED === */}
      {gs === 'finished' && (
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#ffb347', margin: '10px 0' }}>🏆 Final Leaderboard</h2>
          
          {/* NEW AI COMMENTARY BOX */}
          <div style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(53,212,255,0.2))', padding: '20px', borderRadius: '15px', margin: '20px auto', maxWidth: '400px', border: '1px solid rgba(168,85,247,0.4)' }}>
              <p style={{ color: '#35d4ff', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>🤖 AI Game Master says:</p>
              <p style={{ fontSize: '16px', fontStyle: 'italic', lineHeight: '1.4' }}>"{aiCommentary}"</p>
          </div>

          {sorted.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 18px', margin: '8px 0', borderRadius: '12px',
              background: i === 0 ? '#1c3a2a' : '#1c1c26',
              border: i === 0 ? '2px solid #22c55e' : '1px solid #333'
            }}>
              <span style={{ color: 'white', fontSize: '16px' }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}{' '}<strong>{p.name}</strong>
              </span>
              <span style={{ color: '#ffb347', fontWeight: 'bold', fontSize: '18px' }}>{p.score || 0}</span>
            </div>
          ))}
          <div style={{ marginTop: '25px', display: 'flex', gap: '10px' }}>
            <button onClick={restart} style={{ ...bigBtn, background: '#3b82f6', flex: 1 }}>🔄 Play Again</button>
            <button onClick={clearRoom} style={{ ...bigBtn, background: '#ef4444', flex: 1 }}>🗑️ End Room</button>
          </div>
        </div>
      )}

      {/* Clear room always visible during non-finished states */}
      {gs !== 'finished' && (
        <button onClick={clearRoom} style={{ ...smBtn, marginTop: '20px', color: '#ef4444' }}>🗑️ Clear Room</button>
      )}
    </div>
  );
}

// ==============================
// PLAYER SETUP
// ==============================
function PlayerSetup({ roomCode, roomData, onReady }) {
  const [name, setName] = useState('');
  const [step, setStep] = useState(0);
  const [secretQ, setSecretQ] = useState('Loading a weird question...');
  const [secretA, setSecretA] = useState('');
  const [statements, setStatements] = useState([
    { text: '', isLie: false }, { text: '', isLie: false }, { text: '', isLie: true }
  ]);
  const [strength, setStrength] = useState('');
  const [weakness, setWeakness] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [uploading, setUploading] = useState(false);

  // Ask Gemini for a question when the screen loads!
  useEffect(() => {
    async function fetchQuestion() {
      const aiQuestion = await generateDynamicQuestion();
      setSecretQ(aiQuestion);
    }
    fetchQuestion();
  }, []);

  const category = roomData?.selectedCategory;
  const needsFull = category === 'guess_who';
  const needsMedia = true; // All categories collect a profile photo
  // Steps: 0=name, 1=media(if needed), 2=secretQA, 3=truths, 4=strength
  const totalSteps = needsFull ? 5 : needsMedia ? 2 : 1;

  const uploadFile = async (file) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);
    const rType = file.type.startsWith('video') || file.type.startsWith('audio') ? 'video' : 'image';
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${rType}/upload`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      if (!data.secure_url) throw new Error('No URL returned');
      const uploadedMediaType = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image';
      setMediaUrl(getPlayableMediaUrl(data.secure_url, uploadedMediaType));
      setMediaType(uploadedMediaType);
    } catch (e) { 
      console.error('Upload failed:', e);
      alert('Upload failed. Please try again.');
    }
    setUploading(false);
  };

  const finishSetup = () => {
    const pid = 'p_' + Math.random().toString(36).substr(2, 8);
    const playerData = { name, score: 0, isReady: true };
    if (mediaUrl) { playerData.mediaUrl = mediaUrl; playerData.mediaType = mediaType; }
    if (needsFull) {
      playerData.secretQuestion = secretQ;
      playerData.secretAnswer = secretA;
      playerData.statements = { s0: statements[0], s1: statements[1], s2: statements[2] };
      playerData.myStrength = strength;
      playerData.myWeakness = weakness;
    }
    set(ref(db, `rooms/${roomCode}/players/${pid}`), playerData);
    sessionStorage.setItem(`nexus_player_${roomCode}`, pid);
    onReady(pid);
  };

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1 && needsMedia) return !!mediaUrl;
    if (needsFull) {
      if (step === 2) return secretA.trim().length > 0;
      if (step === 3) return statements.every(s => s.text.trim());
      if (step === 4) return strength && weakness;
    }
    return true;
  };

  const goNext = () => {
    if (step >= totalSteps - 1) { finishSetup(); return; }
    setStep(s => s + 1);
  };

  return (
    <div style={setupWrap}>
      <h2 style={{ color: '#ff5c35', textAlign: 'center', margin: '0 0 5px' }}>🎮 Locker Room</h2>
      <p style={{ color: '#555', textAlign: 'center', marginBottom: '20px', fontSize: '13px' }}>Step {step + 1} of {totalSteps} • All fields required</p>

      {/* Step 0: Name */}
      {step === 0 && (
        <div>
          <label style={labelSt}>Your Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" maxLength={20} style={inp}
            onKeyDown={e => e.key === 'Enter' && canNext() && goNext()} />
        </div>
      )}

      {/* Step 1: Media */}
      {step === 1 && needsMedia && (
        <div>
          <label style={labelSt}>Upload a Profile Photo, Video, or Audio</label>
          <p style={{ color: '#777', fontSize: '12px' }}>
            {needsFull
              ? 'Photo, video, or audio for teammates to guess about!'
              : category === 'creative'
                ? '📸 Upload a photo — it will be used in Caption This rounds!'
                : 'Add a photo, video, or audio file so teammates can see your content during the game!'}
          </p>
          <input type="file" accept="image/*,video/*,audio/*"
            onChange={e => { if (e.target.files[0]) uploadFile(e.target.files[0]); }}
            style={{ color: 'white', marginTop: '10px' }} />
          {uploading && <p style={{ color: '#ffb347', marginTop: '10px' }}>⏳ Uploading...</p>}
          {mediaUrl && mediaType && (
            <div style={{ marginTop: '15px', padding: '12px', background: '#1c1c26', borderRadius: '10px', borderLeft: '4px solid #22c55e' }}>
              <p style={{ color: '#22c55e', margin: '0 0 10px', fontSize: '12px' }}>✅ Uploaded!</p>
              {mediaType === 'image' && <img src={mediaUrl} alt="Preview" style={{ width: '100%', maxHeight: '150px', borderRadius: '8px', objectFit: 'cover' }} />}
              {mediaType === 'video' && <video src={getPlayableMediaUrl(mediaUrl, mediaType)} controls playsInline preload="metadata" style={{ width: '100%', maxHeight: '150px', borderRadius: '8px' }} />}
              {mediaType === 'audio' && <audio src={getPlayableMediaUrl(mediaUrl, mediaType)} controls preload="metadata" style={{ width: '100%', marginTop: '8px' }} />}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Secret Q&A */}
      {step === 2 && needsFull && (
        <div>
          <label style={labelSt}>Secret Question</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
            {SECRET_QUESTIONS.slice(0, 8).map(q => (
              <button key={q} onClick={() => setSecretQ(q)} style={{
                padding: '6px 12px', borderRadius: '15px', cursor: 'pointer', fontSize: '12px', color: 'white',
                border: secretQ === q ? '2px solid #ff5c35' : '1px solid #444',
                background: secretQ === q ? '#3a1515' : '#252533'
              }}>{q}</button>
            ))}
          </div>
          <p style={{ color: '#ffb347', marginBottom: '5px', fontSize: '14px' }}>{secretQ}</p>
          <input value={secretA} onChange={e => setSecretA(e.target.value)} placeholder="Your answer..." maxLength={80} style={inp} />
        </div>
      )}

      {/* Step 3: Two Truths */}
      {step === 3 && needsFull && (
        <div>
          <label style={labelSt}>Two Truths & A Lie</label>
          <p style={{ color: '#777', fontSize: '12px', marginBottom: '10px' }}>Write 2 truths and 1 lie. The 3rd one is the lie!</p>
          {statements.map((s, i) => (
            <div key={i} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: s.isLie ? '#ef4444' : '#22c55e', fontSize: '12px', minWidth: '35px' }}>
                {s.isLie ? '❌ Lie' : '✅ True'}
              </span>
              <input value={s.text} onChange={e => {
                const ns = [...statements]; ns[i] = { ...ns[i], text: e.target.value }; setStatements(ns);
              }} placeholder={s.isLie ? 'The lie...' : 'A truth...'} maxLength={80} style={{ ...inp, margin: 0, flex: 1 }} />
            </div>
          ))}
        </div>
      )}

      {/* Step 4: Strength/Weakness */}
      {step === 4 && needsFull && (
        <div>
          <label style={labelSt}>Your Strength</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '15px' }}>
            {STRENGTH_OPTIONS.map(s => (
              <button key={s} onClick={() => setStrength(s)} style={{
                padding: '6px 12px', borderRadius: '15px', cursor: 'pointer', fontSize: '12px', color: 'white',
                border: strength === s ? '2px solid #14b8a6' : '1px solid #444',
                background: strength === s ? '#0d2a2a' : '#252533'
              }}>{s}</button>
            ))}
          </div>
          <label style={labelSt}>Want to Improve</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {WEAKNESS_OPTIONS.map(w => (
              <button key={w} onClick={() => setWeakness(w)} style={{
                padding: '6px 12px', borderRadius: '15px', cursor: 'pointer', fontSize: '12px', color: 'white',
                border: weakness === w ? '2px solid #f97316' : '1px solid #444',
                background: weakness === w ? '#2a1a0a' : '#252533'
              }}>{w}</button>
            ))}
          </div>
        </div>
      )}

      <button onClick={goNext} disabled={!canNext()} style={{
        ...bigBtn, marginTop: '20px',
        background: canNext() ? '#ff5c35' : '#333', opacity: canNext() ? 1 : 0.5
      }}>
        {step >= totalSteps - 1 ? '🚀 Join Game!' : 'Next →'}
      </button>
    </div>
  );
}

// ==============================
// GAME BOARD (Player-facing)
// ==============================
function GameBoard({ roomCode, roomData, myPlayerId }) {
  const activity = roomData.currentActivity || { type: 'waiting' };
  const cat = getCat(roomData.selectedCategory);
  const gs = roomData.gameState;

  // Finished - leaderboard (check FIRST so it always shows)
  if (gs === 'finished') {
    const players = Object.entries(roomData.players || {}).map(([id, d]) => ({ id, ...d }));
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    return (
      <div style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto', color: 'white', padding: '20px' }}>
        <h2 style={{ color: '#ffb347' }}>🏆 Final Leaderboard</h2>
        {sorted.map((p, i) => (
          <div key={p.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 18px', margin: '8px 0', borderRadius: '12px',
            background: i === 0 ? '#1c3a2a' : '#1c1c26',
            border: i === 0 ? '2px solid #22c55e' : '1px solid #333'
          }}>
            <span style={{ color: 'white' }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}{' '}
              <strong>{p.name}</strong> {p.id === myPlayerId ? '(You)' : ''}
            </span>
            <span style={{ color: '#ffb347', fontWeight: 'bold', fontSize: '18px' }}>{p.score || 0}</span>
          </div>
        ))}
      </div>
    );
  }

  // Waiting / lobby
  if (gs === 'lobby' || gs === 'category_select' || activity.type === 'waiting') return (
    <div style={{ ...centerMsg, flexDirection: 'column' }}>
      <p style={{ fontSize: '48px' }}>⏳</p>
      <h2 style={{ color: 'white' }}>Waiting for host to start...</h2>
      <p style={{ color: '#9090b0' }}>Get ready!</p>
    </div>
  );

  // Active round
  if (!cat) return <div style={centerMsg}>Loading game...</div>;
  const Renderer = cat.mod.GameRenderer;

  return (
    <div style={{ padding: '15px' }}>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <span style={{ color: '#9090b0', fontSize: '13px' }}>
          Round {(roomData.currentRound || 0) + 1} / {roomData.totalRounds} &nbsp;•&nbsp;
          <span style={{ color: cat.color }}>{cat.label}</span>
        </span>
      </div>
      <Renderer activity={activity} roomCode={roomCode} roomData={roomData} myPlayerId={myPlayerId} />
    </div>
  );
}

// ==============================
// PLAYER VIEW
// ==============================
function PlayerView() {
  const { code } = useParams();
  const [roomData, setRoomData] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(() => sessionStorage.getItem(`nexus_player_${code}`));

  useEffect(() => {
    return onValue(ref(db, `rooms/${code}`), s => setRoomData(s.val()));
  }, [code]);

  if (!roomData) return <div style={centerMsg}>Loading...</div>;

  // Wait for host to pick category before allowing setup
  if (roomData.gameState === 'category_select') return (
    <div style={{ ...centerMsg, flexDirection: 'column' }}>
      <p style={{ fontSize: '48px' }}>🎮</p>
      <h2 style={{ color: 'white' }}>Waiting for host to pick a game...</h2>
      <p style={{ color: '#9090b0' }}>Hang tight!</p>
    </div>
  );

  // Not set up yet
  if (!myPlayerId || !roomData.players?.[myPlayerId]) {
    return <PlayerSetup roomCode={code} roomData={roomData} onReady={setMyPlayerId} />;
  }

  return <GameBoard roomCode={code} roomData={roomData} myPlayerId={myPlayerId} />;
}

// ==============================
// APP
// ==============================
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:code/admin" element={<AdminPanel />} />
        <Route path="/room/:code/player" element={<PlayerView />} />
      </Routes>
    </Router>
  );
}

export default App;

// ==============================
// SHARED STYLES
// ==============================
const homeWrap = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px', color: 'white' };
const adminWrap = { maxWidth: '600px', margin: '0 auto', padding: '20px', color: 'white', minHeight: '100vh' };
const setupWrap = { maxWidth: '500px', margin: '0 auto', padding: '20px', color: 'white', minHeight: '100vh' };
const centerMsg = { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'white', textAlign: 'center' };
const inp = { width: '100%', padding: '14px', background: '#1c1c26', border: '1px solid #5a5a78', borderRadius: '10px', color: 'white', fontSize: '14px', boxSizing: 'border-box', margin: '5px 0' };
const bigBtn = { padding: '16px 32px', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', width: '100%' };
const smBtn = { padding: '10px 20px', border: '1px solid #444', borderRadius: '8px', background: 'transparent', color: '#9090b0', cursor: 'pointer', fontSize: '13px', width: '100%' };
const labelSt = { color: '#9090b0', fontSize: '13px', textTransform: 'uppercase', display: 'block', marginBottom: '5px' };

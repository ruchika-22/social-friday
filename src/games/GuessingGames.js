import React, { useState, useEffect } from 'react';
import { ref, set, update, onValue, increment } from 'firebase/database';
import { db } from '../firebase';
import { shuffle } from './gameData';

export const CONFIG = {
  id: 'guess_who', label: '🎯 Guess Who', color: '#a855f7',
  description: 'Guess which teammate matches the clue — media, quotes, truths & lies, and strengths!'
};

export const CLEAR_KEYS = {
  mediaGuesses: null, whoSaidGuesses: null, twoTruthGuesses: null, strengthGuesses: null, revealResults: null
};

export function buildRounds(players, count) {
  const pids = Object.keys(players);
  const allRounds = [];

  // For each player, only create rounds for data they actually provided
  pids.forEach(pid => {
    const p = players[pid];
    if (p.mediaUrl) allRounds.push({ type: 'media_guess', targetId: pid });
    if (p.secretQuestion && p.secretAnswer) allRounds.push({ type: 'who_said_it', targetId: pid });
    if (p.statements) allRounds.push({ type: 'two_truths', targetId: pid });
    if (p.myStrength) allRounds.push({ type: 'strength_spotter', targetId: pid });
  });

  // Shuffle for variety, take up to count
  const shuffled = shuffle(allRounds);
  return shuffled.slice(0, count).map((r, i) => ({ ...r, round: Date.now() + i }));
}

// ===== PLAYER GAME RENDERER =====
export function GameRenderer({ activity, roomCode, roomData, myPlayerId }) {
  const [hasGuessed, setHasGuessed] = useState(false);
  const [allGuesses, setAllGuesses] = useState({});
  const round = activity.round || activity.targetId || activity.type;
  const revealed = roomData.revealResults === true;

  useEffect(() => { setHasGuessed(false); setAllGuesses({}); }, [round]);

  const guessKeys = { media_guess: 'mediaGuesses', who_said_it: 'whoSaidGuesses', two_truths: 'twoTruthGuesses', strength_spotter: 'strengthGuesses' };
  const gk = guessKeys[activity.type];

  useEffect(() => {
    if (!gk) return;
    return onValue(ref(db, `rooms/${roomCode}/${gk}`), s => { if (s.exists()) setAllGuesses(s.val()); });
  }, [roomCode, gk]);

  const players = Object.entries(roomData.players || {}).map(([id, d]) => ({ id, ...d }));
  const target = players.find(p => p.id === activity.targetId);
  if (!target) return <div style={{ textAlign: 'center', padding: '40px', color: 'white' }}>Waiting for round data...</div>;

  const isMe = myPlayerId === target.id;

  const guessPlayer = (guessedId) => {
    if (hasGuessed || isMe) return;
    setHasGuessed(true);
    const correct = guessedId === target.id;
    const guessedName = players.find(p => p.id === guessedId)?.name || 'Unknown';
    if (correct) update(ref(db, `rooms/${roomCode}/players/${myPlayerId}`), { score: increment(100) });
    set(ref(db, `rooms/${roomCode}/${gk}/${myPlayerId}`), { guessedName, correct });
  };

  const ResultsPanel = () => {
    const entries = Object.entries(allGuesses);
    if (entries.length === 0) return null;
    return (
      <div style={{ background: '#1a1a2e', padding: '15px', borderRadius: '12px', marginTop: '15px', textAlign: 'left' }}>
        <p style={{ color: '#ffb347', fontWeight: 'bold', marginBottom: '8px' }}>📊 Results — Answer: <span style={{ color: '#22c55e' }}>{target.name}</span></p>
        {entries.map(([pid, g]) => {
          const p = players.find(x => x.id === pid);
          return <div key={pid} style={rStyle}><strong>{p?.name || pid}:</strong> {g.guessedName || (g.correct ? 'Found it!' : 'Wrong')} {g.correct ? '✅' : '❌'}</div>;
        })}
      </div>
    );
  };

  // --- MEDIA GUESS ---
  if (activity.type === 'media_guess') return (
    <div style={wrap}>
      <h2 style={{ color: '#a855f7' }}>📸 Whose file is this?</h2>
      <div style={card}>
        {target.mediaType === 'image' && <img src={target.mediaUrl} alt="Mystery" style={{ width: '100%', borderRadius: '10px', maxHeight: '300px', objectFit: 'contain' }} />}
        {target.mediaType === 'video' && <video src={target.mediaUrl} controls style={{ width: '100%', borderRadius: '10px' }} />}
        {target.mediaType === 'audio' && <audio src={target.mediaUrl} controls style={{ width: '100%' }} />}
      </div>
      {isMe ? <p style={{ color: '#ffb347' }}>This is your file! Sit back and watch. 😎</p> : !hasGuessed ? (
        <div style={grid}>{players.map(p => <button key={p.id} onClick={() => guessPlayer(p.id)} style={gBtn}>{p.name}</button>)}</div>
      ) : <p style={{ color: '#35d4ff', marginTop: '15px' }}>✅ Answered! Waiting for reveal...</p>}
      {(hasGuessed || isMe) && revealed && <ResultsPanel />}
    </div>
  );

  // --- WHO SAID IT ---
  if (activity.type === 'who_said_it') return (
    <div style={wrap}>
      <h2 style={{ color: '#ffb347' }}>🗣️ Who Said It?</h2>
      <div style={{ ...card, borderLeft: '5px solid #ffb347' }}>
        <p style={{ color: '#9090b0', textTransform: 'uppercase', fontSize: '12px' }}>Question:</p>
        <p style={{ fontSize: '18px', marginBottom: '15px' }}>{target.secretQuestion}</p>
        <p style={{ color: '#9090b0', textTransform: 'uppercase', fontSize: '12px' }}>Answer:</p>
        <h2 style={{ fontSize: '24px', color: '#ff5c35' }}>"{target.secretAnswer}"</h2>
      </div>
      {isMe ? <p style={{ color: '#ffb347' }}>This is your answer! Sit back and watch. 😎</p> : !hasGuessed ? (
        <div style={grid}>{players.map(p => <button key={p.id} onClick={() => guessPlayer(p.id)} style={gBtn}>{p.name}</button>)}</div>
      ) : <p style={{ color: '#35d4ff', marginTop: '15px' }}>✅ Answered! Waiting for reveal...</p>}
      {(hasGuessed || isMe) && revealed && <ResultsPanel />}
    </div>
  );

  // --- TWO TRUTHS & A LIE ---
  if (activity.type === 'two_truths') {
    const statements = Object.values(target.statements || {});
    return (
      <div style={wrap}>
        <h2 style={{ color: '#ff5c35' }}>🤥 Two Truths & A Lie</h2>
        <p style={{ color: '#9090b0' }}>About: <strong style={{ color: '#35d4ff' }}>{target.name}</strong></p>
        {target.mediaType === 'image' && <img src={target.mediaUrl} alt={target.name} style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', margin: '10px auto', display: 'block', border: '3px solid #ff5c35' }} />}
        <p style={{ color: '#ffb347', marginBottom: '15px' }}>Which one is the LIE?</p>
        {isMe ? <p style={{ color: '#ffb347' }}>This round is about you! 😎</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {statements.map((s, i) => (
              <button key={i} onClick={() => {
                if (hasGuessed) return;
                setHasGuessed(true);
                const correct = s.isLie === true;
                if (correct) update(ref(db, `rooms/${roomCode}/players/${myPlayerId}`), { score: increment(150) });
                set(ref(db, `rooms/${roomCode}/twoTruthGuesses/${myPlayerId}`), { correct });
              }} disabled={hasGuessed} style={{
                padding: '16px', textAlign: 'left', fontSize: '15px', color: 'white', cursor: hasGuessed ? 'default' : 'pointer',
                background: hasGuessed ? (s.isLie ? '#7f1d1d' : '#1c3a2a') : '#252533',
                border: hasGuessed ? (s.isLie ? '2px solid #ef4444' : '2px solid #22c55e') : '1px solid #5a5a78', borderRadius: '10px'
              }}>
                {hasGuessed ? (s.isLie ? '❌ LIE: ' : '✅ TRUE: ') : `${i + 1}. `}{s.text || ''}
              </button>
            ))}
          </div>
        )}
        {hasGuessed && !revealed && <p style={{ color: '#35d4ff', marginTop: '15px' }}>Waiting for reveal...</p>}
        {(hasGuessed || isMe) && revealed && (() => {
          const entries = Object.entries(allGuesses);
          return (
            <div style={{ background: '#1a1a2e', padding: '15px', borderRadius: '12px', marginTop: '15px', textAlign: 'left' }}>
              <p style={{ color: '#ffb347', fontWeight: 'bold', marginBottom: '8px' }}>📊 Results</p>
              {entries.map(([pid, g]) => {
                const p = players.find(x => x.id === pid);
                return <div key={pid} style={rStyle}><strong>{p?.name || pid}:</strong> {g.correct ? '🎯 Found the lie!' : '😅 Picked a truth'}</div>;
              })}
            </div>
          );
        })()}
      </div>
    );
  }

  // --- STRENGTH SPOTTER ---
  if (activity.type === 'strength_spotter') return (
    <div style={wrap}>
      <h2 style={{ color: '#14b8a6' }}>💪 Strength Spotter</h2>
      <p style={{ color: '#9090b0', marginBottom: '15px' }}>Whose strength & weakness is this?</p>
      <div style={card}>
        <p style={{ color: '#9090b0', textTransform: 'uppercase', fontSize: '11px' }}>Strength</p>
        <h2 style={{ color: '#14b8a6', margin: '8px 0 18px', fontSize: '20px' }}>"{target.myStrength || 'Not provided'}"</h2>
        <p style={{ color: '#9090b0', textTransform: 'uppercase', fontSize: '11px' }}>Wants to improve</p>
        <h2 style={{ color: '#f97316', margin: '8px 0 0', fontSize: '20px' }}>"{target.myWeakness || 'Not provided'}"</h2>
      </div>
      {isMe ? <p style={{ color: '#ffb347' }}>This round is about you! 😎</p> : !hasGuessed ? (
        <div style={grid}>{players.map(p => <button key={p.id} onClick={() => guessPlayer(p.id)} style={gBtn}>{p.name}</button>)}</div>
      ) : <p style={{ color: '#35d4ff', marginTop: '15px' }}>✅ Answered! Waiting for reveal...</p>}
      {(hasGuessed || isMe) && revealed && <ResultsPanel />}
    </div>
  );

  return null;
}

// ===== ADMIN MONITOR =====
export function AdminMonitor({ activity, roomData, playersArray, targetPlayer }) {
  const gk = { media_guess: 'mediaGuesses', who_said_it: 'whoSaidGuesses', two_truths: 'twoTruthGuesses', strength_spotter: 'strengthGuesses' }[activity.type];
  const data = roomData?.[gk];
  const respondedCount = data ? Object.keys(data).length : 0;

  return (
    <div>
      {targetPlayer && <p style={{ color: '#9090b0', fontSize: '13px' }}>Target: <strong style={{ color: '#22c55e' }}>{targetPlayer.name}</strong></p>}
      {activity.type === 'who_said_it' && targetPlayer && (
        <div style={{ background: '#1a1a2e', padding: '8px 12px', borderRadius: '8px', margin: '5px 0', borderLeft: '3px solid #ffb347' }}>
          <span style={{ color: '#9090b0', fontSize: '12px' }}>Q: {targetPlayer.secretQuestion}</span><br/>
          <span style={{ color: '#ffb347', fontWeight: 'bold' }}>A: "{targetPlayer.secretAnswer}"</span>
        </div>
      )}
      {activity.type === 'two_truths' && targetPlayer?.statements && Object.values(targetPlayer.statements).map((s, i) => (
        <div key={i} style={{ padding: '4px 10px', margin: '2px 0', borderRadius: '6px', background: s.isLie ? '#3b1111' : '#112e1b', border: s.isLie ? '1px solid #ef4444' : '1px solid #22c55e', fontSize: '12px' }}>
          {s.isLie ? '❌ LIE' : '✅ TRUE'}: {s.text}
        </div>
      ))}
      {activity.type === 'strength_spotter' && targetPlayer && (
        <div style={{ background: '#1a1a2e', padding: '8px 12px', borderRadius: '8px', margin: '5px 0', borderLeft: '3px solid #14b8a6' }}>
          <span style={{ fontSize: '11px', color: '#9090b0' }}>Strength:</span> <strong style={{ color: '#14b8a6' }}>"{targetPlayer.myStrength}"</strong><br/>
          <span style={{ fontSize: '11px', color: '#9090b0' }}>Weakness:</span> <strong style={{ color: '#f97316' }}>"{targetPlayer.myWeakness}"</strong>
        </div>
      )}
      {data && Object.entries(data).map(([pid, g]) => {
        const p = playersArray.find(x => x.id === pid);
        return <div key={pid} style={rStyle}><strong>{p?.name || pid}:</strong> {g.guessedName || (g.correct ? '🎯' : '😅')} {g.correct ? '✅' : '❌'}</div>;
      })}
      <p style={{ color: '#555', fontSize: '12px', marginTop: '6px' }}>Responded: {respondedCount} / {playersArray.length}</p>
    </div>
  );
}

const wrap = { textAlign: 'center', maxWidth: '500px', margin: '0 auto', color: 'white' };
const card = { background: '#1c1c26', padding: '25px', borderRadius: '15px', margin: '15px 0' };
const grid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' };
const gBtn = { padding: '15px', background: '#252533', color: 'white', border: '1px solid #5a5a78', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' };
const rStyle = { padding: '5px 10px', margin: '3px 0', background: '#252538', borderRadius: '6px', fontSize: '13px', color: 'white' };

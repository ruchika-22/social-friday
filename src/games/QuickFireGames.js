import React, { useState, useEffect } from 'react';
import { ref, set, update, onValue, increment } from 'firebase/database';
import { db } from '../firebase';
import { WOULD_YOU_RATHER_PROMPTS, THIS_OR_THAT_PROMPTS, WORD_ASSOCIATION_PROMPTS, shuffle, isMediaKind } from './gameData';

export const CONFIG = {
  id: 'quickfire', label: '⚡ Quick Fire', color: '#eab308',
  description: 'Fast picks, hot takes & word games — think fast, no time to overthink!'
};

export const CLEAR_KEYS = {
  wouldYouRatherVotes: null, thisOrThatVotes: null, wordAssocAnswers: null, wordAssocVotes: null, revealResults: null
};

const SUB_TYPES = ['would_you_rather', 'this_or_that', 'word_assoc'];

export function buildRounds(players, count) {
  const wyr = shuffle([...WOULD_YOU_RATHER_PROMPTS]);
  const tot = shuffle([...THIS_OR_THAT_PROMPTS]);
  const wa = shuffle([...WORD_ASSOCIATION_PROMPTS]);
  let wi = 0, ti = 0, ai = 0;
  const rounds = [];
  for (let i = 0; i < count; i++) {
    const subType = SUB_TYPES[i % SUB_TYPES.length];
    if (subType === 'would_you_rather') {
      const p = wyr[wi++ % wyr.length];
      rounds.push({ type: 'would_you_rather', optionA: p.a, optionB: p.b, round: Date.now() + i });
    } else if (subType === 'this_or_that') {
      const p = tot[ti++ % tot.length];
      rounds.push({ type: 'this_or_that', optionA: p.a, optionB: p.b, round: Date.now() + i });
    } else {
      rounds.push({ type: 'word_assoc', word: wa[ai++ % wa.length], round: Date.now() + i });
    }
  }
  return rounds;
}

function PlayerAvatar({ player, size }) {
  const s = size || 36;
  if (player?.mediaUrl && isMediaKind(player.mediaType, player.mediaUrl, 'image')) {
    return <img src={player.mediaUrl} alt={player.name} style={{ width: s, height: s, borderRadius: '50%', objectFit: 'cover', border: '2px solid #5a5a78', flexShrink: 0 }} />;
  }
  return <div style={{ width: s, height: s, borderRadius: '50%', background: '#3b3b5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: s * 0.45, color: '#aaa', flexShrink: 0, border: '2px solid #5a5a78' }}>{(player?.name || '?')[0].toUpperCase()}</div>;
}

// ===== PLAYER RENDERER =====
export function GameRenderer({ activity, roomCode, roomData, myPlayerId }) {
  const [hasVoted, setHasVoted] = useState(false);
  const [myChoice, setMyChoice] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [hasVotedWord, setHasVotedWord] = useState(false);
  const [allVotes, setAllVotes] = useState({});
  const [allWords, setAllWords] = useState({});
  const [wordVotes, setWordVotes] = useState({});
  const round = activity.round || activity.type;
  const revealed = roomData.revealResults === true;

  useEffect(() => { setHasVoted(false); setMyChoice(''); setTextAnswer(''); setSubmitted(false); setHasVotedWord(false); setAllVotes({}); setAllWords({}); setWordVotes({}); }, [round]);

  const voteKey = activity.type === 'would_you_rather' ? 'wouldYouRatherVotes' : activity.type === 'this_or_that' ? 'thisOrThatVotes' : null;

  useEffect(() => {
    if (voteKey) return onValue(ref(db, `rooms/${roomCode}/${voteKey}`), s => { if (s.exists()) setAllVotes(s.val()); });
  }, [roomCode, voteKey]);

  useEffect(() => {
    if (activity.type === 'word_assoc') return onValue(ref(db, `rooms/${roomCode}/wordAssocAnswers`), s => { if (s.exists()) setAllWords(s.val()); });
  }, [roomCode, activity.type]);

  useEffect(() => {
    if (activity.type === 'word_assoc') return onValue(ref(db, `rooms/${roomCode}/wordAssocVotes`), s => { if (s.exists()) setWordVotes(s.val()); });
  }, [roomCode, activity.type]);

  const players = Object.entries(roomData.players || {}).map(([id, d]) => ({ id, ...d }));

  // Vote counts for A/B games
  let countA = 0, countB = 0;
  Object.values(allVotes).forEach(v => { if (v.choice === 'A') countA++; else countB++; });
  const total = countA + countB;

  // Word vote counts
  const wordVoteCounts = {};
  Object.values(wordVotes).forEach(v => { wordVoteCounts[v] = (wordVoteCounts[v] || 0) + 1; });

  const handleWordVote = (pid) => {
    if (hasVotedWord || pid === myPlayerId) return;
    setHasVotedWord(true);
    set(ref(db, `rooms/${roomCode}/wordAssocVotes/${myPlayerId}`), pid);
    update(ref(db, `rooms/${roomCode}/players/${pid}`), { score: increment(50) });
  };

  // ===== WOULD YOU RATHER =====
  if (activity.type === 'would_you_rather') return (
    <div style={wrap}>
      <h2 style={{ color: '#eab308' }}>🤔 Would You Rather</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
        {[['A', activity.optionA, '#3b82f6'], ['B', activity.optionB, '#f43f5e']].map(([label, text, col]) => (
          <button key={label} onClick={() => {
            if (hasVoted) return;
            setHasVoted(true);
            setMyChoice(label);
            const myName = players.find(p => p.id === myPlayerId)?.name || 'Anon';
            set(ref(db, `rooms/${roomCode}/wouldYouRatherVotes/${myPlayerId}`), { choice: label, name: myName });
          }} disabled={hasVoted} style={{
            padding: '24px', borderRadius: '15px', border: hasVoted && myChoice === label ? `3px solid ${col}` : '1px solid #5a5a78',
            background: hasVoted && myChoice === label ? col + '22' : '#252533', cursor: hasVoted ? 'default' : 'pointer',
            color: 'white', fontSize: '16px', textAlign: 'center'
          }}>
            <span style={{ color: col, fontWeight: 'bold', fontSize: '14px' }}>{label}</span><br/>{text}
          </button>
        ))}
      </div>
      {hasVoted && !revealed && <p style={{ color: '#35d4ff', marginTop: '20px' }}>✅ Voted! Waiting for reveal...</p>}
      {revealed && <VoteDistribution countA={countA} countB={countB} total={total} labelA={activity.optionA} labelB={activity.optionB} allVotes={allVotes} players={players} />}
    </div>
  );

  // ===== THIS OR THAT =====
  if (activity.type === 'this_or_that') return (
    <div style={wrap}>
      <h2 style={{ color: '#a855f7' }}>⚡ This or That</h2>
      <div style={{ display: 'flex', gap: '15px', marginTop: '20px', justifyContent: 'center' }}>
        {[['A', activity.optionA, '#3b82f6'], ['B', activity.optionB, '#f43f5e']].map(([label, text, col]) => (
          <button key={label} onClick={() => {
            if (hasVoted) return;
            setHasVoted(true);
            setMyChoice(label);
            const myName = players.find(p => p.id === myPlayerId)?.name || 'Anon';
            set(ref(db, `rooms/${roomCode}/thisOrThatVotes/${myPlayerId}`), { choice: label, name: myName });
          }} disabled={hasVoted} style={{
            padding: '30px 20px', borderRadius: '15px', flex: 1, maxWidth: '180px',
            border: hasVoted && myChoice === label ? `3px solid ${col}` : '1px solid #5a5a78',
            background: hasVoted && myChoice === label ? col + '22' : '#252533',
            cursor: hasVoted ? 'default' : 'pointer', color: 'white', fontSize: '18px', fontWeight: 'bold'
          }}>{text}</button>
        ))}
      </div>
      {hasVoted && !revealed && <p style={{ color: '#35d4ff', marginTop: '20px' }}>✅ Voted! Waiting for reveal...</p>}
      {revealed && <VoteDistribution countA={countA} countB={countB} total={total} labelA={activity.optionA} labelB={activity.optionB} allVotes={allVotes} players={players} />}
    </div>
  );

  // ===== WORD ASSOCIATION =====
  if (activity.type === 'word_assoc') {
    const otherWords = Object.entries(allWords).filter(([pid]) => pid !== myPlayerId);
    return (
      <div style={wrap}>
        <h2 style={{ color: '#14b8a6' }}>💬 Word Association</h2>
        <div style={{ ...card, borderLeft: '5px solid #14b8a6' }}>
          <p style={{ color: '#9090b0', textTransform: 'uppercase', fontSize: '11px' }}>First word that comes to mind!</p>
          <h2 style={{ color: '#14b8a6', margin: '8px 0' }}>{activity.word}</h2>
        </div>
        {!submitted ? (
          <div style={{ marginTop: '15px' }}>
            <input value={textAnswer} onChange={e => setTextAnswer(e.target.value)} placeholder="First thing that comes to mind..." maxLength={30} style={inp} />
            <button onClick={() => {
              if (!textAnswer.trim()) return;
              setSubmitted(true);
              const myName = players.find(p => p.id === myPlayerId)?.name || 'Anon';
              set(ref(db, `rooms/${roomCode}/wordAssocAnswers/${myPlayerId}`), { text: textAnswer.trim(), name: myName });
            }} style={{ ...btn, background: '#14b8a6', color: '#000', marginTop: '10px' }}>Submit 💬</button>
          </div>
        ) : !hasVotedWord ? (
          <div style={{ marginTop: '15px' }}>
            <p style={{ color: '#35d4ff', marginBottom: '10px' }}>✅ You said: "<strong>{allWords[myPlayerId]?.text || textAnswer}</strong>"</p>
            {otherWords.length > 0 ? (
              <>
                <p style={{ color: '#ffb347', fontWeight: 'bold', marginBottom: '10px' }}>🏅 Vote for the best word!</p>
                {otherWords.map(([pid, w]) => {
                  const p = players.find(x => x.id === pid);
                  return (
                    <button key={pid} onClick={() => handleWordVote(pid)} style={voteCardStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <PlayerAvatar player={p} size={32} />
                        <div style={{ textAlign: 'left' }}>
                          <strong style={{ color: '#35d4ff' }}>{w.name || p?.name}</strong>
                          <p style={{ color: '#d0d0e0', margin: '3px 0 0', fontSize: '16px', fontWeight: 'bold' }}>"{w.text}"</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            ) : <p style={{ color: '#9090b0' }}>Waiting for others to submit...</p>}
          </div>
        ) : !revealed ? (
          <p style={{ color: '#35d4ff', marginTop: '20px' }}>🎉 Voted! Waiting for reveal...</p>
        ) : null}
        {revealed && <WordCloud words={allWords} players={players} wordVoteCounts={wordVoteCounts} />}
      </div>
    );
  }

  return null;
}

function VoteDistribution({ countA, countB, total, labelA, labelB, allVotes, players }) {
  const pctA = total > 0 ? Math.round((countA / total) * 100) : 50;
  const pctB = 100 - pctA;
  return (
    <div style={{ background: '#1a1a2e', borderRadius: '15px', padding: '20px', marginTop: '20px', textAlign: 'center' }}>
      <h3 style={{ color: '#ffb347', margin: '0 0 15px' }}>📊 Results</h3>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <div style={{ flex: 1, background: '#1e3a5f', borderRadius: '10px', padding: '15px' }}>
          <p style={{ color: '#3b82f6', fontWeight: 'bold', margin: '0 0 5px' }}>{labelA}</p>
          <p style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{pctA}%</p>
          <p style={{ color: '#777', fontSize: '12px', margin: '4px 0 0' }}>{countA} vote{countA !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ flex: 1, background: '#3f1e2e', borderRadius: '10px', padding: '15px' }}>
          <p style={{ color: '#f43f5e', fontWeight: 'bold', margin: '0 0 5px' }}>{labelB}</p>
          <p style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{pctB}%</p>
          <p style={{ color: '#777', fontSize: '12px', margin: '4px 0 0' }}>{countB} vote{countB !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div style={{ textAlign: 'left' }}>
        {Object.entries(allVotes).map(([pid, v]) => {
          const p = players.find(x => x.id === pid);
          return (
            <div key={pid} style={{ ...rStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlayerAvatar player={p} size={24} />
              <strong>{v.name || p?.name || pid}:</strong> <span style={{ color: v.choice === 'A' ? '#3b82f6' : '#f43f5e' }}>{v.choice === 'A' ? '🅰️' : '🅱️'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WordCloud({ words, players, wordVoteCounts }) {
  const entries = Object.entries(words);
  if (entries.length === 0) return null;
  const textCounts = {};
  entries.forEach(([, w]) => { const t = w.text.toLowerCase(); textCounts[t] = (textCounts[t] || 0) + 1; });
  const sorted = [...entries].sort((a, b) => (wordVoteCounts[b[0]] || 0) - (wordVoteCounts[a[0]] || 0));
  return (
    <div style={{ background: '#1a1a2e', borderRadius: '15px', padding: '20px', marginTop: '20px' }}>
      <h3 style={{ color: '#ffb347', margin: '0 0 15px', textAlign: 'center' }}>💬 Everyone's Words</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '15px' }}>
        {entries.map(([pid, w]) => {
          const isMatch = textCounts[w.text.toLowerCase()] > 1;
          return (
            <span key={pid} style={{ padding: '8px 16px', borderRadius: '20px', background: isMatch ? '#22c55e22' : '#252538', border: isMatch ? '2px solid #22c55e' : '1px solid #444', color: isMatch ? '#22c55e' : 'white', fontSize: '15px', fontWeight: 'bold' }}>
              {w.text}
            </span>
          );
        })}
      </div>
      <div style={{ textAlign: 'left' }}>
        {sorted.map(([pid, w]) => {
          const p = players.find(x => x.id === pid);
          const vc = wordVoteCounts[pid] || 0;
          return (
            <div key={pid} style={{ ...rStyle, display: 'flex', alignItems: 'center', gap: '8px', background: vc > 0 ? '#1c3a2a' : '#252538', border: vc > 0 ? '1px solid #22c55e33' : '1px solid transparent' }}>
              <PlayerAvatar player={p} size={28} />
              <span style={{ flex: 1 }}><strong>{w.name || p?.name || pid}:</strong> {w.text}</span>
              {vc > 0 && <span style={{ color: '#ffb347', fontWeight: 'bold', fontSize: '13px' }}>⭐ {vc}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== ADMIN MONITOR =====
export function AdminMonitor({ activity, roomData, playersArray }) {
  const nodeMap = { would_you_rather: 'wouldYouRatherVotes', this_or_that: 'thisOrThatVotes', word_assoc: 'wordAssocAnswers' };
  const node = nodeMap[activity.type];
  const data = roomData?.[node] || {};
  const wordVotes = roomData?.wordAssocVotes || {};
  const wordVoteCounts = {};
  Object.values(wordVotes).forEach(v => { wordVoteCounts[v] = (wordVoteCounts[v] || 0) + 1; });

  if (activity.type === 'word_assoc') {
    return (
      <div>
        {Object.entries(data).map(([pid, w]) => (
          <div key={pid} style={rStyle}>
            <strong>{w.name || pid}:</strong> {w.text}
            {(wordVoteCounts[pid] || 0) > 0 && <span style={{ color: '#ffb347', float: 'right' }}>⭐ {wordVoteCounts[pid]}</span>}
          </div>
        ))}
        <p style={{ color: '#555', fontSize: '12px', marginTop: '6px' }}>Answered: {Object.keys(data).length} / {playersArray.length} &nbsp; Votes: {Object.keys(wordVotes).length}</p>
      </div>
    );
  }

  let countA = 0, countB = 0;
  Object.values(data).forEach(v => { if (v.choice === 'A') countA++; else countB++; });
  return (
    <div>
      <p style={{ color: '#3b82f6', fontSize: '13px' }}>🅰️ {activity.optionA}: <strong>{countA}</strong></p>
      <p style={{ color: '#f43f5e', fontSize: '13px' }}>🅱️ {activity.optionB}: <strong>{countB}</strong></p>
      {Object.entries(data).map(([pid, v]) => (
        <div key={pid} style={rStyle}><strong>{v.name || pid}:</strong> {v.choice === 'A' ? '🅰️' : '🅱️'}</div>
      ))}
      <p style={{ color: '#555', fontSize: '12px', marginTop: '6px' }}>Responded: {Object.keys(data).length} / {playersArray.length}</p>
    </div>
  );
}

const wrap = { textAlign: 'center', maxWidth: '500px', margin: '0 auto', color: 'white' };
const card = { background: '#1c1c26', padding: '25px', borderRadius: '15px', margin: '15px 0' };
const inp = { width: '100%', padding: '14px', background: '#1c1c26', border: '1px solid #5a5a78', borderRadius: '10px', color: 'white', fontSize: '14px', boxSizing: 'border-box' };
const btn = { padding: '14px 28px', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', width: '100%' };
const rStyle = { padding: '5px 10px', margin: '3px 0', background: '#252538', borderRadius: '6px', fontSize: '13px', color: 'white' };
const voteCardStyle = { display: 'block', width: '100%', padding: '12px 14px', background: '#252533', border: '1px solid #5a5a78', borderRadius: '10px', color: 'white', cursor: 'pointer', margin: '8px 0', textAlign: 'left' };

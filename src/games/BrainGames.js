import React, { useState, useEffect } from 'react';
import { ref, set, update, onValue, increment } from 'firebase/database';
import { db } from '../firebase';
import { TEAM_TRIVIA_QUESTIONS, EMOJI_DECODE_PROMPTS, ALIEN_CLUES, shuffle } from './gameData';

export const CONFIG = {
  id: 'brain', label: '🧠 Brain Battle', color: '#3b82f6',
  description: 'Trivia, emoji puzzles & alien translations — test your brainpower!'
};

export const CLEAR_KEYS = {
  triviaAnswers: null, emojiDecodeAnswers: null, emojiDecodeVotes: null,
  alienGuesses: null, alienVotes: null, revealResults: null
};

const SUB_TYPES = ['team_trivia', 'emoji_decode', 'alien_interpreter'];

export function buildRounds(players, count) {
  const trivia = shuffle([...TEAM_TRIVIA_QUESTIONS]);
  const emoji = shuffle([...EMOJI_DECODE_PROMPTS]);
  const alien = shuffle([...ALIEN_CLUES]);
  let ti = 0, ei = 0, ai = 0;
  const rounds = [];
  for (let i = 0; i < count; i++) {
    const subType = SUB_TYPES[i % SUB_TYPES.length];
    if (subType === 'team_trivia') {
      const q = trivia[ti++ % trivia.length];
      rounds.push({ type: 'team_trivia', question: q.q, options: q.options, correctIndex: q.correct, round: Date.now() + i });
    } else if (subType === 'emoji_decode') {
      const e = emoji[ei++ % emoji.length];
      rounds.push({ type: 'emoji_decode', emoji: e.emoji, answer: e.answer, round: Date.now() + i });
    } else {
      const a = alien[ai++ % alien.length];
      rounds.push({ type: 'alien_interpreter', clue: a.clue, answer: a.answer, round: Date.now() + i });
    }
  }
  return rounds;
}

function PlayerAvatar({ player, size }) {
  const s = size || 36;
  if (player?.mediaUrl && player.mediaType === 'image') {
    return <img src={player.mediaUrl} alt={player.name} style={{ width: s, height: s, borderRadius: '50%', objectFit: 'cover', border: '2px solid #5a5a78', flexShrink: 0 }} />;
  }
  return <div style={{ width: s, height: s, borderRadius: '50%', background: '#3b3b5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: s * 0.45, color: '#aaa', flexShrink: 0, border: '2px solid #5a5a78' }}>{(player?.name || '?')[0].toUpperCase()}</div>;
}

// ===== PLAYER RENDERER =====
export function GameRenderer({ activity, roomCode, roomData, myPlayerId }) {
  const [textAnswer, setTextAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [allAnswers, setAllAnswers] = useState({});
  const [votes, setVotes] = useState({});
  const round = activity.round || activity.type;
  const revealed = roomData.revealResults === true;

  useEffect(() => { setTextAnswer(''); setAnswered(false); setWasCorrect(false); setHasVoted(false); setAllAnswers({}); setVotes({}); }, [round]);

  const answerNodeMap = { team_trivia: 'triviaAnswers', emoji_decode: 'emojiDecodeAnswers', alien_interpreter: 'alienGuesses' };
  const voteNodeMap = { emoji_decode: 'emojiDecodeVotes', alien_interpreter: 'alienVotes' };
  const node = answerNodeMap[activity.type];
  const voteNode = voteNodeMap[activity.type];

  useEffect(() => {
    if (!node) return;
    return onValue(ref(db, `rooms/${roomCode}/${node}`), s => { if (s.exists()) setAllAnswers(s.val()); });
  }, [roomCode, node]);

  useEffect(() => {
    if (!voteNode) return;
    return onValue(ref(db, `rooms/${roomCode}/${voteNode}`), s => { if (s.exists()) setVotes(s.val()); });
  }, [roomCode, voteNode]);

  const players = Object.entries(roomData.players || {}).map(([id, d]) => ({ id, ...d }));

  const handleVote = (pid) => {
    if (hasVoted || pid === myPlayerId) return;
    setHasVoted(true);
    set(ref(db, `rooms/${roomCode}/${voteNode}/${myPlayerId}`), pid);
    update(ref(db, `rooms/${roomCode}/players/${pid}`), { score: increment(50) });
  };

  // Vote tally
  const voteCounts = {};
  Object.values(votes).forEach(v => { voteCounts[v] = (voteCounts[v] || 0) + 1; });
  const otherAnswers = Object.entries(allAnswers).filter(([pid]) => pid !== myPlayerId);

  // ===== TEAM TRIVIA =====
  if (activity.type === 'team_trivia') {
    const options = activity.options || {};
    const correctIdx = activity.correctIndex;
    return (
      <div style={wrap}>
        <h2 style={{ color: '#3b82f6' }}>🧠 Team Trivia</h2>
        <div style={{ ...card, borderLeft: '5px solid #3b82f6' }}>
          <h3 style={{ color: 'white', margin: '0' }}>{activity.question}</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
          {Object.entries(options).map(([key, val]) => {
            const idx = parseInt(key);
            const isCorrect = idx === correctIdx;
            return (
              <button key={key} onClick={() => {
                if (answered) return;
                setAnswered(true);
                setWasCorrect(isCorrect);
                if (isCorrect) update(ref(db, `rooms/${roomCode}/players/${myPlayerId}`), { score: increment(100) });
                const myName = players.find(p => p.id === myPlayerId)?.name || 'Anon';
                set(ref(db, `rooms/${roomCode}/triviaAnswers/${myPlayerId}`), { answer: idx, correct: isCorrect, name: myName });
              }} disabled={answered} style={{
                padding: '16px', fontSize: '15px', borderRadius: '10px', cursor: answered ? 'default' : 'pointer',
                background: answered ? (isCorrect ? '#1c3a2a' : '#252533') : '#252533',
                border: answered ? (isCorrect ? '2px solid #22c55e' : '1px solid #333') : '1px solid #5a5a78',
                color: 'white', textAlign: 'left'
              }}>
                {answered && isCorrect && '✅ '}{val}
              </button>
            );
          })}
        </div>
        {answered && <p style={{ color: wasCorrect ? '#22c55e' : '#ef4444', marginTop: '15px', fontWeight: 'bold' }}>{wasCorrect ? '🎯 Correct! +100pts' : '❌ Wrong!'}</p>}
        {revealed && <AllAnswersPanel allAnswers={allAnswers} players={players} correctLabel={options[correctIdx]} voteCounts={{}} />}
      </div>
    );
  }

  // ===== EMOJI DECODE =====
  if (activity.type === 'emoji_decode') return (
    <div style={wrap}>
      <h2 style={{ color: '#eab308' }}>🔤 Emoji Decode</h2>
      <div style={{ ...card, borderLeft: '5px solid #eab308' }}>
        <p style={{ fontSize: '48px', margin: '10px 0' }}>{activity.emoji}</p>
        <p style={{ color: '#9090b0' }}>What does this emoji sequence represent?</p>
      </div>
      {!answered ? (
        <div style={{ marginTop: '15px' }}>
          <input value={textAnswer} onChange={e => setTextAnswer(e.target.value)} placeholder="Your answer..." style={inp} />
          <button onClick={() => {
            if (!textAnswer.trim()) return;
            setAnswered(true);
            const correct = textAnswer.trim().toLowerCase().includes(activity.answer.toLowerCase());
            setWasCorrect(correct);
            if (correct) update(ref(db, `rooms/${roomCode}/players/${myPlayerId}`), { score: increment(100) });
            const myName = players.find(p => p.id === myPlayerId)?.name || 'Anon';
            set(ref(db, `rooms/${roomCode}/emojiDecodeAnswers/${myPlayerId}`), { text: textAnswer.trim(), correct, name: myName });
          }} style={{ ...btn, background: '#eab308', color: '#000', marginTop: '10px' }}>Submit</button>
        </div>
      ) : !hasVoted ? (
        <div style={{ marginTop: '15px' }}>
          <p style={{ color: wasCorrect ? '#22c55e' : '#ef4444', fontWeight: 'bold', marginBottom: '5px' }}>{wasCorrect ? '🎯 Correct! +100pts' : '❌ Wrong!'}</p>
          <p style={{ color: '#9090b0', marginBottom: '15px' }}>Answer: <strong style={{ color: '#eab308' }}>{activity.answer}</strong></p>
          {otherAnswers.length > 0 ? (
            <>
              <p style={{ color: '#ffb347', fontWeight: 'bold', marginBottom: '10px' }}>🏅 Vote for the best answer!</p>
              {otherAnswers.map(([pid, a]) => {
                const p = players.find(x => x.id === pid);
                return (
                  <button key={pid} onClick={() => handleVote(pid)} style={voteCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <PlayerAvatar player={p} size={32} />
                      <div style={{ textAlign: 'left' }}>
                        <strong style={{ color: '#35d4ff' }}>{a.name || p?.name}</strong>
                        <span style={{ color: a.correct ? '#22c55e' : '#ef4444', marginLeft: '6px', fontSize: '12px' }}>{a.correct ? '✅' : '❌'}</span>
                        <p style={{ color: '#d0d0e0', margin: '3px 0 0', fontSize: '14px' }}>"{a.text}"</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          ) : <p style={{ color: '#9090b0' }}>Waiting for others...</p>}
        </div>
      ) : !revealed ? (
        <p style={{ color: '#35d4ff', marginTop: '20px' }}>🎉 Voted! Waiting for reveal...</p>
      ) : null}
      {revealed && <AllAnswersPanel allAnswers={allAnswers} players={players} correctLabel={activity.answer} voteCounts={voteCounts} />}
    </div>
  );

  // ===== ALIEN INTERPRETER =====
  if (activity.type === 'alien_interpreter') return (
    <div style={wrap}>
      <h2 style={{ color: '#22d3ee' }}>👽 Alien Interpreter</h2>
      <div style={{ ...card, borderLeft: '5px solid #22d3ee' }}>
        <p style={{ color: '#9090b0', textTransform: 'uppercase', fontSize: '11px' }}>Alien description</p>
        <h3 style={{ color: '#22d3ee', margin: '8px 0' }}>"{activity.clue}"</h3>
        <p style={{ color: '#9090b0', fontSize: '13px' }}>What is the alien trying to describe?</p>
      </div>
      {!answered ? (
        <div style={{ marginTop: '15px' }}>
          <input value={textAnswer} onChange={e => setTextAnswer(e.target.value)} placeholder="Your guess..." style={inp} />
          <button onClick={() => {
            if (!textAnswer.trim()) return;
            setAnswered(true);
            const correct = textAnswer.trim().toLowerCase().includes(activity.answer.toLowerCase());
            setWasCorrect(correct);
            if (correct) update(ref(db, `rooms/${roomCode}/players/${myPlayerId}`), { score: increment(150) });
            const myName = players.find(p => p.id === myPlayerId)?.name || 'Anon';
            set(ref(db, `rooms/${roomCode}/alienGuesses/${myPlayerId}`), { text: textAnswer.trim(), correct, name: myName });
          }} style={{ ...btn, background: '#22d3ee', color: '#000', marginTop: '10px' }}>Submit 👽</button>
        </div>
      ) : !hasVoted ? (
        <div style={{ marginTop: '15px' }}>
          <p style={{ color: wasCorrect ? '#22c55e' : '#ef4444', fontWeight: 'bold', marginBottom: '5px' }}>{wasCorrect ? '🎯 Correct! +150pts' : '❌ Wrong!'}</p>
          <p style={{ color: '#9090b0', marginBottom: '15px' }}>Answer: <strong style={{ color: '#22d3ee' }}>{activity.answer}</strong></p>
          {otherAnswers.length > 0 ? (
            <>
              <p style={{ color: '#ffb347', fontWeight: 'bold', marginBottom: '10px' }}>🏅 Vote for the best answer!</p>
              {otherAnswers.map(([pid, a]) => {
                const p = players.find(x => x.id === pid);
                return (
                  <button key={pid} onClick={() => handleVote(pid)} style={voteCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <PlayerAvatar player={p} size={32} />
                      <div style={{ textAlign: 'left' }}>
                        <strong style={{ color: '#35d4ff' }}>{a.name || p?.name}</strong>
                        <span style={{ color: a.correct ? '#22c55e' : '#ef4444', marginLeft: '6px', fontSize: '12px' }}>{a.correct ? '✅' : '❌'}</span>
                        <p style={{ color: '#d0d0e0', margin: '3px 0 0', fontSize: '14px' }}>"{a.text}"</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          ) : <p style={{ color: '#9090b0' }}>Waiting for others...</p>}
        </div>
      ) : !revealed ? (
        <p style={{ color: '#35d4ff', marginTop: '20px' }}>🎉 Voted! Waiting for reveal...</p>
      ) : null}
      {revealed && <AllAnswersPanel allAnswers={allAnswers} players={players} correctLabel={activity.answer} voteCounts={voteCounts} />}
    </div>
  );

  return null;
}

function AllAnswersPanel({ allAnswers, players, correctLabel, voteCounts }) {
  const entries = Object.entries(allAnswers);
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => (voteCounts[b[0]] || 0) - (voteCounts[a[0]] || 0));
  return (
    <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '15px', marginTop: '15px', textAlign: 'left' }}>
      <h3 style={{ color: '#ffb347', margin: '0 0 10px', fontSize: '15px', textAlign: 'center' }}>📊 All Answers</h3>
      {correctLabel && <p style={{ color: '#22c55e', textAlign: 'center', marginBottom: '10px' }}>✅ Correct: <strong>{correctLabel}</strong></p>}
      {sorted.map(([pid, a]) => {
        const p = players.find(x => x.id === pid);
        const vc = voteCounts[pid] || 0;
        return (
          <div key={pid} style={{ padding: '10px 12px', margin: '5px 0', background: vc > 0 ? '#1c3a2a' : '#252538', border: vc > 0 ? '1px solid #22c55e33' : '1px solid #333', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PlayerAvatar player={p} size={32} />
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#35d4ff', fontSize: '13px' }}>{a.name || p?.name || pid}</strong>
              <span style={{ color: a.correct ? '#22c55e' : '#ef4444', marginLeft: '6px', fontSize: '12px' }}>{a.correct ? '✅' : '❌'}</span>
              <p style={{ color: '#d0d0e0', margin: '2px 0 0', fontSize: '13px' }}>"{a.text || `Option ${a.answer}`}"</p>
            </div>
            {vc > 0 && <span style={{ color: '#ffb347', fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap' }}>⭐ {vc}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ===== ADMIN MONITOR =====
export function AdminMonitor({ activity, roomData, playersArray }) {
  const answerNodeMap = { team_trivia: 'triviaAnswers', emoji_decode: 'emojiDecodeAnswers', alien_interpreter: 'alienGuesses' };
  const voteNodeMap = { emoji_decode: 'emojiDecodeVotes', alien_interpreter: 'alienVotes' };
  const node = answerNodeMap[activity.type];
  const vNode = voteNodeMap[activity.type];
  const data = roomData?.[node] || {};
  const voteData = vNode ? (roomData?.[vNode] || {}) : {};
  const correct = activity.type === 'team_trivia'
    ? (activity.options && activity.options[activity.correctIndex])
    : activity.answer;
  const voteCounts = {};
  Object.values(voteData).forEach(v => { voteCounts[v] = (voteCounts[v] || 0) + 1; });

  return (
    <div>
      <p style={{ color: '#22c55e', fontSize: '13px', marginBottom: '6px' }}>Answer: <strong>{correct}</strong></p>
      {Object.entries(data).map(([pid, a]) => (
        <div key={pid} style={{ padding: '5px 10px', margin: '3px 0', background: '#252538', borderRadius: '6px', fontSize: '13px', color: 'white' }}>
          <strong>{a.name || pid}:</strong> {a.text || `Option ${a.answer}`} {a.correct ? '✅' : '❌'}
          {(voteCounts[pid] || 0) > 0 && <span style={{ color: '#ffb347', float: 'right' }}>⭐ {voteCounts[pid]}</span>}
        </div>
      ))}
      <p style={{ color: '#555', fontSize: '12px', marginTop: '6px' }}>Answered: {Object.keys(data).length} / {playersArray.length} &nbsp; Votes: {Object.keys(voteData).length}</p>
    </div>
  );
}

const wrap = { textAlign: 'center', maxWidth: '500px', margin: '0 auto', color: 'white' };
const card = { background: '#1c1c26', padding: '25px', borderRadius: '15px', margin: '15px 0' };
const inp = { width: '100%', padding: '14px', background: '#1c1c26', border: '1px solid #5a5a78', borderRadius: '10px', color: 'white', fontSize: '14px', boxSizing: 'border-box' };
const btn = { padding: '14px 28px', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', width: '100%' };
const voteCardStyle = { display: 'block', width: '100%', padding: '12px 14px', background: '#252533', border: '1px solid #5a5a78', borderRadius: '10px', color: 'white', cursor: 'pointer', margin: '8px 0', textAlign: 'left' };

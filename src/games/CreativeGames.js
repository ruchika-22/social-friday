import React, { useState, useEffect } from 'react';
import { ref, set, update, onValue, increment } from 'firebase/database';
import { db } from '../firebase';
import { CAPTION_PROMPTS, SELL_THIS_ITEMS, QUICK_DRAW_SUBJECTS, shuffle, isMediaKind, getPlayableMediaUrl } from './gameData';

const EMOJI_KEYBOARD = [
  ['😀','😂','🥹','😍','🤩','😎','🥳','😤','😱','🤯','😈','💀','👻','🤖','👽'],
  ['❤️','🔥','⭐','✨','💎','🌈','☀️','🌙','⛈️','❄️','💧','🌊','🌸','🍀','🌺'],
  ['🐶','🐱','🦁','🐻','🦊','🐸','🐙','🦋','🐝','🦄','🐉','🦖','🐬','🦅','🐍'],
  ['🍕','🍔','🍟','🍩','🎂','🍎','🍷','☕','🧃','🍿','🌮','🍣','🍪','🧁','🍺'],
  ['⚽','🏀','🎯','🎮','🎸','🎭','🎨','🎪','🏆','🎤','🎬','🎹','🎲','🎳','🪄'],
  ['🚀','✈️','🚗','🛸','🚢','🏠','🏰','🏝️','🗻','🌋','🎡','🏟️','🗽','🎢','⛺'],
  ['💪','👑','🎒','💰','🗡️','🛡️','💣','🔮','🧲','🪂','🎁','📱','💡','🔑','🧩'],
  ['📡','💻','🖥️','⌨️','🔌','📶','🔇','📊','📉','🚫','⚠️','😵','🤦','👨‍💼','🏢']
];

export const CONFIG = {
  id: 'creative', label: '🎨 Creative Showdown', color: '#f43f5e',
  description: 'Caption, pitch & draw your way to the top — then vote for the best!'
};

export const CLEAR_KEYS = {
  captions: null, captionVotes: null, sellThisPitches: null, sellThisVotes: null,
  quickDrawAnswers: null, quickDrawVotes: null, revealResults: null
};

function PlayerAvatar({ player, size }) {
  const s = size || 36;
  if (player?.mediaUrl && isMediaKind(player.mediaType, player.mediaUrl, 'image')) {
    return <img src={player.mediaUrl} alt={player.name} style={{ width: s, height: s, borderRadius: '50%', objectFit: 'cover', border: '2px solid #5a5a78', flexShrink: 0 }} />;
  }
  return <div style={{ width: s, height: s, borderRadius: '50%', background: '#3b3b5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: s * 0.45, color: '#aaa', flexShrink: 0, border: '2px solid #5a5a78' }}>{(player?.name || '?')[0].toUpperCase()}</div>;
}

const SUB_TYPES = ['caption_this', 'sell_this', 'quick_draw'];

export function buildRounds(players, count) {
  const pids = Object.keys(players);
  const mediaPids = pids.filter(pid => players[pid].mediaUrl);
  const captions = shuffle([...CAPTION_PROMPTS]);
  const sells = shuffle([...SELL_THIS_ITEMS]);
  const draws = shuffle([...QUICK_DRAW_SUBJECTS]);

  // Only include caption_this if players uploaded media.
  const availableTypes = mediaPids.length > 0 ? SUB_TYPES : ['sell_this', 'quick_draw'];

  const rounds = [];
  let ci = 0, si = 0, di = 0, mediaIdx = 0;
  for (let i = 0; i < count; i++) {
    const subType = availableTypes[i % availableTypes.length];
    if (subType === 'caption_this') {
      const targetId = mediaPids[mediaIdx++ % mediaPids.length];
      rounds.push({ type: 'caption_this', targetId, prompt: captions[ci++ % captions.length], round: Date.now() + i });
    } else if (subType === 'sell_this') {
      rounds.push({ type: 'sell_this', item: sells[si++ % sells.length], round: Date.now() + i });
    } else {
      rounds.push({ type: 'quick_draw', subject: draws[di++ % draws.length], round: Date.now() + i });
    }
  }
  return rounds;
}

// ===== PLAYER RENDERER =====
export function GameRenderer({ activity, roomCode, roomData, myPlayerId }) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [submissions, setSubmissions] = useState({});
  const [votes, setVotes] = useState({});
  const round = activity.round || activity.type;
  const revealed = roomData.revealResults === true;

  useEffect(() => { setText(''); setSubmitted(false); setHasVoted(false); setSubmissions({}); setVotes({}); }, [round]);

  const nodeMap = { caption_this: ['captions', 'captionVotes'], sell_this: ['sellThisPitches', 'sellThisVotes'], quick_draw: ['quickDrawAnswers', 'quickDrawVotes'] };
  const [subNode, voteNode] = nodeMap[activity.type] || [];

  useEffect(() => {
    if (!subNode) return;
    return onValue(ref(db, `rooms/${roomCode}/${subNode}`), s => { if (s.exists()) setSubmissions(s.val()); });
  }, [roomCode, subNode]);

  useEffect(() => {
    if (!voteNode) return;
    return onValue(ref(db, `rooms/${roomCode}/${voteNode}`), s => { if (s.exists()) setVotes(s.val()); });
  }, [roomCode, voteNode]);

  const players = Object.entries(roomData.players || {}).map(([id, d]) => ({ id, ...d }));
  const target = activity.type === 'caption_this' ? players.find(p => p.id === activity.targetId) : null;

  const handleSubmit = () => {
    if (!text.trim()) return;
    const myName = players.find(p => p.id === myPlayerId)?.name || 'Anon';
    set(ref(db, `rooms/${roomCode}/${subNode}/${myPlayerId}`), { text: text.trim(), name: myName });
    setSubmitted(true);
  };

  const handleVote = (pid) => {
    if (hasVoted || pid === myPlayerId) return;
    setHasVoted(true);
    set(ref(db, `rooms/${roomCode}/${voteNode}/${myPlayerId}`), pid);
    update(ref(db, `rooms/${roomCode}/players/${pid}`), { score: increment(100) });
  };

  // Vote tally
  const voteCounts = {};
  Object.values(votes).forEach(v => { voteCounts[v] = (voteCounts[v] || 0) + 1; });
  const sortedSubs = Object.entries(submissions).sort((a, b) => (voteCounts[b[0]] || 0) - (voteCounts[a[0]] || 0));
  const winner = sortedSubs.length > 0 ? sortedSubs[0] : null;

  const subList = Object.entries(submissions).filter(([pid]) => pid !== myPlayerId);

  // ===== CAPTION THIS =====
  if (activity.type === 'caption_this') return (
    <div style={wrap}>
      <h2 style={{ color: '#f43f5e' }}>📸 Caption This!</h2>
      {target && target.mediaUrl ? (
        <div style={card}>
          {isMediaKind(target.mediaType, target.mediaUrl, 'image') && <img src={target.mediaUrl} alt="Caption" style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: '10px' }} />}
          {isMediaKind(target.mediaType, target.mediaUrl, 'video') && <video src={getPlayableMediaUrl(target.mediaUrl, target.mediaType)} controls playsInline preload="metadata" style={{ width: '100%', borderRadius: '10px' }} />}
          {isMediaKind(target.mediaType, target.mediaUrl, 'audio') && <audio src={getPlayableMediaUrl(target.mediaUrl, target.mediaType)} controls preload="metadata" style={{ width: '100%' }} />}
          {!isMediaKind(target.mediaType, target.mediaUrl, 'image') && !isMediaKind(target.mediaType, target.mediaUrl, 'video') && !isMediaKind(target.mediaType, target.mediaUrl, 'audio') && (
            <a href={target.mediaUrl} target="_blank" rel="noreferrer" style={{ color: '#35d4ff' }}>Open uploaded media</a>
          )}
        </div>
      ) : (
        <div style={{ ...card, borderLeft: '5px solid #f43f5e', textAlign: 'center' }}>
          <p style={{ fontSize: '64px', margin: '10px 0' }}>📸</p>
          <p style={{ color: '#9090b0' }}>No image uploaded — caption the prompt instead!</p>
        </div>
      )}
      {activity.prompt && <p style={{ color: '#ffb347', fontStyle: 'italic', fontSize: '18px', fontWeight: 'bold' }}>"{activity.prompt}"</p>}
      {!submitted ? (
        <div style={{ marginTop: '15px' }}>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Write a caption..." maxLength={120} style={inp} />
          <button onClick={handleSubmit} style={{ ...btn, background: '#f43f5e', marginTop: '10px' }}>Submit Caption</button>
        </div>
      ) : !hasVoted ? (
        <VotingUI subList={subList} handleVote={handleVote} label="caption" players={players} />
      ) : !revealed ? (
        <p style={{ color: '#35d4ff', marginTop: '20px' }}>🎉 Voted! Waiting for reveal...</p>
      ) : null}
      {revealed && <RevealResults sortedSubs={sortedSubs} voteCounts={voteCounts} players={players} />}
    </div>
  );

  // ===== SELL ME THIS =====
  if (activity.type === 'sell_this') return (
    <div style={wrap}>
      <h2 style={{ color: '#f97316' }}>🛒 Sell Me This!</h2>
      <div style={{ ...card, borderLeft: '5px solid #f97316' }}>
        <p style={{ color: '#9090b0', textTransform: 'uppercase', fontSize: '11px' }}>Product</p>
        <h2 style={{ color: '#f97316', margin: '8px 0' }}>{activity.item}</h2>
        <p style={{ color: '#9090b0', fontSize: '13px' }}>Write a quick sales pitch for this absurd product!</p>
      </div>
      {!submitted ? (
        <div style={{ marginTop: '15px' }}>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write your pitch..." maxLength={200} rows={3} style={{ ...inp, height: 'auto', resize: 'none' }} />
          <button onClick={handleSubmit} style={{ ...btn, background: '#f97316', marginTop: '10px' }}>Submit Pitch 🎤</button>
        </div>
      ) : !hasVoted ? (
        <VotingUI subList={subList} handleVote={handleVote} label="pitch" players={players} />
      ) : !revealed ? (
        <p style={{ color: '#35d4ff', marginTop: '20px' }}>🎉 Voted! Waiting for reveal...</p>
      ) : null}
      {revealed && <RevealResults sortedSubs={sortedSubs} voteCounts={voteCounts} players={players} />}
    </div>
  );

  // ===== QUICK DRAW =====
  if (activity.type === 'quick_draw') return (
    <div style={wrap}>
      <h2 style={{ color: '#22c55e' }}>🎨 Quick Draw (Words Edition)</h2>
      <div style={{ ...card, borderLeft: '5px solid #22c55e' }}>
        <p style={{ color: '#9090b0', textTransform: 'uppercase', fontSize: '11px' }}>Depict using emojis & words</p>
        <h2 style={{ color: '#22c55e', margin: '8px 0' }}>{activity.subject}</h2>
      </div>
      {!submitted ? (
        <div style={{ marginTop: '15px' }}>
          {/* Selected text display */}
          <div style={{ background: '#1c1c26', border: '2px solid #22c55e', borderRadius: '12px', padding: '14px', minHeight: '50px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {text ? (
              <span style={{ fontSize: '20px', flex: 1, wordBreak: 'break-word' }}>{text}</span>
            ) : (
              <span style={{ color: '#555', fontSize: '14px' }}>Tap emojis + type words below...</span>
            )}
            {text && (
              <button onClick={() => setText(prev => [...prev].slice(0, -1).join(''))} style={{ background: '#ef444433', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}>⌫</button>
            )}
          </div>
          {/* Text input for words */}
          <input value="" onChange={e => setText(prev => prev + e.target.value)} placeholder="Type words here..." maxLength={100} style={{ ...inp, marginBottom: '10px' }} onKeyDown={e => { if (e.key === 'Backspace' && e.target.value === '') setText(prev => [...prev].slice(0, -1).join('')); }} />
          {/* Emoji keyboard */}
          <div style={{ background: '#151520', borderRadius: '12px', padding: '10px', border: '2px solid #22c55e55' }}>
            <p style={{ color: '#22c55e', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', margin: '0 0 8px', textTransform: 'uppercase' }}>🎨 Emoji Keyboard</p>
            {EMOJI_KEYBOARD.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '5px', marginBottom: '5px' }}>
                {row.map(e => (
                  <button key={e} onClick={() => setText(prev => prev.length < 100 ? prev + e : prev)} style={{ width: '40px', height: '40px', fontSize: '20px', background: '#252533', border: '1px solid #444', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    {e}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <button onClick={handleSubmit} style={{ ...btn, background: '#22c55e', color: '#000', marginTop: '10px' }}>Submit 🎨</button>
        </div>
      ) : !hasVoted ? (
        <VotingUI subList={subList} handleVote={handleVote} label="depiction" players={players} />
      ) : !revealed ? (
        <p style={{ color: '#35d4ff', marginTop: '20px' }}>🎉 Voted! Waiting for reveal...</p>
      ) : null}
      {revealed && <RevealResults sortedSubs={sortedSubs} voteCounts={voteCounts} players={players} />}
    </div>
  );

  return null;
}

function VotingUI({ subList, handleVote, label, players }) {
  if (subList.length === 0) return <p style={{ color: '#9090b0', marginTop: '20px' }}>✅ Submitted! Waiting for others...</p>;
  return (
    <div style={{ marginTop: '20px' }}>
      <p style={{ color: '#ffb347', fontWeight: 'bold', marginBottom: '10px' }}>Vote for the BEST {label}!</p>
      {subList.map(([pid, s]) => {
        const p = (players || []).find(x => x.id === pid);
        return (
          <button key={pid} onClick={() => handleVote(pid)} style={{ display: 'block', width: '100%', padding: '14px 18px', background: '#252533', border: '1px solid #5a5a78', borderRadius: '10px', color: 'white', cursor: 'pointer', margin: '8px 0', textAlign: 'left', fontSize: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PlayerAvatar player={p} size={32} />
              <div><strong style={{ color: '#35d4ff' }}>{s.name}</strong><p style={{ color: '#d0d0e0', margin: '3px 0 0', fontSize: '14px' }}>"{s.text}"</p></div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function RevealResults({ sortedSubs, voteCounts, players }) {
  if (sortedSubs.length === 0) return null;
  return (
    <div style={{ background: '#1a1a2e', borderRadius: '15px', padding: '20px', marginTop: '20px', textAlign: 'left' }}>
      <h3 style={{ color: '#ffb347', margin: '0 0 12px', textAlign: 'center' }}>🏆 Results</h3>
      {sortedSubs.map(([pid, s], i) => {
        const vc = voteCounts[pid] || 0;
        const p = (players || []).find(x => x.id === pid);
        return (
          <div key={pid} style={{ padding: '12px', margin: '6px 0', background: i === 0 && vc > 0 ? '#1c3a2a' : '#252538', border: i === 0 && vc > 0 ? '2px solid #22c55e' : '1px solid #333', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PlayerAvatar player={p} size={32} />
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{i === 0 && vc > 0 ? '👑 ' : ''}<strong style={{ color: '#35d4ff' }}>{s.name}</strong></span>
                <span style={{ color: '#ffb347', fontWeight: 'bold' }}>{vc} vote{vc !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <p style={{ color: '#d0d0e0', margin: '6px 0 0', fontSize: '14px', paddingLeft: '42px' }}>"{s.text}"</p>
          </div>
        );
      })}
    </div>
  );
}

// ===== ADMIN MONITOR =====
export function AdminMonitor({ activity, roomData, playersArray }) {
  const nodeMap = { caption_this: ['captions', 'captionVotes'], sell_this: ['sellThisPitches', 'sellThisVotes'], quick_draw: ['quickDrawAnswers', 'quickDrawVotes'] };
  const [subNode, voteNode] = nodeMap[activity.type] || [];
  const subs = roomData?.[subNode] || {};
  const votes = roomData?.[voteNode] || {};
  const voteCounts = {};
  Object.values(votes).forEach(v => { voteCounts[v] = (voteCounts[v] || 0) + 1; });

  return (
    <div>
      <p style={{ color: '#9090b0', fontSize: '12px', marginBottom: '8px' }}>Submissions: {Object.keys(subs).length} / {playersArray.length} &nbsp; Votes: {Object.keys(votes).length}</p>
      {Object.entries(subs).sort((a, b) => (voteCounts[b[0]] || 0) - (voteCounts[a[0]] || 0)).map(([pid, s]) => (
        <div key={pid} style={{ padding: '6px 10px', margin: '3px 0', background: '#252538', borderRadius: '6px', fontSize: '13px', color: 'white' }}>
          <strong>{s.name}:</strong> "{s.text}" <span style={{ color: '#ffb347', float: 'right' }}>{voteCounts[pid] || 0} votes</span>
        </div>
      ))}
    </div>
  );
}

const wrap = { textAlign: 'center', maxWidth: '500px', margin: '0 auto', color: 'white' };
const card = { background: '#1c1c26', padding: '25px', borderRadius: '15px', margin: '15px 0' };
const inp = { width: '100%', padding: '14px', background: '#1c1c26', border: '1px solid #5a5a78', borderRadius: '10px', color: 'white', fontSize: '14px', boxSizing: 'border-box' };
const btn = { padding: '14px 28px', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', width: '100%' };

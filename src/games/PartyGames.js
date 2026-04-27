import React, { useState, useEffect } from 'react';
import { ref, set, update, onValue, increment } from 'firebase/database';
import { db } from '../firebase';
import { SPEED_EMOJI_TARGETS, RPS_OPTIONS, shuffle } from './gameData';

const STORY_THEMES = [
  'A day at the beach', 'An alien invasion', 'A surprise birthday party',
  'A haunted house adventure', 'A road trip gone wrong', 'First day at a new job',
  'Cooking disaster in the kitchen', 'A superhero origin story',
  'Lost in the jungle', 'A wild night out', 'Time travel mishap',
  'A heist at the museum', 'Zombie apocalypse survival', 'A magical quest',
  'Space station emergency', 'Winning the lottery', 'A spy mission'
];

export const CONFIG = {
  id: 'party', label: '🎮 Party Games', color: '#22c55e',
  description: 'Speed races, emoji chains, RPS battles & team sync — pure fun!'
};

export const CLEAR_KEYS = {
  speedEmojiTaps: null, rpsBattleChoices: null, emojiStoryEntries: null, emojiStoryVotes: null, syncClicks: null, revealResults: null
};

const SUB_TYPES = ['speed_emoji', 'rps_battle', 'emoji_story', 'team_sync'];

export function buildRounds(players, count) {
  const emojis = shuffle([...SPEED_EMOJI_TARGETS]);
  let ei = 0;
  const rounds = [];
  for (let i = 0; i < count; i++) {
    const subType = SUB_TYPES[i % SUB_TYPES.length];
    if (subType === 'speed_emoji') {
      rounds.push({ type: 'speed_emoji', target: emojis[ei++ % emojis.length], round: Date.now() + i });
    } else if (subType === 'rps_battle') {
      rounds.push({ type: 'rps_battle', round: Date.now() + i });
    } else if (subType === 'emoji_story') {
      const theme = STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)];
      rounds.push({ type: 'emoji_story', theme, round: Date.now() + i });
    } else {
      const target = 20 + Math.floor(Math.random() * 30);
      rounds.push({ type: 'team_sync', targetClicks: target, round: Date.now() + i });
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
  const round = activity.round || activity.type;
  const revealed = roomData.revealResults === true;

  if (activity.type === 'speed_emoji') return <SpeedEmojiGame key={round} activity={activity} roomCode={roomCode} roomData={roomData} myPlayerId={myPlayerId} revealed={revealed} />;
  if (activity.type === 'rps_battle') return <RPSGame key={round} activity={activity} roomCode={roomCode} roomData={roomData} myPlayerId={myPlayerId} revealed={revealed} />;
  if (activity.type === 'emoji_story') return <EmojiStoryGame key={round} activity={activity} roomCode={roomCode} roomData={roomData} myPlayerId={myPlayerId} revealed={revealed} />;
  if (activity.type === 'team_sync') return <TeamSyncGame key={round} activity={activity} roomCode={roomCode} roomData={roomData} myPlayerId={myPlayerId} revealed={revealed} />;
  return null;
}

// --- SPEED EMOJI ---
function SpeedEmojiGame({ activity, roomCode, roomData, myPlayerId, revealed }) {
  const [found, setFound] = useState(false);
  const [allTaps, setAllTaps] = useState({});
  const EMOJI_POOL = ['😀','😂','🥳','😎','🤯','🥺','😤','🤩','💀','👻','🔥','💧','⭐','🌈','🎈','🎯','🍕','🍔','🎸','🚀','🌙','❤️','💎','🦄','🐱','🎵','🏆','👑','🌸','🦊'];
  const target = activity.target || '🎯';
  const [grid] = useState(() => {
    const g = [...EMOJI_POOL].filter(e => e !== target).slice(0, 24);
    const pos = Math.floor(Math.random() * 25);
    g.splice(pos, 0, target);
    return g;
  });

  useEffect(() => {
    return onValue(ref(db, `rooms/${roomCode}/speedEmojiTaps`), s => { if (s.exists()) setAllTaps(s.val()); });
  }, [roomCode]);

  const players = Object.entries(roomData.players || {}).map(([id, d]) => ({ id, ...d }));

  return (
    <div style={wrap}>
      <h2 style={{ color: '#eab308' }}>⚡ Speed Emoji</h2>
      <p style={{ color: '#9090b0', marginBottom: '10px' }}>Find <span style={{ fontSize: '28px' }}>{target}</span> as fast as you can!</p>
      {!found ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', maxWidth: '320px', margin: '0 auto' }}>
          {grid.map((e, i) => (
            <button key={i} onClick={() => {
              if (e === target) {
                setFound(true);
                update(ref(db, `rooms/${roomCode}/players/${myPlayerId}`), { score: increment(50) });
                const myName = players.find(p => p.id === myPlayerId)?.name || 'Anon';
                set(ref(db, `rooms/${roomCode}/speedEmojiTaps/${myPlayerId}`), { found: true, name: myName, time: Date.now() });
              }
            }} style={{ padding: '10px', fontSize: '24px', background: '#252533', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer' }}>
              {e}
            </button>
          ))}
        </div>
      ) : <p style={{ color: '#22c55e', marginTop: '20px', fontSize: '18px' }}>🎯 Found it! +50pts</p>}
      {revealed && (
        <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '15px', marginTop: '15px', textAlign: 'left' }}>
          <h3 style={{ color: '#ffb347', margin: '0 0 10px', textAlign: 'center', fontSize: '15px' }}>⚡ Speed Rankings</h3>
          {Object.entries(allTaps).sort((a, b) => a[1].time - b[1].time).map(([pid, t], i) => {
            const p = players.find(x => x.id === pid);
            return (
              <div key={pid} style={{ ...rStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
                <PlayerAvatar player={p} size={28} />
                <strong>{t.name || pid}</strong>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- RPS BATTLE ---
const BEATS = { Rock: 'Scissors', Scissors: 'Paper', Paper: 'Rock' };

function RPSGame({ activity, roomCode, roomData, myPlayerId, revealed }) {
  const [picked, setPicked] = useState(false);
  const [myPick, setMyPick] = useState(null);
  const [allPicks, setAllPicks] = useState({});
  const [scored, setScored] = useState(false);

  useEffect(() => {
    return onValue(ref(db, `rooms/${roomCode}/rpsBattleChoices`), s => { if (s.exists()) setAllPicks(s.val()); });
  }, [roomCode]);

  const players = Object.entries(roomData.players || {}).map(([id, d]) => ({ id, ...d }));

  // Determine winners when revealed
  const entries = Object.entries(allPicks);
  const counts = { Rock: 0, Paper: 0, Scissors: 0 };
  entries.forEach(([, p]) => { if (counts[p.choice] !== undefined) counts[p.choice]++; });
  const present = Object.keys(counts).filter(k => counts[k] > 0);

  // Win logic: if exactly 2 different choices exist, the one that beats the other wins
  let winningChoice = null;
  if (present.length === 2) {
    const [a, b] = present;
    winningChoice = BEATS[a] === b ? a : b;
  }
  // If all 3 or all same → draw (no winner)

  const winnerIds = winningChoice ? entries.filter(([, p]) => p.choice === winningChoice).map(([pid]) => pid) : [];
  const myResult = !myPick ? null : winnerIds.includes(myPlayerId) ? 'win' : winningChoice === null ? 'draw' : 'lose';

  // Award points once on reveal
  useEffect(() => {
    if (revealed && !scored && winnerIds.includes(myPlayerId)) {
      setScored(true);
      update(ref(db, `rooms/${roomCode}/players/${myPlayerId}`), { score: increment(100) });
    }
  }, [revealed, scored, winnerIds, myPlayerId, roomCode]);

  return (
    <div style={wrap}>
      <h2 style={{ color: '#f43f5e' }}>✊ Rock Paper Scissors</h2>
      {!picked ? (
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '25px' }}>
          {RPS_OPTIONS.map(o => (
            <button key={o.name} onClick={() => {
              setPicked(true);
              setMyPick(o);
              const myName = players.find(p => p.id === myPlayerId)?.name || 'Anon';
              set(ref(db, `rooms/${roomCode}/rpsBattleChoices/${myPlayerId}`), { choice: o.name, emoji: o.emoji, name: myName });
            }} style={{ padding: '20px 30px', fontSize: '40px', background: '#252533', border: '2px solid #5a5a78', borderRadius: '15px', cursor: 'pointer' }}>
              {o.emoji}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: '20px' }}>
          <p style={{ fontSize: '48px' }}>{myPick?.emoji}</p>
          <p style={{ color: '#35d4ff' }}>You chose {myPick?.name}! Waiting for reveal...</p>
        </div>
      )}
      {revealed && (
        <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '15px', marginTop: '15px', textAlign: 'left' }}>
          {/* Result banner */}
          {myResult === 'win' && <p style={{ textAlign: 'center', color: '#22c55e', fontSize: '20px', fontWeight: 'bold', margin: '0 0 12px' }}>🎉 You WON! +100pts</p>}
          {myResult === 'lose' && <p style={{ textAlign: 'center', color: '#ef4444', fontSize: '20px', fontWeight: 'bold', margin: '0 0 12px' }}>😢 You lost!</p>}
          {myResult === 'draw' && <p style={{ textAlign: 'center', color: '#eab308', fontSize: '20px', fontWeight: 'bold', margin: '0 0 12px' }}>🤝 It's a draw!</p>}

          <h3 style={{ color: '#ffb347', margin: '0 0 10px', textAlign: 'center', fontSize: '15px' }}>✊ Everyone's Picks</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '10px' }}>
            {RPS_OPTIONS.map(o => (
              <span key={o.name} style={{ color: o.name === winningChoice ? '#22c55e' : 'white', fontSize: '14px', fontWeight: o.name === winningChoice ? 'bold' : 'normal' }}>
                {o.emoji} {counts[o.name]} {o.name === winningChoice ? '👑' : ''}
              </span>
            ))}
          </div>
          {entries.map(([pid, pick]) => {
            const p = players.find(x => x.id === pid);
            const isWinner = winnerIds.includes(pid);
            return (
              <div key={pid} style={{ ...rStyle, display: 'flex', alignItems: 'center', gap: '8px', background: isWinner ? '#1c3a2a' : '#252538', border: isWinner ? '1px solid #22c55e33' : '1px solid transparent' }}>
                <PlayerAvatar player={p} size={28} />
                <span style={{ flex: 1 }}><strong>{pick.name || pid}:</strong> {pick.emoji} {pick.choice}</span>
                {isWinner && <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '12px' }}>🏆 +100</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- EMOJI STORY ---
const EMOJI_KEYBOARD = [
  ['😀','😂','🥹','😍','🤩','😎','🥳','😤','😱','🤯','😈','💀','👻','🤖','👽'],
  ['❤️','🔥','⭐','✨','💎','🌈','☀️','🌙','⛈️','❄️','💧','🌊','🌸','🍀','🌺'],
  ['🐶','🐱','🦁','🐻','🦊','🐸','🐙','🦋','🐝','🦄','🐉','🦖','🐬','🦅','🐍'],
  ['🍕','🍔','🍟','🍩','🎂','🍎','🍷','☕','🧃','🍿','🌮','🍣','🍪','🧁','🍺'],
  ['⚽','🏀','🎯','🎮','🎸','🎭','🎨','🎪','🏆','🎤','🎬','🎹','🎲','🎳','🪄'],
  ['🚀','✈️','🚗','🛸','🚢','🏠','🏰','🏝️','🗻','🌋','🎡','🏟️','🗽','🎢','⛺'],
  ['💪','👑','🎒','💰','🗡️','🛡️','💣','🔮','🧲','🪂','🎁','📱','💡','🔑','🧩']
];

function EmojiStoryGame({ activity, roomCode, roomData, myPlayerId, revealed }) {
  const [submitted, setSubmitted] = useState(false);
  const [emoji, setEmoji] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [allEntries, setAllEntries] = useState({});
  const [storyVotes, setStoryVotes] = useState({});

  useEffect(() => {
    return onValue(ref(db, `rooms/${roomCode}/emojiStoryEntries`), s => { if (s.exists()) setAllEntries(s.val()); });
  }, [roomCode]);

  useEffect(() => {
    return onValue(ref(db, `rooms/${roomCode}/emojiStoryVotes`), s => { if (s.exists()) setStoryVotes(s.val()); });
  }, [roomCode]);

  const players = Object.entries(roomData.players || {}).map(([id, d]) => ({ id, ...d }));
  const storyEmojis = Object.values(allEntries).map(e => e.emoji).join(' ');
  const otherEntries = Object.entries(allEntries).filter(([pid]) => pid !== myPlayerId);

  const voteCounts = {};
  Object.values(storyVotes).forEach(v => { voteCounts[v] = (voteCounts[v] || 0) + 1; });

  const handleVote = (pid) => {
    if (hasVoted || pid === myPlayerId) return;
    setHasVoted(true);
    set(ref(db, `rooms/${roomCode}/emojiStoryVotes/${myPlayerId}`), pid);
    update(ref(db, `rooms/${roomCode}/players/${pid}`), { score: increment(50) });
  };

  return (
    <div style={wrap}>
      <h2 style={{ color: '#a855f7' }}>📖 Emoji Story Chain</h2>
      {activity.theme && (
        <div style={{ background: '#2a1a3e', padding: '12px 18px', borderRadius: '10px', margin: '10px 0', border: '1px solid #a855f755' }}>
          <p style={{ color: '#9090b0', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px' }}>Story Theme</p>
          <p style={{ color: '#c084fc', fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{activity.theme}</p>
        </div>
      )}
      <div style={{ ...card, minHeight: '60px', borderLeft: '5px solid #a855f7' }}>
        <p style={{ color: '#9090b0', fontSize: '11px', textTransform: 'uppercase' }}>Story so far</p>
        <p style={{ fontSize: '28px', margin: '10px 0' }}>{storyEmojis || '📖 ...'}</p>
      </div>
      {!submitted ? (
        <div style={{ marginTop: '15px' }}>
          <p style={{ color: '#9090b0', fontSize: '13px', marginBottom: '8px' }}>Tap emojis to build your part of the story!</p>
          {/* Selected emojis display */}
          <div style={{ background: '#1c1c26', border: '2px solid #a855f7', borderRadius: '12px', padding: '14px', minHeight: '50px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
            {emoji ? (
              <span style={{ fontSize: '32px', letterSpacing: '6px' }}>{emoji}</span>
            ) : (
              <span style={{ color: '#555', fontSize: '14px' }}>Tap emojis below...</span>
            )}
            {emoji && (
              <button onClick={() => setEmoji(prev => [...prev].slice(0, -2).join(''))} style={{ marginLeft: '10px', background: '#ef444433', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>⌫</button>
            )}
          </div>
          {/* Emoji picker grid */}
          <div style={{ background: '#151520', borderRadius: '12px', padding: '10px', border: '2px solid #a855f755' }}>
            <p style={{ color: '#c084fc', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', margin: '0 0 8px', textTransform: 'uppercase' }}>🎨 Emoji Keyboard</p>
            {EMOJI_KEYBOARD.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '5px', marginBottom: '5px' }}>
                {row.map(e => (
                  <button key={e} onClick={() => setEmoji(prev => prev.length < 20 ? prev + e : prev)} style={{ width: '42px', height: '42px', fontSize: '22px', background: '#252533', border: '1px solid #444', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, transition: 'transform 0.1s' }}>
                    {e}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <button onClick={() => {
            if (!emoji.trim()) return;
            setSubmitted(true);
            const myName = players.find(p => p.id === myPlayerId)?.name || 'Anon';
            set(ref(db, `rooms/${roomCode}/emojiStoryEntries/${myPlayerId}`), { emoji: emoji.trim(), name: myName });
          }} style={{ ...btn, background: '#a855f7', marginTop: '10px' }}>Add to Story 📖</button>
        </div>
      ) : !hasVoted ? (
        <div style={{ marginTop: '15px' }}>
          <p style={{ color: '#35d4ff', marginBottom: '10px' }}>✅ You added: <strong>{allEntries[myPlayerId]?.emoji || emoji}</strong></p>
          {otherEntries.length > 0 ? (
            <>
              <p style={{ color: '#ffb347', fontWeight: 'bold', marginBottom: '10px' }}>🏅 Vote for the best emoji contribution!</p>
              {otherEntries.map(([pid, e]) => {
                const p = players.find(x => x.id === pid);
                return (
                  <button key={pid} onClick={() => handleVote(pid)} style={voteCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <PlayerAvatar player={p} size={32} />
                      <div style={{ textAlign: 'left' }}>
                        <strong style={{ color: '#35d4ff' }}>{e.name || p?.name}</strong>
                        <p style={{ color: '#d0d0e0', margin: '3px 0 0', fontSize: '22px' }}>{e.emoji}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          ) : <p style={{ color: '#9090b0' }}>Waiting for others...</p>}
        </div>
      ) : !revealed ? (
        <p style={{ color: '#35d4ff', marginTop: '15px' }}>🎉 Voted! Waiting for reveal...</p>
      ) : null}
      {revealed && (
        <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '15px', marginTop: '15px', textAlign: 'left' }}>
          <h3 style={{ color: '#ffb347', margin: '0 0 10px', textAlign: 'center', fontSize: '15px' }}>📖 The Full Story</h3>
          <p style={{ textAlign: 'center', fontSize: '32px', margin: '10px 0' }}>{storyEmojis}</p>
          {Object.entries(allEntries).sort((a, b) => (voteCounts[b[0]] || 0) - (voteCounts[a[0]] || 0)).map(([pid, e]) => {
            const p = players.find(x => x.id === pid);
            const vc = voteCounts[pid] || 0;
            return (
              <div key={pid} style={{ ...rStyle, display: 'flex', alignItems: 'center', gap: '8px', background: vc > 0 ? '#1c3a2a' : '#252538', border: vc > 0 ? '1px solid #22c55e33' : '1px solid transparent' }}>
                <PlayerAvatar player={p} size={28} />
                <span style={{ flex: 1 }}><strong>{e.name || p?.name || pid}:</strong> {e.emoji}</span>
                {vc > 0 && <span style={{ color: '#ffb347', fontWeight: 'bold', fontSize: '13px' }}>⭐ {vc}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- TEAM SYNC ---
function TeamSyncGame({ activity, roomCode, roomData, myPlayerId, revealed }) {
  const target = activity.targetClicks || 30;
  const current = roomData.syncClicks || 0;
  const done = current >= target;

  return (
    <div style={wrap}>
      <h2 style={{ color: '#14b8a6' }}>🤝 Team Sync</h2>
      <p style={{ color: '#9090b0' }}>Work together to hit <strong style={{ color: '#14b8a6' }}>{target}</strong> taps!</p>
      <div style={{ ...card, borderLeft: '5px solid #14b8a6' }}>
        <p style={{ fontSize: '48px', fontWeight: 'bold', color: done ? '#22c55e' : 'white', margin: '10px 0' }}>{current} / {target}</p>
        <div style={{ background: '#333', borderRadius: '10px', height: '12px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(100, (current / target) * 100)}%`, background: done ? '#22c55e' : '#14b8a6', borderRadius: '10px', transition: 'width 0.2s' }} />
        </div>
      </div>
      {!done ? (
        <button onClick={() => update(ref(db, `rooms/${roomCode}`), { syncClicks: increment(1) })} style={{ ...btn, background: '#14b8a6', color: '#000', marginTop: '15px', fontSize: '24px', padding: '20px' }}>
          TAP! 🤝
        </button>
      ) : (
        <div style={{ marginTop: '15px' }}>
          <p style={{ color: '#22c55e', fontSize: '24px', fontWeight: 'bold' }}>🎉 Target reached!</p>
        </div>
      )}
    </div>
  );
}

// ===== ADMIN MONITOR =====
export function AdminMonitor({ activity, roomData, playersArray }) {
  if (activity.type === 'speed_emoji') {
    const taps = roomData?.speedEmojiTaps || {};
    return (
      <div>
        <p style={{ color: '#9090b0', fontSize: '12px' }}>Target: {activity.target}</p>
        {Object.entries(taps).map(([pid, t]) => <div key={pid} style={rStyle}><strong>{t.name || pid}:</strong> Found! ✅</div>)}
        <p style={{ color: '#555', fontSize: '12px', marginTop: '6px' }}>Found: {Object.keys(taps).length} / {playersArray.length}</p>
      </div>
    );
  }
  if (activity.type === 'rps_battle') {
    const picks = roomData?.rpsBattleChoices || {};
    return (
      <div>
        {Object.entries(picks).map(([pid, p]) => <div key={pid} style={rStyle}><strong>{p.name || pid}:</strong> {p.emoji} {p.choice}</div>)}
        <p style={{ color: '#555', fontSize: '12px', marginTop: '6px' }}>Picked: {Object.keys(picks).length} / {playersArray.length}</p>
      </div>
    );
  }
  if (activity.type === 'emoji_story') {
    const entries = roomData?.emojiStoryEntries || {};
    const storyVotes = roomData?.emojiStoryVotes || {};
    const story = Object.values(entries).map(e => e.emoji).join(' ');
    const voteCounts = {};
    Object.values(storyVotes).forEach(v => { voteCounts[v] = (voteCounts[v] || 0) + 1; });
    return (
      <div>
        <p style={{ fontSize: '20px' }}>{story || '📖 ...'}</p>
        {Object.entries(entries).map(([pid, e]) => (
          <div key={pid} style={rStyle}>
            <strong>{e.name || pid}:</strong> {e.emoji}
            {(voteCounts[pid] || 0) > 0 && <span style={{ color: '#ffb347', float: 'right' }}>⭐ {voteCounts[pid]}</span>}
          </div>
        ))}
        <p style={{ color: '#555', fontSize: '12px' }}>Entries: {Object.keys(entries).length} / {playersArray.length} &nbsp; Votes: {Object.keys(storyVotes).length}</p>
      </div>
    );
  }
  if (activity.type === 'team_sync') {
    const current = roomData?.syncClicks || 0;
    const target = activity.targetClicks || 30;
    return (
      <div>
        <p style={{ color: current >= target ? '#22c55e' : 'white', fontWeight: 'bold' }}>{current} / {target} taps {current >= target ? '✅' : ''}</p>
      </div>
    );
  }
  return null;
}

const wrap = { textAlign: 'center', maxWidth: '500px', margin: '0 auto', color: 'white' };
const card = { background: '#1c1c26', padding: '25px', borderRadius: '15px', margin: '15px 0' };
const inp = { width: '100%', padding: '14px', background: '#1c1c26', border: '1px solid #5a5a78', borderRadius: '10px', color: 'white', fontSize: '14px', boxSizing: 'border-box' };
const btn = { padding: '14px 28px', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', width: '100%' };
const rStyle = { padding: '5px 10px', margin: '3px 0', background: '#252538', borderRadius: '6px', fontSize: '13px', color: 'white' };
const voteCardStyle = { display: 'block', width: '100%', padding: '12px 14px', background: '#252533', border: '1px solid #5a5a78', borderRadius: '10px', color: 'white', cursor: 'pointer', margin: '8px 0', textAlign: 'left' };

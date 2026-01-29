import { useEffect, useState } from 'react';
import { getPoll, vote } from '../api/polls';
import type { Poll as PollType } from '../api/polls';

interface PollProps {
  pollId: string;
}

export function Poll({ pollId }: PollProps) {
  const [poll, setPoll] = useState<PollType | null>(null);

  const fetchPoll = async () => {
    const data = await getPoll(pollId);
    setPoll(data);
  };

  useEffect(() => {
    fetchPoll();
    const interval = setInterval(fetchPoll, 2000);
    return () => clearInterval(interval);
  }, [pollId]);

  const handleVote = async (option: string) => {
    const updated = await vote(pollId, option);
    setPoll(updated);
  };

  if (!poll) return <p>Loading...</p>;

  const totalVotes = Object.values(poll.votes).reduce((sum, v) => sum + v, 0);

  return (
    <div style={{ marginTop: 20 }}>
      <h2 style={{ marginBottom: 16 }}>{poll.question}</h2>
      <div>
        {poll.options.map((option) => {
          const count = poll.votes[option] || 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          return (
            <div key={option} style={{ marginBottom: 12 }}>
              <button
                onClick={() => handleVote(option)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: '1px solid #ccc',
                  borderRadius: 6,
                  background: '#fff',
                  fontSize: 16,
                }}
              >
                {option}
              </button>
              <div
                style={{
                  marginTop: 4,
                  height: 8,
                  borderRadius: 4,
                  background: '#eee',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: '#4f46e5',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              <span style={{ fontSize: 13, color: '#666' }}>
                {count} votes ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 13, color: '#999', marginTop: 16 }}>
        Total: {totalVotes} votes
      </p>
    </div>
  );
}

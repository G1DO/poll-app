import { useEffect, useState } from 'react';
import { getPolls, createPoll } from './api/polls';
import type { Poll as PollType } from './api/polls';
import { Poll } from './components/Poll';

function App() {
  const [polls, setPolls] = useState<PollType[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState('');

  const refreshPolls = () => {
    getPolls().then((data) => {
      setPolls(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    });
  };

  useEffect(() => {
    refreshPolls();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !options.trim()) return;
    const optionList = options.split(',').map((o) => o.trim()).filter(Boolean);
    if (optionList.length < 2) return;
    const poll = await createPoll(question.trim(), optionList);
    setQuestion('');
    setOptions('');
    setSelectedId(poll.id);
    refreshPolls();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      padding: 20,
      fontFamily: 'sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 500 }}>
        <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Poll App</h1>

        <form onSubmit={handleCreate} style={{ marginBottom: 32 }}>
          <input
            type="text"
            placeholder="Question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              marginBottom: 8,
              border: '1px solid #ccc',
              borderRadius: 6,
              fontSize: 16,
              boxSizing: 'border-box',
            }}
          />
          <input
            type="text"
            placeholder="Options (comma separated)"
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              marginBottom: 8,
              border: '1px solid #ccc',
              borderRadius: 6,
              fontSize: 16,
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '10px 16px',
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            Create Poll
          </button>
        </form>

        {polls.length > 1 && (
          <div style={{ marginBottom: 32, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {polls.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                style={{
                  padding: '6px 12px',
                  border: selectedId === p.id ? '2px solid #4f46e5' : '1px solid #ccc',
                  borderRadius: 4,
                  background: selectedId === p.id ? '#eef2ff' : '#fff',
                  cursor: 'pointer',
                }}
              >
                {p.question}
              </button>
            ))}
          </div>
        )}

        {selectedId && <Poll pollId={selectedId} />}
      </div>
    </div>
  );
}

export default App;

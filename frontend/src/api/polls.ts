export interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
}

export async function getPolls(): Promise<Poll[]> {
  const res = await fetch('/api/polls');
  return res.json();
}

export async function getPoll(id: string): Promise<Poll> {
  const res = await fetch(`/api/polls/${id}`);
  return res.json();
}

export async function createPoll(question: string, options: string[]): Promise<Poll> {
  const res = await fetch('/api/polls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, options }),
  });
  return res.json();
}

export async function vote(id: string, option: string): Promise<Poll> {
  const res = await fetch(`/api/polls/${id}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ option }),
  });
  return res.json();
}

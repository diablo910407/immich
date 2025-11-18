type TagType = { id: string; name: string };
type TagSkill = { id: string; typeId: string; name: string };

let labelsPromise: Promise<{ types: TagType[]; skills: TagSkill[] }> | null = null;

export function invalidateLabelsCache() {
  labelsPromise = null;
}

export async function getLabelsCached(): Promise<{ types: TagType[]; skills: TagSkill[] }> {
  if (!labelsPromise) {
    labelsPromise = fetch('/api/myowntag/labels').then(async (res) => {
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as { types: TagType[]; skills: TagSkill[] };
    });
  }
  return labelsPromise;
}

export async function getLabelsFresh(): Promise<{ types: TagType[]; skills: TagSkill[] }> {
  const res = await fetch('/api/myowntag/labels');
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { types: TagType[]; skills: TagSkill[] };
  return data;
}

export async function getPersonLabels(personId: string): Promise<{ labels: { typeId: string; skillId?: string }[] }>{
  const res = await fetch(`/api/myowntag/person/${personId}/labels`);
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { labels: { typeId: string; skillId?: string }[] };
}

export async function savePersonLabels(personId: string, labels: { typeId: string; skillId?: string }[]) {
  const res = await fetch(`/api/myowntag/person/${personId}/labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ labels }),
  });
  if (!res.ok) throw new Error(await res.text());
}
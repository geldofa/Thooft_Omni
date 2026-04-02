declare module 'virtual:changelog' {
  export interface ChangelogCommit {
    id: string; // the git hash
    version: string | null; // e.g. "1.11.3" or null if no version found
    date: string; // commit date
    title: string; // parsed title without version
    body: string; // full body message
    type: 'feature' | 'bug' | 'chore'; // guessed from message
  }
  const changelog: ChangelogCommit[];
  export default changelog;
}
